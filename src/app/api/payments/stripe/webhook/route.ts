import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/payments/stripe";
import { markOrderPaid } from "@/lib/payments/markOrderPaid";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    // constructEvent does the signature verification itself — this is the
    // only accepted way to trust a Stripe webhook payload.
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const orderId = checkoutSession.metadata?.orderId;

    if (orderId && checkoutSession.payment_status === "paid") {
      const amountTotal = checkoutSession.amount_total ?? 0;
      const currency = (checkoutSession.currency ?? "").toUpperCase();
      await markOrderPaid(orderId, checkoutSession.id, amountTotal, currency);
    }
  }

  return NextResponse.json({ received: true });
}
