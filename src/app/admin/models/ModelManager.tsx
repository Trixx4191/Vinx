"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";

export type ModelRecord = {
  id: string;
  name: string;
  gender: string;
  heightCm: number | null;
  wearingSize: string | null;
  referenceImageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  shotCount: number;
};

type Draft = {
  name: string;
  gender: string;
  heightCm: string;
  wearingSize: string;
  referenceImageUrl: string;
  displayOrder: string;
  isActive: boolean;
};

const EMPTY: Draft = {
  name: "",
  gender: "Women",
  heightCm: "",
  wearingSize: "",
  referenceImageUrl: "",
  displayOrder: "0",
  isActive: true
};

function draftOf(model: ModelRecord): Draft {
  return {
    name: model.name,
    gender: model.gender,
    heightCm: model.heightCm?.toString() ?? "",
    wearingSize: model.wearingSize ?? "",
    referenceImageUrl: model.referenceImageUrl ?? "",
    displayOrder: model.displayOrder.toString(),
    isActive: model.isActive
  };
}

export default function ModelManager({ models }: { models: ModelRecord[] }) {
  const router = useRouter();
  // `null` means the create form; a string means that model is being edited.
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
  }

  function openEdit(model: ModelRecord) {
    setEditing(model.id);
    setDraft(draftOf(model));
    setError(null);
  }

  function close() {
    setEditing(undefined);
    setError(null);
  }

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const res = await fetch(editing ? `/api/admin/models/${editing}` : "/api/admin/models", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      // heightCm and displayOrder go as the raw strings the inputs hold; the
      // schema coerces them, and sending "" is how "no height" is expressed.
      body: JSON.stringify(draft)
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save this model.");
      return;
    }

    close();
    router.refresh();
  }

  async function remove(model: ModelRecord) {
    if (!confirm(`Delete ${model.name}? This cannot be undone.`)) return;
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/admin/models/${model.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      // The common case here is a model who appears in products, which the API
      // refuses with an explanation of what to do instead. Surfacing that text
      // is the whole point of showing it.
      setError(data.error ?? "Could not delete this model.");
      return;
    }

    router.refresh();
  }

  async function toggleActive(model: ModelRecord) {
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/admin/models/${model.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftOf(model), isActive: !model.isActive })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not update this model.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="border-l-2 border-vienna-red pl-3 text-sm text-vienna-red">{error}</p>}

      <section className="admin-panel p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="admin-kicker">Shoot roster</p>
            <p className="mt-2 text-sm text-soft-500">
              {models.length === 0
                ? "No models yet. Add the people your catalog is shot on."
                : `${models.length} ${models.length === 1 ? "model" : "models"}, ${
                    models.filter((model) => model.isActive).length
                  } active.`}
            </p>
          </div>
          <button type="button" onClick={openCreate} className="btn-secondary shrink-0 px-3 py-2 text-xs">
            Add model
          </button>
        </div>

        {models.length > 0 && (
          <div className="mt-6 space-y-3">
            {models.map((model) => (
              <div
                key={model.id}
                className="flex items-center gap-4 border-b border-soft-200/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="h-16 w-12 shrink-0 border border-soft-200 bg-white">
                  {model.referenceImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={model.referenceImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.1em] text-soft-300">
                      —
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-soft-700">
                    {model.name}
                    {!model.isActive && (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-soft-400">Retired</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-soft-400">
                    {[
                      model.gender,
                      model.heightCm ? `${model.heightCm}cm` : null,
                      model.wearingSize ? `wears ${model.wearingSize}` : null,
                      `${model.shotCount} ${model.shotCount === 1 ? "product" : "products"}`
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(model)}
                    className="text-xs text-soft-500 hover:text-soft-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(model)}
                    disabled={busy}
                    className="text-xs text-soft-500 hover:text-soft-800 disabled:opacity-40"
                  >
                    {model.isActive ? "Retire" : "Restore"}
                  </button>
                  {/* Deleting is only offered where it can actually succeed.
                      The API refuses a delete while shots reference the model,
                      so showing the button then would be an invitation to hit
                      an error message. */}
                  {model.shotCount === 0 && (
                    <button
                      type="button"
                      onClick={() => remove(model)}
                      disabled={busy}
                      className="text-xs text-soft-400 hover:text-vienna-red disabled:opacity-40"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing !== undefined && (
        <form onSubmit={save} className="admin-panel p-5 sm:p-7">
          <p className="admin-kicker">{editing ? "Edit model" : "New model"}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Name</span>
              <input
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                required
                className="input-soft"
              />
            </label>

            <label className="block">
              <span className="field-label">Gender</span>
              <input
                value={draft.gender}
                onChange={(event) => set("gender", event.target.value)}
                placeholder="Women / Men / Unisex"
                required
                className="input-soft"
              />
            </label>

            <label className="block">
              <span className="field-label">Height (cm)</span>
              <input
                type="number"
                min="100"
                max="250"
                value={draft.heightCm}
                onChange={(event) => set("heightCm", event.target.value)}
                className="input-soft"
              />
            </label>

            <label className="block">
              <span className="field-label">Size worn</span>
              <input
                value={draft.wearingSize}
                onChange={(event) => set("wearingSize", event.target.value)}
                placeholder="M"
                className="input-soft"
              />
            </label>

            <label className="block">
              <span className="field-label">Order in the picker</span>
              <input
                type="number"
                min="0"
                value={draft.displayOrder}
                onChange={(event) => set("displayOrder", event.target.value)}
                className="input-soft"
              />
            </label>
          </div>

          <p className="mt-4 text-xs text-soft-400">
            Height and size worn appear beside the photograph on the storefront — &ldquo;on {draft.name || "…"}
            {draft.heightCm ? `, ${draft.heightCm}cm` : ""}
            {draft.wearingSize ? `, wearing ${draft.wearingSize}` : ""}&rdquo;. They are what make a model shot
            useful for judging fit rather than just decorative.
          </p>

          <div className="mt-5 border-t border-soft-200 pt-5">
            <ImageUploadField
              label="Reference portrait"
              hint="Optional. A shot of the model alone, used to identify them in the product form."
              value={draft.referenceImageUrl}
              onChange={(value) => set("referenceImageUrl", value)}
              onRemove={() => set("referenceImageUrl", "")}
            />
          </div>

          <label className="mt-5 flex items-center gap-3 text-sm text-soft-600">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => set("isActive", event.target.checked)}
              className="accent-soft-700"
            />
            Offer this model when adding products
          </label>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary px-6 py-3">
              {busy ? "Saving…" : editing ? "Save changes" : "Add model"}
            </button>
            <button type="button" onClick={close} className="btn-secondary px-6 py-3">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
