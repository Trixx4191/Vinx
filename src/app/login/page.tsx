"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl");
  const callbackUrl = requestedCallback?.startsWith("/") ? requestedCallback : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        code,
        redirect: false,
        callbackUrl
      });

      if (res?.error === "2FA_REQUIRED") {
        setNeedsCode(true);
        setLoading(false);
        return;
      }

      if (res?.error) {
        setError(needsCode ? "Invalid code" : "Invalid email or password");
        setLoading(false);
        return;
      }

      // NextAuth has already set the httpOnly session cookie. Use its returned
      // URL and refresh the document so middleware sees the new token before
      // rendering a protected route.
      window.location.assign(res?.url ?? callbackUrl);
    } catch {
      setError("Login is temporarily unavailable. Check that the server and database are running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-enter mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / account</p>
        <h1 className="text-2xl font-semibold tracking-tight text-soft-700">Log in</h1>
        <p className="mt-1 text-sm text-soft-500">Welcome back</p>
      </div>

      <form onSubmit={handleSubmit} className="glass space-y-4 rounded-3xl p-6 sm:p-8">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={needsCode}
            autoComplete="email"
            className="input-soft disabled:opacity-60"
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
            disabled={needsCode}
            autoComplete="current-password"
            className="input-soft disabled:opacity-60"
          />
        </div>
        {needsCode && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">
              Authenticator code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              className="input-soft"
            />
          </div>
        )}
        {error && <p role="alert" className="rounded-2xl bg-red-50/80 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
          {loading ? "Logging in..." : needsCode ? "Verify" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-soft-500">
        No account?{" "}
        <Link href="/signup" className="font-medium text-soft-700 transition-opacity hover:opacity-70">
          Sign up
        </Link>
      </p>
    </div>
  );
}
