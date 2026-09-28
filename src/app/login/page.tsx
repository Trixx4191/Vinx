"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { safeCallbackPath } from "@/lib/safeRedirect";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  // Why they are here, when a sign-out sent them. Without it, being signed out
  // after changing a password looks like the site broke.
  const reason = searchParams.get("reason");
  const notice =
    reason === "password-changed"
      ? "Password changed. Sign in with the new one."
      : reason === "signed-out-everywhere"
        ? "Signed out on every device."
        : null;
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
    <div className="mx-auto max-w-xs py-20 sm:py-28">
      <h1 className="text-center">Sign in</h1>
      {notice && (
        <p role="status" className="type-micro mt-3 text-center text-[var(--muted)]">
          {notice}
        </p>
      )}

      {/* No panel. A bordered card around a login form adds a second frame
          inside a page that is already mostly empty space — the form reads
          more clearly as bare fields on the page itself. */}
      <form onSubmit={handleSubmit} className="mt-12">
        <div className="space-y-7">
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
              className="input-soft disabled:opacity-40"
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
              className="input-soft disabled:opacity-40"
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
                className="input-soft tracking-[0.3em]"
              />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="type-micro mt-6 text-[var(--error)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-10 w-full disabled:opacity-40">
          {loading ? "Logging in…" : needsCode ? "Verify" : "Log in"}
        </button>
      </form>

      <p className="type-micro mt-10 text-center text-[var(--muted)]">
        New to Vinx?{" "}
        <Link href="/signup" className="text-black underline underline-offset-4 transition-opacity hover:opacity-50">
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
