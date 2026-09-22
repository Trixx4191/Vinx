import { prisma } from "@/lib/prisma";
import { Heading, Kicker } from "@/components/luxury";
import ProductsBrowser from "./ProductsBrowser";

export const dynamic = "force-dynamic";

/**
 * Products and categories are read straight from the database here rather than
 * fetched from `/api/products`. This page is a server component running in the
 * same process as that route, so calling it over HTTP added a round trip and a
 * second copy of the same query — the previous version actually hit that
 * endpoint twice, once for products and once for the categories it also
 * returns. The API route stays as-is for real clients.
 */
async function getCatalog() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      include: {
        category: { select: { name: true, slug: true } },
        variants: { select: { id: true, size: true, color: true, quantity: true, inStock: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } })
  ]);

  return { products, categories };
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ products, categories }, { category }] = await Promise.all([getCatalog(), searchParams]);

  return (
    <div className="page-enter">
      <header className="mb-10 flex flex-col justify-between gap-5 border-b border-soft-300/60 pb-8 sm:flex-row sm:items-end">
        <div>
          <Kicker>Vinx / Collection 01</Kicker>
          <Heading level={1} className="mt-3">
            The essentials.
          </Heading>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-soft-500">
            Soft layers and considered essentials for the days that do not need a uniform.
          </p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-soft-400">
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </span>
      </header>

      <ProductsBrowser products={products} categories={categories} initialCategory={category ?? "all"} />
    </div>
  );
}
