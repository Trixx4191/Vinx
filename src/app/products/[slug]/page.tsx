import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, isPublished: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        select: { id: true, size: true, color: true, quantity: true, inStock: true, sku: true }
      }
    }
  });

  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
