"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";
import { isAdminRole } from "@/lib/roles";
import { HandbagIcon } from "@/components/HandbagIcon";
import { AccountIcon } from "@/components/AccountIcon";
import BrandMark from "@/components/BrandMark";

/**
 * Shop navigation, defined once and rendered twice — the desktop bar and the
 * mobile drawer read from the same array, so the two can never drift into
 * offering different categories.
 */
const SHOP_LINKS = [
  { href: "/products", label: "All" },
  { href: "/products?category=hoodies", label: "Hoodies" },
  { href: "/products?category=t-shirts", label: "Tees" },
  { href: "/products?category=jackets", label: "Jackets" },
  { href: "/products?category=accessories", label: "Accessories" }
];

/** Repeated because a marquee needs two copies to loop without a visible seam. */
const TICKER = [
  "Free delivery in Accra over GHS 400",
  "International shipping",
  "Mobile money · Card · PayPal"
];

export default function Navbar() {
  const { data: session } = useSession();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const isAdmin = isAdminRole((session?.user as { role?: string } | undefined)?.role);
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating must close the drawer. Without this, tapping a category leaves
  // the panel sitting over the page it just loaded.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // A drawer over a page that still scrolls behind it is the classic mobile
  // menu bug. Cleanup restores the original value rather than clearing it, so
  // this cannot fight another component that also locks scrolling.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (pathname.startsWith("/admin")) return null;

  // Sentence case at normal tracking for the nav itself. Wide-tracked caps read
  // as couture formality; this is a shop you buy sweatpants from. The caps are
  // saved for labels and buttons, where they do real work.
  const linkClass = (href: string) => {
    const [path] = href.split("?");
    const active = pathname === path || (path !== "/" && pathname.startsWith(path));
    return `text-[13px] transition-colors duration-200 ${
      active ? "text-soft-800" : "text-soft-500 hover:text-soft-800"
    }`;
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-soft-200 bg-soft-50/90 backdrop-blur-md">
        {/* Announcement ticker. Three claims rather than one, because the thing
            a shopper in Accra most needs to know is whether this ships to them
            and what they can pay with — and that is more than fits statically on
            a phone. It scrolls rather than rotating on a timer: a marquee is
            readable at a glance at any moment, where a fader is blank half the
            time it is looked at. Stops entirely under reduced-motion. */}
        <div className="overflow-hidden border-b border-soft-200/70 py-2">
          <div className="marquee-track" aria-hidden>
            {[0, 1].map((copy) => (
              <span key={copy} className="flex shrink-0 items-center">
                {TICKER.map((item) => (
                  <span key={item} className="flex items-center">
                    <span className="type-micro whitespace-nowrap px-6 text-soft-500">{item}</span>
                    <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-soft-300" />
                  </span>
                ))}
              </span>
            ))}
          </div>
          {/* The visual track is hidden from assistive tech because it is
              duplicated and endlessly scrolling; this is the same content once,
              in a form a screen reader can actually read. */}
          <p className="sr-only">{TICKER.join(". ")}</p>
        </div>

        <nav className="mx-auto flex max-w-container items-center gap-4 px-5 py-4 sm:gap-8 sm:px-8 lg:px-10">
          {/* Burger first on mobile, so the wordmark can stay optically centred
              on a phone the way it does on the reference. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-ml-2 p-2 text-soft-700 transition-opacity hover:opacity-60 sm:hidden"
          >
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden>
              <path d="M0 1h18M0 6h18M0 11h18" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </button>

          <BrandMark className="shrink-0 transition-opacity duration-200 hover:opacity-60" />

          <div className="hidden items-center gap-7 sm:flex">
            {SHOP_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-5">
            <Link
              href={session ? (isAdmin ? "/admin" : "/account") : "/login"}
              className={linkClass(session ? (isAdmin ? "/admin" : "/account") : "/login")}
            >
              <span className="inline-flex items-center gap-1.5">
                <AccountIcon size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{session ? (isAdmin ? "Admin" : "Account") : "Account"}</span>
              </span>
            </Link>

            <Link
              href="/cart"
              className={linkClass("/cart")}
              aria-label={totalItems === 1 ? "Bag, 1 item" : `Bag, ${totalItems} items`}
            >
              <span className="inline-flex items-center gap-1.5">
                <HandbagIcon size={16} aria-hidden="true" />
                {/* `tabular-nums` so the header does not shift by a pixel as the
                    count crosses from 9 to 10. */}
                {totalItems > 0 && <span className="text-[13px] tabular-nums">{totalItems}</span>}
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile drawer                                                       */}
      {/*                                                                     */}
      {/* This did not exist. The category links were `hidden sm:flex`, so on a */}
      {/* phone there was no way to reach a category at all — the only route   */}
      {/* into the catalog was the hero button. That is a navigation bug       */}
      {/* wearing a design problem's clothes.                                  */}
      {/* ------------------------------------------------------------------ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-soft-800/30 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-soft-50 px-6 pb-8 pt-5"
          >
            <div className="flex items-center justify-between">
              <BrandMark />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="-mr-2 p-2 text-soft-600 transition-opacity hover:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
              </button>
            </div>

            <p className="type-micro mt-12 text-soft-400">Shop</p>
            <div className="mt-4 flex flex-col">
              {SHOP_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="type-d3 border-b border-soft-200 py-4 text-soft-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-4 pt-10">
              <Link
                href={session ? (isAdmin ? "/admin" : "/account") : "/login"}
                className="type-micro text-soft-600"
              >
                {session ? (isAdmin ? "Admin" : "Account") : "Sign in"}
              </Link>
              <Link href="/cart" className="type-micro text-soft-600">
                Bag {totalItems > 0 && `(${totalItems})`}
              </Link>
              <p className="type-micro mt-2 text-soft-400">Accra · GHS</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
