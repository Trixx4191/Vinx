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
        select: { id: true, size: true, color: true, quantity: true, inStock: true, sku: true }
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
      variants: { select: { id: true, size: true, color: true, quantity: true, inStock: true, sku: true } }
    }
  });

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
