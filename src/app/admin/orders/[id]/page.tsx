import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import OrderUpdateForm from "./OrderUpdateForm";
import { isAdminRole } from "@/lib/roles";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdminRole(role)) redirect("/");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      address: true,
      items: { include: { variant: { include: { product: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!order) notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Fulfillment / order</p>
        <h1 className="mb-2 mt-2 text-3xl font-semibold tracking-tight text-soft-700">#{order.id.slice(0, 8)}</h1>
        <p className="mb-6 text-sm text-soft-500">
          {order.user.name ?? "Customer"} — {order.user.email}
        </p>

        <div className="glass mb-4 rounded-3xl p-5">
          <h2 className="mb-4 text-lg font-medium text-soft-700">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-sm text-soft-600">
                {item.variant.product.name} ({item.variant.size}/{item.variant.color}) x{item.quantity}
              </span>
              <span className="text-sm text-soft-700">{formatPrice(item.priceAtPurchase * item.quantity, order.currency)}</span>
            </div>
          ))}
          <div className="mt-4 flex justify-between border-t border-soft-200 pt-3 font-medium text-soft-700">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount, order.currency)}</span>
          </div>
          <p className="mt-3 text-xs text-soft-400">Payment via {order.paymentProvider}, ref: {order.paymentRef ?? "—"}</p>
        </div>

        <div className="glass mb-4 rounded-3xl p-5">
          <h2 className="mb-2 text-lg font-medium text-soft-700">Shipping to</h2>
          <p className="text-sm leading-relaxed text-soft-500">
            {order.address.fullName}, {order.address.phone}
            <br />
            {order.address.line1}, {order.address.city}, {order.address.region}
          </p>
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="mb-4 text-lg font-medium text-soft-700">Status timeline</h2>
          <ul className="space-y-3 text-sm text-soft-500">
            {order.statusHistory.map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt).toLocaleString()} — {event.status}
                {event.note ? `: ${event.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-soft-700">Update order</h2>
        <OrderUpdateForm
          orderId={order.id}
          currentStatus={order.status}
          currentCarrier={order.carrier}
          currentTrackingNumber={order.trackingNumber}
          currentTrackingUrl={order.trackingUrl}
          currentEstimatedDelivery={order.estimatedDelivery}
        />
      </div>
    </div>
  );
}
