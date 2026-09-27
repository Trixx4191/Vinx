"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Kicker } from "@/components/luxury";

type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
} | null;

export default function AccountSettings({ address }: { address: Address }) {
  const [openPanel, setOpenPanel] = useState<"none" | "address" | "password">("none");

  return (
    <div className="mt-12 border-t border-soft-200 pt-10">
      <Kicker>Settings</Kicker>

      <div className="mt-6 divide-y divide-soft-200 border-y border-soft-200">
        <SettingRow
          title="Delivery address"
          detail={address ? `${address.line1}, ${address.city}` : "No address saved yet"}
          open={openPanel === "address"}
          onToggle={() => setOpenPanel((p) => (p === "address" ? "none" : "address"))}
        >
          <AddressForm address={address} onDone={() => setOpenPanel("none")} />
        </SettingRow>

        <SettingRow
          title="Password"
          detail="Change the password you sign in with"
          open={openPanel === "password"}
          onToggle={() => setOpenPanel((p) => (p === "password" ? "none" : "password"))}
        >
          <PasswordForm onDone={() => setOpenPanel("none")} />
        </SettingRow>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  detail,
  open,
  onToggle,
  children
}: {
  title: string;
  detail: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left transition-opacity hover:opacity-60"
      >
        <span className="min-w-0">
          <span className="block text-sm text-soft-800">{title}</span>
          <span className="mt-1 block truncate text-xs text-soft-400">{detail}</span>
        </span>
        <span aria-hidden className="shrink-0 text-base leading-none text-soft-500">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && <div className="mt-6 max-w-md">{children}</div>}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required = true,
  autoComplete
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="type-micro mb-2 block text-soft-400">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
        className="input-soft"
      />
    </label>
  );
}

function AddressForm({ address, onDone }: { address: Address; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/account/address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save your address.");
      return;
    }

    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Full name" name="fullName" defaultValue={address?.fullName ?? ""} autoComplete="name" />
      <Field label="Phone" name="phone" type="tel" defaultValue={address?.phone ?? ""} autoComplete="tel" />
      <Field label="Address" name="line1" defaultValue={address?.line1 ?? ""} autoComplete="street-address" />
      <Field
        label="Apartment, suite (optional)"
        name="line2"
        defaultValue={address?.line2 ?? ""}
        required={false}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="City" name="city" defaultValue={address?.city ?? ""} autoComplete="address-level2" />
        <Field label="Region" name="region" defaultValue={address?.region ?? ""} autoComplete="address-level1" />
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-vienna-red pl-3 text-sm text-vienna-red">
          {error}
        </p>
      )}

      <Button type="submit" loading={saving}>
        {saving ? "Saving" : "Save address"}
      </Button>
    </form>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not change your password.");
      return;
    }

    // Clear the fields rather than leaving a password sitting in the DOM.
    form.reset();
    setDone(true);
    setTimeout(onDone, 1600);
  }

  if (done) {
    return (
      <p role="status" className="border-l-2 border-vienna-green pl-3 text-sm text-soft-600">
        Your password has been changed.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
      />
      <div>
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" />
        <p className="mt-3 text-xs leading-relaxed text-soft-400">
          At least 10 characters, with one letter and one number.
        </p>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-vienna-red pl-3 text-sm text-vienna-red">
          {error}
        </p>
      )}

      <Button type="submit" loading={saving}>
        {saving ? "Changing" : "Change password"}
      </Button>
    </form>
  );
}
