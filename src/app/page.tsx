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
  const categoryImages = [
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=85"
  ];

  return (
    <div className="flex flex-col">
      <section
        className="hero-glass relative mt-2 min-h-[680px] overflow-hidden bg-cover bg-center sm:min-h-[780px]"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.28)), url('https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=90')" }}
      >
        <div className="absolute left-5 top-5 text-[10px] uppercase tracking-[0.16em] text-white">main page / 001</div>
        <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 rotate-90 text-[10px] uppercase tracking-[0.16em] text-white sm:block">vinx / fall winter</div>
        <div className="absolute bottom-6 left-5 text-[11px] font-medium text-white">The new collection</div>
        <div className="absolute bottom-6 right-5 flex items-center gap-5 text-[10px] uppercase tracking-[0.12em] text-white">
          <span>for her</span>
          <span>for him</span>
          <Link href="/products" className="border border-white px-4 py-2 transition-colors hover:bg-white hover:text-black">discover</Link>
        </div>
      </section>

      <section className="mt-16 grid gap-3 sm:mt-24 sm:grid-cols-4">
        {categories.map((category, index) => (
          <Link key={category.slug} href={`/products?category=${category.slug}`} className="group relative flex min-h-56 overflow-hidden bg-soft-200 p-5 sm:min-h-72">
            <span className="absolute inset-0 bg-cover bg-center opacity-80 grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" style={{ backgroundImage: `url('${categoryImages[index % categoryImages.length]}')` }} />
            <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
            <span className="absolute right-4 top-4 text-[10px] text-soft-400">0{index + 1}</span>
            <span className="relative z-10 mt-auto text-sm font-medium text-white transition-transform duration-500 group-hover:translate-x-1">{category.name}</span>
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
