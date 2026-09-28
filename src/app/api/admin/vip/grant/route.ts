import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, logAdminAction } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { vipGrantSchema } from "@/lib/validation";
import { applyPaidPeriod } from "@/lib/vip";

/**
 * Give a customer VIP time for free — for someone the brand is gifting it to,
 * or to put right a problem.
 *
 * Master admin only, like staff management: it hands out something customers
 * pay for. Recorded as a purchase with plan COMP and amount 0, so it appears in
 * the payments list, is excluded from revenue by construction, and can be
 * ended with the same action as a refund.
 */
export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const parsed = vipGrantSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { email, days } = parsed.data;

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { email }, select: { id: true, vipUntil: true, vipSince: true } });
        if (!user) return null;

        const next = applyPaidPeriod(user, days);
        await tx.user.update({ where: { id: user.id }, data: { vipUntil: next.vipUntil, vipSince: next.vipSince } });
        const purchase = await tx.vipPurchase.create({
          data: {
            userId: user.id,
            plan: "COMP",
            amount: 0,
            currency: "GHS",
            periodDays: days,
            status: "PAID",
            paidAt: new Date(),
            periodStart: next.periodStart,
            periodEnd: next.vipUntil
          }
        });
        return { userId: user.id, purchaseId: purchase.id, vipUntil: next.vipUntil };
      },
      // Serializable for the same reason as markVipPaid: a grant landing at the
      // same moment as a paid renewal must not both extend from one old date.
      { isolationLevel: "Serializable" }
    );

    if (!result) {
      // Saying "no account with that email" to an admin is fine — they are
      // already trusted with the customer list.
      return NextResponse.json({ error: "No account uses that email." }, { status: 404 });
    }

    await logAdminAction(admin.session.user!.id!, "vip.grant", "User", result.userId, {
      days,
      purchaseId: result.purchaseId,
      vipUntil: result.vipUntil
    });

    return NextResponse.json({ ok: true, vipUntil: result.vipUntil });
  });
}
