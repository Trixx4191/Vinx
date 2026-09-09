"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "FAILED"] as const;

type Props = {
  orderId: string;
  currentStatus: string;
  currentCarrier: string | null;
  currentTrackingNumber: string | null;
  currentTrackingUrl: string | null;
};

export default function OrderUpdateForm({
  orderId,
  currentStatus,
  currentCarrier,
  currentTrackingNumber,
  currentTrackingUrl
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [carrier, setCarrier] = useState(currentCarrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(currentTrackingUrl ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, carrier, trackingNumber, trackingUrl, note })
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update order");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gray-300 p-4">
      <div>
        <label className="block text-sm">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Carrier</label>
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Tracking number</label>
          <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm">Tracking URL</label>
        <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm">Note (optional, shown in status history)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="bg-black px-6 py-2 text-sm text-white disabled:bg-gray-300">
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
