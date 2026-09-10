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
  currentEstimatedDelivery: Date | null;
};

export default function OrderUpdateForm({
  orderId,
  currentStatus,
  currentCarrier,
  currentTrackingNumber,
  currentTrackingUrl,
  currentEstimatedDelivery
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [carrier, setCarrier] = useState(currentCarrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(currentTrackingUrl ?? "");
  const [estimatedDelivery, setEstimatedDelivery] = useState(currentEstimatedDelivery ? new Date(currentEstimatedDelivery).toISOString().slice(0, 10) : "");
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
      body: JSON.stringify({ status, carrier, trackingNumber, trackingUrl, estimatedDelivery: estimatedDelivery ? `${estimatedDelivery}T00:00:00.000Z` : "", note })
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
    <form onSubmit={handleSubmit} className="glass rounded-3xl p-5 sm:p-6">
      <p className="mb-5 rounded-2xl bg-white/60 p-3 text-sm text-soft-600">Next recommended step: <strong>{currentStatus === "PENDING" ? "confirm payment" : currentStatus === "PAID" ? "prepare shipment" : currentStatus === "SHIPPED" ? "add delivery confirmation" : "review order status"}</strong></p>
      <div>
        <label className="field-label">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block"><span className="field-label">Carrier</span><input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="input-soft" /></label>
        </div>
        <div>
          <label className="block"><span className="field-label">Tracking number</span><input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="input-soft" /></label>
        </div>
      </div>
      <div>
        <label className="block"><span className="field-label">Tracking URL</span><input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className="input-soft" /></label>
      </div>
      <label className="block"><span className="field-label">Estimated delivery</span><input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} className="input-soft" /></label>
      <div>
        <label className="field-label">Note</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input-soft" placeholder="Optional note for the timeline" />
      </div>
      {error && <p className="rounded-2xl bg-red-50/80 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
