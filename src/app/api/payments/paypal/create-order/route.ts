import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/payments/paypal";
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

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.userId !== userId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Order is not payable" }, { status: 409 });
    }
    if (order.paymentProvider !== "PAYPAL") {
      return NextResponse.json({ error: "Order was not created for PayPal" }, { status: 400 });
    }

    const returnUrl = `${process.env.NEXTAUTH_URL}/api/payments/paypal/callback?orderId=${order.id}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/orders/${order.id}`;

    // Amount comes from our own record (order.totalAmount) — never from
    // this request body.
    const { paypalOrderId, approveLink } = await createOrder(order.id, order.totalAmount, order.currency, returnUrl, cancelUrl);

    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: paypalOrderId } });

    return NextResponse.json({ authorizationUrl: approveLink });
  });
}
