"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isSuperAdminRole } from "@/lib/roles";

// `superOnly` items are hidden from regular admins. This is presentation only
// — the page and its API routes both gate on requireSuperAdmin independently,
// so hiding the link is a courtesy, never the control.
const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/models", label: "Models" },
  { href: "/admin/vip", label: "VIP" },
  { href: "/admin/restock", label: "Inventory" },
  { href: "/admin/staff", label: "Staff", superOnly: true },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/activity", label: "Activity" }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = isSuperAdminRole((session?.user as { role?: string } | undefined)?.role);
  const visibleNavigation = navigation.filter((item) => !item.superOnly || isSuperAdmin);

  return (
    <aside className="border-b border-soft-200 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
      <div className="flex items-center justify-between gap-4 lg:block">
        <div>
          {/* The wordmark, set like the storefront's, so the back office reads
              as the same product rather than a second application that happens
              to share a database. */}
          <p className="brand-wordmark">Vinx</p>
          <p className="admin-kicker mt-2">Studio</p>
        </div>
        <Link
          href="/"
          className="type-micro text-soft-500 transition-colors hover:text-soft-800 lg:mt-10 lg:block"
        >
          View storefront ↗
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="mt-6 flex gap-1 overflow-x-auto lg:mt-14 lg:block lg:space-y-2">
        {visibleNavigation.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              // Active state is a rule in the margin rather than a filled
              // block. A solid dark pill per item turns the sidebar into the
              // heaviest thing on the page, which is the wrong emphasis for
              // navigation that sits beside the actual work.
              className={`relative block whitespace-nowrap border-l-2 py-2 pl-3 text-sm transition-colors ${
                active
                  ? "border-soft-800 text-soft-800"
                  : "border-transparent text-soft-500 hover:border-soft-300 hover:text-soft-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}