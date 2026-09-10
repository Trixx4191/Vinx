"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/types/product";

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
    return <div className="page-enter mx-auto max-w-md py-16 text-center"><h1 className="text-2xl font-semibold text-soft-700">Nothing to check out.</h1><p className="mt-2 text-sm text-soft-500">Add a piece to your bag first.</p></div>;
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
    <div className="page-enter mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / checkout</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-soft-700">A considered finish.</h1>
      </div>
      <div className="mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.14em]">
        <span className={step === "shipping" ? "font-medium text-soft-700" : "text-soft-400"}>01 Shipping</span>
        <span className="text-soft-300">/</span>
        <span className={step === "payment" ? "font-medium text-soft-700" : "text-soft-400"}>02 Payment</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {step === "shipping" ? (
            <form onSubmit={continueToPayment} className="glass rounded-3xl p-6 sm:p-8">
              <div className="mb-6"><h2 className="text-xl font-medium text-soft-700">Shipping details</h2><p className="mt-1 text-sm text-soft-500">Where should we send your pieces?</p></div>
              <div className="space-y-4">
                <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
                <Field label="Phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
                <Field label="Address" value={line1} onChange={setLine1} autoComplete="street-address" />
                <div className="grid gap-4 sm:grid-cols-2"><Field label="City" value={city} onChange={setCity} autoComplete="address-level2" /><Field label="Region" value={region} onChange={setRegion} autoComplete="address-level1" /></div>
              </div>
              {error && <p className="mt-5 text-sm text-red-500/90">{error}</p>}
              <button type="submit" className="btn-primary mt-7 w-full py-3.5">Continue to payment</button>
            </form>
          ) : (
            <div className="glass rounded-3xl p-6 sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-medium text-soft-700">Payment method</h2><p className="mt-1 text-sm text-soft-500">Choose how you would like to pay.</p></div><button type="button" onClick={() => { setError(null); setStep("shipping"); }} className="text-xs text-soft-500 underline underline-offset-4">Edit shipping</button></div>
              <div className="space-y-3">
                {PROVIDERS.map((option) => <label key={option.value} className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${provider === option.value ? "border-soft-700 bg-white/75" : "border-soft-200 bg-white/35 hover:bg-white/60"}`}><span className="flex items-center gap-3"><input type="radio" name="provider" value={option.value} checked={provider === option.value} onChange={() => setProvider(option.value)} className="accent-soft-700" /><span><span className="block text-sm font-medium text-soft-700">{option.label}</span><span className="mt-1 block text-xs text-soft-400">{option.note}</span></span></span><span className="text-xs text-soft-400">Secure</span></label>)}
              </div>
              {error && <p className="mt-5 text-sm text-red-500/90">{error}</p>}
              <button type="button" onClick={placeOrder} disabled={loading} className="btn-primary mt-7 w-full py-3.5 disabled:opacity-60">{loading ? "Preparing your order..." : "Place order"}</button>
              <p className="mt-3 text-center text-xs leading-relaxed text-soft-400">Your total is calculated again on the server using current product prices and stock.</p>
            </div>
          )}
        </div>

        <aside className="glass-strong h-fit rounded-3xl p-6 lg:sticky lg:top-28">
          <p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Order summary</p>
          <div className="mt-5 space-y-4">{items.map((item) => <div key={item.variantId} className="flex justify-between gap-4 text-sm"><span className="min-w-0 text-soft-500">{item.name} <span className="text-xs">({item.size} / {item.color}) × {item.quantity}</span></span><span className="shrink-0 text-soft-700">{formatPrice(item.price * item.quantity, item.currency)}</span></div>)}</div>
          <div className="mt-6 flex justify-between border-t border-soft-200 pt-4"><span className="text-sm text-soft-500">Estimated total</span><span className="font-semibold text-soft-700">{formatPrice(totalPrice, items[0]?.currency ?? "GHS")}</span></div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required autoComplete={autoComplete} className="input-soft" /></label>;
}
