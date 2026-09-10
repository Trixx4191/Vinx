import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { Product } from "@/types/product";

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
    return [];
  }
}

async function getCategories(): Promise<{ name: string; slug: string }[]> {
  try {
    return await prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" }, take: 4 });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([getFeaturedProducts(), getCategories()]);

  return (
    <div className="flex flex-col">
      <section className="hero-glass relative mt-2 min-h-[680px] overflow-hidden sm:min-h-[780px]">
        <div className="absolute left-5 top-5 text-[10px] uppercase tracking-[0.16em] text-soft-400">main page</div>
        <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 rotate-90 text-[10px] uppercase tracking-[0.16em] text-soft-400 sm:block">vinx / 001</div>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] text-soft-500 [writing-mode:vertical-rl]">play introduction</div>
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-soft-700/5"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(18,31,24,0.05))"
          }}
        />
        <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[clamp(2.5rem,8vw,7rem)] font-semibold leading-none tracking-[-0.07em] text-soft-700/90">Vinx</p>
        </div>
        <div className="absolute bottom-6 left-5 text-[11px] font-medium text-soft-700">Vinx studio</div>
        <Link href="/products" className="absolute bottom-6 right-5 rounded-full bg-soft-700 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-0.5">shop women / men</Link>
      </section>

      <section className="mt-16 grid gap-3 sm:mt-24 sm:grid-cols-4">
        {categories.map((category, index) => (
          <Link key={category.slug} href={`/products?category=${category.slug}`} className="group relative flex min-h-40 overflow-hidden border border-soft-300/60 bg-white/35 p-5 transition-colors hover:bg-white/65 sm:min-h-52">
            <span className="absolute right-4 top-4 text-[10px] text-soft-400">0{index + 1}</span>
            <span className="mt-auto text-sm font-medium text-soft-700 transition-transform duration-500 group-hover:translate-x-1">{category.name}</span>
          </Link>
        ))}
        {categories.length === 0 && <Link href="/products" className="group col-span-full border border-soft-300/60 bg-white/35 p-6 text-sm text-soft-600 hover:bg-white/65">Browse the collection <span className="ml-2 transition-transform group-hover:translate-x-1">→</span></Link>}
      </section>

      <section className="mt-12 border-t border-soft-300/60 pt-7 sm:mt-20">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Selected pieces</p>
            <h2 className="mt-2 text-xl font-medium tracking-tight text-soft-700">Quiet forms, useful layers.</h2>
          </div>
          <Link href="/products" className="text-[11px] uppercase tracking-[0.12em] text-soft-500 transition-colors hover:text-soft-800">view all</Link>
        </div>
        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 sm:gap-x-5">
            {products.map((product, index) => (
              <div key={product.id} className="animate-scale-in" style={{ animationDelay: `${index * 0.08}s` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 bg-white/55 px-6 py-16 text-center text-sm text-soft-500">The first pieces are almost here.</div>
        )}
      </section>

      <section className="mt-16 grid gap-8 border-t border-soft-300/60 pt-8 sm:mt-24 sm:grid-cols-[1.05fr_0.95fr] sm:items-center">
        <div className="max-w-md">
          <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">The Vinx approach</p>
          <h2 className="mt-3 text-2xl font-medium tracking-tight text-soft-700">Made for the in-between.</h2>
          <p className="mt-4 text-sm leading-relaxed text-soft-500">Quiet pieces with enough structure to carry the day, and enough softness to let it move around you.</p>
          <Link href="/products" className="mt-6 inline-flex text-xs uppercase tracking-[0.14em] text-soft-600 underline underline-offset-4 hover:text-soft-800">Explore the collection</Link>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden bg-soft-200/50">
          <Image src="/001.jpeg" alt="Vinx studio texture" fill sizes="(max-width: 640px) 100vw, 45vw" className="object-cover grayscale-[20%] mix-blend-multiply opacity-80" />
          <span className="absolute bottom-4 left-4 text-[10px] uppercase tracking-[0.16em] text-white">studio / 001</span>
        </div>
      </section>

      <div className="mt-16 flex items-center justify-center border-y border-soft-300/50 py-3 text-[10px] text-soft-400 sm:mt-24">click to discover further information</div>
    </div>
  );
}
