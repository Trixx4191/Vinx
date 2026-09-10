"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";

type VariantRow = { size: string; color: string; sku: string; quantity: number };

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [frontImageUrl, setFrontImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([{ size: "", color: "", sku: "", quantity: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateVariant(i: number, field: keyof VariantRow, value: string) {
    setVariants((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, [field]: field === "quantity" ? Number(value) : value } : v))
    );
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { size: "", color: "", sku: "", quantity: 0 }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!frontImageUrl || !backImageUrl) {
      setError("Upload both a front and back image first");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        material,
        price: Math.round(Number(price) * 100), // convert cedis to pesewas
        categorySlug,
        frontImageUrl,
        backImageUrl,
        variants
      })
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create product");
      return;
    }

    router.push("/admin/products");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">Add product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className="mt-1 w-full border border-gray-300 px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Material</label>
            <input value={material} onChange={(e) => setMaterial(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm">Price (GHS)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm">Category slug</label>
          <input value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} placeholder="t-shirts" required className="mt-1 w-full border border-gray-300 px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ImageUploadField label="Front image" value={frontImageUrl} onChange={setFrontImageUrl} />
          <ImageUploadField label="Back image" value={backImageUrl} onChange={setBackImageUrl} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Variants</p>
          {variants.map((v, i) => (
            <div key={i} className="mb-2 grid grid-cols-4 gap-2">
              <input placeholder="Size" value={v.size} onChange={(e) => updateVariant(i, "size", e.target.value)} required className="border border-gray-300 px-2 py-1 text-sm" />
              <input placeholder="Color" value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} required className="border border-gray-300 px-2 py-1 text-sm" />
              <input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} required className="border border-gray-300 px-2 py-1 text-sm" />
              <input placeholder="Qty" type="number" value={v.quantity} onChange={(e) => updateVariant(i, "quantity", e.target.value)} required className="border border-gray-300 px-2 py-1 text-sm" />
            </div>
          ))}
          <button type="button" onClick={addVariantRow} className="text-sm underline">
            + Add another variant
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="bg-black px-6 py-2 text-sm text-white disabled:bg-gray-300">
          {loading ? "Saving..." : "Create product"}
        </button>
      </form>
    </div>
  );
}
