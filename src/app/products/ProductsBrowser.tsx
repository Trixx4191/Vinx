"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { ProductGrid } from "@/components/luxury";
import { Product } from "@/types/product";
import { catalogHref, type ParsedCatalogQuery } from "@/lib/productQuery";

type Category = { name: string; slug: string };

/** Per-tile availability, decided on the server. */
export type TileAccess = "open" | "early-vip" | "early-locked";

/**
 * The catalog: a row of category words, then the garments.
 *
 * Removed: the filter drawer and its toggle, the search box, the sort select,
 * the "N pieces" count and the "Clear filters" link. With a catalog this size
 * the category row is the whole of the navigation anyone needs, and every
 * control above the grid was pushing the first product further down the page.
 *
 * `search` and `sort` still work as URL parameters — `parseCatalogParams`
 * validates them and the query builder honours them — so a link to a sorted
 * or searched view is not broken; there is simply no chrome for them.
 *
 * All state lives in the URL, which is what makes a filtered view shareable,
 * refresh-safe and back-button friendly.
 */
export default function ProductsBrowser({
  products,
  access = {},
  categories,
  query,
  totalPages
}: {
  products: Product[];
  access?: Record<string, TileAccess>;
  categories: Category[];
  query: ParsedCatalogQuery;
  total: number;
  totalPages: number;
}) {
  return (
    <>
      <nav aria-label="Categories" className="flex justify-center py-6 sm:py-8">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <li>
            <FilterLink active={query.category === "all"} href={catalogHref({ ...query, category: "all", page: 1 })}>
              All
            </FilterLink>
          </li>
          {categories.map((item) => (
            <li key={item.slug}>
              <FilterLink
                active={query.category === item.slug}
                href={catalogHref({ ...query, category: item.slug, page: 1 })}
              >
                {item.name}
              </FilterLink>
            </li>
          ))}
        </ul>
      </nav>

      {products.length === 0 ? (
        <p className="type-label py-40 text-center text-[var(--muted)]">Nothing here yet.</p>
      ) : (
        <ProductGrid className="mt-2 sm:mt-6">
          {products.map((product, index) => (
            // Staggered by position within a row of six, not by overall index —
            // otherwise the thirtieth tile waits two seconds to appear.
            <Reveal key={product.id} delay={(index % 6) * 60}>
              <ProductCard product={product} priority={index < 6} access={access[product.id] ?? "open"} />
            </Reveal>
          ))}
        </ProductGrid>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-24 flex items-center justify-center gap-8">
          <PagerLink href={catalogHref({ ...query, page: query.page - 1 })} disabled={query.page <= 1}>
            Prev
          </PagerLink>
          <span className="type-label tabular-nums text-[var(--muted)]">
            {query.page} / {totalPages}
          </span>
          <PagerLink href={catalogHref({ ...query, page: query.page + 1 })} disabled={query.page >= totalPages}>
            Next
          </PagerLink>
        </nav>
      )}
    </>
  );
}

function FilterLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`type-label transition-colors duration-200 ${
        active ? "text-black" : "text-[var(--muted)] hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}

function PagerLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  // A disabled control is a span, not a styled link — a link still takes focus
  // and still navigates on Enter.
  if (disabled) return <span className="type-label text-black/20">{children}</span>;
  return (
    <Link href={href} className="type-label transition-opacity hover:opacity-40">
      {children}
    </Link>
  );
}
