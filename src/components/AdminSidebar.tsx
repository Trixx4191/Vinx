"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/restock", label: "Inventory" },
  { href: "/admin/security", label: "Security" }
  ,{ href: "/admin/activity", label: "Activity" }
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-soft-300/60 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
      <div className="flex items-center justify-between gap-4 lg:block">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / studio</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-soft-700">Admin</p>
        </div>
        <Link
          href="/"
          className="text-[10px] uppercase tracking-[0.14em] text-soft-500 transition-colors hover:text-soft-700 lg:mt-8 lg:block"
        >
          View storefront
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="mt-6 flex gap-2 overflow-x-auto lg:mt-12 lg:block lg:space-y-1">
        {navigation.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors lg:rounded-xl ${
                active
                  ? "bg-soft-700 text-white"
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