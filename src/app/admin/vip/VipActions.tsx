"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GRANT_OPTIONS = [
  { days: 7, label: "1 week" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 365, label: "1 year" }
] as const;

/** Give a customer VIP for free. Master admin only; the page does not render it otherwise. */
export function GrantVip() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<number>(30);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);
    const res = await fetch("/api/admin/vip/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, days })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not grant VIP.");
      return;
    }
    const until = new Date(data.vipUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    setStatus(`${email} is VIP until ${until}.`);
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="admin-panel">
      <p className="admin-kicker">Give VIP</p>
      <p className="mt-2 max-w-xl text-sm text-soft-500">
        Free time for a customer — a gift, or to put something right. Added on to the end of any time they
        already have, and recorded below as complimentary.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="field-label">Customer email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-soft" />
        </label>
        <label className="block">
          <span className="field-label">Length</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="select-soft">
            {GRANT_OPTIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-4 text-sm text-vienna-red">{error}</p>}
      {status && <p className="mt-4 text-sm text-soft-600">{status}</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-6">
        {busy ? "…" : "Give VIP"}
      </button>
    </form>
  );
}

/**
 * Record a refund against one payment and take its time back. The refund
 * itself is made in Paystack; the confirm says so, because clicking this does
 * not send anyone money.
 */
export function RefundButton({ purchaseId, comp }: { purchaseId: string; comp: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund() {
    const message = comp
      ? "End this complimentary VIP? Its time comes off the customer's membership."
      : "Record this payment as refunded? Its time comes off the customer's membership.\n\nThis does not send money — refund it in your Paystack dashboard too.";
    if (!confirm(message)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/vip/purchases/${purchaseId}/refund`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not record the refund.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={refund}
        disabled={busy}
        className="text-xs text-soft-400 underline underline-offset-4 hover:text-vienna-red disabled:opacity-40"
      >
        {busy ? "…" : comp ? "End" : "Refunded"}
      </button>
      {error && <span className="mt-1 text-xs text-vienna-red">{error}</span>}
    </span>
  );
}
