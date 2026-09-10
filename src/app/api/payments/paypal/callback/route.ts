import { NextRequest, NextResponse } from "next/server";
import { captureOrder } from "@/lib/payments/paypal";
import { markOrderPaid } from "@/lib/payments/markOrderPaid";

// PayPal redirects here with ?token=<paypalOrderId> after the customer
// approves on PayPal's site. The token itself proves nothing — we still
// have to call PayPal's capture endpoint server-to-server to actually
// confirm and finalize the payment before trusting it.
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  const paypalOrderId = req.nextUrl.searchParams.get("token");

  if (!orderId || !paypalOrderId) {
    return NextResponse.redirect(new URL("/cart", req.url));
  }

  try {
    const captured = await captureOrder(paypalOrderId);
    if (captured.status === "COMPLETED" && captured.referenceId === orderId) {
      await markOrderPaid(orderId, paypalOrderId, captured.amountMinorUnits, captured.currency);
    }
  } catch (err) {
    console.error("[paypal callback] capture failed", err);
  }

  return NextResponse.redirect(new URL(`/orders/${orderId}`, req.url));
}
