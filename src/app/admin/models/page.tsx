import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import ModelManager from "./ModelManager";

export default async function AdminModelsPage() {
  // Independent re-check. The layout and middleware both gate this too; each
  // page re-checking is what makes any one of those failing survivable.
  const session = await getServerSession(authOptions);
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) redirect("/");

  const models = await prisma.model.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { shots: true } } }
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="type-d3 text-soft-800">Models</h1>
        <p className="mt-2 max-w-xl text-sm text-soft-500">
          The people your catalog is shot on. Add a model here, then on each product upload the photograph of
          that model wearing the piece — the images are made outside Vinx and uploaded like any other product
          image.
        </p>
      </div>

      <ModelManager
        models={models.map((model) => ({
          id: model.id,
          name: model.name,
          gender: model.gender,
          heightCm: model.heightCm,
          wearingSize: model.wearingSize,
          referenceImageUrl: model.referenceImageUrl,
          displayOrder: model.displayOrder,
          isActive: model.isActive,
          shotCount: model._count.shots
        }))}
      />
    </div>
  );
}
