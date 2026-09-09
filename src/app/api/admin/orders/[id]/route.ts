import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { adminOrderUpdateSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        items: { include: { variant: { include: { product: true } } } },
        statusHistory: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ order });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const parsed = adminOrderUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { status, carrier, trackingNumber, trackingUrl, estimatedDelivery, note } = parsed.data;

    // Admins can move an order's status and attach tracking info, but this
    // never touches price, items, or payment fields — those stay locked to
    // what checkout and payment verification set, even for admins, since
    // an admin account being compromised shouldn't be a path to altering a
    // charge that already happened.
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(carrier !== undefined ? { carrier: carrier || null } : {}),
        ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
        ...(trackingUrl !== undefined ? { trackingUrl: trackingUrl || null } : {}),
        ...(estimatedDelivery !== undefined
          ? { estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null }
          : {}),
        ...(status
          ? { statusHistory: { create: { status, note: note || `Updated by admin` } } }
          : {})
      },
      include: { statusHistory: true }
    });

    await logAdminAction(admin.session.user!.id!, "order.update", "Order", order.id, {
      status,
      carrier,
      trackingNumber
    });

    return NextResponse.json({ order });
  });
}
