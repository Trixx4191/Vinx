import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import { shortStatusLabel, needsAttention } from "@/lib/orderStatus";
import AccountSettings, { ProfileHeader, VipPanel } from "./AccountSettings";
import { readSettings } from "@/lib/siteSettings";
import { isVipActive, planPrice } from "@/lib/vip";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

/**
 * The account: who you are, what you ordered, VIP, then settings.
 *
 * One column, one reading order, no tabs — there is not enough here to need
 * navigation inside the page, and tabs would hide the orders, which are the
 * reason most people open it.
 */
export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ vip?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?callbackUrl=/account");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      avatarUrl: true,
      vipUntil: true,
      vipSince: true,
      vipDropEmails: true,
      addresses: { orderBy: { isDefault: "desc" }, take: 1 },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          trackingNumber: true,
          items: { select: { quantity: true } }
        }
      }
    }
  });
  if (!user) redirect("/login");

  const address = user.addresses[0];
  const [settings, { vip: vipOutcome }] = await Promise.all([readSettings(), searchParams]);
  const vipActive = isVipActive(user.vipUntil);

  return (
    <div className="mx-auto max-w-md space-y-20 pb-10 pt-12">
      <ProfileHeader
        profile={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          vipActive,
          vipSince: user.vipSince?.toISOString() ?? null
        }}
      />

      <section>
        <h2 className="text-center">Orders</h2>
        {user.orders.length > 0 ? (
          <ul className="mt-6">
            {user.orders.map((order) => {
              const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <li key={order.id}>
                  {/* Each order opens its own page, which carries the full
                      timeline and the carrier's tracking link. */}
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-baseline justify-between gap-4 py-3 transition-opacity hover:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="type-label block">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        <span className="text-[var(--muted)]"> · {pieces} {pieces === 1 ? "piece" : "pieces"}</span>
                      </span>
                      <span
                        className={`type-micro mt-1 block ${
                          needsAttention(order.status) ? "text-[var(--error)]" : "text-[var(--muted)]"
                        }`}
                      >
                        {shortStatusLabel(order.status)}
                        {order.trackingNumber && " · Track"}
                      </span>
                    </span>
                    <span className="type-label shrink-0 tabular-nums">
                      {formatPrice(order.totalAmount, order.currency)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="type-label mt-6 text-center text-[var(--muted)]">
            None yet.{" "}
            <Link href="/" className="text-black underline underline-offset-4">
              Shop
            </Link>
          </p>
        )}
      </section>

      <VipPanel
        active={vipActive}
        vipUntil={user.vipUntil?.toISOString() ?? null}
        dropEmails={user.vipDropEmails}
        prices={{ MONTH: planPrice(settings, "MONTH"), YEAR: planPrice(settings, "YEAR") }}
        // Only the four values the callback sets are passed on; anything else
        // in the URL is ignored rather than echoed.
        outcome={
          vipOutcome === "welcome" || vipOutcome === "pending" || vipOutcome === "failed" || vipOutcome === "problem"
            ? vipOutcome
            : null
        }
      />

      <AccountSettings
        name={user.name}
        address={
          address
            ? {
                fullName: address.fullName,
                phone: address.phone,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                region: address.region
              }
            : null
        }
      />
    </div>
  );
}
