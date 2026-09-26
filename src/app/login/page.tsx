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
    <div className="page-enter mx-auto max-w-sm py-16 sm:py-24">
      <div className="text-center">
        <BrandMark href={null} className="text-[15px]" />
        <p className="type-micro mt-8 text-soft-400">Vinx / Account</p>
        <h1 className="type-display mt-4 text-3xl text-soft-800">Welcome back</h1>
        <p className="mt-4 text-sm text-soft-500">Log in to continue to your account.</p>
      </div>

      {/* No panel. A bordered card around a login form adds a second frame
          inside a page that is already mostly empty space — the form reads
          more clearly as bare fields on the page itself. */}
      <form onSubmit={handleSubmit} className="mt-12">
        <div className="space-y-7">
          <div>
            <label className="type-micro mb-2 block text-soft-400" htmlFor="login-email">
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
              className="input-soft disabled:opacity-40"
            />
          </div>

          <div>
            <label className="type-micro mb-2 block text-soft-400" htmlFor="login-password">
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
              className="input-soft disabled:opacity-40"
            />
          </div>

          {needsCode && (
            <div>
              <label className="type-micro mb-2 block text-soft-400" htmlFor="login-code">
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
                className="input-soft tracking-[0.3em]"
              />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-6 border-l-2 border-vienna-red pl-3 text-sm text-vienna-red">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-10 w-full disabled:opacity-40">
          {loading ? "Logging in…" : needsCode ? "Verify" : "Log in"}
        </button>
      </form>

      <p className="mt-10 text-center text-sm text-soft-500">
        New to Vinx?{" "}
        <Link href="/signup" className="text-soft-800 underline underline-offset-4 transition-opacity hover:opacity-50">
          Create an account
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
