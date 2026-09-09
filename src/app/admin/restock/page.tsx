"use client";

import { useState } from "react";

export default function RestockPage() {
  const [csv, setCsv] = useState("sku,quantity\n");
  const [result, setResult] = useState<{ updated: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/admin/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv })
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setResult({ updated: data.updated ?? 0, errors: data.errors ?? (data.error ? [data.error] : []) });
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold">Bulk restock</h1>
      <p className="mb-4 text-sm text-gray-600">
        Paste SKU,quantity pairs — one per line. This overwrites the quantity for each SKU listed.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          className="w-full border border-gray-300 p-2 font-mono text-sm"
        />
        <button type="submit" disabled={loading} className="mt-3 bg-black px-6 py-2 text-sm text-white disabled:bg-gray-300">
          {loading ? "Updating..." : "Update stock"}
        </button>
      </form>

      {result && (
        <div className="mt-4 text-sm">
          <p>Updated {result.updated} variant(s).</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-600">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
