import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Layer 1: must be logged in at all. Middleware already enforces this for
  // the /checkout page, but this API route is re-checked independently —
  // it must never assume the request came through the page.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { ok } = rateLimit(`checkout:${userId}`, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { items, address, paymentProvider } = parsed.data;

    // Whatever price the client's cart *displayed* is irrelevant from here on.
    // Everything charge-related below is derived fresh from the database.
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const addressRecord = await tx.address.create({
          data: { ...address, userId }
        });

        let totalAmount = 0;
        let currency = "GHS";
        const orderItemsData: { variantId: string; quantity: number; priceAtPurchase: number }[] = [];

        for (const item of items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true }
          });

          if (!variant || !variant.product.isPublished) {
            throw new Error("STOCK_ERROR: item is no longer available");
          }

          // Atomic check-and-decrement: only succeeds if enough stock exists
          // right now, inside this same transaction. This is what actually
          // prevents overselling under concurrent checkouts, not a prior
          // read of quantity that could be stale by the time we write.
          const decremented = await tx.productVariant.updateMany({
            where: { id: variant.id, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } }
          });

          if (decremented.count === 0) {
            throw new Error(`STOCK_ERROR: not enough stock for ${variant.sku}`);
          }

          const remaining = variant.quantity - item.quantity;
          if (remaining <= 0) {
            await tx.productVariant.update({ where: { id: variant.id }, data: { inStock: false } });
          }

          // Authoritative price, read from the product record in the same
          // transaction — never taken from anything the client sent.
          const linePrice = variant.product.price;
          totalAmount += linePrice * item.quantity;
          currency = variant.product.currency;

          orderItemsData.push({ variantId: variant.id, quantity: item.quantity, priceAtPurchase: linePrice });
        }

        return tx.order.create({
          data: {
            userId,
            addressId: addressRecord.id,
            status: "PENDING",
            paymentProvider,
            totalAmount,
            currency,
            items: { create: orderItemsData },
            statusHistory: { create: { status: "PENDING", note: "Order created, awaiting payment" } }
          },
          include: { items: true }
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("STOCK_ERROR")) {
        return NextResponse.json({ error: err.message.replace("STOCK_ERROR: ", "") }, { status: 409 });
      }
      throw err; // genuinely unexpected — let withSafeErrors log it and return a generic 500
    }

    // Phase 3 picks up here: create a payment session with Stripe/Paystack/
    // PayPal for `order.totalAmount` (server value) and return the
    // redirect/session info to the client. Not wired yet.
    return NextResponse.json({ order }, { status: 201 });
  });
}
