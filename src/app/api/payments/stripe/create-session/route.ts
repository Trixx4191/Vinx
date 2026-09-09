import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/payments/stripe";
import { withSafeErrors } from "@/lib/safeErrors";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;
    if (typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: { include: { variant: { include: { product: true } } } } }
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Order is not payable" }, { status: 409 });
    }
    if (order.paymentProvider !== "STRIPE") {
      return NextResponse.json({ error: "Order was not created for Stripe" }, { status: 400 });
    }

    // Line items are rebuilt from the order's own stored priceAtPurchase —
    // again, nothing here comes from the current request.
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.user.email,
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: item.priceAtPurchase,
          product_data: { name: item.variant.product.name }
        }
      })),
      metadata: { orderId: order.id },
      success_url: `${process.env.NEXTAUTH_URL}/orders/${order.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/orders/${order.id}`
    });

    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: checkoutSession.id } });

    return NextResponse.json({ url: checkoutSession.url });
  });
}
