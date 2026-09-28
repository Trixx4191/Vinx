import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import PayButton from "@/components/PayButton";
import { isAdminRole } from "@/lib/roles";
import { Kicker } from "@/components/luxury";
import OrderTimeline from "./OrderTimeline";

export default async function OrderDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !userId) redirect("/login");
  const { id } = await params;
  const { created } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      address: true,
      statusHistory: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!order) notFound();

  // Ownership check: a customer can only ever see their own order, no
  // matter what ID is in the URL. Admins can see any order.
  if (order.userId !== userId && !isAdminRole(role)) notFound();

  const isPending = order.status === "PENDING";
  const isPaid = order.status === "PAID";
  const hasFailed = order.status === "FAILED" || order.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Status notice. A hairline in the margin rather than a tinted panel —
          a filled colour block is the loudest thing on an otherwise white page
          and pulls attention away from the order itself. */}
      {created === "1" && isPending && (
        <p className="mb-10 border-l-2 border-soft-800 pl-4 text-sm text-soft-600">
          Your order is reserved. Complete payment below to confirm it.
        </p>
      )}
      {isPaid && (
        <p className="mb-10 border-l-2 border-vienna-green pl-4 text-sm text-soft-600">
          Payment confirmed. We will let you know when your order ships.
        </p>
      )}
      {hasFailed && (
        <p className="type-micro mb-10 text-center text-[var(--error)]">
          This order could not be completed. Please return to your bag and try again.
        </p>
      )}

      <header className="pt-10 text-center">
        <h1>{isPaid ? "Order confirmed" : hasFailed ? "Order incomplete" : "Order placed"}</h1>
        <p className="type-micro mt-2 text-[var(--muted)]">{order.id}</p>
      </header>

      {isPending && (
        <section className="mt-14 text-center">
          <Kicker>Payment outstanding</Kicker>
          <p className="type-body mx-auto mt-3 max-w-md">
            Your pieces are reserved while this order is pending. Complete payment to confirm it.
          </p>
          <div className="mt-6">
            <PayButton orderId={order.id} provider={order.paymentProvider} />
          </div>
        </section>
      )}

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        <div>
          <section>
            <Kicker>Items</Kicker>
            <ul className="mt-6 divide-y divide-soft-200 border-y border-soft-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-6 py-5">
                  <div className="min-w-0">
                    <p className="text-sm text-soft-800">{item.variant.product.name}</p>
                    <p className="type-micro mt-1.5 text-soft-400">
                      {item.variant.size} — {item.variant.color} × {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-soft-800">
                    {formatPrice(item.priceAtPurchase * item.quantity, order.currency)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-between">
              <span className="text-sm text-soft-500">Total paid</span>
              <span className="text-sm tabular-nums text-soft-800">
                {formatPrice(order.totalAmount, order.currency)}
              </span>
            </div>
          </section>

          <section className="mt-12">
            <Kicker>Shipping to</Kicker>
            <address className="mt-5 text-sm not-italic leading-relaxed text-soft-500">
              <span className="block text-soft-800">{order.address.fullName}</span>
              {order.address.line1}
              {order.address.line2 && <>, {order.address.line2}</>}
              <br />
              {order.address.city}, {order.address.region}
              <br />
              {order.address.phone}
            </address>
          </section>

          {order.trackingNumber && (
            <section className="mt-12">
              <Kicker>Tracking</Kicker>
              <p className="mt-5 text-sm text-soft-500">
                <span className="text-soft-800">{order.carrier}</span> — {order.trackingNumber}
              </p>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-micro mt-4 inline-block border-b border-soft-800 pb-1 text-soft-800 transition-opacity hover:opacity-50"
                >
                  Track this parcel
                </a>
              )}
              {order.estimatedDelivery && (
                <p className="type-micro mt-4 text-soft-400">
                  Estimated {new Date(order.estimatedDelivery).toLocaleDateString()}
                </p>
              )}
            </section>
          )}
        </div>

        <aside>
          <Kicker>Progress</Kicker>
          <div className="mt-6">
            <OrderTimeline events={order.statusHistory} currentStatus={order.status} />
          </div>

          <Link
            href="/account"
            className="type-micro mt-12 inline-block border-b border-soft-300 pb-1 text-soft-500 transition-colors hover:border-soft-800 hover:text-soft-800"
          >
            All orders
          </Link>
        </aside>
      </div>
    </div>
  );
}
