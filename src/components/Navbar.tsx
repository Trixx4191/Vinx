"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { data: session } = useSession();
  const { totalItems } = useCart();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  return (
    <header className="border-b border-gray-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Vinx
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/products">Shop</Link>
          <Link href="/login">Login</Link>
          <Link href="/cart">Cart{totalItems > 0 ? ` (${totalItems})` : ""}</Link>
          {isAdmin && (
            <Link href="/admin" className="font-medium">
              Admin
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
