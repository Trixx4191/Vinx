"use client";

import { useState } from "react";

type Props = { orderId: string; provider: "PAYSTACK" | "STRIPE" | "PAYPAL" };

export default function PayButton({ orderId, provider }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);

    const endpoint =
      provider === "PAYSTACK"
        ? "/api/payments/paystack/initialize"
        : provider === "STRIPE"
        ? "/api/payments/stripe/create-session"
        : null;

    if (!endpoint) {
      setError("PayPal isn't wired up yet — pick Paystack or Stripe for now.");
      setLoading(false);
      return;
    }

    // Note: only orderId goes in this request. The server looks up the
    // amount to charge itself — this page has no way to influence it.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not start payment");
      return;
    }

    window.location.href = data.authorizationUrl ?? data.url;
  }

  return (
    <div>
      <button onClick={handlePay} disabled={loading} className="bg-black px-6 py-2 text-sm text-white disabled:bg-gray-300">
        {loading ? "Redirecting..." : "Pay now"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
