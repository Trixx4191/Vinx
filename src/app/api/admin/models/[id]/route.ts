import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { modelSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;

  return withSafeErrors(async () => {
    const parsed = modelSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.model.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = parsed.data;

    const model = await prisma.model.update({
      where: { id },
      data: {
        name: data.name,
        gender: data.gender,
        heightCm: data.heightCm ?? null,
        wearingSize: data.wearingSize ?? null,
        referenceImageUrl: data.referenceImageUrl ?? null,
        displayOrder: data.displayOrder,
        isActive: data.isActive
      }
    });

    await logAdminAction(admin.session.user!.id!, "model.update", "Model", id, {
      name: model.name,
      isActive: model.isActive
    });

    return NextResponse.json({ model });
  });
}

/**
 * Deleting a model is allowed only while nothing has been shot on them.
 *
 * Once a model appears in a product's imagery, the row is what gives that
 * photograph its caption — who is wearing the garment and at what size. A
 * cascading delete would strip the images from every product they appear in,
 * and a nulling delete would leave photographs of a person the catalog can no
 * longer name. Retiring them (isActive = false) removes them from the picker
 * while leaving the existing shots intact, which is what "we are not shooting
 * with them any more" actually means.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;
  const { id } = await params;

  return withSafeErrors(async () => {
    const model = await prisma.model.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { shots: true } } }
    });
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (model._count.shots > 0) {
      return NextResponse.json(
        {
          error: `${model.name} is used in ${model._count.shots} product ${
            model._count.shots === 1 ? "shot" : "shots"
          }. Retire them instead — that hides them from the picker and keeps the existing photographs.`
        },
        { status: 409 }
      );
    }

    await prisma.model.delete({ where: { id } });
    await logAdminAction(admin.session.user!.id!, "model.delete", "Model", id, { name: model.name });

    return NextResponse.json({ ok: true });
  });
}
