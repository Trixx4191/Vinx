import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";

export default async function AdminHome() {
  // Defense in depth, layer 3: even though middleware already gated this
  // route, the page itself re-checks. If middleware is ever misconfigured,
  // this still stops the page from rendering for a non-admin.
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/");

  const [orderCount, pendingCount, productCount, lowStockCount, revenue, recentOrders, recentActivity] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count(),
    prisma.productVariant.count({ where: { quantity: { lte: 3 } } }),
    prisma.order.aggregate({ where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, _sum: { totalAmount: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } }
    }),
    prisma.adminAuditLog.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true, email: true } } } })
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Operations / today</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-soft-700">Good morning.</h1>
          <p className="mt-2 text-sm text-soft-500">A quiet view of what needs your attention.</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary text-xs uppercase tracking-[0.1em]">
          Add product
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Orders", orderCount, "/admin/orders"],
          ["Awaiting action", pendingCount, "/admin/orders?status=PENDING"],
          ["Products", productCount, "/admin/products"],
          ["Low-stock variants", lowStockCount, "/admin/restock"],
          ["Revenue", formatPrice(revenue._sum.totalAmount ?? 0, "GHS"), "/admin/orders"]
        ].map(([label, value, href]) => (
          <Link key={label} href={href as string} className="glass rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs text-soft-400">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-soft-700">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]"><div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Latest activity</p>
            <h2 className="mt-2 text-lg font-medium text-soft-700">Recent orders</h2>
          </div>
          <Link href="/admin/orders" className="text-xs uppercase tracking-[0.1em] text-soft-500 hover:text-soft-700">
            View all
          </Link>
        </div>

        <div className="mt-5 divide-y divide-soft-200/70">
          {recentOrders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-soft-700">{order.user.name ?? order.user.email}</p>
                <p className="mt-1 text-xs text-soft-400">#{order.id.slice(0, 8)} · {order.status}</p>
              </div>
              <p className="shrink-0 text-sm font-medium text-soft-700">{formatPrice(order.totalAmount, order.currency)}</p>
            </Link>
          ))}
          {recentOrders.length === 0 && <p className="py-4 text-sm text-soft-500">No orders yet.</p>}
        </div>
      </div><div className="glass rounded-2xl p-5 sm:p-6"><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Audit trail</p><h2 className="mt-2 text-lg font-medium text-soft-700">Recent admin activity</h2><div className="mt-5 space-y-4">{recentActivity.map((entry) => <div key={entry.id}><p className="text-sm text-soft-600">{entry.action}</p><p className="mt-1 text-xs text-soft-400">{entry.admin.name ?? entry.admin.email} · {new Date(entry.createdAt).toLocaleDateString()}</p></div>)}{recentActivity.length === 0 && <p className="text-sm text-soft-500">No activity recorded yet.</p>}</div></div></div>
    </div>
  );
}
