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

  if (pathname.startsWith("/admin")) return null;

  const linkClass = (href: string) =>
    `relative text-sm font-medium transition-colors duration-300 ease-apple ${
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "text-soft-700"
        : "text-soft-500 hover:text-soft-700"
    }`;

  return (
    <header className="sticky top-0 z-50 px-5 pt-4 sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between border-b border-soft-300/60 bg-[#e9e6dc]/70 px-1 pb-3 text-[11px] backdrop-blur-xl sm:px-2">
        <Link
          href="/"
          className="text-[17px] font-semibold tracking-[-0.04em] text-soft-700 transition-opacity duration-300 hover:opacity-70"
        >
          Vinx
        </Link>

        <div className="flex items-center gap-1 sm:gap-5">
          <span className="hidden text-soft-400 sm:inline">collection 01</span>
          <Link href="/products" className={`${linkClass("/products")} px-2 py-1.5`}>
            shop
          </Link>
          <Link href="/cart" className={`${linkClass("/cart")} px-2 py-1.5`}>
            bag
            {totalItems > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-soft-700 px-1.5 text-[11px] font-medium text-white">
                {totalItems}
              </span>
            )}
          </Link>
          {session ? (
            <Link
              href={isAdmin ? "/admin" : "/account"}
              className="ml-1 px-2 py-1.5 text-soft-700 transition-colors duration-300 hover:text-soft-500"
            >
              {isAdmin ? "Admin" : "account"}
            </Link>
          ) : (
            <Link href="/login" className={`${linkClass("/login")} px-2 py-1.5`}>
              account
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
