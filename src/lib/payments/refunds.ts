import { prisma } from "@/lib/prisma";
import { removePaidPeriod } from "@/lib/vip";

/**
 * Reversing things that were paid for. Shared by the admin "Refunded" button
 * and the Paystack refund webhook, so both paths take exactly the same effect
 * and neither can apply a refund twice.
 *
 * Neither function moves money. By the time either runs, the money has already
 * gone back (the admin refunded it in Paystack, or Paystack is telling us it
 * processed one); these bring the shop's records into line.
 */

export type RefundResult =
  | { ok: true; applied: true; userId: string; vipUntil: Date | null }
  | { ok: true; applied: false; reason: "already-refunded" }
  | { ok: false; reason: "not-found" | "not-refundable" };

/** Mark a VIP purchase refunded and take its period back off the member. */
export async function refundVipPurchase(purchaseId: string): Promise<RefundResult> {
  return prisma.$transaction(
    async (tx) => {
      const purchase = await tx.vipPurchase.findUnique({
        where: { id: purchaseId },
        select: { userId: true, periodDays: true, status: true }
      });
      if (!purchase) return { ok: false as const, reason: "not-found" as const };
      if (purchase.status === "REFUNDED") return { ok: true as const, applied: false as const, reason: "already-refunded" as const };

      // The claim: only one caller moves PAID → REFUNDED. The webhook and an
      // admin click arriving together take one period back, not two.
      const claimed = await tx.vipPurchase.updateMany({
        where: { id: purchaseId, status: "PAID" },
        data: { status: "REFUNDED" }
      });
      if (claimed.count === 0) {
        const now = await tx.vipPurchase.findUnique({ where: { id: purchaseId }, select: { status: true } });
        return now?.status === "REFUNDED"
          ? { ok: true as const, applied: false as const, reason: "already-refunded" as const }
          : { ok: false as const, reason: "not-refundable" as const };
      }

      const user = await tx.user.findUnique({
        where: { id: purchase.userId },
        select: { vipUntil: true, vipSince: true }
      });
      if (!user) throw new Error("VIP purchase references a missing user");

      const next = removePaidPeriod(user, purchase.periodDays);
      await tx.user.update({ where: { id: purchase.userId }, data: next });

      return { ok: true as const, applied: true as const, userId: purchase.userId, vipUntil: next.vipUntil };
    },
    { isolationLevel: "Serializable" }
  );
}

/** Statuses an order can be refunded from: money was taken. */
const REFUNDABLE_ORDER = ["PAID", "SHIPPED", "DELIVERED"] as const;

/**
 * Mark an order refunded, with a line on its timeline. Stock is not returned:
 * a refund after shipping means the goods are with the customer, and a refund
 * before shipping is followed by an admin deciding what happens to the stock —
 * the same as the admin order screen, which this matches.
 */
export async function markOrderRefunded(orderId: string, note: string): Promise<RefundResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true, userId: true } });
    if (!order) return { ok: false as const, reason: "not-found" as const };
    if (order.status === "REFUNDED") return { ok: true as const, applied: false as const, reason: "already-refunded" as const };

    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: [...REFUNDABLE_ORDER] } },
      data: { status: "REFUNDED" }
    });
    if (claimed.count === 0) return { ok: false as const, reason: "not-refundable" as const };

    await tx.orderStatusEvent.create({ data: { orderId, status: "REFUNDED", note } });
    return { ok: true as const, applied: true as const, userId: order.userId, vipUntil: null };
  });
}
