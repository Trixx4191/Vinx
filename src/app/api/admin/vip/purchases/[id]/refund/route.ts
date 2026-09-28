import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, logAdminAction } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { refundVipPurchase } from "@/lib/payments/refunds";

/**
 * Record that a VIP payment was refunded, and take its time back.
 *
 * This does NOT move money. The refund itself is made in the Paystack
 * dashboard — and once Paystack finishes it, the refund webhook records it
 * here on its own. This button is for when that webhook is not set up, or for
 * ending a complimentary grant early. Doing the money half from here would
 * mean this app holding the power to send refunds, and a refund issued from
 * the wrong row is far harder to undo than one typed into Paystack.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;

  return withSafeErrors(async () => {
    const result = await refundVipPurchase(id);

    if (!result.ok) {
      return result.reason === "not-found"
        ? NextResponse.json({ error: "Not found" }, { status: 404 })
        : NextResponse.json({ error: "That payment is not refundable." }, { status: 409 });
    }
    if (!result.applied) {
      return NextResponse.json({ error: "Already refunded." }, { status: 409 });
    }

    await logAdminAction(admin.session.user!.id!, "vip.refund", "VipPurchase", id, {
      userId: result.userId,
      vipUntil: result.vipUntil
    });

    return NextResponse.json({ ok: true, vipUntil: result.vipUntil });
  });
}
