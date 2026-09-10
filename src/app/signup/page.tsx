"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="signup-page page-enter mx-auto max-w-md py-4 sm:py-10">
      <div className="mb-8 text-center">
        <BrandMark href={null} className="text-base" />
        <p className="mt-7 text-[10px] uppercase tracking-[0.2em] text-soft-400">Vinx / account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-soft-700">Create your account</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-soft-500">
          Save your details and keep your Vinx pieces close.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-[2rem] p-6 sm:p-9">
        <div className="space-y-5">
        <div>
          <label className="field-label" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-soft"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input-soft"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
            className="input-soft"
          />
          <p className="mt-2 text-xs leading-relaxed text-soft-400">Use at least 10 characters with one letter and one number.</p>
        </div>
        </div>
        {error && <p role="alert" className="rounded-2xl bg-red-50/80 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-7 w-full py-3.5 disabled:opacity-60">
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-soft-400">
          By creating an account, you agree to receive updates about your Vinx orders and account.
        </p>
      </form>

      <p className="mt-7 text-center text-sm text-soft-500">
        Already have an account?
        <Link href="/login" className="font-medium text-soft-700 transition-opacity hover:opacity-70">
          {" "}Log in
        </Link>
      </p>
    </div>
  );
}
