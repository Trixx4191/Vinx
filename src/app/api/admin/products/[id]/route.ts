import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { createProductSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";
import { findUnknownModelIds, shotRows } from "@/lib/modelShots";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: true, modelShots: { include: { model: true }, orderBy: { sortOrder: "asc" } } }
  });
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

    const unknownModels = await findUnknownModelIds(data.modelShots);
    if (unknownModels.length > 0) {
      return NextResponse.json(
        { error: "One of the selected models no longer exists. Reload the page and pick again." },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      // Replaced wholesale rather than diffed, matching how variants are
      // handled: the form submits the complete set it wants, and clearing first
      // is what makes removing a shot possible at all. Inside the transaction,
      // so a failure part-way cannot leave a product with no model imagery.
      await tx.productModelShot.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          name: data.name, description: data.description, material: data.material, price: data.price,
          currency: data.currency, categoryId: category.id, frontImageUrl: data.frontImageUrl,
          backImageUrl: data.backImageUrl, hoverVideoUrl: data.hoverVideoUrl ?? null,
          galleryImages: data.galleryImages, isPublished: data.isPublished,
          releaseAt: data.releaseAt, earlyAccessAt: data.earlyAccessAt,
          variants: { create: data.variants.map((variant) => ({ ...variant, inStock: variant.quantity > 0 })) },
          modelShots: { create: shotRows(data.modelShots) }
        },
        include: { variants: true, modelShots: { include: { model: true } } }
      });
    });
    await logAdminAction(admin.session.user!.id!, "product.update", "Product", id, {
      name: product.name,
      isPublished: product.isPublished,
      // Drop dates are logged because moving one changes who can buy what and
      // when — the kind of change someone will later need to account for.
      releaseAt: product.releaseAt,
      earlyAccessAt: product.earlyAccessAt
    });
    return NextResponse.json({ product });
  });
}