import { prisma } from "@/lib/prisma";

const PENDING_ORDER_TTL_MS = 30 * 60 * 1000;

/**
 * Releases inventory reserved by unpaid orders. The conditional update claims
 * each order first, so concurrent requests cannot restore the same stock twice.
 */
export async function expirePendingOrders(now = new Date()) {
  const expired = await prisma.order.findMany({
    where: { status: "PENDING", paymentExpiresAt: { lte: now } },
    select: { id: true, items: { select: { variantId: true, quantity: true } } }
  });

  for (const order of expired) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING", paymentExpiresAt: { lte: now } },
        data: { status: "CANCELLED" }
      });
      if (claimed.count !== 1) return;

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { increment: item.quantity }, inStock: true }
        });
      }

      await tx.orderStatusEvent.create({
        data: { orderId: order.id, status: "CANCELLED", note: "Payment window expired; inventory released" }
      });
    });
  }
}

export { PENDING_ORDER_TTL_MS };
