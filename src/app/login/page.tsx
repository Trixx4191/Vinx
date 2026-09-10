"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

function LoginForm() {
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
    <div className="page-enter mx-auto max-w-md py-4 sm:py-10">
      <div className="mb-8 text-center">
        <BrandMark href={null} className="text-base" />
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / account</p>
        <h1 className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-soft-700">Welcome back</h1>
        <p className="mt-2 text-sm text-soft-500">Log in to continue to your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-[2rem] p-6 sm:p-9">
        <div className="space-y-5">
        <div>
          <label className="field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
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
          <label className="field-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
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
            <label className="field-label" htmlFor="login-code">
              Authenticator code
            </label>
            <input
              id="login-code"
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
        </div>
        {error && <p role="alert" className="rounded-2xl bg-red-50/80 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-7 w-full py-3.5 disabled:opacity-60">
          {loading ? "Logging in..." : needsCode ? "Verify" : "Log in"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-soft-500">
        New to Vinx?
        <Link href="/signup" className="font-medium text-soft-700 transition-opacity hover:opacity-70">
          {" "}Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16" />}>
      <LoginForm />
    </Suspense>
  );
}
