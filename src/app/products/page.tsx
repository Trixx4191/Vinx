import { Product } from "@/types/product";
import ProductsBrowser from "./ProductsBrowser";

async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/products`, {
    cache: "no-store"
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products;
}

async function getCategories(): Promise<{ name: string; slug: string }[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/products`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.categories ?? [];
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const { category } = await searchParams;

  return (
    <div className="page-enter">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-soft-400">Vinx / collection 01</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-soft-700 sm:text-5xl">The essentials.</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-soft-500">Soft layers and considered essentials for the days that do not need a uniform.</p>
        </div>
        <span className="text-sm text-soft-400">{products.length} pieces</span>
      </div>

      <ProductsBrowser products={products} categories={categories} initialCategory={category ?? "all"} />
    </div>
  );
}
