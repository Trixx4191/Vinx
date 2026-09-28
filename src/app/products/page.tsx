import { prisma } from "@/lib/prisma";
import { Heading, Kicker } from "@/components/luxury";
import {
  parseCatalogParams,
  catalogWhere,
  catalogOrderBy,
  pageCount,
  type CatalogParams
} from "@/lib/productQuery";
import ProductsBrowser from "./ProductsBrowser";

export const dynamic = "force-dynamic";

/**
 * Products and categories are read straight from the database here rather than
 * fetched from `/api/products`. This page is a server component running in the
 * same process as that route, so calling it over HTTP added a round trip and a
 * second copy of the same query. The API route stays as-is for real clients.
 *
 * Filtering, sorting and paging all happen in the query. The previous version
 * loaded every published product and filtered in the browser, which meant a
 * visitor downloaded the whole catalog to look at one category.
 */
export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<CatalogParams>;
}) {
  const params = await searchParams;
  const query = parseCatalogParams(params);

  const where = catalogWhere(query);

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        variants: { select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true } }
      },
      orderBy: catalogOrderBy(query.sort),
      skip: query.skip,
      take: query.take
    }),
    // Counted with the same filter so the pager reflects the current view
    // rather than the size of the catalog.
    prisma.product.count({ where }),
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } })
  ]);

  const totalPages = pageCount(total);
  const activeCategory = categories.find((item) => item.slug === query.category);

  return (
    // No `page-enter` here: the root layout already wraps every page's children
    // in it, so this was running the same entry animation twice, nested — the
    // inner one starting from the outer one's moving frame.
    <div>
      <header className="flex flex-col justify-between gap-5 border-b border-soft-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <Kicker>Collection 01</Kicker>
          {/* h1 at display-2. This was an `h2`, which left the catalog — the
              most-linked page on the site after the homepage — with no
              top-level heading at all. */}
          <Heading level={1} size={2} className="mt-3">
            {activeCategory ? activeCategory.name : "The essentials."}
          </Heading>
          <p className="type-body mt-4 max-w-copy">
            Soft layers and considered essentials for the days that do not need a uniform.
          </p>
        </div>
        <span className="type-micro shrink-0 text-soft-400">
          {total} {total === 1 ? "piece" : "pieces"}
        </span>
      </header>

      <ProductsBrowser
        products={products}
        categories={categories}
        query={query}
        total={total}
        totalPages={totalPages}
      />
    </div>
  );
}
