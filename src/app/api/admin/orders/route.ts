import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const status = req.nextUrl.searchParams.get("status");

    const orders = await prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        user: { select: { name: true, email: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ orders });
  });
}
