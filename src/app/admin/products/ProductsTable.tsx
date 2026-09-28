"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice, Product } from "@/types/product";
import { StatusPill } from "@/components/luxury";
import { isLowStock } from "@/lib/inventory";

type Row = Product & { isPublished?: boolean };

/** Total sellable units across a product's variants. */
function stockOf(product: Row): number {
  return product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
}

export default function ProductsTable({ products }: { products: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      `${product.name} ${product.category.name}`.toLowerCase().includes(needle)
    );
  }, [products, query]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className="input-soft max-w-sm py-2.5"
        />
        <p className="text-xs text-soft-400" aria-live="polite">
          {filtered.length} of {products.length} products
        </p>
      </div>

      {/* Mobile: one panel per product. A seven-column table on a phone is a
          horizontal scroll nobody wins. */}
      <div className="space-y-3 md:hidden">
        {filtered.map((product) => {
          const stock = stockOf(product);
          return (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="admin-panel-link p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-soft-800">{product.name}</p>
                  <p className="mt-1 text-xs text-soft-400">
                    {product.category.name} · {product.variants.length}{" "}
                    {product.variants.length === 1 ? "variant" : "variants"}
                  </p>
                </div>
                <Status published={product.isPublished !== false} />
              </div>

              <div className="mt-4 flex justify-between text-sm">
                <span className={isLowStock(stock) ? "text-gold" : "text-soft-500"}>
                  {stock} in stock{isLowStock(stock) && " · low"}
                </span>
                <span className="font-medium tabular-nums text-soft-700">
                  {formatPrice(product.price, product.currency)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto border border-soft-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="admin-kicker border-b border-soft-200">
            <tr>
              <th scope="col" className="px-5 py-4">
                Product
              </th>
              <th scope="col">Category</th>
              <th scope="col">Price</th>
              <th scope="col">Variants</th>
              <th scope="col">Stock</th>
              <th scope="col">Status</th>
              {/* Not an empty <th>: a header cell with no content and no
                  accessible name is read out as a blank column by a screen
                  reader working through the row. */}
              <th scope="col" className="pr-5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-soft-200">
            {filtered.map((product) => {
              const stock = stockOf(product);
              const low = isLowStock(stock);

              return (
                <tr key={product.id} className="transition-colors hover:bg-soft-50">
                  <th scope="row" className="px-5 py-4 text-left font-medium text-soft-800">
                    {product.name}
                  </th>
                  <td className="text-soft-500">{product.category.name}</td>
                  <td className="tabular-nums text-soft-600">
                    {formatPrice(product.price, product.currency)}
                  </td>
                  <td className="tabular-nums text-soft-500">{product.variants.length}</td>
                  <td className={low ? "font-medium text-gold" : "tabular-nums text-soft-500"}>
                    {stock}
                    {low && <span className="ml-1 text-xs">low</span>}
                  </td>
                  <td>
                    <Status published={product.isPublished !== false} />
                  </td>
                  <td className="whitespace-nowrap pr-5 text-right">
                    <Link
                      href={`/products/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-4 text-xs text-soft-400 transition-colors hover:text-soft-800"
                    >
                      Preview
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-xs text-soft-700 underline underline-offset-4"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="admin-panel p-10 text-center text-sm text-soft-500">
          {products.length === 0
            ? "No products yet."
            : `No products match “${query.trim()}”.`}
        </div>
      )}
    </>
  );
}

function Status({ published }: { published: boolean }) {
  return (
    <StatusPill
      status={published ? "PUBLISHED" : "DRAFT"}
      label={published ? "Published" : "Draft"}
    />
  );
}
