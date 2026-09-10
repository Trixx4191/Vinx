"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";
import { HandbagIcon } from "@/components/HandbagIcon";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="page-enter mx-auto max-w-md py-12 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / bag</p>
        <h1 className="mt-3 flex items-center justify-center gap-3 text-3xl font-semibold tracking-tight text-soft-700">
          <HandbagIcon size={28} aria-hidden="true" />
          <span>Your bag is quiet.</span>
        </h1>
        <div className="glass mt-8 rounded-3xl px-8 py-12">
          <p className="text-sm text-soft-500">There are no pieces here yet.</p>
          <Link href="/products" className="btn-primary mt-6">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / bag</p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight text-soft-700">
          <HandbagIcon size={28} aria-hidden="true" />
          <span>Your selected pieces.</span>
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.variantId} className="glass flex gap-4 rounded-3xl p-4 sm:p-5">
              <Link href={`/products/${item.productSlug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-soft-100 sm:h-36 sm:w-28">
                {item.frontImageUrl ? <Image src={item.frontImageUrl} alt={item.name} fill sizes="112px" className="object-contain p-2" /> : <span className="flex h-full items-center justify-center text-[10px] text-soft-400">Vinx</span>}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${item.productSlug}`} className="truncate text-sm font-medium text-soft-700 hover:text-soft-900">{item.name}</Link>
                    <p className="mt-1 text-xs text-soft-500">{item.size} / {item.color}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-soft-700">{formatPrice(item.price * item.quantity, item.currency)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center overflow-hidden rounded-full border border-soft-200 bg-white/60">
                    <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="px-3 py-1.5 text-soft-500 hover:text-soft-700">−</button>
                    <span className="min-w-8 border-x border-soft-200 px-2 py-1.5 text-center text-xs text-soft-700">{item.quantity}</span>
                    <button type="button" aria-label={`Increase quantity of ${item.name}`} onClick={() => updateQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.maxQuantity} className="px-3 py-1.5 text-soft-500 hover:text-soft-700 disabled:opacity-30">+</button>
                  </div>
                  <button type="button" onClick={() => removeItem(item.variantId)} className="text-xs text-soft-400 underline underline-offset-4 hover:text-red-500">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-strong h-fit rounded-3xl p-6 lg:sticky lg:top-28">
          <p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Summary</p>
          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-soft-500">Subtotal</span>
            <span className="font-semibold text-soft-700">{formatPrice(totalPrice, items[0]?.currency ?? "GHS")}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-soft-400">Shipping and final payment details are confirmed at checkout.</p>
          <Link href="/checkout" className="btn-primary mt-6 w-full py-3.5">Continue to checkout</Link>
          <Link href="/products" className="mt-4 block text-center text-xs text-soft-500 hover:text-soft-700">Continue shopping</Link>
        </div>
      </div>
      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <Link href="/checkout" className="btn-primary w-full py-3.5 shadow-soft-lg">Checkout · {formatPrice(totalPrice, items[0]?.currency ?? "GHS")}</Link>
      </div>
    </div>
  );
}
