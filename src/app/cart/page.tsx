"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";
import { Heading, Kicker } from "@/components/luxury";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const currency = items[0]?.currency ?? "GHS";

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center sm:py-32">
        <Kicker>Bag</Kicker>
        <Heading level={1} size={2} className="mt-5">
          Your bag is empty.
        </Heading>
        <p className="mt-5 text-sm text-soft-500">There are no pieces here yet.</p>
        <Link href="/products" className="btn-primary mt-10">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 lg:pb-0">
      <header className="border-b border-soft-200 pb-6">
        <Kicker>Bag</Kicker>
        <Heading level={1} size={2} className="mt-4">
          Your selection.
        </Heading>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        {/* Items — separated by hairlines rather than boxed as cards, so the
            page reads as one list instead of a stack of panels. */}
        <ul className="divide-y divide-soft-200">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-5 py-7">
              <Link
                href={`/products/${item.productSlug}`}
                className="relative h-32 w-24 shrink-0 overflow-hidden bg-soft-100 sm:h-40 sm:w-32"
              >
                {item.frontImageUrl ? (
                  <Image
                    src={item.frontImageUrl}
                    alt={item.name}
                    fill
                    sizes="128px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="type-micro flex h-full items-center justify-center text-soft-400">
                    Vinx
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="block truncate text-sm text-soft-800 transition-opacity hover:opacity-60"
                    >
                      {item.name}
                    </Link>
                    <p className="type-micro mt-2 text-soft-400">
                      {item.size} — {item.color}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-soft-800">
                    {formatPrice(item.price * item.quantity, item.currency)}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex items-center border border-soft-200">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-3 py-2 text-soft-500 transition-colors hover:text-soft-800"
                    >
                      −
                    </button>
                    <span className="min-w-10 border-x border-soft-200 px-2 py-2 text-center text-xs tabular-nums text-soft-800">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxQuantity}
                      className="px-3 py-2 text-soft-500 transition-colors hover:text-soft-800 disabled:opacity-25"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="type-micro text-soft-400 transition-colors hover:text-soft-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit border-t border-soft-200 pt-7 lg:sticky lg:top-28 lg:border-t-0">
          <Kicker>Summary</Kicker>

          <div className="mt-6 flex items-center justify-between border-b border-soft-200 pb-4">
            <span className="text-sm text-soft-500">Subtotal</span>
            <span className="text-sm tabular-nums text-soft-800">{formatPrice(totalPrice, currency)}</span>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-soft-400">
            Shipping and final payment details are confirmed at checkout.
          </p>

          <Link href="/checkout" className="btn-primary mt-8 w-full">
            Continue to checkout
          </Link>
          <Link
            href="/products"
            className="type-micro mt-5 block text-center text-soft-500 transition-colors hover:text-soft-800"
          >
            Continue shopping
          </Link>
        </aside>
      </div>

      {/* Mobile checkout bar. Hidden on large screens where the summary column
          is already visible and sticky. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-soft-200 bg-white p-4 lg:hidden">
        <Link href="/checkout" className="btn-primary w-full">
          Checkout — {formatPrice(totalPrice, currency)}
        </Link>
      </div>
    </div>
  );
}
