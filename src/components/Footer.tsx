"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/content/site";

/**
 * One line. The help pages, and the name.
 *
 * This was a three-column footer with a tagline, a city, a free-delivery note,
 * a payment-methods row and social links. Everything a shopper actually needs
 * from it is the four help pages; the rest was the footer describing the shop
 * to someone already in it. The same four links sit in the `+` menu.
 */
const LINKS = [
  { href: "/delivery", label: "Delivery" },
  { href: "/returns", label: "Returns" },
  { href: "/size-guide", label: "Size guide" },
  { href: "/contact", label: "Contact" }
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mx-auto flex max-w-container flex-col items-center justify-between gap-4 px-[var(--gutter)] py-10 sm:flex-row">
      <nav aria-label="Help">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="type-micro text-[var(--muted)] transition-colors hover:text-black">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Computed, so it cannot be quietly wrong every January. */}
      <p className="type-micro text-[var(--muted)]">
        © {new Date().getFullYear()} {SITE.name}
      </p>
    </footer>
  );
}
