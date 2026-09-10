"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Product, formatPrice } from "@/types/product";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailClient({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {
  const [view, setView] = useState<"front" | "back">("front");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const sizes = useMemo(() => Array.from(new Set(product.variants.map((v) => v.size))), [product]);
  const colors = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color))), [product]);

  const [size, setSize] = useState(sizes[0] ?? "");
  const [color, setColor] = useState(colors[0] ?? "");

  const selectedVariant = product.variants.find((v) => v.size === size && v.color === color);
  const inStock = selectedVariant ? selectedVariant.inStock && selectedVariant.quantity > 0 : false;
  const maxQuantity = selectedVariant?.quantity ?? 0;

  function variantFor(nextSize: string, nextColor: string) {
    return product.variants.find((variant) => variant.size === nextSize && variant.color === nextColor);
  }

  function isAvailable(nextSize: string, nextColor: string) {
    const variant = variantFor(nextSize, nextColor);
    return Boolean(variant?.inStock && variant.quantity > 0);
  }

  function addToCart() {
    if (!selectedVariant || !inStock) return;
    // Note: this price is only a display convenience for the cart UI.
    // The real charge is always recalculated server-side from the database
    // at checkout — a client-editable value (localStorage, devtools) is
    // never trusted as the source of truth for what gets charged.
    addItem({
      variantId: selectedVariant.id,
      productSlug: product.slug,
      name: product.name,
      frontImageUrl: product.frontImageUrl,
      size,
      color,
      price: product.price,
      currency: product.currency,
      quantity,
      maxQuantity: selectedVariant.quantity
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] md:gap-14">
      {/* Image column — clear Apple-style presentation */}
      <div className="space-y-4">
        <div className="product-stage relative aspect-[3/4]">
          <Image
            src={view === "front" ? product.frontImageUrl : product.backImageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-5 transition-opacity duration-500 ease-apple sm:p-12"
          />
        </div>
        <div className="flex gap-2">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-apple ${
                view === v
                  ? "bg-soft-700 text-white"
                  : "bg-white/70 text-soft-500 hover:bg-white hover:text-soft-700"
              }`}
            >
              {v === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      </div>

      {/* Info column */}
      <div className="glass-strong flex flex-col rounded-4xl p-6 sm:p-8 md:sticky md:top-28 md:h-fit">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-soft-400">Vinx / {product.category?.name ?? "piece"}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-soft-700 sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-2 text-lg text-soft-500">
          {formatPrice(product.price, product.currency)}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-soft-600">
          {product.description}
        </p>
        {product.material && (
          <p className="mt-2 text-sm text-soft-400">
            Material · {product.material}
          </p>
        )}

        <div className="mt-8 space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-soft-400">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSize(s); if (!isAvailable(s, color)) { const fallback = colors.find((candidate) => isAvailable(s, candidate)); if (fallback) setColor(fallback); } }}
                  disabled={!colors.some((candidate) => isAvailable(s, candidate))}
                  className={`min-w-[3rem] rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-apple disabled:cursor-not-allowed disabled:opacity-30 ${
                    s === size
                      ? "bg-soft-700 text-white shadow-soft"
                      : "bg-white/70 text-soft-600 hover:bg-white hover:text-soft-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-soft-400">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  disabled={!isAvailable(size, c)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-apple disabled:cursor-not-allowed disabled:opacity-30 ${
                    c === color
                      ? "bg-soft-700 text-white shadow-soft"
                      : "bg-white/70 text-soft-600 hover:bg-white hover:text-soft-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-soft-400">
              Quantity
            </p>
            <div className="flex w-fit items-center overflow-hidden rounded-full border border-soft-200 bg-white/60">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 text-soft-500 hover:text-soft-700">−</button>
              <input type="number" min={1} max={Math.max(maxQuantity, 1)} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(maxQuantity, 1))))} className="w-12 border-x border-soft-200 bg-transparent py-2 text-center text-sm text-soft-700 focus:outline-none" />
              <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(Math.min(Math.max(maxQuantity, 1), quantity + 1))} className="px-4 py-2 text-soft-500 hover:text-soft-700">+</button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm text-soft-500">
          {inStock ? (
            <span>{maxQuantity} in stock</span>
          ) : (
            <span className="text-red-500/90">Out of stock</span>
          )}
        </p>

        <button
          onClick={addToCart}
          disabled={!inStock}
          className="btn-primary mt-8 w-full py-3.5 disabled:cursor-not-allowed disabled:bg-soft-300 disabled:hover:scale-100"
        >
          {added ? "Added to cart" : "Add to cart"}
        </button>
      </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-soft-300/60 pt-7 sm:mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Continue exploring</p>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-soft-700">More from this collection.</h2>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 sm:gap-x-5">
            {relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}
          </div>
        </section>
      )}
    </div>
  );
}
