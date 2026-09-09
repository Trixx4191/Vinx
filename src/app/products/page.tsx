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
    <div>
      <h1 className="mb-6 text-xl font-semibold">Shop</h1>
      {products.length === 0 ? (
        <p className="text-gray-600">No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
