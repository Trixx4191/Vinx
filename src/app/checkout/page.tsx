"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";

const PROVIDERS = [
  { value: "PAYSTACK", label: "Card / MTN MoMo / Telecel Cash (Paystack)" },
  { value: "STRIPE", label: "Card (Stripe)" },
  { value: "PAYPAL", label: "PayPal" }
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clear } = useCart();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["value"]>("PAYSTACK");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (items.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold">Checkout</h1>
        <p className="text-gray-600">Your cart is empty.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Note exactly what does NOT go in this request: no price, no total.
    // The server looks both up itself from the database.
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        address: { fullName, phone, line1, city, region, country: "GH" },
        paymentProvider: provider
      })
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not place order");
      return;
    }

    clear();
    router.push(`/orders/${data.order.id}`);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Shipping details</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm">Address</label>
            <input value={line1} onChange={(e) => setLine1(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm">Region</label>
              <input value={region} onChange={(e) => setRegion(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Payment method</p>
            {PROVIDERS.map((p) => (
              <label key={p.value} className="mb-1 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="provider"
                  checked={provider === p.value}
                  onChange={() => setProvider(p.value)}
                />
                {p.label}
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-black py-3 text-white disabled:bg-gray-300">
            {loading ? "Placing order..." : "Place order"}
          </button>
          <p className="text-xs text-gray-500">
            You won&apos;t be charged yet — payment collection wires in next (Phase 3). Placing the order reserves
            stock and locks in the price from our records, not from this page.
          </p>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Order summary</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.variantId} className="flex justify-between text-sm">
              <span>
                {item.name} ({item.size}/{item.color}) x{item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity, item.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-medium">
          <span>Estimated total</span>
          <span>{formatPrice(totalPrice, items[0]?.currency ?? "GHS")}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          This is a display estimate only. The exact total is calculated by the server from live prices when you
          place the order.
        </p>
      </div>
    </div>
  );
}
