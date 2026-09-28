import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { modelSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

/**
 * The shoot registry: the handful of people the catalog is photographed on.
 *
 * Gated on requireAdmin rather than requireSuperAdmin. Maintaining this list is
 * catalog work, the same kind of thing as adding a product — it grants no
 * access to anything and touches no money, so it does not need the stricter
 * gate that staff management does.
 */

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const models = await prisma.model.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: {
        // How many products each model appears in. This is what tells an admin
        // whether a model can be deleted or only retired, before they try.
        _count: { select: { shots: true } }
      }
    });

    return NextResponse.json({ models });
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const parsed = modelSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const data = parsed.data;

    const model = await prisma.model.create({
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

    await logAdminAction(admin.session.user!.id!, "model.create", "Model", model.id, {
      name: model.name,
      gender: model.gender
    });

    return NextResponse.json({ model }, { status: 201 });
  });
}
