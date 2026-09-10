"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";

type VariantRow = { size: string; color: string; sku: string; quantity: number };
type ProductFormData = { id?: string; name: string; description: string; material: string; price: number; categorySlug: string; frontImageUrl: string; backImageUrl: string; isPublished: boolean; variants: VariantRow[] };

export default function AdminProductForm({ initial }: { initial?: ProductFormData }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>(initial ?? { name: "", description: "", material: "", price: 0, categorySlug: "", frontImageUrl: "", backImageUrl: "", isPublished: true, variants: [{ size: "", color: "", sku: "", quantity: 0 }] });
  const [priceText, setPriceText] = useState(initial ? (initial.price / 100).toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function setField(field: keyof ProductFormData, value: string | boolean) { setForm((current) => ({ ...current, [field]: value })); }
  function updateVariant(index: number, field: keyof VariantRow, value: string) { setForm((current) => ({ ...current, variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: field === "quantity" ? Math.max(0, Number(value) || 0) : value } : variant) })); }
  function removeVariant(index: number) { setForm((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setSaved(false);
    if (!form.frontImageUrl || !form.backImageUrl) { setError("Upload both product images before saving."); return; }
    if (form.variants.length === 0 || form.variants.some((variant) => !variant.size || !variant.color || !variant.sku)) { setError("Complete every variant row before saving."); return; }
    setLoading(true);
    const payload = { ...form, price: Math.round(Number(priceText) * 100), currency: "GHS" };
    const res = await fetch(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({})); setLoading(false);
    if (!res.ok) { setError(data.error ?? "Could not save product."); return; }
    setSaved(true); router.push("/admin/products"); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-6">
    <section className="glass rounded-3xl p-5 sm:p-7"><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">01 / Basic information</p><div className="mt-5 space-y-4"><label className="block"><span className="field-label">Product name</span><input value={form.name} onChange={(event) => setField("name", event.target.value)} required className="input-soft" /></label><label className="block"><span className="field-label">Description</span><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} required rows={4} className="input-soft" /></label><label className="block"><span className="field-label">Material</span><input value={form.material} onChange={(event) => setField("material", event.target.value)} required className="input-soft" /></label></div></section>
    <section className="glass rounded-3xl p-5 sm:p-7"><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">02 / Pricing and category</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block"><span className="field-label">Price (GHS)</span><input type="number" min="0.01" step="0.01" value={priceText} onChange={(event) => setPriceText(event.target.value)} required className="input-soft" /></label><label className="block"><span className="field-label">Category slug</span><input value={form.categorySlug} onChange={(event) => setField("categorySlug", event.target.value)} placeholder="t-shirts" required className="input-soft" /></label></div><label className="mt-5 flex items-center gap-3 text-sm text-soft-600"><input type="checkbox" checked={form.isPublished} onChange={(event) => setField("isPublished", event.target.checked)} className="accent-soft-700" /> Published on the storefront</label></section>
    <section className="glass rounded-3xl p-5 sm:p-7"><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">03 / Images</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><ImageUploadField label="Front image" value={form.frontImageUrl} onChange={(value) => setField("frontImageUrl", value)} /><ImageUploadField label="Back image" value={form.backImageUrl} onChange={(value) => setField("backImageUrl", value)} /></div></section>
    <section className="glass rounded-3xl p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">04 / Variants and inventory</p><p className="mt-2 text-sm text-soft-500">Each size, color, and SKU combination is tracked separately.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, { size: "", color: "", sku: "", quantity: 0 }] }))} className="btn-secondary shrink-0 px-3 py-2 text-xs">Add variant</button></div><div className="mt-5 space-y-3">{form.variants.map((variant, index) => <div key={`${variant.sku}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_0.7fr_auto]"><input placeholder="Size" value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} required className="input-soft py-2.5" /><input placeholder="Color" value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} required className="input-soft py-2.5" /><input placeholder="SKU" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} required className="input-soft py-2.5" /><input placeholder="Qty" type="number" min="0" value={variant.quantity} onChange={(event) => updateVariant(index, "quantity", event.target.value)} required className="input-soft py-2.5" /><button type="button" onClick={() => removeVariant(index)} disabled={form.variants.length === 1} className="px-2 text-xs text-soft-400 hover:text-red-500 disabled:opacity-30">Remove</button></div>)}</div></section>
    {error && <p className="rounded-2xl bg-red-50/80 p-4 text-sm text-red-700">{error}</p>}{saved && <p className="rounded-2xl bg-emerald-50/80 p-4 text-sm text-emerald-800">Product saved.</p>}<button type="submit" disabled={loading} className="btn-primary w-full py-3.5 sm:w-auto">{loading ? "Saving product..." : form.id ? "Save changes" : "Create product"}</button>
  </form>;
}
