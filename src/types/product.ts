export type ProductVariant = {
  id: string;
  size: string;
  color: string;
  /** Exact swatch colour as #rrggbb. Absent falls back to matching `color`. */
  colorHex?: string | null;
  quantity: number;
  inStock: boolean;
  sku?: string;
};

/** The measurements shown beside a model shot so a shopper can judge fit. */
export type ModelSummary = {
  name: string;
  heightCm?: number | null;
  wearingSize?: string | null;
};

/**
 * One uploaded photograph of a model wearing this product.
 *
 * The image is produced outside this application and uploaded through the
 * admin product form, exactly like the front and back shots. Nothing in the
 * codebase generates it.
 */
export type ModelShot = {
  id?: string;
  imageUrl: string;
  sortOrder?: number;
  model: ModelSummary;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  material: string;
  price: number; // minor units
  currency: string;
  frontImageUrl: string;
  backImageUrl: string;
  /** Optional short muted loop shown on card hover and in the detail gallery. */
  hoverVideoUrl?: string | null;
  /** Extra detail shots beyond front/back. Empty array when none are set. */
  galleryImages?: string[];
  /**
   * On-model photographs, if the admin added any. Optional rather than
   * required because the catalog grid query does not select them: a card shows
   * the flat product shot, so loading model imagery for every tile on the page
   * would be work nothing displays.
   */
  modelShots?: ModelShot[];
  category: { name: string; slug: string };
  variants: ProductVariant[];
  /** Present on records read from the database; drives the "New" badge. */
  createdAt?: Date | string;
};

/**
 * The line shown under a model shot: who is wearing it, how tall they are, and
 * what size they have on.
 *
 * This is the whole reason the model is a record rather than just another
 * image URL. "Kofi is 185cm and wearing L" tells a shopper more about fit than
 * a size chart does, and it is the one piece of information a photograph
 * cannot carry by itself.
 *
 * Every part except the name is optional, and an absent part is omitted rather
 * than rendered as an empty segment or a zero.
 */
export function modelShotCaption(model: ModelSummary): string {
  const parts = [`On ${model.name}`];

  // A stored 0 would be a data error rather than a real height, and printing
  // "0cm" beside a photograph looks like a bug to a shopper — which it is.
  if (typeof model.heightCm === "number" && model.heightCm > 0) {
    parts.push(`${model.heightCm}cm`);
  }

  const size = model.wearingSize?.trim();
  if (size) parts.push(`wearing ${size}`);

  return parts.join(" · ");
}

/** How long a piece carries a "New" badge on the grid. */
const NEW_FOR_DAYS = 30;

/**
 * Whether a product should be badged as new.
 *
 * Derived from `createdAt` rather than stored as a flag, so nothing has to
 * remember to switch it off — a badge that has to be manually cleared is a
 * badge that ends up on eighteen-month-old stock.
 */
export function isNewArrival(product: Product, now: Date = new Date()): boolean {
  if (!product.createdAt) return false;
  const created = new Date(product.createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const ageInDays = (now.getTime() - created.getTime()) / 86_400_000;

  // No lower bound on purpose. A row dated slightly ahead of the web server —
  // ordinary clock skew between two machines — produces a negative age, and
  // rejecting that would drop the badge from the newest product in the
  // catalog. Erring the other way shows a badge a few seconds early, which
  // nobody notices.
  return ageInDays <= NEW_FOR_DAYS;
}

export function formatPrice(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minorUnits / 100);
}

/** True when at least one variant can actually be bought right now. */
export function isProductInStock(product: Product): boolean {
  return product.variants.some((variant) => variant.inStock && variant.quantity > 0);
}

/** Total sellable units across every variant. */
export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
}

export type MediaSlot =
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "video"; src: string; poster: string; alt: string; caption?: string };

/**
 * The ordered media for a product: any on-model shots first, then front, back,
 * the gallery shots, and the hover video last. Built in one place so the card
 * and the detail gallery can never drift apart on what counts as this
 * product's media.
 *
 * Model shots lead because a garment on a body is what a shopper looks at
 * first — the flat front shot answers "what is it", the model shot answers
 * "what does it look like worn", and that is the question that sells. A product
 * with no model shot is unaffected: the front image simply stays first, which
 * is why this ordering needed no backfill.
 */
export function productMedia(product: Product): MediaSlot[] {
  const slots: MediaSlot[] = [];

  // Sorted by the admin's chosen order, with a stable fallback so two shots
  // left at the default 0 don't swap places between renders.
  const modelShots = [...(product.modelShots ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  for (const shot of modelShots) {
    slots.push({
      kind: "image",
      src: shot.imageUrl,
      alt: `${product.name} — worn by ${shot.model.name}`,
      caption: modelShotCaption(shot.model)
    });
  }

  slots.push(
    { kind: "image", src: product.frontImageUrl, alt: `${product.name} — front` },
    { kind: "image", src: product.backImageUrl, alt: `${product.name} — back` }
  );

  for (const [index, src] of (product.galleryImages ?? []).entries()) {
    slots.push({ kind: "image", src, alt: `${product.name} — detail ${index + 1}` });
  }

  if (product.hoverVideoUrl) {
    slots.push({
      kind: "video",
      src: product.hoverVideoUrl,
      poster: product.frontImageUrl,
      alt: `${product.name} — in motion`
    });
  }

  return slots;
}
