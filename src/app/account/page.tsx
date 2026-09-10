import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: { orderBy: { isDefault: "desc" }, take: 1 },
      orders: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, status: true, totalAmount: true, currency: true, createdAt: true, items: { select: { quantity: true } } } }
    }
  });
  if (!user) redirect("/login");

  const address = user.addresses[0];

  return (
    <div className="page-enter mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Vinx / account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-soft-700">Your account.</h1>
        <p className="mt-2 text-sm text-soft-500">A quiet record of your pieces and deliveries.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Profile</p>
          <h2 className="mt-3 text-lg font-medium text-soft-700">{user.name ?? "Vinx customer"}</h2>
          <p className="mt-2 text-sm text-soft-500">{user.email}</p>
        </section>
        <section className="glass rounded-3xl p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Saved address</p>
          {address ? <div className="mt-3 text-sm leading-relaxed text-soft-600"><p className="font-medium text-soft-700">{address.fullName}</p><p>{address.line1}</p><p>{address.city}, {address.region}</p><p>{address.phone}</p></div> : <p className="mt-3 text-sm text-soft-500">Your saved address will appear after your first order.</p>}
        </section>
      </div>

      <section className="mt-8 glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">History</p><h2 className="mt-2 text-xl font-medium text-soft-700">Your orders</h2></div><Link href="/products" className="text-xs uppercase tracking-[0.1em] text-soft-500 hover:text-soft-700">Shop pieces</Link></div>
        <div className="mt-6 divide-y divide-soft-200/70">
          {user.orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-medium text-soft-700">Order #{order.id.slice(0, 8)}</p><p className="mt-1 text-xs text-soft-400">{new Date(order.createdAt).toLocaleDateString()} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} pieces · {order.status}</p></div><p className="shrink-0 text-sm font-medium text-soft-700">{formatPrice(order.totalAmount, order.currency)}</p></Link>)}
          {user.orders.length === 0 && <div className="py-8 text-center text-sm text-soft-500">Your first order will appear here.</div>}
        </div>
      </section>
    </div>
  );
}
