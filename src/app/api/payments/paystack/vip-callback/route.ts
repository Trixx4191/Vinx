import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/payments/paystack";
import { markVipPaid } from "@/lib/payments/markVipPaid";

/**
 * Where Paystack sends the customer's browser after a VIP payment.
 *
 * The query string is a hint of WHICH payment to check, never proof it
 * happened: the payment is re-verified with Paystack server-to-server, and only
 * that answer can apply VIP time. The signed webhook does the same
 * independently, so VIP is applied even if the browser never comes back.
 */
export async function GET(req: NextRequest) {
  const purchaseId = req.nextUrl.searchParams.get("purchaseId");
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");

  if (!purchaseId || !reference) {
    return NextResponse.redirect(new URL("/account#vip", req.url));
  }

  let outcome = "pending";
  try {
    const verified = await verifyTransaction(reference);
    if (verified.status === "success") {
      const result = await markVipPaid(purchaseId, verified.reference, verified.amount, verified.currency);
      outcome = result.ok ? "welcome" : "problem";
    } else {
      outcome = "failed";
    }
  } catch (error) {
    // Fall through to "pending": the webhook may still confirm it, and the
    // account page will show VIP as soon as something does.
    console.error("[paystack vip callback] verify failed", error);
  }

  return NextResponse.redirect(new URL(`/account?vip=${outcome}#vip`, req.url));
}
