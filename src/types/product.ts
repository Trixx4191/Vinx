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
  category: { name: string; slug: string };
  variants: ProductVariant[];
};

export function formatPrice(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minorUnits / 100);
}
