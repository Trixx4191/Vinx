import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { Product } from "@/types/product";
import { Heading, Kicker, ProductGrid } from "@/components/luxury";

/**
 * Editorial placeholders, development only — `next.config.js` does not allow
 * this host in production, so any of these still in place at deploy time will
 * fail visibly instead of quietly shipping someone else's photography.
 * Replace with your own campaign imagery.
 */
const PLACEHOLDER = {
  hero: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=2400&q=90",
  editorial: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=90",
  categories: [
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1200&q=85"
  ]
};

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    return await prisma.product.findMany({
      where: { isPublished: true },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true, slug: true } },
        variants: { select: { id: true, size: true, color: true, quantity: true, inStock: true, sku: true } }
      }
    });
  } catch {
    // The homepage must still render if the database is unreachable — a
    // sleeping serverless instance should not produce a blank site.
    return [];
  }
}

async function getCategories(): Promise<{ name: string; slug: string }[]> {
  try {
    return await prisma.category.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
      take: 4
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([getFeaturedProducts(), getCategories()]);

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------------- */}
      {/* Hero — full viewport, edge to edge                                */}
      {/* ---------------------------------------------------------------- */}
      {/* -mt-6 cancels the `pt-6` the app shell puts on <main>. That padding is
          right for every other page, but a hero has to sit flush against the
          header — a strip of white above a full-bleed image reads as a mistake. */}
      <section className="bleed relative -mt-6 h-[88vh] min-h-[560px] overflow-hidden bg-soft-100">
        <Image
          src={PLACEHOLDER.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Sits under the text only. A wash across the whole frame would flatten
            the image; this keeps the top and bottom readable and the middle clean. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
          <div className="flex items-start justify-between text-white">
            <span className="type-micro">Vinx / Collection 001</span>
            <span className="type-micro hidden sm:block">Fall — Winter</span>
          </div>

          <div className="text-white">
            <h1 className="type-display max-w-4xl text-[13vw] leading-[0.9] sm:text-[8vw]">
              The new collection
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link
                href="/products"
                className="type-micro border border-white px-6 py-3 text-white transition-colors duration-500 hover:bg-white hover:text-black"
              >
                Discover
              </Link>
              <Link href="/products" className="type-micro text-white/80 transition-colors hover:text-white">
                For her
              </Link>
              <Link href="/products" className="type-micro text-white/80 transition-colors hover:text-white">
                For him
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Categories — edge to edge, no gutters between frames              */}
      {/* ---------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="bleed mt-px grid grid-cols-2 gap-px bg-soft-200 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group relative aspect-[3/4] overflow-hidden bg-soft-100"
            >
              <Image
                src={PLACEHOLDER.categories[index % PLACEHOLDER.categories.length]}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover grayscale transition-all duration-[1200ms] ease-apple group-hover:scale-[1.03] group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-black/15 transition-colors duration-700 group-hover:bg-black/5" />

              <span className="type-micro absolute right-4 top-4 text-white/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="type-micro absolute bottom-5 left-5 text-white transition-transform duration-700 group-hover:translate-x-1">
                {category.name}
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Selected pieces                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-24 sm:mt-36">
        <div className="flex items-end justify-between gap-6 border-b border-soft-200 pb-6">
          <div>
            <Kicker>Selected pieces</Kicker>
            <Heading level={2} className="mt-4">
              Quiet forms.
            </Heading>
          </div>
          <Link
            href="/products"
            className="type-micro shrink-0 pb-1 text-soft-500 transition-colors hover:text-soft-800"
          >
            View all
          </Link>
        </div>

        {products.length > 0 ? (
          <ProductGrid columns={4} className="mt-10">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </ProductGrid>
        ) : (
          <p className="mt-10 py-20 text-center text-sm text-soft-400">
            The first pieces are almost here.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Editorial split                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-24 grid gap-10 sm:mt-36 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden bg-soft-100">
          <Image
            src={PLACEHOLDER.editorial}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover grayscale"
          />
        </div>

        <div className="max-w-md">
          <Kicker>The Vinx approach</Kicker>
          <Heading level={2} className="mt-4">
            Made for the in-between.
          </Heading>
          <p className="mt-6 text-sm leading-relaxed text-soft-500">
            Quiet pieces with enough structure to carry the day, and enough softness to let it move
            around you. Cut once, properly, from cloth chosen to age rather than fade.
          </p>
          <Link
            href="/products"
            className="type-micro mt-8 inline-block border-b border-soft-800 pb-1 text-soft-800 transition-opacity hover:opacity-50"
          >
            Explore the collection
          </Link>
        </div>
      </section>
    </div>
  );
}
