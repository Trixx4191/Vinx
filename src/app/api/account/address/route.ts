import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAddressSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

/**
 * The customer's saved address.
 *
 * Note what this does NOT do: it never edits an address already attached to an
 * order. `Order.addressId` points at a specific row, and orders are a record of
 * where something was actually sent. Rewriting that row would silently change
 * the shipping address on past orders — including ones already delivered.
 *
 * So editing creates a new default and demotes the old one, leaving historical
 * rows exactly as they were. The cost is some accumulated rows; the benefit is
 * that an order's address always says where the parcel went.
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return withSafeErrors(async () => {
    const parsed = updateAddressSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const data = parsed.data;

    const address = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({
        where: { userId, isDefault: true },
        select: { id: true, orders: { select: { id: true }, take: 1 } }
      });

      // An address never used by an order is safe to edit in place — nothing
      // references it as a historical fact.
      if (existing && existing.orders.length === 0) {
        return tx.address.update({
          where: { id: existing.id },
          data: { ...data, line2: data.line2 || null, isDefault: true }
        });
      }

      // Otherwise leave it untouched and add a new default beside it.
      if (existing) {
        await tx.address.update({ where: { id: existing.id }, data: { isDefault: false } });
      }

      return tx.address.create({
        data: { ...data, line2: data.line2 || null, userId, isDefault: true }
      });
    });

    return NextResponse.json({ address });
  });
}
