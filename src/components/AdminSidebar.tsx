"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/restock", label: "Inventory" },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/activity", label: "Activity" }
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-soft-300/60 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
      <div className="flex items-center justify-between gap-4 lg:block">
        <div>
          <p className="admin-kicker">Vinx / studio</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-soft-700">Admin</p>
        </div>
        <Link
          href="/"
          className="text-[10px] font-medium uppercase tracking-[0.14em] text-soft-500 transition-colors hover:text-soft-700 lg:mt-10 lg:block"
        >
          View storefront
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="mt-6 flex gap-1 overflow-x-auto lg:mt-14 lg:block lg:space-y-2">
        {navigation.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-soft-700 text-white shadow-soft"
                  : "text-soft-500 hover:bg-white/60 hover:text-soft-700"
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