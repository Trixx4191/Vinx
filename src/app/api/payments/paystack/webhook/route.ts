import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { verifyTransaction } from "@/lib/payments/paystack";
import { markOrderPaid } from "@/lib/payments/markOrderPaid";

// This is the endpoint Paystack itself calls — configure it in the Paystack
// dashboard. It's the most reliable confirmation path, since it doesn't
// depend on the customer's browser successfully redirecting back to us.
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Read the raw body BEFORE any JSON parsing — the signature is computed
  // over the exact bytes Paystack sent, and re-serializing a parsed object
  // is not guaranteed to reproduce those bytes.
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");

  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    // Do not process, do not leak which part of the check failed.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    const orderId = event.data?.metadata?.orderId;

    if (reference && orderId) {
      // Even though the webhook payload is now signature-verified, we still
      // re-verify with Paystack's own verify endpoint rather than trusting
      // the amount/status fields in the webhook body directly. Belt and
      // suspenders: a compromised or buggy webhook payload still can't
      // mark an order paid for the wrong amount.
      try {
        const verified = await verifyTransaction(reference);
        if (verified.status === "success") {
          await markOrderPaid(orderId, verified.reference, verified.amount, verified.currency);
        }
      } catch (err) {
        console.error("[paystack webhook] re-verify failed", err);
        return NextResponse.json({ error: "Verification failed" }, { status: 502 });
      }
    }
  }

  // Always 200 quickly once handled, or Paystack will retry aggressively.
  return NextResponse.json({ received: true });
}
