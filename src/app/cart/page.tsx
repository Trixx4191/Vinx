"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold">Cart</h1>
        <p className="text-gray-600">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-block underline text-sm">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.variantId} className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-600">
                {item.size} / {item.color}
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <label>Qty</label>
                <input
                  type="number"
                  min={1}
                  max={item.maxQuantity}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
                  className="w-16 border border-gray-300 px-2 py-1"
                />
                <button onClick={() => removeItem(item.variantId)} className="ml-2 text-red-600 underline">
                  Remove
                </button>
              </div>
            </div>
            <p>{formatPrice(item.price * item.quantity, item.currency)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-lg font-medium">
        <span>Total</span>
        <span>{formatPrice(totalPrice, items[0]?.currency ?? "GHS")}</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Final total is recalculated at checkout from live prices — this is an estimate.
      </p>

      <Link href="/checkout" className="mt-6 block w-full bg-black py-3 text-center text-white">
        Checkout
      </Link>
    </div>
  );
}
