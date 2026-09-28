import { prisma } from "@/lib/prisma";

export type ModelShotInput = { modelId: string; imageUrl: string };

/**
 * The roster as the product form needs it.
 *
 * Retired models are included rather than filtered out here. The form needs
 * them to label shots a product already carries — a model retired last month
 * still appears in the imagery shot before that, and dropping them from this
 * list would render those existing shots as "Unknown model". The form applies
 * `isActive` itself when deciding which models to *offer* for a new shot.
 */
export async function modelOptions() {
  return prisma.model.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      gender: true,
      heightCm: true,
      wearingSize: true,
      referenceImageUrl: true,
      isActive: true
    }
  });
}

/**
 * Turn validated model-shot input into rows ready for a nested create.
 *
 * `sortOrder` comes from the submitted order rather than from the client, so
 * the sequence an admin arranged in the form is the sequence a shopper sees,
 * and a caller cannot submit colliding or negative values.
 */
export function shotRows(shots: ModelShotInput[]) {
  return shots.map((shot, index) => ({
    modelId: shot.modelId,
    imageUrl: shot.imageUrl,
    sortOrder: index
  }));
}

/**
 * Check every referenced model exists before writing anything.
 *
 * Without this, an unknown id reaches Postgres and comes back as a foreign-key
 * violation, which the generic error handler reports as "Something went wrong"
 * — no indication that the problem is a stale model in a form left open while
 * someone else deleted it. Naming the ids turns that into a fixable message.
 *
 * Retired models are accepted on purpose: `isActive` controls whether a model
 * is offered for new shoots, not whether existing products may keep their
 * imagery. Rejecting them here would mean that retiring a model silently broke
 * every subsequent save of every product they appear in.
 */
export async function findUnknownModelIds(shots: ModelShotInput[]): Promise<string[]> {
  if (shots.length === 0) return [];

  const ids = [...new Set(shots.map((shot) => shot.modelId))];
  const found = await prisma.model.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const foundIds = new Set(found.map((model) => model.id));

  return ids.filter((id) => !foundIds.has(id));
}
