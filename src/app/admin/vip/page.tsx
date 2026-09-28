import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { readSettings } from "@/lib/siteSettings";
import { planPrice } from "@/lib/vip";
import { formatPrice } from "@/types/product";
import VipPricing from "./VipPricing";
import { GrantVip, RefundButton } from "./VipActions";

export default async function AdminVipPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminRole(session?.user?.role)) redirect("/");
  // Granting and refunding change what customers have paid for, so they are
  // master-admin actions — the API enforces this; the page just does not offer
  // controls a regular admin could not use.
  const canManage = isSuperAdminRole(session?.user?.role);

  const now = new Date();
  const [settings, activeMembers, recent, revenue] = await Promise.all([
    readSettings(),
    prisma.user.count({ where: { vipUntil: { gt: now } } }),
    prisma.vipPurchase.findMany({
      // Refunded rows stay in the list, marked — a payment that vanished from
      // the record when refunded would make the history impossible to follow.
      where: { status: { in: ["PAID", "REFUNDED"] } },
      orderBy: { paidAt: "desc" },
      take: 15,
      include: { user: { select: { email: true, name: true } } }
    }),
    prisma.vipPurchase.aggregate({ where: { status: "PAID" }, _sum: { amount: true } })
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="admin-kicker">Membership</p>
        <h1 className="type-d3 mt-2 text-soft-800">VIP</h1>
        <p className="mt-2 text-sm text-soft-500">
          Paid early access to drops, bought a month or a year at a time. Nothing renews automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="admin-panel">
          <p className="text-xs text-soft-400">Active members</p>
          <p className="type-d3 mt-3 tabular-nums text-soft-800">{activeMembers}</p>
        </div>
        <div className="admin-panel">
          <p className="text-xs text-soft-400">VIP revenue, all time</p>
          <p className="type-d3 mt-3 tabular-nums text-soft-800">{formatPrice(revenue._sum.amount ?? 0, "GHS")}</p>
        </div>
      </div>

      <VipPricing month={planPrice(settings, "MONTH")} year={planPrice(settings, "YEAR")} />

      {canManage && <GrantVip />}

      <section className="admin-panel">
        <p className="admin-kicker">Recent payments</p>
        {canManage && (
          <p className="mt-2 text-xs text-soft-400">
            To refund: refund the payment in Paystack, then mark it here — that takes its time back.
          </p>
        )}
        <div className="mt-4 divide-y divide-soft-200">
          {recent.map((purchase) => (
            <div key={purchase.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-soft-800">{purchase.user.name ?? purchase.user.email}</p>
                <p className="mt-0.5 text-xs text-soft-400">
                  {purchase.plan === "COMP"
                    ? `Complimentary · ${purchase.periodDays} days`
                    : purchase.plan === "YEAR"
                      ? "1 year"
                      : "1 month"}
                  {purchase.status === "REFUNDED"
                    ? purchase.plan === "COMP" ? " · ended" : " · refunded"
                    : ` · until ${purchase.periodEnd?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) ?? ""}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <p className={`tabular-nums ${purchase.status === "REFUNDED" ? "text-soft-300 line-through" : "text-soft-600"}`}>
                  {purchase.plan === "COMP" ? "Free" : formatPrice(purchase.amount, purchase.currency)}
                </p>
                {canManage && purchase.status === "PAID" && (
                  <RefundButton purchaseId={purchase.id} comp={purchase.plan === "COMP"} />
                )}
              </div>
            </div>
          ))}
          {recent.length === 0 && <p className="py-3 text-sm text-soft-500">No VIP payments yet.</p>}
        </div>
      </section>
    </div>
  );
}
