"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { isAdminRole } from "@/lib/roles";

/**
 * The header is three things: a `+` that opens the menu, the wordmark, and the
 * bag. Everything that used to sit in it — an announcement ticker, five
 * category links, an account link with an icon and a label — now lives behind
 * the `+`, on every screen size.
 *
 * A single menu pattern on desktop and phone is itself a simplification: there
 * is one navigation to learn and one to maintain, not a bar that collapses into
 * a drawer at an arbitrary breakpoint.
 */

const SHOP = [
  { href: "/", label: "All" },
  { href: "/products?category=hoodies", label: "Hoodies" },
  { href: "/products?category=t-shirts", label: "T-Shirts" },
  { href: "/products?category=jackets", label: "Jackets" },
  { href: "/products?category=pants", label: "Pants" },
  { href: "/products?category=accessories", label: "Accessories" }
];

const HELP = [
  { href: "/delivery", label: "Delivery" },
  { href: "/returns", label: "Returns" },
  { href: "/size-guide", label: "Size guide" },
  { href: "/contact", label: "Contact" }
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { totalItems } = useCart();
  const isAdmin = isAdminRole((session?.user as { role?: string } | undefined)?.role);

  // `mounted` keeps the overlay in the DOM through its exit transition; `open`
  // drives the transition. Unmounting on close would make it vanish on a frame.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>();

  function openMenu() {
    clearTimeout(exitTimer.current);
    setMounted(true);
    // One frame between mounting and opening, so there is a closed state for
    // the transition to start from.
    requestAnimationFrame(() => setOpen(true));
  }

  function closeMenu() {
    setOpen(false);
    exitTimer.current = setTimeout(() => setMounted(false), 400);
  }

  // Any navigation closes the menu — otherwise tapping a link leaves the
  // overlay sitting over the page it just loaded.
  useEffect(() => {
    if (mounted) closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // While open: no page scroll behind it, and Escape closes it and returns
  // focus to the `+` that opened it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeMenu();
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  if (pathname.startsWith("/admin")) return null;

  const accountHref = session ? (isAdmin ? "/admin" : "/account") : "/login";
  const accountLabel = session ? (isAdmin ? "Admin" : "Account") : "Sign in";

  // Delays for the staggered entrance, so the list assembles top to bottom
  // rather than appearing as one block.
  let item = 0;
  const delay = () => ({ "--item-delay": `${60 + item++ * 35}ms` }) as React.CSSProperties;

  return (
    <>
      {/* z-70, above the menu overlay (z-60). A sticky element with a z-index
          forms its own stacking context, so the `+` inside it can never rise
          above the overlay on its own z-index — the whole header has to. The
          header staying visible over the open menu is also the point: the
          wordmark and bag remain where they were, and the `+` is the close. */}
      <header className="sticky top-0 z-[70] bg-white">
        <div className="relative mx-auto flex h-14 max-w-container items-center justify-between px-[var(--gutter)]">
          {/* The `+` turns 45° into an `×` rather than swapping for a
              different icon — the same object changing state reads as one
              control, which is what it is. It sits above the overlay so it
              stays reachable as the close button. */}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => (open ? closeMenu() : openMenu())}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-ml-2 p-2 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-black"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden
              className={`transition-transform duration-500 ease-apple-out ${open ? "rotate-45" : ""}`}
            >
              <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </button>

          <Link
            href="/"
            className="brand-wordmark absolute left-1/2 -translate-x-1/2 transition-opacity hover:opacity-50"
          >
            Vinx
          </Link>

          <Link
            href="/cart"
            aria-label={totalItems === 1 ? "Bag, 1 item" : `Bag, ${totalItems} items`}
            className="-mr-2 flex items-center gap-1.5 p-2 transition-opacity hover:opacity-50"
          >
            <svg width="15" height="16" viewBox="0 0 15 16" fill="none" aria-hidden>
              <path d="M1.5 5h12l-.9 10H2.4L1.5 5Z" stroke="currentColor" strokeWidth="1.1" />
              <path d="M4.8 5V3.6a2.7 2.7 0 1 1 5.4 0V5" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            {/* Only when there is something to count. A "0" is noise. */}
            {totalItems > 0 && <span className="tabular-nums">{totalItems}</span>}
          </Link>
        </div>
      </header>

      {mounted && (
        // A disclosure, not a modal dialog: the control that closes it is the
        // `+` in the header, outside this element. `aria-modal` would tell
        // assistive tech that everything outside is inert — including the only
        // close button.
        <div
          id="site-menu"
          aria-label="Menu"
          data-state={open ? "open" : "closed"}
          className="menu-overlay fixed inset-0 z-[60] overflow-y-auto bg-white"
        >
          <nav className="mx-auto flex min-h-full max-w-container flex-col px-[var(--gutter)] pb-10 pt-24">
            <ul className="space-y-3">
              {SHOP.map((link) => (
                <li key={link.href} data-menu-item style={delay()}>
                  <Link href={link.href} className="type-label transition-opacity hover:opacity-40">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-12 space-y-3">
              <li data-menu-item style={delay()}>
                <Link href={accountHref} className="type-label transition-opacity hover:opacity-40">
                  {accountLabel}
                </Link>
              </li>
              <li data-menu-item style={delay()}>
                <Link href="/cart" className="type-label transition-opacity hover:opacity-40">
                  Bag{totalItems > 0 && ` (${totalItems})`}
                </Link>
              </li>
            </ul>

            <ul className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-16">
              {HELP.map((link) => (
                <li key={link.href} data-menu-item style={delay()}>
                  <Link
                    href={link.href}
                    className="type-micro text-[var(--muted)] transition-colors hover:text-black"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
