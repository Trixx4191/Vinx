"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, formatPrice, productMedia } from "@/types/product";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import { Badge, Button, Heading, ImageGallery, Kicker, ProductGrid } from "@/components/luxury";

export default function ProductDetailClient({
  product,
  relatedProducts
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const sizes = useMemo(() => Array.from(new Set(product.variants.map((v) => v.size))), [product]);
  const colors = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color))), [product]);
  const media = useMemo(() => productMedia(product), [product]);

  const [size, setSize] = useState(sizes[0] ?? "");
  const [color, setColor] = useState(colors[0] ?? "");

  const selectedVariant = product.variants.find((v) => v.size === size && v.color === color);
  const inStock = selectedVariant ? selectedVariant.inStock && selectedVariant.quantity > 0 : false;
  const maxQuantity = selectedVariant?.quantity ?? 0;

  // Switching to a variant with less stock used to leave the old, higher count
  // in the input — the order would then be rejected at checkout with a 409
  // rather than here. The server remains the authority on stock; this just
  // stops the UI from proposing something it already knows is unbuyable.
  useEffect(() => {
    setQuantity((current) => Math.min(current, Math.max(maxQuantity, 1)));
  }, [maxQuantity]);

  function variantFor(nextSize: string, nextColor: string) {
    return product.variants.find((variant) => variant.size === nextSize && variant.color === nextColor);
  }

  function isAvailable(nextSize: string, nextColor: string) {
    const variant = variantFor(nextSize, nextColor);
    return Boolean(variant?.inStock && variant.quantity > 0);
  }

  function selectSize(nextSize: string) {
    setSize(nextSize);
    // If the current colour isn't made in this size, move to one that is
    // rather than leaving the pair in an unbuyable state.
    if (!isAvailable(nextSize, color)) {
      const fallback = colors.find((candidate) => isAvailable(nextSize, candidate));
      if (fallback) setColor(fallback);
    }
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
        <ImageGallery media={media} priority />

        <div className="flex flex-col border border-soft-300 bg-white p-6 sm:p-8 md:sticky md:top-28 md:h-fit">
          <Kicker>Vinx / {product.category?.name ?? "piece"}</Kicker>

          <Heading level={1} className="mt-4 text-3xl sm:text-4xl">
            {product.name}
          </Heading>

          <p className="mt-3 text-lg text-soft-500">{formatPrice(product.price, product.currency)}</p>

          <p className="mt-6 text-sm leading-relaxed text-soft-600">{product.description}</p>

          {product.material && (
            <p className="mt-3 text-xs uppercase tracking-[0.12em] text-soft-400">
              Material · {product.material}
            </p>
          )}

          <div className="mt-8 space-y-6">
            <Options
              label="Size"
              values={sizes}
              selected={size}
              onSelect={selectSize}
              isEnabled={(value) => colors.some((candidate) => isAvailable(value, candidate))}
            />

            <Options
              label="Colour"
              values={colors}
              selected={color}
              onSelect={setColor}
              isEnabled={(value) => isAvailable(size, value)}
            />

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-soft-400">Quantity</p>
              <div className="flex w-fit items-center border border-soft-300 bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-soft-500 transition-colors hover:text-soft-700"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(maxQuantity, 1)}
                  value={quantity}
                  aria-label="Quantity"
                  onChange={(event) =>
                    setQuantity(
                      Math.max(1, Math.min(Number(event.target.value) || 1, Math.max(maxQuantity, 1)))
                    )
                  }
                  className="w-12 border-x border-soft-300 bg-transparent py-2 text-center text-sm text-soft-700 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(Math.min(Math.max(maxQuantity, 1), quantity + 1))}
                  className="px-4 py-2 text-soft-500 transition-colors hover:text-soft-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6" aria-live="polite">
            {inStock ? (
              <span className="text-xs uppercase tracking-[0.12em] text-soft-500">{maxQuantity} in stock</span>
            ) : (
              <Badge variant="alert">Out of stock</Badge>
            )}
          </p>

          <Button size="lg" fullWidth className="mt-8 py-4" onClick={addToCart} disabled={!inStock}>
            {added ? "Added to cart" : "Add to cart"}
          </Button>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-soft-300/60 pt-8 sm:mt-24">
          <Kicker>Continue exploring</Kicker>
          <Heading level={2} className="mt-2 text-xl sm:text-2xl">
            More from this collection.
          </Heading>

          <ProductGrid columns={4} className="mt-8">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}

/** A labelled row of selectable chips that disables combinations with no stock. */
function Options({
  label,
  values,
  selected,
  onSelect,
  isEnabled
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  isEnabled: (value: string) => boolean;
}) {
  if (values.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-soft-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const enabled = isEnabled(value);
          const active = value === selected;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              disabled={!enabled}
              aria-pressed={active}
              className={`min-w-[3rem] border px-4 py-2 text-xs uppercase tracking-[0.1em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-30 ${
                active
                  ? "border-soft-700 bg-soft-700 text-white"
                  : "border-soft-300 bg-white text-soft-600 hover:border-soft-700 hover:text-soft-700"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
