"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";

/**
 * The bag: the pieces, a total, and one button.
 *
 * Removed: a kicker and a headline ("Your selection."), a two-column layout with
 * a sticky "Summary" sidebar, a subtotal row with its own rule, a line of small
 * print, a second "Continue shopping" link, and a boxed quantity stepper. The
 * total and the button now sit directly under the list, where the eye already
 * is when it reaches the last item.
 */
export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const currency = items[0]?.currency ?? "GHS";

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-40 text-center">
        <h1>Bag</h1>
        <p className="type-label mt-3 text-[var(--muted)]">Empty.</p>
        <Link href="/" className="btn-quiet mt-10">
          Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-28 pt-10 sm:pb-0">
      <h1 className="text-center">Bag</h1>

      <ul className="mt-12">
        {items.map((item) => (
          <li key={item.variantId} className="flex items-center gap-5 py-5">
            <Link href={`/products/${item.productSlug}`} className="relative h-24 w-20 shrink-0">
              {item.frontImageUrl && (
                <Image src={item.frontImageUrl} alt="" fill sizes="80px" className="object-contain" />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.productSlug}`}
                className="type-label block truncate transition-opacity hover:opacity-50"
              >
                {item.name}
              </Link>
              <p className="type-micro mt-1 text-[var(--muted)]">
                {item.size} / {item.color}
              </p>

              {/* Quantity as three plain glyphs. No box: the numbers are the
                  control, and the buttons around them are 32px targets. */}
              <div className="mt-2 flex items-center">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${item.name}`}
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  className="-ml-2 flex h-8 w-8 items-center justify-center transition-opacity hover:opacity-40"
                >
                  −
                </button>
                <span className="type-label w-5 text-center tabular-nums" aria-live="polite">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${item.name}`}
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  className="flex h-8 w-8 items-center justify-center transition-opacity hover:opacity-40 disabled:opacity-20"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <p className="type-label tabular-nums">{formatPrice(item.price * item.quantity, item.currency)}</p>
              <button
                type="button"
                onClick={() => removeItem(item.variantId)}
                aria-label={`Remove ${item.name}`}
                className="type-micro text-[var(--muted)] transition-colors hover:text-black"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-6">
        <span className="type-label">Total</span>
        <span className="type-label tabular-nums">{formatPrice(totalPrice, currency)}</span>
      </div>
      {/* Honest about what the total is: the server recalculates the charge
          and delivery is added at checkout. */}
      <p className="type-micro mt-2 text-right text-[var(--muted)]">Delivery at checkout</p>

      <Link href="/checkout" className="btn-primary mt-10 hidden w-full sm:flex">
        Checkout
      </Link>

      {/* On a phone the button is pinned to the bottom of the screen, so it is
          reachable without scrolling past a long bag. */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-white px-[var(--gutter)] py-4 sm:hidden">
        <Link href="/checkout" className="btn-primary w-full">
          Checkout · {formatPrice(totalPrice, currency)}
        </Link>
      </div>
    </div>
  );
}
