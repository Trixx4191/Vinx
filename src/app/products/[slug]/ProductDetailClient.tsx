"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Product, formatPrice } from "@/types/product";
import { useCart } from "@/context/CartContext";

export default function ProductDetailClient({ product }: { product: Product }) {
  const [view, setView] = useState<"front" | "back">("front");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const sizes = useMemo(() => Array.from(new Set(product.variants.map((v) => v.size))), [product]);
  const colors = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color))), [product]);

  const [size, setSize] = useState(sizes[0]);
  const [color, setColor] = useState(colors[0]);

  const selectedVariant = product.variants.find((v) => v.size === size && v.color === color);
  const inStock = selectedVariant ? selectedVariant.inStock && selectedVariant.quantity > 0 : false;
  const maxQuantity = selectedVariant?.quantity ?? 0;

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
                  onClick={() => setSize(s)}
                  className={`min-w-[3rem] rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-apple ${
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-apple ${
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
            <input
              type="number"
              min={1}
              max={Math.max(maxQuantity, 1)}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.min(Number(e.target.value), Math.max(maxQuantity, 1)))
              }
              className="input-soft w-24"
            />
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
  );
}
