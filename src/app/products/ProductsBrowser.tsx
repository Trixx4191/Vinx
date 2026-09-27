"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { Button, ProductGrid } from "@/components/luxury";
import { Product } from "@/types/product";
import {
  SORT_OPTIONS,
  catalogHref,
  type ParsedCatalogQuery,
  type SortValue
} from "@/lib/productQuery";

type Category = { name: string; slug: string };

/**
 * Catalog controls.
 *
 * All state lives in the URL rather than in this component. That is what makes
 * a filtered view shareable, survive a refresh, and work with the back button —
 * and it is required now that the filtering happens in the database, since the
 * server needs to be told what to query.
 */
export default function ProductsBrowser({
  products,
  categories,
  query,
  total,
  totalPages
}: {
  products: Product[];
  categories: Category[];
  query: ParsedCatalogQuery;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filtersOpen, setFiltersOpen] = useState(query.category !== "all" || Boolean(query.search));
  const [searchDraft, setSearchDraft] = useState(query.search);

  const hasFilters = query.category !== "all" || Boolean(query.search);

  function navigate(next: Partial<ParsedCatalogQuery>) {
    // Any change other than paging returns to page one: staying on page 4
    // while narrowing to a category with two pages lands on an empty grid that
    // looks like the filter matched nothing.
    const href = catalogHref({ ...query, page: 1, ...next });
    startTransition(() => router.push(href, { scroll: false }));
  }

  // Debounce the search box so a query is not issued per keystroke. Skipped
  // when the draft already matches the URL, which is the case on first render
  // and after a navigation — without that guard this would fire a redundant
  // push every time the component remounts with new results.
  useEffect(() => {
    if (searchDraft === query.search) return;

    const timer = setTimeout(() => {
      navigate({ search: searchDraft });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-soft-200 py-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="product-filters"
          className="flex items-center gap-2 text-sm text-soft-700 transition-opacity hover:opacity-60"
        >
          <span aria-hidden className="text-base leading-none">
            {filtersOpen ? "−" : "+"}
          </span>
          Filter
          {hasFilters && <span className="text-soft-400">·&nbsp;on</span>}
        </button>

        <label className="flex items-center gap-2">
          <span className="sr-only">Sort products</span>
          <span aria-hidden className="text-soft-400">
            ↕
          </span>
          <select
            value={query.sort}
            onChange={(event) => navigate({ sort: event.target.value as SortValue })}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm text-soft-700 focus:outline-none focus:ring-0"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtersOpen && (
        <div id="product-filters" className="border-b border-soft-200 py-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <CategoryTab active={query.category === "all"} href={catalogHref({ ...query, category: "all", page: 1 })}>
              All pieces
            </CategoryTab>
            {categories.map((item) => (
              <CategoryTab
                key={item.slug}
                active={query.category === item.slug}
                href={catalogHref({ ...query, category: item.slug, page: 1 })}
              >
                {item.name}
              </CategoryTab>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="sr-only">Search pieces</span>
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search"
              maxLength={100}
              className="w-full min-w-0 rounded-none border-0 border-b border-soft-300 bg-transparent px-1 py-2 text-sm text-soft-700 transition-colors duration-300 placeholder:text-soft-400 focus:border-soft-700 focus:outline-none focus:ring-0 sm:w-64"
            />
          </label>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-xs text-soft-400">
          {isPending ? "Loading…" : `${total} ${total === 1 ? "piece" : "pieces"}`}
        </p>
        {hasFilters && (
          <Link
            href="/products"
            onClick={() => setSearchDraft("")}
            className="text-xs text-soft-600 underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Clear filters
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="mt-10 border border-soft-300 bg-white px-8 py-24 text-center">
          <p className="type-display text-2xl text-soft-800">Nothing matched this search.</p>
          <p className="mt-3 text-sm text-soft-400">Try another word, or return to all pieces.</p>
          <Button variant="secondary" className="mt-8" onClick={() => router.push("/products")}>
            View all pieces
          </Button>
        </div>
      ) : (
        <ProductGrid columns={4} className={`mt-8 transition-opacity ${isPending ? "opacity-50" : ""}`}>
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </ProductGrid>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-6">
          <PagerLink
            href={catalogHref({ ...query, page: query.page - 1 })}
            disabled={query.page <= 1}
          >
            Previous
          </PagerLink>

          <span className="text-xs tabular-nums text-soft-500">
            Page {query.page} of {totalPages}
          </span>

          <PagerLink
            href={catalogHref({ ...query, page: query.page + 1 })}
            disabled={query.page >= totalPages}
          >
            Next
          </PagerLink>
        </nav>
      )}
    </>
  );
}

function CategoryTab({
  active,
  href,
  children
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap border-b pb-1 text-sm transition-colors duration-200 ${
        active ? "border-soft-700 text-soft-800" : "border-transparent text-soft-500 hover:text-soft-800"
      }`}
    >
      {children}
    </Link>
  );
}

function PagerLink({
  href,
  disabled,
  children
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  // A disabled pager control is a span, not a link. Rendering an <a> and
  // styling it as unavailable still lets the keyboard reach it and still
  // navigates on Enter.
  if (disabled) {
    return <span className="type-micro text-soft-300">{children}</span>;
  }

  return (
    <Link href={href} scroll={false} className="type-micro text-soft-700 transition-opacity hover:opacity-60">
      {children}
    </Link>
  );
}
