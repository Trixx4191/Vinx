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
        : "/api/payments/paypal/create-order";

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
      <button onClick={handlePay} disabled={loading} className="btn-primary disabled:opacity-60">
        {loading ? "Redirecting..." : "Pay now"}
      </button>
      {error && <p className="mt-2 text-sm text-soft-500">{error}</p>}
    </div>
  );
}
