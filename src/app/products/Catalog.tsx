import { prisma } from "@/lib/prisma";
import {
  parseCatalogParams,
  catalogWhere,
  catalogOrderBy,
  pageCount,
  type CatalogParams
} from "@/lib/productQuery";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { releaseState } from "@/lib/release";
import ProductsBrowser, { type TileAccess } from "./ProductsBrowser";

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
export default async function Catalog({
  params,
  headingLevel = "h1"
}: {
  params: CatalogParams;
  /**
   * The catalog's visually hidden heading. `h1` on /products, where the grid
   * is the page; `h2` on the homepage, where the hero is the page's subject
   * and the grid is a section beneath it — one h1 per page either way.
   */
  headingLevel?: "h1" | "h2";
}) {
  const query = parseCatalogParams(params);
  const Heading = headingLevel;

  const where = catalogWhere(query);

  // The homepage renders this page, so a database that is asleep or
  // unreachable — a serverless Postgres auto-suspending is the usual cause —
  // must not take the whole front door down with a 500. It renders the empty
  // catalog instead, and the next request after the database wakes is normal.
  let products: Awaited<ReturnType<typeof loadProducts>> = [];
  let total = 0;
  let categories: { name: string; slug: string }[] = [];
  let unavailable = false;

  try {
    [products, total, categories] = await Promise.all([
      loadProducts(query, where),
      // Counted with the same filter so the pager reflects the current view.
      prisma.product.count({ where }),
      prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } })
    ]);
  } catch (error) {
    console.error("[catalog] could not load products", error);
    unavailable = true;
  }

  // What each tile's hover says. Decided here, on the server, from the same
  // release rules checkout enforces — the grid never offers a price to someone
  // the checkout would turn away.
  const session = await getServerSession(authOptions);
  const isVip = Boolean(session?.user?.vip);
  const access: Record<string, TileAccess> = {};
  for (const product of products) {
    const state = releaseState(product);
    access[product.id] = state === "early" ? (isVip ? "early-vip" : "early-locked") : "open";
  }

  const totalPages = pageCount(total);
  const activeCategory = categories.find((item) => item.slug === query.category);

  return (
    <div>
      {/* No visible title — the category row says where you are — but the page
          still needs its one h1 for the document outline and for search. */}
      <Heading className="sr-only">{activeCategory ? activeCategory.name : "All pieces"}</Heading>

      {unavailable ? (
        <p className="type-label py-40 text-center text-[var(--muted)]">
          The shop is waking up. Refresh in a moment.
        </p>
      ) : (
        <ProductsBrowser
          products={products}
          access={access}
          categories={categories}
          query={query}
          total={total}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}

function loadProducts(
  query: ReturnType<typeof parseCatalogParams>,
  where: ReturnType<typeof catalogWhere>
) {
  return prisma.product.findMany({
    where,
    include: {
      category: { select: { name: true, slug: true } },
      variants: { select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true } }
    },
    orderBy: catalogOrderBy(query.sort),
    skip: query.skip,
    take: query.take
  });
}
