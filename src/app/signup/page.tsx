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
    <div className="signup-page page-enter mx-auto max-w-sm py-16 sm:py-24">
      <div className="text-center">
        <BrandMark href={null} className="text-[15px]" />
        <p className="type-micro mt-8 text-soft-400">Vinx / Account</p>
        <h1 className="type-display mt-4 text-3xl text-soft-800">Create your account</h1>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-soft-500">
          Save your details and keep your Vinx pieces close.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-12">
        <div className="space-y-7">
          <div>
            <label className="type-micro mb-2 block text-soft-400" htmlFor="signup-name">
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
            <label className="type-micro mb-2 block text-soft-400" htmlFor="signup-email">
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
            <label className="type-micro mb-2 block text-soft-400" htmlFor="signup-password">
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
          <p role="alert" className="mt-6 border-l-2 border-vienna-red pl-3 text-sm text-vienna-red">
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

      <p className="mt-10 text-center text-sm text-soft-500">
        Already have an account?{" "}
        <Link href="/login" className="text-soft-800 underline underline-offset-4 transition-opacity hover:opacity-50">
          Log in
        </Link>
      </p>
    </div>
  );
}
