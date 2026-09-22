import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { createProductSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true, variants: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;

  return withSafeErrors(async () => {
    const parsed = createProductSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    const data = parsed.data;
    const category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
    if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });

    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          name: data.name, description: data.description, material: data.material, price: data.price,
          currency: data.currency, categoryId: category.id, frontImageUrl: data.frontImageUrl,
          backImageUrl: data.backImageUrl, hoverVideoUrl: data.hoverVideoUrl ?? null,
          galleryImages: data.galleryImages, isPublished: data.isPublished,
          variants: { create: data.variants.map((variant) => ({ ...variant, inStock: variant.quantity > 0 })) }
        },
        include: { variants: true }
      });
    });
    await logAdminAction(admin.session.user!.id!, "product.update", "Product", id, { name: product.name, isPublished: product.isPublished });
    return NextResponse.json({ product });
  });
}