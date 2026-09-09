import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...(category ? { category: { slug: category } } : {})
    },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        select: { id: true, size: true, color: true, quantity: true, inStock: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ products });
}
