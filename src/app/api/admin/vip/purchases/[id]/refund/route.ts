import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, logAdminAction } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { removePaidPeriod } from "@/lib/vip";

/**
 * Record that a VIP payment was refunded, and take its time back.
 *
 * This does NOT move money. The refund itself is made in the Paystack
 * dashboard; this records it here and removes the membership time it paid for.
 * Doing the money half automatically would mean this app holding the power to
 * send refunds, and a refund issued from the wrong row is far harder to undo
 * than one typed into Paystack deliberately.
 *
 * Also how a complimentary grant is ended early.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;

  return withSafeErrors(async () => {
    const result = await prisma.$transaction(
      async (tx) => {
        const purchase = await tx.vipPurchase.findUnique({
          where: { id },
          select: { id: true, userId: true, periodDays: true, status: true, plan: true, amount: true }
        });
        if (!purchase) return { status: 404 as const, error: "Not found" };

        // The claim: only a PAID purchase can be refunded, and only once —
        // two admins clicking at the same moment remove one period, not two.
        const claimed = await tx.vipPurchase.updateMany({
          where: { id, status: "PAID" },
          data: { status: "REFUNDED" }
        });
        if (claimed.count === 0) return { status: 409 as const, error: "That payment is not refundable." };

        const user = await tx.user.findUnique({
          where: { id: purchase.userId },
          select: { vipUntil: true, vipSince: true }
        });
        if (!user) throw new Error("VIP purchase references a missing user");

        const next = removePaidPeriod(user, purchase.periodDays);
        await tx.user.update({ where: { id: purchase.userId }, data: next });

        return { status: 200 as const, purchase, vipUntil: next.vipUntil };
      },
      { isolationLevel: "Serializable" }
    );

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logAdminAction(admin.session.user!.id!, "vip.refund", "VipPurchase", id, {
      userId: result.purchase.userId,
      plan: result.purchase.plan,
      amount: result.purchase.amount,
      periodDays: result.purchase.periodDays,
      vipUntil: result.vipUntil
    });

    return NextResponse.json({ ok: true, vipUntil: result.vipUntil });
  });
}
