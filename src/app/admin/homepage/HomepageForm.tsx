"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";

export default function HomepageForm({ heroImageUrl }: { heroImageUrl: string }) {
  const router = useRouter();
  const [hero, setHero] = useState(heroImageUrl);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroImageUrl: next })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setError(data.error ?? "Could not save.");
      return;
    }
    setHero(next);
    setStatus("saved");
    router.refresh();
  }

  return (
    <section className="admin-panel">
      <p className="admin-kicker">Hero image</p>
      <p className="mt-2 max-w-xl text-sm text-soft-500">
        Shown centred on the homepage, under the VINX wordmark, before the product grid. It floats on white
        with nothing around it — so use a{" "}
        <strong className="font-medium text-soft-700">pure white background or a transparent PNG</strong>,
        or the photo&apos;s own background will show as a rectangle.
      </p>

      <div className="mt-6">
        {/* Saves as soon as the upload finishes. A separate Save button after
            an upload is a step people forget, and the result is an image that
            looks uploaded in the form and never appears on the site. */}
        <ImageUploadField
          label="Image"
          value={hero}
          onChange={(url) => void save(url)}
          onRemove={() => void save("")}
          hint="JPEG, PNG or WebP, under 8MB. Portrait or square works best."
        />
      </div>

      <p className="mt-4 text-xs text-soft-400" aria-live="polite">
        {status === "saving" && "Saving…"}
        {status === "saved" && (hero ? "Live on the homepage." : "Removed. The homepage opens on the grid.")}
      </p>
      {error && <p className="mt-2 text-sm text-vienna-red">{error}</p>}
    </section>
  );
}
