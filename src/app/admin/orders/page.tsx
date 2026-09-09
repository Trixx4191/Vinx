import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/");

  const statuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "FAILED"];
  const filter = searchParams.status;

  const orders = await prisma.order.findMany({
    where: filter ? { status: filter as never } : undefined,
    include: { user: { select: { name: true, email: true } }, items: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Orders</h1>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className={`border px-3 py-1 ${!filter ? "border-black" : "border-gray-300"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`border px-3 py-1 ${filter === s ? "border-black" : "border-gray-300"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Order</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2">
                <Link href={`/admin/orders/${o.id}`} className="underline">
                  {o.id.slice(0, 8)}
                </Link>
              </td>
              <td>{o.user.name ?? o.user.email}</td>
              <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
              <td>{formatPrice(o.totalAmount, o.currency)}</td>
              <td>{o.status}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && <p className="mt-4 text-gray-600">No orders match this filter.</p>}
    </div>
  );
}
