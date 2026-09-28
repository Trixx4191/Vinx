"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Product, formatPrice, productMedia } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { SITE } from "@/content/site";
import { isLowStock } from "@/lib/inventory";
import { formatDropDate, type ReleaseState } from "@/lib/release";
import { ImageGallery } from "@/components/luxury";

/**
 * The product page, reduced to: the image, the name, the price, a size, and a
 * way to add it.
 *
 * Gone from the default view: the category kicker, the description, the
 * material line, a quantity stepper, a delivery/returns table, two help links,
 * and a "more from this collection" grid. The description, material and help
 * sit behind "Details" for anyone who wants them; quantity is adjustable in the
 * bag, where people actually change it; and the related grid was the catalog
 * again, one click from the `+` menu.
 */
export type ProductAccess = {
  state: ReleaseState;
  /** Decided on the server with the same rule checkout enforces. */
  purchasable: boolean;
  releaseAt: string | null;
  signedIn: boolean;
};

export default function ProductDetailClient({ product, access }: { product: Product; access: ProductAccess }) {
  const { addItem } = useCart();
  const media = useMemo(() => productMedia(product), [product]);

  const sizes = useMemo(() => Array.from(new Set(product.variants.map((v) => v.size))), [product]);
  const colors = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color))), [product]);

  const variantFor = (s: string, c: string) => product.variants.find((v) => v.size === s && v.color === c);
  const isAvailable = (s: string, c: string) => {
    const variant = variantFor(s, c);
    return Boolean(variant?.inStock && variant.quantity > 0);
  };

  // Open on a combination that can actually be bought. Defaulting to the first
  // size listed lands a shopper on "sold out" whenever that one is gone, which
  // reads as the whole product being unavailable.
  const initial = useMemo(() => {
    for (const s of sizes) for (const c of colors) if (isAvailable(s, c)) return { s, c };
    return { s: sizes[0] ?? "", c: colors[0] ?? "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const [size, setSize] = useState(initial.s);
  const [color, setColor] = useState(initial.c);
  const [added, setAdded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selected = variantFor(size, color);
  const inStock = Boolean(selected?.inStock && selected.quantity > 0);

  function selectSize(next: string) {
    setSize(next);
    // Keep the pair buyable: if this colour is not made in the new size, move to
    // one that is.
    if (!isAvailable(next, color)) {
      const fallback = colors.find((candidate) => isAvailable(next, candidate));
      if (fallback) setColor(fallback);
    }
  }

  function add() {
    if (!selected || !inStock) return;
    // The price here is display-only for the bag. What is charged is always
    // recomputed server-side from the database at checkout.
    addItem({
      variantId: selected.id,
      productSlug: product.slug,
      name: product.name,
      frontImageUrl: product.frontImageUrl,
      size,
      color,
      price: product.price,
      currency: product.currency,
      quantity: 1,
      maxQuantity: selected.quantity
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="pt-6 sm:pt-10">
      <ImageGallery media={media} priority />

      <div className="mx-auto mt-10 flex max-w-sm flex-col items-center text-center">
        <h1>{product.name}</h1>
        <p className="type-label mt-2">{formatPrice(product.price, product.currency)}</p>

        {/* A choice with one option is not a choice. "One size" products and
            single-colour products skip the row entirely. */}
        {sizes.length > 1 && (
          <Choice
            label="Size"
            values={sizes}
            selected={size}
            onSelect={selectSize}
            enabled={(value) => colors.some((c) => isAvailable(value, c))}
          />
        )}

        {colors.length > 1 && (
          <Choice
            label="Colour"
            values={colors}
            selected={color}
            onSelect={setColor}
            enabled={(value) => isAvailable(size, value)}
          />
        )}

        {/* Early access, seen by someone who is not VIP: the piece is visible
            — that is the point of the window — but in place of "add to bag"
            is when it opens to everyone and the way in. The server would refuse
            the order regardless; this just says so before they try. */}
        {!access.purchasable && access.state === "early" && (
          <div className="mt-10 flex flex-col items-center">
            <p className="type-label">VIP early access</p>
            {access.releaseAt && (
              <p className="type-micro mt-1 text-[var(--muted)]">
                Opens to everyone {formatDropDate(access.releaseAt)}
              </p>
            )}
            <Link
              href={access.signedIn ? "/account#vip" : "/signup"}
              className="btn-primary mt-6"
            >
              {access.signedIn ? "Join VIP" : "Create account for VIP"}
            </Link>
          </div>
        )}

        {/* An admin previewing a drop before any window has opened. */}
        {access.state === "upcoming" && (
          <p className="type-micro mt-10 text-[var(--muted)]">
            Preview · not yet visible to customers
            {access.releaseAt && ` · opens ${formatDropDate(access.releaseAt)}`}
          </p>
        )}

        {/* Text, not a filled bar. The one action on the page does not need a
            black rectangle to be found — it is the only thing here that says
            "add". */}
        {access.purchasable && access.state === "early" && (
          <p className="type-micro mt-10 text-[var(--muted)]">VIP early access</p>
        )}
        {access.purchasable && (
        <button
          type="button"
          onClick={add}
          disabled={!inStock}
          aria-live="polite"
          className={`type-label ${access.state === "early" ? "mt-3" : "mt-10"} flex items-center gap-2 px-4 py-2 transition-opacity hover:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--muted)] disabled:hover:opacity-100`}
        >
          {inStock ? (
            <>
              <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden>
                <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1.4" fill="none" />
              </svg>
              {added ? "Added" : "Add to bag"}
            </>
          ) : (
            "Sold out"
          )}
        </button>
        )}

        {/* Only when it is genuinely scarce. A permanent stock count is noise;
            "2 left" is information. */}
        {inStock && selected && isLowStock(selected.quantity) && (
          <p className="type-micro mt-2 text-[var(--muted)]">
            {selected.quantity === 1 ? "Last one" : `${selected.quantity} left`}
          </p>
        )}

        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="product-details"
          className="type-micro mt-12 text-[var(--muted)] transition-colors hover:text-black"
        >
          Details {detailsOpen ? "−" : "+"}
        </button>

        {detailsOpen && (
          <div id="product-details" className="page-enter mt-6 space-y-5">
            <p className="type-body">{product.description}</p>
            {product.material && <p className="type-micro text-[var(--muted)]">{product.material}</p>}
            <p className="type-micro text-[var(--muted)]">
              Delivery {SITE.delivery.accra} in {SITE.city} · Returns {SITE.returns.windowDays} days
            </p>
            <p className="flex justify-center gap-5">
              <Link href="/size-guide" className="type-micro underline underline-offset-4 hover:opacity-50">
                Size guide
              </Link>
              <Link href="/returns" className="type-micro underline underline-offset-4 hover:opacity-50">
                Returns
              </Link>
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * A row of plain words. The selected one is black; the rest are grey; one that
 * cannot be bought is struck through. No chips, no borders — the difference is
 * carried entirely by tone, and the strike-through makes "unavailable" survive
 * a phone screen in sunlight, where two greys would not.
 */
function Choice({
  label,
  values,
  selected,
  onSelect,
  enabled
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  enabled: (value: string) => boolean;
}) {
  return (
    <fieldset className="mt-8">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {values.map((value) => {
          const available = enabled(value);
          const active = value === selected;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              disabled={!available}
              aria-pressed={active}
              className={`type-label px-1 py-1 transition-colors duration-200 disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                active ? "text-black underline decoration-1 underline-offset-[6px]" : "text-[var(--muted)] hover:text-black"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
