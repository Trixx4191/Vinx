export type ProductVariant = {
  id: string;
  size: string;
  color: string;
  quantity: number;
  inStock: boolean;
  sku?: string;
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
  category: { name: string; slug: string };
  variants: ProductVariant[];
};

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
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; poster: string; alt: string };

/**
 * The ordered media for a product: front, back, any gallery shots, then the
 * hover video last. Built in one place so the card and the detail gallery can
 * never drift apart on what counts as this product's media.
 */
export function productMedia(product: Product): MediaSlot[] {
  const slots: MediaSlot[] = [
    { kind: "image", src: product.frontImageUrl, alt: `${product.name} — front` },
    { kind: "image", src: product.backImageUrl, alt: `${product.name} — back` }
  ];

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
