"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The sign-up panel that slides up from the bottom of the storefront.
 *
 * Deliberately not a modal. It does not cover the page, trap focus or block
 * scrolling — a shopper who wants to keep browsing can ignore it entirely, and
 * an interstitial that has to be dismissed before the catalog can be read is
 * both hostile and, on mobile, penalised by search engines.
 *
 * Dismissal is remembered in `localStorage`, so it appears once rather than on
 * every page. Storage is wrapped because it throws outright in Safari's private
 * mode; the fallback is simply that the panel shows again, which is a far better
 * failure than a page that will not render.
 */

const STORAGE_KEY = "vinx:newsletter-dismissed";

/** How long to wait before appearing, in milliseconds. */
const DELAY = 6000;

function alreadyHandled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function remember() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private mode. The panel will show again next visit; nothing else breaks.
  }
}

export default function NewsletterPopup() {
  const pathname = usePathname();
  // Never in the back office, and never over the checkout: a sign-up panel
  // sliding up while someone is entering card details is the worst possible
  // moment to interrupt, and it covers the pay button on a phone.
  const suppressed =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/cart");

  // `mounted` controls whether the element is in the DOM at all; `open` drives
  // the transition. They are separate so the panel can animate out and only
  // then be removed — unmounting on dismiss would make it vanish on a frame,
  // which is the thing the animation exists to avoid.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (suppressed || alreadyHandled()) return;

    const timer = setTimeout(() => {
      setMounted(true);
      // A frame between mounting and opening, so the browser has a resting
      // state to transition *from*. Setting both in the same tick means the
      // element is created already open and the transition never runs.
      requestAnimationFrame(() => setOpen(true));
    }, DELAY);

    return () => clearTimeout(timer);
  }, [suppressed]);

  // Navigating into checkout while it is open takes it away rather than leaving
  // it sitting over the payment step.
  useEffect(() => {
    if (suppressed && mounted) {
      setOpen(false);
      setMounted(false);
    }
  }, [suppressed, mounted]);

  const dismiss = useCallback(() => {
    setOpen(false);
    remember();
    exitTimer.current = setTimeout(() => setMounted(false), 500);
  }, []);

  // Escape closes it, like any other dismissible surface.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "popup" })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Could not sign you up. Try again shortly.");
        return;
      }

      setStatus("done");
      remember();
      // Left on screen long enough to be read, then animated away.
      exitTimer.current = setTimeout(() => {
        setOpen(false);
        exitTimer.current = setTimeout(() => setMounted(false), 500);
      }, 2200);
    } catch {
      setStatus("error");
      setError("Could not reach the server. Check your connection.");
    }
  }

  if (!mounted) return null;

  return (
    <div
      className="popup fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white"
      data-state={open ? "open" : "closed"}
      // Complementary, not a dialog: it is not modal and does not take focus.
      role="complementary"
      aria-label="Newsletter sign-up"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-[var(--gutter)] top-5 -mr-2 p-2 transition-opacity hover:opacity-40"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </button>

      <div className="mx-auto max-w-sm px-[var(--gutter)] py-7">
        {status === "done" ? (
          <p className="type-label py-6 text-center" role="status">
            You are on the list.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p className="type-label">Receive website updates</p>
            <label className="mt-3 block">
              <span className="sr-only">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="email"
                disabled={status === "sending"}
                className="input-soft"
              />
            </label>
            <button type="submit" disabled={status === "sending"} className="btn-primary mt-4 w-full">
              {status === "sending" ? "…" : "Subscribe"}
            </button>
            {error && (
              <p className="type-micro mt-3 text-[var(--error)]" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
