"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";
import { Heading, Kicker } from "@/components/luxury";

const PROVIDERS = [
  { value: "PAYSTACK", label: "Card / MTN MoMo / Telecel Cash", note: "Paystack" },
  { value: "STRIPE", label: "Card", note: "Stripe" },
  { value: "PAYPAL", label: "PayPal", note: "PayPal checkout" }
] as const;

type Step = "shipping" | "payment";
type Provider = (typeof PROVIDERS)[number]["value"];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clear } = useCart();
  const [step, setStep] = useState<Step>("shipping");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [provider, setProvider] = useState<Provider>("PAYSTACK");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center sm:py-32">
        <Kicker>Checkout</Kicker>
        <Heading level={1} size={2} className="mt-5">
          Nothing to check out.
        </Heading>
        <p className="mt-5 text-sm text-soft-500">Add a piece to your bag first.</p>
      </div>
    );
  }

  function validateShipping() {
    if (!fullName.trim() || !phone.trim() || !line1.trim() || !city.trim() || !region.trim()) {
      setError("Please complete every shipping field.");
      return false;
    }
    if (phone.trim().length < 7) {
      setError("Please enter a valid phone number.");
      return false;
    }
    return true;
  }

  function continueToPayment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (validateShipping()) setStep("payment");
  }

  async function placeOrder() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        address: { fullName, phone, line1, city, region, country: "GH" },
        paymentProvider: provider
      })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "We could not place your order. Please check your bag and try again.");
      return;
    }
    clear();
    router.push(`/orders/${data.order.id}?created=1`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-soft-200 pb-6">
        <Kicker>Checkout</Kicker>
        <Heading level={1} size={2} className="mt-4">
          A considered finish.
        </Heading>
      </header>

      <nav aria-label="Checkout progress" className="mt-8 flex items-center gap-4">
        <span className={`type-micro ${step === "shipping" ? "text-soft-800" : "text-soft-400"}`}>
          01 Shipping
        </span>
        <span className="h-px w-8 bg-soft-300" aria-hidden />
        <span className={`type-micro ${step === "payment" ? "text-soft-800" : "text-soft-400"}`}>
          02 Payment
        </span>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div>
          {step === "shipping" ? (
            <form onSubmit={continueToPayment}>
              <h2 className="text-lg text-soft-800">Shipping details</h2>
              <p className="mt-2 text-sm text-soft-500">Where should we send your pieces?</p>

              <div className="mt-8 space-y-6">
                <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
                <Field label="Phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
                <Field label="Address" value={line1} onChange={setLine1} autoComplete="street-address" />
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="City" value={city} onChange={setCity} autoComplete="address-level2" />
                  <Field label="Region" value={region} onChange={setRegion} autoComplete="address-level1" />
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-6 text-sm text-vienna-red">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary mt-10 w-full">
                Continue to payment
              </button>
            </form>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg text-soft-800">Payment method</h2>
                  <p className="mt-2 text-sm text-soft-500">Choose how you would like to pay.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("shipping");
                  }}
                  className="type-micro shrink-0 text-soft-500 transition-colors hover:text-soft-800"
                >
                  Edit shipping
                </button>
              </div>

              <div className="mt-8 divide-y divide-soft-200 border-y border-soft-200">
                {PROVIDERS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center justify-between gap-4 py-5 transition-opacity ${
                      provider === option.value ? "opacity-100" : "opacity-55 hover:opacity-100"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="provider"
                        value={option.value}
                        checked={provider === option.value}
                        onChange={() => setProvider(option.value)}
                        className="accent-soft-800"
                      />
                      <span>
                        <span className="block text-sm text-soft-800">{option.label}</span>
                        <span className="type-micro mt-1.5 block text-soft-400">{option.note}</span>
                      </span>
                    </span>
                    <span className="type-micro text-soft-400">Secure</span>
                  </label>
                ))}
              </div>

              {error && (
                <p role="alert" className="mt-6 text-sm text-vienna-red">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={placeOrder}
                disabled={loading}
                className="btn-primary mt-10 w-full disabled:opacity-40"
              >
                {loading ? "Preparing your order…" : "Place order"}
              </button>

              <p className="mt-5 text-center text-xs leading-relaxed text-soft-400">
                Your total is calculated again on the server using current product prices and stock.
              </p>
            </div>
          )}
        </div>

        <aside className="h-fit border-t border-soft-200 pt-7 lg:sticky lg:top-28 lg:border-t-0">
          <Kicker>Order summary</Kicker>

          <ul className="mt-6 space-y-4">
            {items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 text-soft-500">
                  {item.name}
                  <span className="type-micro mt-1 block text-soft-400">
                    {item.size} — {item.color} × {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-soft-800">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex justify-between border-t border-soft-200 pt-5">
            <span className="text-sm text-soft-500">Estimated total</span>
            <span className="text-sm tabular-nums text-soft-800">
              {formatPrice(totalPrice, items[0]?.currency ?? "GHS")}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="type-micro mb-2 block text-soft-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        autoComplete={autoComplete}
        className="input-soft"
      />
    </label>
  );
}
