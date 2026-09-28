import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import { shortStatusLabel, needsAttention } from "@/lib/orderStatus";
import { Heading, Kicker } from "@/components/luxury";
import AccountSettings from "./AccountSettings";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: { orderBy: { isDefault: "desc" }, take: 1 },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          items: { select: { quantity: true } }
        }
      }
    }
  });
  if (!user) redirect("/login");

  const address = user.addresses[0];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-soft-200 pb-6">
        <Kicker>Account</Kicker>
        <Heading level={1} size={2} className="mt-4">
          Your account.
        </Heading>
        <p className="mt-4 text-sm text-soft-500">A quiet record of your pieces and deliveries.</p>
      </header>

      <div className="mt-12 grid gap-12 sm:grid-cols-2 sm:gap-16">
        <section>
          <Kicker>Profile</Kicker>
          <p className="mt-5 text-sm text-soft-800">{user.name ?? "Vinx customer"}</p>
          <p className="mt-2 text-sm text-soft-500">{user.email}</p>
        </section>

        <section>
          <Kicker>Saved address</Kicker>
          {address ? (
            <address className="mt-5 text-sm not-italic leading-relaxed text-soft-500">
              <span className="block text-soft-800">{address.fullName}</span>
              {address.line1}
              <br />
              {address.city}, {address.region}
              <br />
              {address.phone}
            </address>
          ) : (
            <p className="mt-5 text-sm text-soft-500">
              Your saved address will appear after your first order.
            </p>
          )}
        </section>
      </div>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-6 border-b border-soft-200 pb-5">
          <Kicker>Order history</Kicker>
          <Link
            href="/products"
            className="type-micro pb-0.5 text-soft-500 transition-colors hover:text-soft-800"
          >
            Shop pieces
          </Link>
        </div>

        {user.orders.length > 0 ? (
          <ul className="divide-y divide-soft-200">
            {user.orders.map((order) => {
              const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between gap-6 py-6 transition-opacity hover:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-soft-800">Order {order.id.slice(0, 8)}</p>
                      <p className="type-micro mt-2 text-soft-400">
                        {new Date(order.createdAt).toLocaleDateString()} — {pieces}{" "}
                        {pieces === 1 ? "piece" : "pieces"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-soft-800">
                        {formatPrice(order.totalAmount, order.currency)}
                      </p>
                      {/* An order awaiting payment or one that failed is the
                          only thing here a customer may need to act on, so it
                          is the only status that gets emphasis. */}
                      <p
                        className={`type-micro mt-2 ${
                          needsAttention(order.status) ? "text-vienna-red" : "text-soft-400"
                        }`}
                      >
                        {shortStatusLabel(order.status)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-16 text-center text-sm text-soft-500">Your first order will appear here.</p>
        )}
      </section>

      <AccountSettings
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
