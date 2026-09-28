"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";
import { swatchColour } from "@/lib/swatch";

type VariantRow = { size: string; color: string; colorHex?: string; sku: string; quantity: number };
type ModelShotRow = { modelId: string; imageUrl: string };
export type ModelOption = { id: string; name: string; gender: string; heightCm: number | null; wearingSize: string | null; referenceImageUrl: string | null; isActive: boolean };
type ProductFormData = { id?: string; name: string; description: string; material: string; price: number; categorySlug: string; frontImageUrl: string; backImageUrl: string; hoverVideoUrl?: string; galleryImages: string[]; modelShots: ModelShotRow[]; isPublished: boolean; variants: VariantRow[]; releaseAt?: string; earlyAccessAt?: string };

// Matches the cap in createProductSchema, so the form can't offer a slot the
// API would reject.
const MAX_GALLERY_IMAGES = 8;
const MAX_MODEL_SHOTS = 5;

export default function AdminProductForm({ initial, models = [] }: { initial?: ProductFormData; models?: ModelOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>(initial ?? { name: "", description: "", material: "", price: 0, categorySlug: "", frontImageUrl: "", backImageUrl: "", hoverVideoUrl: "", galleryImages: [], modelShots: [], isPublished: true, releaseAt: "", earlyAccessAt: "", variants: [{ size: "", color: "", sku: "", quantity: 0 }] });
  // The edit page passes drop dates as stored instants (ISO, UTC). They are
  // turned into local wall-clock values for the inputs HERE, after mount, in
  // the admin's browser — the page itself renders on the server, and converting
  // there would use the server's timezone and shift every drop by the gap.
  useEffect(() => {
    setForm((current) => ({
      ...current,
      releaseAt: current.releaseAt?.includes("Z") ? toLocalInput(current.releaseAt) : current.releaseAt,
      earlyAccessAt: current.earlyAccessAt?.includes("Z") ? toLocalInput(current.earlyAccessAt) : current.earlyAccessAt
    }));
  }, []);
  const [priceText, setPriceText] = useState(initial ? (initial.price / 100).toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function setField(field: keyof ProductFormData, value: string | boolean | string[]) { setForm((current) => ({ ...current, [field]: value })); }
  function addGalleryImage(url: string) { setForm((current) => current.galleryImages.length >= MAX_GALLERY_IMAGES ? current : { ...current, galleryImages: [...current.galleryImages, url] }); }
  function removeGalleryImage(index: number) { setForm((current) => ({ ...current, galleryImages: current.galleryImages.filter((_, imageIndex) => imageIndex !== index) })); }
  function updateVariant(index: number, field: keyof VariantRow, value: string) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant;

        const next = {
          ...variant,
          [field]: field === "quantity" ? Math.max(0, Number(value) || 0) : value
        };

        // Typing a colour name seeds the swatch with the storefront's own
        // guess at that colour, so the picker opens somewhere close instead of
        // at black. Only while the admin has not set one themselves — once
        // they pick a colour, retyping the name must not overwrite it.
        if (field === "color" && !variant.colorHex) {
          const guess = swatchColour(value);
          if (guess.startsWith("#")) next.colorHex = guess;
        }

        return next;
      })
    }));
  }
  function removeVariant(index: number) { setForm((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) })); }

  // A model already carrying a shot on this product is not offered again: the
  // database allows one shot per model per product, and offering a duplicate
  // would only produce a rejected save.
  const usedModelIds = new Set(form.modelShots.map((shot) => shot.modelId));
  const selectableModels = models.filter((model) => model.isActive && !usedModelIds.has(model.id));
  const [pendingModelId, setPendingModelId] = useState("");
  // Falls back to a placeholder record so a shot whose model was retired — or
  // deleted from under an open form — still renders with something readable
  // instead of crashing on an undefined name.
  function modelById(id: string): ModelOption {
    return models.find((model) => model.id === id) ?? { id, name: "Unknown model", gender: "", heightCm: null, wearingSize: null, referenceImageUrl: null, isActive: false };
  }
  function addModelShot(imageUrl: string) {
    setForm((current) => {
      if (!pendingModelId || current.modelShots.length >= MAX_MODEL_SHOTS) return current;
      if (current.modelShots.some((shot) => shot.modelId === pendingModelId)) return current;
      return { ...current, modelShots: [...current.modelShots, { modelId: pendingModelId, imageUrl }] };
    });
    // Cleared so the next upload cannot silently attach to the model just used.
    setPendingModelId("");
  }
  function removeModelShot(modelId: string) { setForm((current) => ({ ...current, modelShots: current.modelShots.filter((shot) => shot.modelId !== modelId) })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setSaved(false);
    if (!form.frontImageUrl || !form.backImageUrl) { setError("Upload both product images before saving."); return; }
    if (form.variants.length === 0 || form.variants.some((variant) => !variant.size || !variant.color || !variant.sku)) { setError("Complete every variant row before saving."); return; }
    setLoading(true);
    const payload = {
      ...form,
      price: Math.round(Number(priceText) * 100),
      currency: "GHS",
      // <input type="datetime-local"> gives a wall-clock time with no zone.
      // Converting here, in the admin's browser, turns it into the instant they
      // meant — the server would otherwise have to guess which timezone "12:00"
      // was in, and would guess its own.
      releaseAt: toInstant(form.releaseAt),
      earlyAccessAt: toInstant(form.earlyAccessAt)
    };
    const res = await fetch(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({})); setLoading(false);
    if (!res.ok) { setError(data.error ?? "Could not save product."); return; }
    setSaved(true); router.push("/admin/products"); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-6">
    <section className="admin-panel p-5 sm:p-7"><p className="admin-kicker">01 / Basic information</p><div className="mt-5 space-y-4"><label className="block"><span className="field-label">Product name</span><input value={form.name} onChange={(event) => setField("name", event.target.value)} required className="input-soft" /></label><label className="block"><span className="field-label">Description</span><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} required rows={4} className="input-soft" /></label><label className="block"><span className="field-label">Material</span><input value={form.material} onChange={(event) => setField("material", event.target.value)} required className="input-soft" /></label></div></section>
    <section className="admin-panel p-5 sm:p-7"><p className="admin-kicker">02 / Pricing and category</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block"><span className="field-label">Price (GHS)</span><input type="number" min="0.01" step="0.01" value={priceText} onChange={(event) => setPriceText(event.target.value)} required className="input-soft" /></label><label className="block"><span className="field-label">Category slug</span><input value={form.categorySlug} onChange={(event) => setField("categorySlug", event.target.value)} placeholder="t-shirts" required className="input-soft" /></label></div><label className="mt-5 flex items-center gap-3 text-sm text-soft-600"><input type="checkbox" checked={form.isPublished} onChange={(event) => setField("isPublished", event.target.checked)} className="accent-soft-700" /> Published on the storefront</label></section>
    <section className="admin-panel p-5 sm:p-7">
      <p className="admin-kicker">03 / Media</p>
      <p className="mt-2 text-sm text-soft-500">Front and back are required. The video and detail shots are optional.</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <ImageUploadField label="Front image" value={form.frontImageUrl} onChange={(value) => setField("frontImageUrl", value)} />
        <ImageUploadField label="Back image" value={form.backImageUrl} onChange={(value) => setField("backImageUrl", value)} />
      </div>

      <div className="mt-6 border-t border-soft-200 pt-5">
        <ImageUploadField
          kind="video"
          label="Hover video"
          hint="MP4, 3–8 seconds, no audio. Plays when a shopper hovers the product tile."
          value={form.hoverVideoUrl ?? ""}
          onChange={(value) => setField("hoverVideoUrl", value)}
          onRemove={() => setField("hoverVideoUrl", "")}
        />
      </div>

      <div className="mt-6 border-t border-soft-200 pt-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="field-label">Detail shots</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-soft-400">{form.galleryImages.length} / {MAX_GALLERY_IMAGES}</span>
        </div>

        {form.galleryImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {form.galleryImages.map((url, index) => (
              <div key={url} className="relative border border-soft-200 bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Detail shot ${index + 1}`} className="h-24 w-20 object-cover" />
                <button type="button" onClick={() => removeGalleryImage(index)} className="absolute right-1 top-1 bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-soft-500 hover:text-vienna-red">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {form.galleryImages.length < MAX_GALLERY_IMAGES && (
          <div className="mt-3">
            {/* Uploading here appends rather than replaces, so the same field
                can be used repeatedly to build the set up. */}
            <ImageUploadField label="Add a detail shot" value="" onChange={addGalleryImage} />
          </div>
        )}
      </div>
    </section>

    <section className="admin-panel p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-2">
        <p className="admin-kicker">04 / Model view</p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-soft-400">{form.modelShots.length} / {MAX_MODEL_SHOTS}</span>
      </div>
      <p className="mt-2 max-w-xl text-sm text-soft-500">
        Optional. Upload an image of a model wearing this piece and it leads the gallery on the product
        page, captioned with their height and the size they have on. It is shown exactly like the product
        shots — no frame — so produce it on a pure white background or as a transparent PNG.
      </p>

      {models.length === 0 ? (
        <p className="mt-4 text-sm text-soft-500">
          No models on the roster yet. Add them under <a href="/admin/models" className="underline decoration-soft-300 underline-offset-4 hover:text-soft-800">Models</a> first.
        </p>
      ) : (
        <>
          {form.modelShots.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {form.modelShots.map((shot) => {
                const model = modelById(shot.modelId);
                return (
                  <div key={shot.modelId} className="relative w-24 border border-soft-200 bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.imageUrl} alt={`${model.name} wearing this product`} className="h-28 w-full object-cover" />
                    <p className="mt-1 truncate px-0.5 text-[10px] text-soft-500" title={model.name}>{model.name}</p>
                    <p className="truncate px-0.5 text-[10px] text-soft-400">
                      {[model.heightCm ? `${model.heightCm}cm` : null, model.wearingSize ? model.wearingSize : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <button type="button" onClick={() => removeModelShot(shot.modelId)} aria-label={`Remove ${model.name}'s shot`} className="absolute right-1 top-1 bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-soft-500 hover:text-vienna-red">
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {form.modelShots.length < MAX_MODEL_SHOTS && (
            <div className="mt-5 border-t border-soft-200 pt-5">
              {selectableModels.length === 0 ? (
                <p className="text-sm text-soft-500">Every active model already has a shot on this product.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">Model</span>
                    <select value={pendingModelId} onChange={(event) => setPendingModelId(event.target.value)} className="input-soft">
                      <option value="">Choose a model…</option>
                      {selectableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} — {[model.gender, model.heightCm ? `${model.heightCm}cm` : null].filter(Boolean).join(", ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    {/* The upload is gated on a model being chosen, because the
                        image alone does not say who is in it. Rendering the
                        field only once a model is picked makes the order
                        obvious without an error message. */}
                    {pendingModelId ? (
                      <ImageUploadField label={`Shot of ${modelById(pendingModelId).name}`} hint="This model wearing this piece, on a pure white background or as a transparent PNG — it floats on the page exactly like the product shots." value="" onChange={addModelShot} />
                    ) : (
                      <div>
                        <span className="field-label">Shot</span>
                        <p className="mt-1 text-xs text-soft-400">Choose a model first.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>

    <section className="admin-panel p-5 sm:p-7">
      <p className="admin-kicker">05 / Drop</p>
      <p className="mt-2 max-w-xl text-sm text-soft-500">
        Optional. Leave both empty and the product is live as soon as it is published. Set a drop date and it
        stays hidden until then; add an early-access time and VIP members can see and buy it from that moment,
        before everyone else.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">VIP early access from</span>
          <input
            type="datetime-local"
            value={form.earlyAccessAt ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, earlyAccessAt: event.target.value }))}
            className="input-soft"
          />
        </label>
        <label className="block">
          <span className="field-label">Drop — open to everyone</span>
          <input
            type="datetime-local"
            value={form.releaseAt ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, releaseAt: event.target.value }))}
            className="input-soft"
          />
        </label>
      </div>
      {(form.releaseAt || form.earlyAccessAt) && (
        <button
          type="button"
          onClick={() => setForm((current) => ({ ...current, releaseAt: "", earlyAccessAt: "" }))}
          className="mt-4 text-xs text-soft-400 underline underline-offset-4 hover:text-soft-700"
        >
          Clear both — make it live now
        </button>
      )}
      <p className="mt-4 text-xs text-soft-400">Times are in your computer&apos;s timezone.</p>
    </section>

    <section className="admin-panel p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="admin-kicker">06 / Variants and inventory</p><p className="mt-2 text-sm text-soft-500">Each size, color, and SKU combination is tracked separately.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, { size: "", color: "", colorHex: "", sku: "", quantity: 0 }] }))} className="btn-secondary shrink-0 px-3 py-2 text-xs">Add variant</button></div>
      <p className="mt-3 text-xs text-soft-400">The swatch beside each colour is what shoppers see on the grid. It is seeded from the colour name — adjust it to match the actual garment.</p>
      <div className="mt-5 space-y-3">
        {form.variants.map((variant, index) => (
          <div key={`${variant.sku}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_1.4fr_0.7fr_auto] sm:items-center">
            <input placeholder="Size" value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} required className="input-soft py-2.5" />
            <input placeholder="Color" value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} required className="input-soft py-2.5" />
            <input
              type="color"
              aria-label={`Swatch colour for ${variant.color || `variant ${index + 1}`}`}
              title="Swatch shown on the product grid"
              value={variant.colorHex && /^#[0-9a-fA-F]{6}$/.test(variant.colorHex) ? variant.colorHex : "#c2bdb4"}
              onChange={(event) => updateVariant(index, "colorHex", event.target.value)}
              className="h-9 w-12 cursor-pointer border border-soft-300 bg-white p-1"
            />
            <input placeholder="SKU" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} required className="input-soft py-2.5" />
            <input placeholder="Qty" type="number" min="0" value={variant.quantity} onChange={(event) => updateVariant(index, "quantity", event.target.value)} required className="input-soft py-2.5" />
            <button type="button" onClick={() => removeVariant(index)} disabled={form.variants.length === 1} className="px-2 text-xs text-soft-400 hover:text-vienna-red disabled:opacity-30">Remove</button>
          </div>
        ))}
      </div>
    </section>
    {error && <p className="border-l-2 border-vienna-red pl-3 text-sm text-vienna-red">{error}</p>}{saved && <p className="border-l-2 border-vienna-green pl-3 text-sm text-soft-600">Product saved.</p>}<button type="submit" disabled={loading} className="btn-primary w-full py-3.5 sm:w-auto">{loading ? "Saving product..." : form.id ? "Save changes" : "Create product"}</button>
  </form>;
}

/** A datetime-local value ("2026-10-12T12:00") as an ISO instant, or "" when empty. */
function toInstant(local: string | undefined): string {
  if (!local) return "";
  const date = new Date(local); // parsed in the browser's own timezone
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** An ISO instant as a datetime-local value in the browser's timezone — the inverse of `toInstant`. */
function toLocalInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
