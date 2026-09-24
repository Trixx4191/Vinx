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

  const linkClass = (href: string) =>
    `type-micro transition-colors duration-300 ${
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "text-soft-800"
        : "text-soft-500 hover:text-soft-800"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/95 px-5 backdrop-blur-sm sm:px-8 lg:px-10">
      {/* Three columns rather than a flex row, so the wordmark is centred on the
          page itself and does not drift as the links on either side change
          width — the account link alone swaps between three different labels. */}
      <nav className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-soft-200 py-5">
        <div className="flex items-center gap-6">
          <Link href="/products" className={linkClass("/products")}>
            Shop
          </Link>
          <span className="type-micro hidden text-soft-400 sm:inline">New collection</span>
        </div>

        <BrandMark className="justify-self-center text-[15px] transition-opacity duration-300 hover:opacity-50" />

        <div className="flex items-center justify-end gap-6">
          {session ? (
            <Link href={isAdmin ? "/admin" : "/account"} className={linkClass(isAdmin ? "/admin" : "/account")}>
              <span className="inline-flex items-center gap-1.5">
                <AccountIcon size={13} aria-hidden="true" />
                <span className="hidden sm:inline">{isAdmin ? "Admin" : "Account"}</span>
              </span>
            </Link>
          ) : (
            <Link href="/login" className={linkClass("/login")}>
              <span className="inline-flex items-center gap-1.5">
                <AccountIcon size={13} aria-hidden="true" />
                <span className="hidden sm:inline">Account</span>
              </span>
            </Link>
          )}

          <Link href="/cart" className={linkClass("/cart")}>
            <span className="inline-flex items-center gap-1.5">
              <HandbagIcon size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Bag</span>
              {totalItems > 0 && <span className="tabular-nums">({totalItems})</span>}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
