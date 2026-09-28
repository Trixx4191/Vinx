import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import { isAdminRole } from "@/lib/roles";
import { lowStockWhere } from "@/lib/inventory";

export default async function AdminHome() {
  // Defense in depth, layer 3: even though middleware already gated this route,
  // the page itself re-checks. If middleware is ever misconfigured, this still
  // stops the page rendering for a non-admin.
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdminRole(role)) redirect("/");

  const [orderCount, pendingCount, productCount, lowStockCount, revenue, recentOrders, recentActivity] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.product.count(),
      prisma.productVariant.count({ where: lowStockWhere }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
        _sum: { totalAmount: true }
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.adminAuditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { name: true, email: true } } }
      })
    ]);

  // Counts that mean "someone has to do something", kept apart from counts that
  // are just the size of the shop. A dashboard where every number looks the
  // same is one nobody reads twice.
  const needsAttention = [
    { label: "Awaiting action", value: pendingCount, href: "/admin/orders?status=PENDING" },
    { label: "Low stock", value: lowStockCount, href: "/admin/restock" }
  ];

  const totals = [
    { label: "Revenue", value: formatPrice(revenue._sum.totalAmount ?? 0, "GHS"), href: "/admin/orders" },
    { label: "Orders", value: orderCount.toString(), href: "/admin/orders" },
    { label: "Products", value: productCount.toString(), href: "/admin/products" }
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="admin-kicker">Operations</p>
          {/* Was "Good morning." — hardcoded, so it greeted the morning at
              every hour of the day. Making it time-aware is not the fix either:
              this renders on the server, so it would read the server's clock
              rather than the reader's and be wrong for anyone in another
              timezone. A title that does not claim to know the time is right at
              all of them. */}
          <h1 className="type-d3 mt-2 text-soft-800">Overview</h1>
          <p className="mt-2 text-sm text-soft-500">
            What needs your attention, and where the shop stands.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary shrink-0">
          Add product
        </Link>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Needs attention                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <p className="admin-kicker">Needs attention</p>
        {/* Capped rather than stretched across the full content width. At
            1400px two panels holding a single digit each were mostly empty
            space, and a number floating in a wide box reads as less urgent, not
            more. */}
        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          {needsAttention.map((stat) => {
            const clear = stat.value === 0;
            return (
              <Link key={stat.label} href={stat.href} className="admin-panel-link">
                <p className="text-xs text-soft-400">{stat.label}</p>
                {/* Zero is not an alarm. Rendering "0" in the same weight and
                    colour as "14" makes an empty queue look like a full one at
                    a glance, which is the only glance a dashboard gets. */}
                <p className={`type-d3 mt-3 tabular-nums ${clear ? "text-soft-300" : "text-soft-800"}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-soft-400">
                  {clear ? "All clear" : "Open →"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Totals                                                            */}
      {/* ---------------------------------------------------------------- */}
      {/* Totals are a quiet strip, not a second row of panels.

          Rendered as panels these read as equal in weight to the queue above —
          two near-identical bands of boxes, so nothing on the page claimed
          priority and the eye had nowhere to land first. Revenue and a product
          count are reference figures: true, worth seeing, and not something
          anyone has to act on this morning. Dropping the boxes is what makes
          the panels above mean "this one needs you". */}
      <section className="rule-top pt-6">
        <p className="admin-kicker">Totals</p>
        <div className="mt-4 grid gap-y-5 sm:grid-cols-3">
          {totals.map((stat) => (
            <Link key={stat.label} href={stat.href} className="group block">
              <p className="text-xs text-soft-400">{stat.label}</p>
              <p className="mt-1.5 text-xl tabular-nums text-soft-700 transition-colors group-hover:text-soft-900">
                {stat.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Recent                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="admin-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="admin-kicker">Latest activity</p>
              <h2 className="admin-panel-title mt-2">Recent orders</h2>
            </div>
            <Link href="/admin/orders" className="type-micro text-soft-500 transition-colors hover:text-soft-800">
              View all
            </Link>
          </div>

          <div className="mt-5 divide-y divide-soft-200">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-soft-800">
                    {order.user.name ?? order.user.email}
                  </p>
                  <p className="mt-1 text-xs text-soft-400">
                    #{order.id.slice(0, 8)} · {order.status}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums text-soft-700">
                  {formatPrice(order.totalAmount, order.currency)}
                </p>
              </Link>
            ))}
            {recentOrders.length === 0 && <p className="py-4 text-sm text-soft-500">No orders yet.</p>}
          </div>
        </section>

        <section className="admin-panel">
          <p className="admin-kicker">Audit trail</p>
          <h2 className="admin-panel-title mt-2">Recent admin activity</h2>

          <div className="mt-5 space-y-4">
            {recentActivity.map((entry) => (
              <div key={entry.id}>
                <p className="text-sm text-soft-700">{entry.action}</p>
                <p className="mt-1 text-xs text-soft-400">
                  {entry.admin.name ?? entry.admin.email} ·{" "}
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-soft-500">No activity recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
