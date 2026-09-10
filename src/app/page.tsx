import Link from "next/link";
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

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="flex flex-col">
      <section className="hero-glass relative mt-2 min-h-[680px] overflow-hidden sm:min-h-[780px]">
        <div className="absolute left-5 top-5 text-[10px] uppercase tracking-[0.16em] text-soft-400">main page</div>
        <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 rotate-90 text-[10px] uppercase tracking-[0.16em] text-soft-400 sm:block">vinx / 001</div>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] text-soft-500 [writing-mode:vertical-rl]">play introduction</div>
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-soft-700/10"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(18,31,24,0.12))"
          }}
        />
        <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[clamp(2.5rem,8vw,7rem)] font-semibold leading-none tracking-[-0.07em] text-soft-700/90">Vinx</p>
        </div>
        <div className="absolute bottom-6 left-5 text-[11px] font-medium text-soft-700">Vinx studio</div>
        <Link href="/products" className="absolute bottom-6 right-5 rounded-full bg-soft-700 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-0.5">shop women / men</Link>
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

      <div className="mt-16 flex items-center justify-center border-y border-soft-300/50 py-3 text-[10px] text-soft-400 sm:mt-24">click to discover further information</div>
    </div>
  );
}
