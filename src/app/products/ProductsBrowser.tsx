"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Button, ProductGrid } from "@/components/luxury";
import { Product, totalStock } from "@/types/product";

type Category = { name: string; slug: string };

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "availability", label: "Most available" }
] as const;

export default function ProductsBrowser({
  products,
  categories,
  initialCategory = "all"
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<string>("newest");

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory = category === "all" || product.category.slug === category;
      const matchesQuery =
        !normalizedQuery ||
        `${product.name} ${product.description} ${product.material}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });

    // "newest" returns 0 so the array keeps the order the server sent it in,
    // which is already createdAt descending — Array.sort is stable, so this is
    // a deliberate no-op rather than a missing case.
    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "availability") return totalStock(b) - totalStock(a);
      return 0;
    });
  }, [category, products, query, sort]);

  const activeCategory = categories.find((item) => item.slug === category);
  const hasFilters = Boolean(query) || category !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return (
    <>
      <div className="border-b border-soft-300/60 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5 overflow-x-auto pb-1">
            <CategoryTab active={category === "all"} onClick={() => setCategory("all")}>
              All pieces
            </CategoryTab>
            {categories.map((item) => (
              <CategoryTab
                key={item.slug}
                active={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
              </CategoryTab>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label>
              <span className="sr-only">Search pieces</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full min-w-0 rounded-none border-0 border-b border-soft-300 bg-transparent px-1 py-2 text-xs uppercase tracking-[0.1em] text-soft-700 transition-colors duration-300 placeholder:text-soft-400 focus:border-soft-700 focus:outline-none focus:ring-0 sm:w-44"
              />
            </label>
            <label>
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="w-full cursor-pointer rounded-none border-0 border-b border-soft-300 bg-transparent px-1 py-2 text-xs uppercase tracking-[0.1em] text-soft-700 transition-colors duration-300 focus:border-soft-700 focus:outline-none focus:ring-0 sm:w-auto"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-[10px] uppercase tracking-[0.16em] text-soft-400">
          {visibleProducts.length} {visibleProducts.length === 1 ? "piece" : "pieces"}
          {activeCategory ? ` / ${activeCategory.name}` : ""}
        </p>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[10px] uppercase tracking-[0.16em] text-soft-600 underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Clear filters
          </button>
        )}
      </div>

      {visibleProducts.length === 0 ? (
        <div className="mt-10 border border-soft-300 bg-white px-8 py-24 text-center">
          <p className="type-display text-2xl text-soft-800">Nothing matched this search.</p>
          <p className="mt-3 text-sm text-soft-400">Try another word, or return to all pieces.</p>
          <Button variant="secondary" className="mt-8" onClick={clearFilters}>
            View all pieces
          </Button>
        </div>
      ) : (
        <ProductGrid columns={4} className="mt-8">
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              className="animate-scale-in"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
            >
              {/* The first row is above the fold on most viewports, so those
                  images are given fetch priority to keep LCP down. */}
              <ProductCard product={product} priority={index < 4} />
            </div>
          ))}
        </ProductGrid>
      )}
    </>
  );
}

function CategoryTab({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active}
      className={`whitespace-nowrap border-b pb-2 text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 ${
        active ? "border-soft-700 text-soft-700" : "border-transparent text-soft-400 hover:text-soft-700"
      }`}
    >
      {children}
    </button>
  );
}
