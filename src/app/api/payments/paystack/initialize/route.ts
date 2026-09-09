import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/payments/paystack";
import { withSafeErrors } from "@/lib/safeErrors";
import { randomBytes } from "crypto";

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

    // The client only ever names WHICH order to pay for. Amount, currency,
    // and email are all pulled from our own records below — never from
    // the request body.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Order is not payable" }, { status: 409 });
    }

    if (order.paymentProvider !== "PAYSTACK") {
      return NextResponse.json({ error: "Order was not created for Paystack" }, { status: 400 });
    }

    const reference = `vinx_${order.id}_${randomBytes(4).toString("hex")}`;
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/payments/paystack/callback?orderId=${order.id}`;

    const result = await initializeTransaction({
      email: order.user.email,
      amount: order.totalAmount, // server value, never client-supplied
      currency: order.currency,
      reference,
      callbackUrl,
      metadata: { orderId: order.id }
    });

    // Record the reference now so the callback/webhook can find this order
    // by reference even before payment completes.
    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: reference } });

    return NextResponse.json({ authorizationUrl: result.authorization_url });
  });
}
