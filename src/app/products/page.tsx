import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/product";

async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/products`, {
    cache: "no-store"
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products;
}

export default async function ProductsPage() {
  const products = await getProducts();

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

      {products.length === 0 ? (
        <div className="glass rounded-3xl px-8 py-16 text-center">
          <p className="text-soft-500">No products yet.</p>
          <p className="mt-1 text-sm text-soft-400">Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-4">
          {products.map((p, i) => (
            <div
              key={p.id}
              className="animate-scale-in"
              style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
