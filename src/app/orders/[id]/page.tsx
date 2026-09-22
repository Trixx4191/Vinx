import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import PayButton from "@/components/PayButton";
import { isAdminRole } from "@/lib/roles";

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
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

  return (
    <div>
      {created === "1" && order.status === "PENDING" && (
        <div className="mb-6 rounded-2xl border border-soft-200 bg-white/60 p-4 text-sm text-soft-600">
          Your order is reserved. Complete payment below to confirm it.
        </div>
      )}
      {order.status === "PAID" && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800">
          Payment confirmed. We&apos;ll let you know when your order ships.
        </div>
      )}
      {(order.status === "FAILED" || order.status === "CANCELLED") && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700">
          This order could not be completed. Please return to your bag and try again.
        </div>
      )}
      <h1 className="mb-2 text-xl font-semibold">Order {order.status === "PAID" ? "confirmed" : "placed"}</h1>
      <p className="mb-6 text-sm text-gray-600">Order #{order.id}</p>

      {order.status === "PENDING" && (
        <div className="mb-6 border border-gray-300 p-4">
          <p className="mb-3 text-sm">Payment hasn&apos;t been completed yet.</p>
          <PayButton orderId={order.id} provider={order.paymentProvider} />
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-2 font-medium">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.variant.product.name} ({item.variant.size}/{item.variant.color}) x{item.quantity}
            </span>
            <span>{formatPrice(item.priceAtPurchase * item.quantity, order.currency)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-medium">
          <span>Total</span>
          <span>{formatPrice(order.totalAmount, order.currency)}</span>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 font-medium">Shipping to</h2>
        <p className="text-sm text-gray-600">
          {order.address.fullName}, {order.address.line1}, {order.address.city}, {order.address.region}
        </p>
      </div>

      {order.trackingNumber && (
        <div className="mb-6">
          <h2 className="mb-2 font-medium">Tracking</h2>
          <p className="text-sm text-gray-600">
            {order.carrier} — {order.trackingNumber}
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium">Status</h2>
        <ul className="text-sm text-gray-600">
          {order.statusHistory.map((event) => (
            <li key={event.id}>
              {new Date(event.createdAt).toLocaleString()} — {event.status}
              {event.note ? `: ${event.note}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
