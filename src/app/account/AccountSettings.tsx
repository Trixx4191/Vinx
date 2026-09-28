"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatPrice } from "@/types/product";

type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
} | null;

type Profile = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  vipActive: boolean;
  vipSince: string | null;
};

// ===========================================================================
// Header: photo, name, email, VIP status
// ===========================================================================

/**
 * The photo is the upload control: tap it to choose a new one. A separate
 * "change photo" button beside a photo is two things doing one job.
 */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    // Checked here for a fast answer; the server enforces the same limit on the
    // real bytes, which is the check that counts.
    if (file.size > 2 * 1024 * 1024) {
      setError("Photos must be under 2MB.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/avatar", {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not upload that photo.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/account/avatar", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  const initial = (profile.name ?? profile.email).trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={profile.avatarUrl ? "Change profile photo" : "Add a profile photo"}
        // A circle, and the one place the system uses one for an image: a face
        // is the only thing on the site that is conventionally round.
        className="group relative h-20 w-20 overflow-hidden rounded-full bg-soft-100 transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="type-label text-[var(--muted)]">{initial}</span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />

      <h1 className="mt-5">{profile.name ?? "Account"}</h1>
      <p className="type-micro mt-1 text-[var(--muted)]">{profile.email}</p>
      {profile.vipActive && (
        <p className="type-micro mt-3">
          VIP
          {profile.vipSince && (
            <span className="text-[var(--muted)]">
              {" "}· since {new Date(profile.vipSince).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </span>
          )}
        </p>
      )}

      <div className="mt-3 flex gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="type-micro text-[var(--muted)] transition-colors hover:text-black"
        >
          {busy ? "…" : profile.avatarUrl ? "Change photo" : "Add photo"}
        </button>
        {profile.avatarUrl && !busy && (
          <button type="button" onClick={remove} className="type-micro text-[var(--muted)] transition-colors hover:text-black">
            Remove
          </button>
        )}
      </div>
      {error && <p className="type-micro mt-2 text-[var(--error)]" role="alert">{error}</p>}
    </div>
  );
}

// ===========================================================================
// VIP
// ===========================================================================

type VipOutcome = "welcome" | "pending" | "failed" | "problem" | null;

const OUTCOME_TEXT: Record<Exclude<VipOutcome, null>, string> = {
  welcome: "Welcome to VIP.",
  pending: "Payment received — still confirming. Refresh in a minute.",
  failed: "The payment did not go through. Nothing was charged.",
  problem: "We could not apply that payment. Contact us with your email and we will sort it out."
};

/**
 * VIP: a paid membership, bought a period at a time.
 *
 * Paying again while a member extends from the current end date, so renewing
 * early never costs days. Nothing auto-renews — mobile money cannot be charged
 * without the customer approving it — so there is nothing to cancel either: it
 * simply runs out.
 */
export function VipPanel({
  active,
  vipUntil,
  prices,
  outcome
}: {
  active: boolean;
  vipUntil: string | null;
  prices: { MONTH: number | null; YEAR: number | null };
  outcome: VipOutcome;
}) {
  const [busy, setBusy] = useState<"MONTH" | "YEAR" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(plan: "MONTH" | "YEAR") {
    setBusy(plan);
    setError(null);
    const res = await fetch("/api/account/vip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.authorizationUrl) {
      setBusy(null);
      setError(data.error ?? "Could not start the payment.");
      return;
    }
    // Paystack's own page: mobile money or card. It returns here when done.
    window.location.assign(data.authorizationUrl);
  }

  const plans = (["MONTH", "YEAR"] as const).filter((plan) => prices[plan] !== null);
  const until = vipUntil ? new Date(vipUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <section id="vip" className="scroll-mt-20 text-center">
      <h2>VIP</h2>

      {outcome && (
        <p role="status" className={`type-micro mt-3 ${outcome === "welcome" ? "" : "text-[var(--muted)]"}`}>
          {OUTCOME_TEXT[outcome]}
        </p>
      )}

      <p className="type-body mx-auto mt-3 max-w-xs">
        {active
          ? `Early access to every drop, until ${until}.`
          : "Early access to new drops — see them and buy them before they open to everyone."}
      </p>

      {plans.length === 0 ? (
        <p className="type-micro mt-6 text-[var(--muted)]">Opening soon.</p>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          {active && <p className="type-micro text-[var(--muted)]">Extend</p>}
          {plans.map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => buy(plan)}
              disabled={busy !== null}
              className={`${active ? "btn-secondary" : "btn-primary"} w-full max-w-[16rem] justify-between`}
            >
              <span>{plan === "MONTH" ? "1 month" : "1 year"}</span>
              <span className="tabular-nums">{busy === plan ? "…" : formatPrice(prices[plan]!, "GHS")}</span>
            </button>
          ))}
          <p className="type-micro mt-1 text-[var(--muted)]">
            Mobile money or card. Does not renew automatically.
          </p>
        </div>
      )}

      {error && <p className="type-micro mt-3 text-[var(--error)]" role="alert">{error}</p>}
    </section>
  );
}

// ===========================================================================
// Settings rows
// ===========================================================================

export default function AccountSettings({ name, address }: { name: string | null; address: Address }) {
  const [open, setOpen] = useState<"none" | "name" | "address" | "password">("none");
  const toggle = (panel: typeof open) => setOpen((current) => (current === panel ? "none" : panel));

  return (
    <section>
      <h2 className="text-center">Settings</h2>
      <div className="mt-6">
        <Row title="Name" detail={name ?? "Not set"} open={open === "name"} onToggle={() => toggle("name")}>
          <NameForm name={name} onDone={() => setOpen("none")} />
        </Row>
        <Row
          title="Address"
          detail={address ? `${address.line1}, ${address.city}` : "None saved"}
          open={open === "address"}
          onToggle={() => toggle("address")}
        >
          <AddressForm address={address} onDone={() => setOpen("none")} />
        </Row>
        <Row title="Password" detail="••••••••••" open={open === "password"} onToggle={() => toggle("password")}>
          <PasswordForm />
        </Row>
      </div>

      <SessionActions />
    </section>
  );
}

function Row({
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
    <div className="py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-4 text-left transition-opacity hover:opacity-50"
      >
        <span className="type-label">{title}</span>
        <span className="type-label min-w-0 truncate text-[var(--muted)]">
          {open ? "Close" : detail}
        </span>
      </button>
      {open && <div className="page-enter pb-4 pt-6">{children}</div>}
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
      <span className="field-label">{label}</span>
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

function useSubmit(url: string, method: string) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function send(body: unknown): Promise<Record<string, unknown> | null> {
    setError(null);
    setSaving(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Something went wrong.");
      return null;
    }
    return data as Record<string, unknown>;
  }

  return { send, error, saving };
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="type-micro text-[var(--error)]">
      {error}
    </p>
  );
}

function NameForm({ name, onDone }: { name: string | null; onDone: () => void }) {
  const router = useRouter();
  const { send, error, saving } = useSubmit("/api/account/profile", "PATCH");

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await send(Object.fromEntries(new FormData(event.currentTarget)));
        if (ok) {
          onDone();
          router.refresh();
        }
      }}
    >
      <Field label="Name" name="name" defaultValue={name ?? ""} autoComplete="name" />
      <FormError error={error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "…" : "Save"}
      </button>
    </form>
  );
}

function AddressForm({ address, onDone }: { address: Address; onDone: () => void }) {
  const router = useRouter();
  const { send, error, saving } = useSubmit("/api/account/address", "PUT");

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await send(Object.fromEntries(new FormData(event.currentTarget)));
        if (ok) {
          onDone();
          router.refresh();
        }
      }}
    >
      <Field label="Full name" name="fullName" defaultValue={address?.fullName ?? ""} autoComplete="name" />
      <Field label="Phone" name="phone" type="tel" defaultValue={address?.phone ?? ""} autoComplete="tel" />
      <Field label="Address" name="line1" defaultValue={address?.line1 ?? ""} autoComplete="street-address" />
      <Field label="Apartment (optional)" name="line2" defaultValue={address?.line2 ?? ""} required={false} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="City" name="city" defaultValue={address?.city ?? ""} autoComplete="address-level2" />
        <Field label="Region" name="region" defaultValue={address?.region ?? ""} autoComplete="address-level1" />
      </div>
      <FormError error={error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "…" : "Save address"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const { send, error, saving } = useSubmit("/api/account/password", "POST");

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const ok = await send(Object.fromEntries(new FormData(form)));
        if (!ok) return; // keep what they typed, so a typo is one field to fix, not two
        // Clear the fields rather than leave a password sitting in the DOM.
        form.reset();
        // Changing the password ended every session, this one included — the
        // server bumped the session version. Signing out here just makes the
        // browser catch up, and lands on the login page with a reason.
        await signOut({ callbackUrl: "/login?reason=password-changed" });
      }}
    >
      <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" />
      <div>
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" />
        <p className="type-micro mt-2 text-[var(--muted)]">10+ characters, a letter and a number.</p>
      </div>
      <p className="type-micro text-[var(--muted)]">
        Changing it signs you out everywhere, including here.
      </p>
      <FormError error={error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "…" : "Change password"}
      </button>
    </form>
  );
}

function SessionActions() {
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    if (!confirm("Sign out on every device, including this one?")) return;
    setBusy(true);
    const res = await fetch("/api/account/sessions", { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      return;
    }
    await signOut({ callbackUrl: "/login?reason=signed-out-everywhere" });
  }

  return (
    <div className="mt-14 flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="btn-quiet"
      >
        Sign out
      </button>
      <button
        type="button"
        onClick={signOutEverywhere}
        disabled={busy}
        className="type-micro text-[var(--muted)] transition-colors hover:text-black disabled:opacity-40"
      >
        {busy ? "…" : "Sign out of all devices"}
      </button>
    </div>
  );
}
