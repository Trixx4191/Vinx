import { prisma } from "@/lib/prisma";
import { applyPaidPeriod } from "@/lib/vip";
import { sendVipReceipt } from "@/lib/email/notifications";

/**
 * The only function allowed to turn a payment into VIP time.
 *
 * Called only after Paystack has confirmed the payment server-to-server —
 * from the browser callback and from the signed webhook, which routinely
 * arrive within milliseconds of each other for the same payment.
 *
 * That concurrency is the thing to get right. A read-then-write ("is it still
 * PENDING? then mark it PAID and extend") lets both callers read PENDING and
 * both extend: one payment, two months of VIP. So the PENDING → PAID transition
 * is a single conditional UPDATE, and only the caller whose update actually
 * changed a row goes on to extend the membership. The other sees zero rows and
 * returns "already applied".
 *
 * The membership extension runs in the same Serializable transaction, so two
 * DIFFERENT purchases for one user settling at the same moment cannot both
 * extend from the same old end date and lose a period between them.
 */
export async function markVipPaid(
  purchaseId: string,
  paymentRef: string,
  verifiedAmount: number,
  verifiedCurrency: string
) {
  const result = await prisma.$transaction(
    async (tx) => {
      const purchase = await tx.vipPurchase.findUnique({ where: { id: purchaseId } });
      if (!purchase) return { ok: false as const, reason: "Purchase not found" };
      if (purchase.status === "PAID") return { ok: true as const, alreadyApplied: true };
      if (purchase.status !== "PENDING") return { ok: false as const, reason: "Purchase is not payable" };

      if (purchase.paymentRef && purchase.paymentRef !== paymentRef) {
        return { ok: false as const, reason: "Payment reference does not belong to this purchase" };
      }

      // What Paystack confirms must equal what was priced at checkout. A
      // mismatch is tampering or a provider bug; either way, no VIP time.
      if (verifiedAmount !== purchase.amount || verifiedCurrency !== purchase.currency) {
        return { ok: false as const, reason: "Amount/currency mismatch — refusing to apply" };
      }

      // The claim. Only one concurrent caller can move this row out of
      // PENDING; everyone else updates nothing and stops here.
      const claimed = await tx.vipPurchase.updateMany({
        where: { id: purchaseId, status: "PENDING" },
        data: { status: "PAID", paymentRef, paidAt: new Date() }
      });
      if (claimed.count === 0) return { ok: true as const, alreadyApplied: true };

      const user = await tx.user.findUnique({
        where: { id: purchase.userId },
        select: { vipUntil: true, vipSince: true }
      });
      if (!user) throw new Error("VIP purchase references a missing user");

      const next = applyPaidPeriod(user, purchase.periodDays);

      await tx.user.update({
        where: { id: purchase.userId },
        data: { vipUntil: next.vipUntil, vipSince: next.vipSince }
      });
      await tx.vipPurchase.update({
        where: { id: purchaseId },
        data: { periodStart: next.periodStart, periodEnd: next.vipUntil }
      });

      return { ok: true as const, alreadyApplied: false, vipUntil: next.vipUntil };
    },
    { isolationLevel: "Serializable" }
  );

  // Only the caller that actually applied the time sends a receipt — the
  // browser callback and the webhook both land here for one payment, and the
  // loser of the claim must not send a second email. After the commit, so a
  // receipt never describes time that a rolled-back transaction did not grant.
  if (result.ok && !result.alreadyApplied) {
    await sendVipReceipt(purchaseId);
  }

  return result;
}
