"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const linkClass = (href: string) =>
    `relative text-sm font-medium transition-colors duration-300 ease-apple ${
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "text-soft-700"
        : "text-soft-500 hover:text-soft-700"
    }`;

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-3 sm:px-6">
        <Link
          href="/"
          className="text-[17px] font-semibold tracking-tight text-soft-700 transition-opacity duration-300 hover:opacity-70"
        >
          Vinx
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/products" className={`${linkClass("/products")} rounded-full px-3 py-1.5`}>
            Shop
          </Link>
          <Link href="/cart" className={`${linkClass("/cart")} rounded-full px-3 py-1.5`}>
            Cart
            {totalItems > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-soft-700 px-1.5 text-[11px] font-medium text-white">
                {totalItems}
              </span>
            )}
          </Link>
          {session ? (
            isAdmin && (
              <Link
                href="/admin"
                className="ml-1 rounded-full bg-soft-700/10 px-3 py-1.5 text-sm font-medium text-soft-700 transition-colors duration-300 hover:bg-soft-700/15"
              >
                Admin
              </Link>
            )
          ) : (
            <Link href="/login" className={`${linkClass("/login")} rounded-full px-3 py-1.5`}>
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
