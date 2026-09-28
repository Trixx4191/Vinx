import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseState } from "@/lib/release";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, isPublished: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true, sku: true }
      }
    }
  });

  // An unopened drop reads exactly like a missing product: the same 404, so the
  // response does not confirm that something is coming at this slug.
  if (!product || releaseState(product) === "upcoming") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
