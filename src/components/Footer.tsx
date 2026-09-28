"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE, freeDeliveryLabel } from "@/content/site";

/**
 * Site footer.
 *
 * Every link here points at a route that exists. That sounds like a low bar,
 * but the usual way a footer gets built is by writing the columns a storefront
 * "should" have and leaving half of them pointing at pages nobody made — and a
 * customer who taps "Returns" and lands on a 404 trusts the checkout less, not
 * just the footer.
 */

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { href: "/products", label: "All pieces" },
      { href: "/products?category=hoodies", label: "Hoodies" },
      { href: "/products?category=t-shirts", label: "Tees" },
      { href: "/products?category=jackets", label: "Jackets" },
      { href: "/products?category=accessories", label: "Accessories" }
    ]
  },
  {
    heading: "Help",
    links: [
      { href: "/delivery", label: "Delivery" },
      { href: "/returns", label: "Returns" },
      { href: "/size-guide", label: "Size guide" },
      { href: "/contact", label: "Contact" }
    ]
  },
  {
    heading: "Account",
    links: [
      { href: "/account", label: "Your account" },
      { href: "/cart", label: "Bag" },
      { href: "/about", label: "About Vinx" }
    ]
  }
];

export default function Footer() {
  const pathname = usePathname();

  // The admin is a separate application wearing the same tokens. A storefront
  // footer under a stock table is noise, and it matches how Navbar behaves.
  if (pathname.startsWith("/admin")) return null;

  const socials = Object.entries(SITE.social).filter(([, handle]) => handle);

  return (
    <footer className="rule-top mt-0">
      <div className="mx-auto max-w-container px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          {/* Brand block */}
          <div>
            <p className="brand-wordmark">{SITE.name}</p>
            <p className="type-body mt-5 max-w-copy">{SITE.tagline}</p>
            <p className="type-micro mt-8 text-soft-400">
              {SITE.city}, {SITE.country} · {SITE.currency}
            </p>
            <p className="type-micro mt-1 text-soft-400">
              Free delivery in {SITE.city} over {freeDeliveryLabel()}
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <p className="type-micro text-soft-400">{column.heading}</p>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-soft-600 transition-colors duration-200 hover:text-soft-800"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Baseline */}
        <div className="mt-16 flex flex-col gap-5 border-t border-soft-200 pt-7 sm:flex-row sm:items-center sm:justify-between">
          {/* Payment methods as words, not logos. Card-brand marks are
              trademarked artwork with usage rules, and a row of slightly-wrong
              redrawn logos looks less trustworthy than plain text. */}
          <p className="type-micro text-soft-400">{SITE.payments.join(" · ")}</p>

          <div className="flex items-center gap-6">
            {socials.map(([network, handle]) => (
              <a
                key={network}
                href={handle}
                target="_blank"
                rel="noopener noreferrer"
                className="type-micro text-soft-500 transition-colors hover:text-soft-800"
              >
                {network}
              </a>
            ))}
            {/* The year is computed, so the footer cannot be quietly wrong every
                January. Rendered in a client component, which means it comes
                from the visitor's clock rather than the build date. */}
            <p className="type-micro text-soft-400">
              © {new Date().getFullYear()} {SITE.name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
