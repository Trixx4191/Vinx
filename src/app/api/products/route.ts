import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visibleReleaseWhere } from "@/lib/release";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
    where: {
      isPublished: true,
      // A public endpoint: drops that have not opened must not be readable
      // here any more than in the catalog, or the API becomes a way to see
      // unreleased pieces before anyone — VIP included — is meant to.
      AND: [visibleReleaseWhere()],
      ...(category ? { category: { slug: category } } : {})
    },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true }
      }
    },
    orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } })
  ]);

  return NextResponse.json({ products, categories });
}
