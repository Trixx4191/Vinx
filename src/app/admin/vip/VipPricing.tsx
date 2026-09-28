"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "50" or "50.00" → "5000". Returns null for anything that is not a money amount. */
function toMinorUnits(major: string): string | null {
  const trimmed = major.trim();
  if (trimmed === "") return "";
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  // Integer arithmetic on the parts — never Number("19.99") * 100, which is
  // 1998.9999999999998 and would round down to a price nobody set.
  const [whole, fraction = ""] = trimmed.split(".");
  return String(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}

export default function VipPricing({ month, year }: { month: number | null; year: number | null }) {
  const router = useRouter();
  const [monthText, setMonthText] = useState(month ? (month / 100).toFixed(2) : "");
  const [yearText, setYearText] = useState(year ? (year / 100).toFixed(2) : "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const vipPriceMonth = toMinorUnits(monthText);
    const vipPriceYear = toMinorUnits(yearText);
    if (vipPriceMonth === null || vipPriceYear === null) {
      setError("Enter prices like 50 or 49.99.");
      return;
    }
    setStatus("saving");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vipPriceMonth, vipPriceYear })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("idle");
      setError(data.error ?? "Could not save.");
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="admin-panel">
      <p className="admin-kicker">Prices</p>
      <p className="mt-2 max-w-xl text-sm text-soft-500">
        Leave a price empty to stop selling that plan. With both empty, VIP shows as &ldquo;opening soon&rdquo;
        and nobody can buy it. Changing a price never affects time people have already paid for.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">1 month (GHS)</span>
          <input inputMode="decimal" value={monthText} onChange={(e) => setMonthText(e.target.value)} placeholder="Not for sale" className="input-soft" />
        </label>
        <label className="block">
          <span className="field-label">1 year (GHS)</span>
          <input inputMode="decimal" value={yearText} onChange={(e) => setYearText(e.target.value)} placeholder="Not for sale" className="input-soft" />
        </label>
      </div>
      {error && <p className="mt-4 text-sm text-vienna-red">{error}</p>}
      <button type="submit" disabled={status === "saving"} className="btn-primary mt-6">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save prices"}
      </button>
    </form>
  );
}
