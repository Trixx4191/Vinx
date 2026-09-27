import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { Product } from "@/types/product";
import { Heading, Kicker, ProductGrid } from "@/components/luxury";
import { firstExistingImage } from "@/lib/publicAsset";

// Extensions here are honest: every one of these files is a JPEG. The previous
// set was named .webp while actually containing JPEG data, which works — the
// browser sniffs the bytes — but makes the next person mistrust everything they
// read in this file.
const HOME_IMAGES = {
  hero: "/images/home/hero.jpg",
  editorial: "/images/home/editorial.jpg",
  categories: [
    "/images/home/categories/category-01.jpg",
    "/images/home/categories/category-02.jpg",
    "/images/home/categories/category-03.jpg",
    "/images/home/categories/category-04.jpg"
  ]
};

const PRODUCT_MOCKUPS: Record<string, string> = {
  "t-shirts": "/images/product-mockups/t-shirt.svg",
  hoodies: "/images/product-mockups/hoodie.jpg",
  jackets: "/images/product-mockups/jacket.svg",
  pants: "/images/product-mockups/trousers.svg",
  accessories: "/images/product-mockups/cap.svg"
};

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    return await prisma.product.findMany({
      where: { isPublished: true },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true, slug: true } },
        variants: { select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true, sku: true } }
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

  const heroImage = firstExistingImage(HOME_IMAGES.hero);
  const editorialImage = firstExistingImage(HOME_IMAGES.editorial);

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------------- */}
      {/* Hero — full viewport, edge to edge                                */}
      {/* ---------------------------------------------------------------- */}
      {/* -mt-6 cancels the `pt-6` the app shell puts on <main>. That padding is
          right for every other page, but a hero has to sit flush against the
          header — a strip of white above a full-bleed image reads as a mistake. */}
      <section className="bleed relative -mt-6 h-[88vh] min-h-[560px] overflow-hidden bg-soft-800">
        {/* Rendered as an <Image> rather than a CSS background so Next serves a
            size appropriate to the viewport and can prioritise it as the LCP
            element. It is also scoped to the hero: as a fixed page-wide
            backdrop the same photograph sat behind the product grid and the
            editorial copy, where near-black text on a photograph is a
            legibility problem rather than a design. */}
        {heroImage && (
          <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/50" />

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
          <div className="flex items-start justify-between text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
            <span className="type-micro">Vinx / Collection 001</span>
            <span className="type-micro hidden sm:block">Fall — Winter</span>
          </div>

          <div className="pb-16 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] sm:pb-24">
            <h1 className="type-display max-w-4xl text-4xl leading-[0.98] sm:text-6xl lg:text-7xl">
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
      {/* Categories — floating square cards over the hero edge             */}
      {/* ---------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="bleed relative z-10 -mt-12 grid max-w-5xl grid-cols-2 gap-3 px-5 sm:-mt-16 sm:gap-5 sm:px-8 lg:-mt-20 lg:grid-cols-4 lg:px-0">
          {categories.map((category, index) => {
            const tileImage = firstExistingImage(
              HOME_IMAGES.categories[index % HOME_IMAGES.categories.length]
            );

            return (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="group relative aspect-square overflow-hidden rounded-lg bg-soft-200 shadow-[0_3px_16px_rgba(20,24,20,0.06)] transition-shadow duration-500 hover:shadow-[0_8px_24px_rgba(20,24,20,0.1)]"
              >
                {/* A tile whose photograph is missing falls back to the plain
                    ground above, which still carries its label and stays
                    clickable — a deliberate blank rather than a broken frame. */}
                {tileImage && (
                  <Image
                    src={tileImage}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover saturate-[0.9] transition-transform duration-[900ms] ease-apple group-hover:scale-[1.035] group-hover:saturate-100"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-90" />

                <span className="type-micro absolute right-4 top-4 text-white/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="type-micro absolute bottom-5 left-5 text-white transition-transform duration-700 group-hover:translate-x-1">
                  {category.name}
                </span>
              </Link>
            );
          })}
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
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
                mockupSrc={PRODUCT_MOCKUPS[product.category.slug] ?? PRODUCT_MOCKUPS["t-shirts"]}
              />
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
          {editorialImage && (
            <Image
              src={editorialImage}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover grayscale"
            />
          )}
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
