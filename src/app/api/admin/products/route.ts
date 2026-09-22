import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { createProductSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true, slug: true } },
        variants: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ products });
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const data = parsed.data;

    const category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
    if (!category) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        material: data.material,
        price: data.price,
        currency: data.currency,
        categoryId: category.id,
        frontImageUrl: data.frontImageUrl,
        backImageUrl: data.backImageUrl,
        hoverVideoUrl: data.hoverVideoUrl ?? null,
        galleryImages: data.galleryImages,
        isPublished: data.isPublished,
        variants: { create: data.variants }
      },
      include: { variants: true }
    });

    await logAdminAction(admin.session.user!.id!, "product.create", "Product", product.id, {
      name: product.name
    });

    return NextResponse.json({ product }, { status: 201 });
  });
}
