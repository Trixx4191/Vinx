"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="page-enter mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-soft-700">Cart</h1>
        <div className="glass mt-8 rounded-3xl px-8 py-12">
          <p className="text-soft-500">Your cart is empty.</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-soft-700">Cart</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="glass flex items-center justify-between gap-4 rounded-3xl px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-soft-700">{item.name}</p>
              <p className="mt-0.5 text-sm text-soft-500">
                {item.size} / {item.color}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-xs text-soft-400">Qty</label>
                <input
                  type="number"
                  min={1}
                  max={item.maxQuantity}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
                  className="input-soft w-16 py-1.5 text-center"
                />
                <button
                  onClick={() => removeItem(item.variantId)}
                  className="text-xs font-medium text-soft-400 transition-colors hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
            <p className="shrink-0 text-sm font-medium text-soft-700">
              {formatPrice(item.price * item.quantity, item.currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="glass-strong mt-8 rounded-3xl px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-soft-500">Subtotal</span>
          <span className="text-lg font-semibold text-soft-700">
            {formatPrice(totalPrice, items[0]?.currency ?? "GHS")}
          </span>
        </div>
        <Link href="/checkout" className="btn-primary mt-5 flex w-full justify-center py-3.5">
          Checkout
        </Link>
        <Link
          href="/products"
          className="mt-3 block text-center text-sm text-soft-500 transition-colors hover:text-soft-700"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
