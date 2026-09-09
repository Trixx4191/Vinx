import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/payments/paystack";
import { markOrderPaid } from "@/lib/payments/markOrderPaid";

// GET because this is a browser redirect, not an API call from our own
// frontend. Never trust the query params themselves as proof of payment —
// they're just a hint of which reference to go check with Paystack directly.
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");

  if (!orderId || !reference) {
    return NextResponse.redirect(new URL("/cart", req.url));
  }

  try {
    // Server-to-server call to Paystack — this is the actual source of
    // truth, not the fact that the browser landed on this URL.
    const verified = await verifyTransaction(reference);

    if (verified.status === "success") {
      await markOrderPaid(orderId, verified.reference, verified.amount, verified.currency);
    }
  } catch (err) {
    console.error("[paystack callback] verify failed", err);
    // Fall through — the webhook may still confirm this independently, and
    // the order page will show PENDING until something does.
  }

  return NextResponse.redirect(new URL(`/orders/${orderId}`, req.url));
}
