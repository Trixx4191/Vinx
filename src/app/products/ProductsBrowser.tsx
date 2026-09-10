"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/product";

type Category = { name: string; slug: string };

export default function ProductsBrowser({ products, categories, initialCategory = "all" }: { products: Product[]; categories: Category[]; initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("newest");

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === "all" || product.category.slug === category;
      const matchesQuery = !normalizedQuery || `${product.name} ${product.description} ${product.material}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "availability") {
        const stock = (product: Product) => product.variants.reduce((total, variant) => total + variant.quantity, 0);
        return stock(b) - stock(a);
      }
      return 0;
    });
  }, [category, products, query, sort]);

  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <>
      <div className="border-y border-soft-300/60 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategory("all")} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs transition-colors ${category === "all" ? "bg-soft-700 text-white" : "bg-white/60 text-soft-500 hover:bg-white"}`}>
              All pieces
            </button>
            {categories.map((item) => (
              <button key={item.slug} onClick={() => setCategory(item.slug)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs transition-colors ${category === item.slug ? "bg-soft-700 text-white" : "bg-white/60 text-soft-500 hover:bg-white"}`}>
                {item.name}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search pieces</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces" className="input-soft min-w-0 py-2.5 sm:w-52" />
            </label>
            <label>
              <span className="sr-only">Sort products</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="input-soft py-2.5">
                <option value="newest">Newest</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="availability">Most available</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 text-xs text-soft-400">
        <p>{visibleProducts.length} {visibleProducts.length === 1 ? "piece" : "pieces"}{activeCategory ? ` / ${activeCategory.name}` : ""}</p>
        {(query || category !== "all") && <button onClick={() => { setQuery(""); setCategory("all"); }} className="text-soft-600 underline underline-offset-4">Clear filters</button>}
      </div>

      {visibleProducts.length === 0 ? (
        <div className="glass mt-8 rounded-3xl px-8 py-20 text-center">
          <p className="text-lg font-medium text-soft-700">Nothing matched this search.</p>
          <p className="mt-2 text-sm text-soft-400">Try another word or return to all pieces.</p>
          <button onClick={() => { setQuery(""); setCategory("all"); }} className="btn-secondary mt-6">View all pieces</button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-4">
          {visibleProducts.map((product, index) => (
            <div key={product.id} className="animate-scale-in" style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}