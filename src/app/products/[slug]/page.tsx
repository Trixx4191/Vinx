import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, isPublished: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true, sku: true }
      },
      // On-model photography, if this product has any. Only the detail page
      // loads these — a grid tile shows the flat product shot, so selecting
      // model imagery for every card would be work nothing renders.
      modelShots: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          imageUrl: true,
          sortOrder: true,
          model: { select: { name: true, heightCm: true, wearingSize: true } }
        }
      }
    }
  });

  if (!product) notFound();

  const relatedProducts = await prisma.product.findMany({
    where: { isPublished: true, categoryId: product.categoryId, id: { not: product.id } },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true, sku: true } }
    }
  });

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
