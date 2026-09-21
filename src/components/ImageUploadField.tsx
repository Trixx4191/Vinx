"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
};

export default function ImageUploadField({ label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const presignRes = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Could not get upload URL");

      // The file goes straight from the browser to storage — it never
      // passes through our server, so our API never has to buffer or
      // proxy image bytes.
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      onChange(presignData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm">{label}</label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="mt-1 w-full text-sm" />
      {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
      {error && <p className="mt-1 text-xs text-soft-500">{error}</p>}
      {value && !uploading && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={`${label} preview`} className="mt-2 h-32 w-24 object-cover" />
      )}
    </div>
  );
}
