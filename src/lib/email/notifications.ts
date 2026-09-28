import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailResult } from "@/lib/email/send";
import { orderConfirmationEmail, orderShippedEmail, type OrderEmailData, vipReceiptEmail } from "@/lib/email/templates";

/**
 * Order emails: load what a template needs, render it, send it.
 *
 * Every function here resolves rather than throwing, including when the
 * database lookup fails. These are called from payment verification and from
 * admin actions — paths where the important work has already succeeded and
 * must not be undone because a notification could not be produced.
 */

function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function loadOrderEmailData(
  orderId: string
): Promise<{ data: OrderEmailData; email: string } | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      address: true,
      items: { include: { variant: { include: { product: { select: { name: true } } } } } }
    }
  });

  if (!order?.user?.email) return null;

  return {
    email: order.user.email,
    data: {
      orderId: order.id,
      customerName: order.user.name,
      items: order.items.map((item) => ({
        name: item.variant.product.name,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        // The price the customer was actually charged, snapshotted at purchase
        // — not the product's current price, which may since have changed.
        price: item.priceAtPurchase
      })),
      totalAmount: order.totalAmount,
      currency: order.currency,
      address: {
        fullName: order.address.fullName,
        line1: order.address.line1,
        city: order.address.city,
        region: order.address.region
      },
      siteUrl: siteUrl()
    }
  };
}

export async function sendOrderConfirmation(orderId: string): Promise<EmailResult> {
  try {
    const loaded = await loadOrderEmailData(orderId);
    if (!loaded) {
      console.error(`[email] cannot build confirmation for order ${orderId}`);
      return { sent: false, reason: "failed", detail: "order or recipient not found" };
    }

    return await sendEmail({ to: loaded.email, ...orderConfirmationEmail(loaded.data) });
  } catch (error) {
    // Includes the database being unreachable. A receipt is never worth
    // failing a settled payment over.
    console.error(`[email] confirmation for ${orderId} failed:`, error);
    return { sent: false, reason: "failed" };
  }
}

export async function sendOrderShipped(orderId: string): Promise<EmailResult> {
  try {
    const loaded = await loadOrderEmailData(orderId);
    if (!loaded) return { sent: false, reason: "failed", detail: "order or recipient not found" };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { carrier: true, trackingNumber: true, trackingUrl: true }
    });

    return await sendEmail({
      to: loaded.email,
      ...orderShippedEmail({ ...loaded.data, ...order })
    });
  } catch (error) {
    console.error(`[email] shipped notice for ${orderId} failed:`, error);
    return { sent: false, reason: "failed" };
  }
}

/**
 * Receipt for a VIP payment. Like the order receipt it never throws: the
 * membership is already applied by the time this runs, and a mail host being
 * down must not turn a settled payment into an error that makes Paystack retry.
 */
export async function sendVipReceipt(purchaseId: string): Promise<EmailResult> {
  try {
    const purchase = await prisma.vipPurchase.findUnique({
      where: { id: purchaseId },
      select: {
        plan: true,
        amount: true,
        currency: true,
        periodEnd: true,
        user: { select: { email: true, name: true } }
      }
    });
    if (!purchase?.user.email || !purchase.periodEnd) {
      return { sent: false, reason: "failed", detail: "purchase or recipient not found" };
    }

    return await sendEmail({
      to: purchase.user.email,
      ...vipReceiptEmail({
        customerName: purchase.user.name,
        planLabel: purchase.plan === "YEAR" ? "1 year" : "1 month",
        amount: purchase.amount,
        currency: purchase.currency,
        vipUntil: purchase.periodEnd,
        siteUrl: siteUrl()
      })
    });
  } catch (error) {
    console.error(`[email] VIP receipt for ${purchaseId} failed:`, error);
    return { sent: false, reason: "failed" };
  }
}
