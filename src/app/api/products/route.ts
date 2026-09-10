import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
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
    }),
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } })
  ]);

  return NextResponse.json({ products, categories });
}
