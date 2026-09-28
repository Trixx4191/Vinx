"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** "video" switches the picker to MP4 and previews with a <video> element. */
  kind?: "image" | "video";
  hint?: string;
  onRemove?: () => void;
};

const ACCEPT = {
  image: "image/jpeg,image/png,image/webp",
  video: "video/mp4"
};

// Browser-side guard only — the real limit has to come from a bucket policy,
// since a presigned PUT can't cap its own body size. This just stops an admin
// from starting a 400MB upload that would be rejected or cost money later.
const MAX_BYTES = {
  image: 8 * 1024 * 1024, // 8MB
  video: 25 * 1024 * 1024 // 25MB
};

export default function ImageUploadField({ label, value, onChange, kind = "image", hint, onRemove }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES[kind]) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Keep ${kind}s under ${MAX_BYTES[kind] / 1024 / 1024}MB.`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const presignRes = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      const presignData = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) throw new Error(presignData.error ?? "Could not get an upload URL.");

      // For S3 the file goes straight from the browser to storage — it never
      // passes through our server, so our API never has to buffer or proxy
      // image bytes. In local development mode the same PUT goes to our own
      // /api/admin/uploads/local instead.
      let uploadRes: Response;
      try {
        uploadRes = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });
      } catch {
        // fetch only throws for transport-level failures, and for a
        // cross-origin PUT that almost always means one of two things. The
        // raw error ("NetworkError when attempting to fetch resource") names
        // neither, so say them explicitly rather than passing it through.
        throw new Error(
          presignData.storage === "local"
            ? "Could not reach the local upload endpoint. Is the dev server still running?"
            : "Could not reach your storage bucket. Either the S3_* values in .env point at a host that does not exist, or the bucket has no CORS rule allowing PUT from this origin."
        );
      }

      if (!uploadRes.ok) {
        // A response that arrived but was rejected — signature expired,
        // credentials wrong, bucket policy denied it.
        throw new Error(
          `Storage rejected the upload (HTTP ${uploadRes.status}). Check the bucket name, credentials and permissions.`
        );
      }

      onChange(presignData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="field-label">{label}</span>
        {value && onRemove && !uploading && (
          <button type="button" onClick={onRemove} className="text-[10px] uppercase tracking-[0.12em] text-soft-400 hover:text-vienna-red">
            Remove
          </button>
        )}
      </div>

      {/* The `file:` variants style the button the browser renders inside the
          input. Left alone it is the OS default — a grey bevelled "Choose File"
          that is the single most out-of-place element in the admin, and the
          only control on the page that does not belong to this design. The
          input itself stays a real file input, so the picker, drag-and-drop and
          keyboard behaviour are untouched. */}
      <input
        type="file"
        accept={ACCEPT[kind]}
        onChange={handleFile}
        disabled={uploading}
        className="mt-1.5 w-full text-xs text-soft-500
          file:mr-4 file:cursor-pointer file:border file:border-soft-300 file:bg-transparent
          file:px-4 file:py-2 file:text-[10px] file:font-medium file:uppercase file:tracking-[0.1em]
          file:text-soft-700 file:transition-colors
          hover:file:border-soft-700 hover:file:bg-soft-700 hover:file:text-soft-50
          disabled:opacity-50"
      />

      {hint && !error && <p className="mt-1 text-xs text-soft-400">{hint}</p>}
      {uploading && <p className="mt-1 text-xs text-soft-500">Uploading…</p>}
      {error && <p className="mt-1 text-xs text-vienna-red">{error}</p>}

      {value && !uploading && (
        <div className="mt-2 border border-soft-200 bg-white p-1">
          {kind === "video" ? (
            <video src={value} muted loop playsInline controls className="h-32 w-24 object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="h-32 w-24 object-cover" />
          )}
        </div>
      )}
    </div>
  );
}
