"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div className="page-enter mx-auto max-w-sm">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-soft-700">Sign up</h1>
        <p className="mt-1 text-sm text-soft-500">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="glass mt-8 space-y-4 rounded-3xl p-6 sm:p-8">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-soft"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input-soft"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="input-soft"
          />
        </div>
        {error && <p className="text-sm text-red-500/90">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-soft-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-soft-700 transition-opacity hover:opacity-70">
          Log in
        </Link>
      </p>
    </div>
  );
}
