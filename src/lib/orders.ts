import { prisma } from "@/lib/prisma";

const PENDING_ORDER_TTL_MS = 30 * 60 * 1000;

/**
 * Releases inventory reserved by unpaid orders. The conditional update claims
 * each order first, so concurrent requests cannot restore the same stock twice.
 *
 * Returns how many orders this call actually released, which is not
 * necessarily how many it found: two callers racing — the scheduled job and an
 * opportunistic call from a checkout request — will each see the same expired
 * orders, and only one of them wins the claim on each. Counting claims rather
 * than candidates is what makes the number in the cron log trustworthy.
 */
export async function expirePendingOrders(now = new Date()): Promise<number> {
  const expired = await prisma.order.findMany({
    where: { status: "PENDING", paymentExpiresAt: { lte: now } },
    select: { id: true, items: { select: { variantId: true, quantity: true } } }
  });

  let released = 0;

  for (const order of expired) {
    const didRelease = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING", paymentExpiresAt: { lte: now } },
        data: { status: "CANCELLED" }
      });
      if (claimed.count !== 1) return false;

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { increment: item.quantity }, inStock: true }
        });
      }

      await tx.orderStatusEvent.create({
        data: { orderId: order.id, status: "CANCELLED", note: "Payment window expired; inventory released" }
      });

      return true;
    });

    if (didRelease) released += 1;
  }

  return released;
}

export { PENDING_ORDER_TTL_MS };
