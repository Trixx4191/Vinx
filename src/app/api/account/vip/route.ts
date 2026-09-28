import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withSafeErrors } from "@/lib/safeErrors";
import { rateLimit } from "@/lib/rateLimit";
import { vipCheckoutSchema } from "@/lib/validation";
import { readSettings } from "@/lib/siteSettings";
import { VIP_PLANS, planPrice } from "@/lib/vip";
import { initializeTransaction } from "@/lib/payments/paystack";

/**
 * Start paying for a VIP period.
 *
 * The client names only WHICH plan. The price is read from the admin's
 * settings here, snapshotted onto the purchase, and sent to Paystack from the
 * server — the same rule as orders: nothing charge-related is ever taken from
 * the request.
 *
 * Paystack only. It covers mobile money and cards in Ghana; Stripe does not
 * onboard Ghanaian businesses, and a membership needs one payment path done
 * properly more than three done loosely.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return withSafeErrors(async () => {
    const { ok } = await rateLimit(`vip-checkout:${userId}`, 6, 10 * 60_000);
    if (!ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

    const parsed = vipCheckoutSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Choose a plan" }, { status: 400 });
    const plan = parsed.data.plan;

    const amount = planPrice(await readSettings(), plan);
    if (amount === null) {
      return NextResponse.json({ error: "VIP is not available yet." }, { status: 409 });
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const reference = `vinxvip_${randomBytes(10).toString("hex")}`;
    const purchase = await prisma.vipPurchase.create({
      data: {
        userId,
        plan,
        amount,
        currency: "GHS",
        periodDays: VIP_PLANS[plan].days,
        paymentRef: reference
      }
    });

    const result = await initializeTransaction({
      email: user.email,
      amount,
      currency: "GHS",
      reference,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/payments/paystack/vip-callback?purchaseId=${purchase.id}`,
      metadata: { vipPurchaseId: purchase.id }
    });

    return NextResponse.json({ authorizationUrl: result.authorization_url });
  });
}
