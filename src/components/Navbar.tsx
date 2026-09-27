"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";
import { isAdminRole } from "@/lib/roles";
import { HandbagIcon } from "@/components/HandbagIcon";
import { AccountIcon } from "@/components/AccountIcon";
import BrandMark from "@/components/BrandMark";

export default function Navbar() {
  const { data: session } = useSession();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const isAdmin = isAdminRole((session?.user as { role?: string } | undefined)?.role);

  if (pathname.startsWith("/admin")) return null;

  // Sentence case at normal tracking, not wide-tracked micro-caps. The caps
  // read as couture formality; this register is a shop you buy sweatpants from.
  const linkClass = (href: string) =>
    `text-sm transition-colors duration-200 ${
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "text-soft-800"
        : "text-soft-600 hover:text-soft-800"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-soft-50/95 backdrop-blur-sm">
      {/* Announcement bar. Centred, with the region on the right — the first
          thing this reference puts on the page, and the thing that tells a
          shopper in Accra that the site will actually ship to them. */}
      <div className="relative flex items-center justify-center border-b border-soft-200 px-5 py-2 sm:px-8">
        <p className="text-xs text-soft-600">International shipping available</p>
        <span className="absolute right-5 hidden text-xs text-soft-500 sm:block sm:right-8">GHS</span>
      </div>

      <nav className="mx-auto flex max-w-[1600px] items-center gap-6 px-5 py-4 sm:px-8 lg:px-10">
        <BrandMark className="shrink-0 text-[17px] transition-opacity duration-200 hover:opacity-60" />

        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/products" className={linkClass("/products")}>
            Shop
          </Link>
          <Link href="/products?category=hoodies" className="text-sm text-soft-600 transition-colors hover:text-soft-800">
            Hoodies
          </Link>
          <Link href="/products?category=t-shirts" className="text-sm text-soft-600 transition-colors hover:text-soft-800">
            Tees
          </Link>
          <Link href="/products?category=accessories" className="text-sm text-soft-600 transition-colors hover:text-soft-800">
            Accessories
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-5">
          {session ? (
            <Link href={isAdmin ? "/admin" : "/account"} className={linkClass(isAdmin ? "/admin" : "/account")}>
              <span className="inline-flex items-center gap-1.5">
                <AccountIcon size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{isAdmin ? "Admin" : "Account"}</span>
              </span>
            </Link>
          ) : (
            <Link href="/login" className={linkClass("/login")}>
              <span className="inline-flex items-center gap-1.5">
                <AccountIcon size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Account</span>
              </span>
            </Link>
          )}

          <Link href="/cart" className={linkClass("/cart")} aria-label={`Bag, ${totalItems} items`}>
            <span className="inline-flex items-center gap-1.5">
              <HandbagIcon size={16} aria-hidden="true" />
              {totalItems > 0 && <span className="text-sm tabular-nums">{totalItems}</span>}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
