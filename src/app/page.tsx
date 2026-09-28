import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { Product } from "@/types/product";
import { ProductGrid, SectionHeader } from "@/components/luxury";
import { firstExistingImage } from "@/lib/publicAsset";
import { SITE } from "@/content/site";

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
      take: 8,
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
      {/* ================================================================== */}
      {/* Hero                                                                */}
      {/* ================================================================== */}
      {/* `-mt-6` cancels the `pt-6` the app shell puts on <main>. That padding
          is right for every other page, but a hero has to sit flush under the
          header — a strip of bone above a full-bleed image reads as a mistake.

          Height is `svh`, not `vh`. On mobile Safari `vh` is measured against
          the viewport with the toolbars hidden, so a 88vh hero is taller than
          the screen on load and its bottom line — the one carrying the buttons —
          sits under the browser chrome until you scroll. */}
      <section className="bleed relative -mt-6 flex h-[86svh] min-h-[540px] flex-col justify-end overflow-hidden bg-soft-200">
        {/* Rendered as an <Image> rather than a CSS background so Next serves a
            size appropriate to the viewport and can prioritise it as the LCP
            element. It is also scoped to the hero: as a fixed page-wide backdrop
            the same photograph sat behind the product grid and the editorial
            copy, where near-black text on a photograph is a legibility problem
            rather than a design. */}
        {heroImage && (
          <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover" />
        )}

        {/* A single bottom-weighted scrim instead of the previous three-stop
            top-and-bottom gradient. That one dimmed the middle of the
            photograph — the part with the garment in it — to protect text that
            only ever sits at the bottom. This darkens only where the type is. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-black/25 to-transparent"
        />

        {/* The shadow sits on the type itself, not on this wrapper. The scrim
            alone was not enough over a pale garment — the eyebrow at 70% white
            on a light knit dropped below a comfortable contrast ratio — and
            deepening the scrim would have fixed it by dimming the photograph.
            A shadow protects the type locally and leaves the image alone.

            Scoped to the two text elements rather than the block, because the
            buttons below are solid fills and a text shadow inside a white
            button reads as a printing fault. */}
        <div className="relative px-5 pb-12 sm:px-8 sm:pb-16 lg:px-10">
          <p className="type-micro text-white/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
            Collection 001 · Fall — Winter
          </p>

          {/* `text-balance` via the global h1 rule, so the two lines break
              evenly rather than leaving one word alone on the second. */}
          <h1 className="type-d1 mt-4 max-w-[13ch] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
            The new collection
          </h1>

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/products"
              className="type-micro bg-soft-50 px-8 py-4 text-soft-800 transition-colors duration-300 hover:bg-white"
            >
              Shop all
            </Link>
            <Link
              href="/products?category=hoodies"
              className="type-micro border border-white/60 px-8 py-4 text-white transition-colors duration-300 hover:bg-white hover:text-soft-800"
            >
              Hoodies
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Categories                                                          */}
      {/* ================================================================== */}
      {/* Flush against the hero and each other, full-bleed, no gaps and no
          shadows. These were floating rounded cards with a drop shadow pulled up
          over the hero edge — which is a 2019 dashboard pattern, and the shadow
          was doing the work a photograph should do. Butted tall portrait tiles
          read as one continuous run of imagery, which is the whole effect.

          A 1px gap, not 0: at exactly 0 a fractional layout width lets the
          background show as a hairline between tiles on some zoom levels, and a
          deliberate hairline looks intentional where an accidental one does not. */}
      {categories.length > 0 && (
        <section className="bleed grid grid-cols-2 gap-px bg-soft-200 lg:grid-cols-4">
          {categories.map((category, index) => {
            const tileImage = firstExistingImage(
              HOME_IMAGES.categories[index % HOME_IMAGES.categories.length]
            );

            return (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="group relative aspect-[4/5] overflow-hidden bg-soft-100 lg:aspect-[3/4]"
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
                    className="object-cover transition-transform duration-700 ease-apple-out group-hover:scale-[1.04]"
                  />
                )}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent"
                />

                <span className="type-micro absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
                  {category.name}
                  {/* An arrow that slides on hover, rather than the label
                      itself moving. Moving the text nudges the whole tile's
                      composition; moving a 10px glyph reads as a response. */}
                  <span
                    aria-hidden
                    className="translate-x-0 opacity-60 transition-transform duration-500 ease-apple-out group-hover:translate-x-1 group-hover:opacity-100"
                  >
                    →
                  </span>
                </span>
              </Link>
            );
          })}
        </section>
      )}

      {/* ================================================================== */}
      {/* Selected pieces                                                     */}
      {/* ================================================================== */}
      <section className="section-gap">
        <SectionHeader
          kicker="Selected pieces"
          title="Quiet forms."
          action={
            <Link href="/products" className="type-micro text-soft-500 transition-colors hover:text-soft-800">
              View all
            </Link>
          }
        />

        {products.length > 0 ? (
          <ProductGrid columns={4} className="mt-10">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                // Only the first row is prioritised. Marking all eight as
                // priority tells the browser everything is urgent, which is the
                // same as telling it nothing is — the four below the fold
                // compete with the four above for the same connections.
                priority={index < 4}
                mockupSrc={PRODUCT_MOCKUPS[product.category.slug] ?? PRODUCT_MOCKUPS["t-shirts"]}
              />
            ))}
          </ProductGrid>
        ) : (
          <p className="mt-10 py-24 text-center text-sm text-soft-400">
            The first pieces are almost here.
          </p>
        )}
      </section>

      {/* ================================================================== */}
      {/* Editorial split                                                     */}
      {/* ================================================================== */}
      <section className="section-gap grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden bg-soft-100">
          {editorialImage && (
            <Image
              src={editorialImage}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              // Grayscale was flattening the one warm photograph on the page
              // into the same tone as the ground it sits on. A slight
              // desaturation keeps it editorial without erasing it.
              className="object-cover saturate-[0.85]"
            />
          )}
        </div>

        <div className="max-w-copy">
          <p className="type-micro text-soft-400">The Vinx approach</p>
          <h2 className="type-d2 mt-4 text-soft-800">Made for the in-between.</h2>
          <p className="type-body mt-6">
            Quiet pieces with enough structure to carry the day, and enough softness to let it move
            around you. Cut once, properly, from cloth chosen to age rather than fade.
          </p>
          <Link href="/products" className="btn-quiet mt-8">
            Explore the collection
          </Link>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Service band                                                        */}
      {/* ================================================================== */}
      {/* The three things a shopper wants to know before they add anything to a
          bag, on the page rather than buried in the footer. Each links to the
          page that explains it, so this is navigation and not decoration. */}
      <section className="section-gap rule-top pt-12">
        <div className="grid gap-10 sm:grid-cols-3">
          {[
            {
              href: "/delivery",
              title: "Delivery",
              body: `Free in ${SITE.city} over the order threshold. ${SITE.delivery.accra} locally, ${SITE.delivery.international} international.`
            },
            {
              href: "/returns",
              title: "Returns",
              body: `${SITE.returns.windowDays} days from delivery. Try things on — that is what the window is for.`
            },
            {
              href: "/size-guide",
              title: "Fit",
              body: "Body measurements, not garment ones. Where a piece is shown on a model, the caption gives their height and size."
            }
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group block">
              <p className="type-micro text-soft-400">{item.title}</p>
              <p className="type-body mt-3 text-soft-600 transition-colors group-hover:text-soft-800">
                {item.body}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
