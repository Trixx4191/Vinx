"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Product, formatPrice, productMedia } from "@/types/product";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import { SITE } from "@/content/site";
import { isLowStock } from "@/lib/inventory";
import { Badge, Button, Heading, ImageGallery, Kicker, ProductGrid, SectionHeader } from "@/components/luxury";

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

        {/* No border, no white fill, no padding of its own. This was a bordered
            white card floating on the bone ground, which is the one gesture this
            system does not make — on the storefront, content sits on the page
            and is separated by space, not enclosed in boxes. The photograph
            beside it is the object on the page; putting the copy in a box of its
            own makes them compete.

            `top-28` clears the sticky header, which is two rows tall. */}
        <div className="flex flex-col md:sticky md:top-28 md:h-fit md:pl-2">
          <Kicker>{product.category?.name ?? "Piece"}</Kicker>

          {/* h1 for the outline, display-2 for the eye: the product name is the
              page's subject, but a collection-sized headline would overpower the
              photograph it sits beside. */}
          <Heading level={1} size={2} className="mt-4">
            {product.name}
          </Heading>

          <p className="mt-4 text-[17px] text-soft-600">
            {formatPrice(product.price, product.currency)}
          </p>

          <p className="type-body mt-7 max-w-copy">{product.description}</p>

          {product.material && (
            <p className="type-micro mt-4 text-soft-400">{product.material}</p>
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
              <p className="type-micro mb-2 text-soft-400">Quantity</p>
              <div className="flex w-fit items-center border border-soft-300">
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
              // Only surfaced once it is genuinely scarce. A permanent "37 in
              // stock" is noise; "2 left" is information.
              isLowStock(maxQuantity) ? (
                <span className="type-micro text-vienna-red">
                  {maxQuantity === 1 ? "Last one" : `Only ${maxQuantity} left`}
                </span>
              ) : (
                <span className="type-micro text-soft-500">In stock</span>
              )
            ) : (
              <Badge variant="alert">Out of stock</Badge>
            )}
          </p>

          <Button size="lg" fullWidth className="mt-7" onClick={addToCart} disabled={!inStock}>
            {added ? "Added to bag" : "Add to bag"}
          </Button>

          {/* The two questions every shopper has at the moment they are deciding
              — when does it arrive, and what if it does not fit — answered where
              the decision happens rather than in the footer. */}
          <div className="mt-8 border-t border-soft-200 pt-6">
            <dl className="space-y-2.5">
              <div className="flex justify-between gap-4">
                <dt className="type-micro text-soft-400">Delivery</dt>
                <dd className="text-[13px] text-soft-600">
                  {SITE.delivery.accra} in {SITE.city}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="type-micro text-soft-400">Returns</dt>
                <dd className="text-[13px] text-soft-600">{SITE.returns.windowDays} days</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/size-guide" className="type-micro text-soft-500 underline decoration-soft-300 underline-offset-4 transition-colors hover:text-soft-800">
                Size guide
              </Link>
              <Link href="/delivery" className="type-micro text-soft-500 underline decoration-soft-300 underline-offset-4 transition-colors hover:text-soft-800">
                Delivery &amp; returns
              </Link>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="section-gap">
          <SectionHeader kicker="Continue exploring" title="More from this collection." />

          <ProductGrid columns={4} className="mt-10">
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
      <p className="type-micro mb-2 text-soft-400">{label}</p>
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
              // A sold-out combination is struck through rather than only
              // faded. At 30% opacity on a warm ground the difference between
              // "available" and "not" was a tone, which is the kind of
              // distinction that disappears in sunlight on a phone.
              className={`min-w-[3rem] border px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] transition-colors duration-300
                disabled:cursor-not-allowed disabled:border-soft-200 disabled:text-soft-400 disabled:line-through ${
                  active
                    ? "border-soft-700 bg-soft-700 text-soft-50"
                    : "border-soft-300 text-soft-600 hover:border-soft-700 hover:text-soft-800"
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
