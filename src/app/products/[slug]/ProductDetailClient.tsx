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
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="relative aspect-[3/4] bg-gray-100">
          <Image
            src={view === "front" ? product.frontImageUrl : product.backImageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setView("front")}
            className={`border px-3 py-1 text-sm ${view === "front" ? "border-black" : "border-gray-300"}`}
          >
            Front
          </button>
          <button
            onClick={() => setView("back")}
            className={`border px-3 py-1 text-sm ${view === "back" ? "border-black" : "border-gray-300"}`}
          >
            Back
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-lg">{formatPrice(product.price, product.currency)}</p>
        <p className="mt-4 text-gray-700">{product.description}</p>
        <p className="mt-2 text-sm text-gray-500">Material: {product.material}</p>

        <div className="mt-6">
          <p className="mb-1 text-sm font-medium">Size</p>
          <div className="flex gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`border px-3 py-1 text-sm ${s === size ? "border-black" : "border-gray-300"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">Color</p>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`border px-3 py-1 text-sm ${c === color ? "border-black" : "border-gray-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">Quantity</p>
          <input
            type="number"
            min={1}
            max={Math.max(maxQuantity, 1)}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(Number(e.target.value), Math.max(maxQuantity, 1)))}
            className="w-20 border border-gray-300 px-2 py-1"
          />
        </div>

        <p className="mt-4 text-sm">
          {inStock ? `${maxQuantity} in stock` : <span className="text-red-600">Out of stock</span>}
        </p>

        <button
          onClick={addToCart}
          disabled={!inStock}
          className="mt-6 w-full bg-black py-3 text-white disabled:bg-gray-300"
        >
          {added ? "Added" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
