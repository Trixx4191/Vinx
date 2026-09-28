import { prisma } from "@/lib/prisma";
import { expirePendingOrders } from "@/lib/orders";
import { sendOrderConfirmation } from "@/lib/email/notifications";

/**
 * The only function in the codebase allowed to mark an order PAID.
 * Called only after a provider (Paystack/Stripe) has been asked
 * server-to-server "did this really succeed, and for how much" — never in
 * response to a client claiming success, and never from an unverified
 * webhook payload.
 *
 * Idempotent on purpose: webhooks can and do arrive more than once, and a
 * user can also land back on our callback URL after a webhook already did
 * this. Re-running this for an already-PAID order is a safe no-op.
 */
export async function markOrderPaid(orderId: string, paymentRef: string, verifiedAmount: number, verifiedCurrency: string) {
  await expirePendingOrders();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { ok: false as const, reason: "Order not found" };
  }

  if (order.status === "PAID") {
    return { ok: true as const, alreadyPaid: true };
  }

  if (order.status !== "PENDING" || (order.paymentExpiresAt && order.paymentExpiresAt <= new Date())) {
    return { ok: false as const, reason: "Order is no longer payable" };
  }

  if (order.paymentRef && order.paymentRef !== paymentRef) {
    return { ok: false as const, reason: "Payment reference does not belong to this order" };
  }

  // The amount/currency the provider confirms must match what we charged
  // for. If a webhook or callback ever disagreed with our own database
  // total, that's a sign of tampering or a provider-side bug — refuse to
  // mark paid rather than trust the incoming number.
  if (verifiedAmount !== order.totalAmount || verifiedCurrency !== order.currency) {
    return { ok: false as const, reason: "Amount/currency mismatch — refusing to mark paid" };
  }

  // The claim is a conditional update, not the read above. Paystack's webhook
  // and the customer's browser redirect routinely arrive within milliseconds
  // of each other; with a read-then-write both saw PENDING, both marked the
  // order PAID and both sent a receipt. Only the caller whose update actually
  // moves the row out of PENDING carries on — the other stops here.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paymentRef }
  });
  if (claimed.count === 0) {
    return { ok: true as const, alreadyPaid: true };
  }
  await prisma.orderStatusEvent.create({
    data: { orderId, status: "PAID", note: `Payment verified via ${paymentRef}` }
  });

  // The receipt goes out after the order is durably marked paid, and its
  // outcome is deliberately ignored.
  //
  // This ordering matters. The money has already moved and the database
  // already reflects it; if the mail host is unreachable the correct
  // behaviour is a paid order with no receipt, not an error response that
  // makes a provider retry its webhook against a settled order.
  // sendOrderConfirmation never throws, but it is awaited so the process is
  // not torn down mid-send in a serverless environment.
  await sendOrderConfirmation(orderId);

  return { ok: true as const, alreadyPaid: false };
}
