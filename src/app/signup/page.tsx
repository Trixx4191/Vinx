"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
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

    if (!res.ok) {
      setLoading(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    // Signed straight in. Sending someone who has just chosen a password to a
    // login form to type it again is a step that loses people — and it was
    // how the account page's VIP and photo features went unfound.
    const signedIn = await signIn("credentials", { email, password, redirect: false });
    if (signedIn?.error) {
      window.location.assign("/login");
      return;
    }
    window.location.assign("/account");
  }

  return (
    <div className="mx-auto max-w-xs py-20 sm:py-28">
      <h1 className="text-center">Create account</h1>

      <form onSubmit={handleSubmit} className="mt-12">
        <div className="space-y-7">
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
              autoComplete="name"
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
            <p className="mt-3 text-xs leading-relaxed text-soft-400">
              At least 10 characters, with one letter and one number.
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="type-micro mt-6 text-[var(--error)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-10 w-full disabled:opacity-40">
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-soft-400">
          By creating an account, you agree to receive updates about your Vinx orders and account.
        </p>
      </form>

      <p className="type-micro mt-10 text-center text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-black underline underline-offset-4 transition-opacity hover:opacity-50">
          Log in
        </Link>
      </p>
    </div>
  );
}
