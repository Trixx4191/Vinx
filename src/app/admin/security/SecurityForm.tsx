"use client";

import { useState } from "react";

export default function AdminSecurityPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startSetup() {
    setError(null);
    const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not start setup");
      return;
    }
    setQrCode(data.qrCodeDataUrl);
    setSecret(data.secret);
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Invalid code");
      return;
    }
    setStatus("Two-factor authentication is now enabled on this account.");
    setQrCode(null);
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Admin security</h1>
      <p className="mb-6 text-sm text-gray-600">
        Two-factor authentication adds a 6-digit code from an authenticator app (Google Authenticator, Authy, etc.)
        to admin login, on top of your password.
      </p>

      {status && <p className="mb-4 text-sm text-green-700">{status}</p>}

      {!qrCode && (
        <button onClick={startSetup} className="border border-black px-4 py-2 text-sm">
          Set up 2FA
        </button>
      )}

      {qrCode && (
        <form onSubmit={confirmSetup} className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="2FA QR code" className="h-48 w-48" />
          <p className="text-xs text-gray-500">
            Can&apos;t scan? Enter this key manually: <code>{secret}</code>
          </p>
          <div>
            <label className="block text-sm">Enter the 6-digit code to confirm</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="bg-black px-6 py-2 text-sm text-white">
            Confirm and enable
          </button>
        </form>
      )}
    </div>
  );
}
