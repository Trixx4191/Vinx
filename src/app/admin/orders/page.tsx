import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";
import { isAdminRole } from "@/lib/roles";
import { shortStatusLabel } from "@/lib/orderStatus";
import { StatusPill } from "@/components/luxury";

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "FAILED"] as const;

// Status colour lives in StatusPill, so the storefront and the back office
// cannot disagree about what "paid" or "failed" looks like.

/**
 * Orders per page.
 *
 * There was no limit at all: this page ran `findMany` with no `take`, so it
 * loaded every order the shop had ever taken, serialised all of them into the
 * HTML, and rendered a row for each. Fine at twenty orders and a progressively
 * slower page at every number after that — the same bug the storefront catalog
 * already had fixed, where "the previous version loaded every published
 * product".
 */
const PAGE_SIZE = 40;

type SearchParams = { status?: string; q?: string; page?: string };

/** Anything outside the known statuses is ignored rather than passed to Prisma. */
function parseStatus(value: string | undefined) {
  return STATUSES.find((status) => status === value);
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  // Capped so a typed-in page number cannot request a huge offset.
  return Math.min(parsed, 10_000);
}

function hrefFor(params: { status?: string; q?: string; page?: number }): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) redirect("/");

  const raw = await searchParams;
  const status = parseStatus(raw.status);
  const q = raw.q?.trim() || undefined;
  const page = parsePage(raw.page);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true } }, items: true },
      // A unique tiebreak after the date, for the same reason the catalog has
      // one: two orders created in the same millisecond have no defined order
      // between them, so the database is free to return one on page 1 and again
      // on page 2 while dropping another entirely.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    // Counted with the same filter, so the pager describes the current view
    // rather than the size of the whole table.
    prisma.order.count({ where })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8">
        <p className="admin-kicker">Fulfillment</p>
        <h1 className="type-d3 mt-2 text-soft-800">Orders</h1>
        <p className="mt-2 text-sm text-soft-500">Keep every delivery moving.</p>
      </div>

      <form className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search order ID or customer"
          aria-label="Search orders"
          className="input-soft py-2.5 sm:max-w-sm"
        />
        {/* Searching keeps the status filter you already chose. Paging does not
            carry over, because a new search has a different set of results and
            landing on page 4 of them is never what was meant. */}
        <input type="hidden" name="status" value={status ?? ""} />
        <button className="btn-secondary py-2.5">Search</button>
      </form>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[{ value: undefined, label: "All" }, ...STATUSES.map((s) => ({ value: s, label: shortStatusLabel(s) }))].map(
          (filter) => {
            const active = status === filter.value;
            return (
              <Link
                key={filter.label}
                href={hrefFor({ status: filter.value, q })}
                aria-current={active ? "page" : undefined}
                // The inactive state previously set `hover:bg-white` on top of
                // `bg-white` — a hover style identical to the resting one, so
                // these chips had no hover feedback at all.
                className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs transition-colors ${
                  active
                    ? "border-soft-700 bg-soft-700 text-soft-50"
                    : "border-soft-200 bg-white text-soft-500 hover:border-soft-400 hover:text-soft-800"
                }`}
              >
                {filter.label}
              </Link>
            );
          }
        )}
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {orders.map((order) => (
          <Link key={order.id} href={`/admin/orders/${order.id}`} className="admin-panel-link p-4">
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-soft-800">#{order.id.slice(0, 8)}</p>
                <p className="mt-1 truncate text-xs text-soft-400">
                  {order.user.name ?? order.user.email}
                </p>
              </div>
              <Badge status={order.status} />
            </div>
            <div className="mt-4 flex justify-between gap-3 text-sm">
              <span className="text-soft-500">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items · {order.paymentProvider}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-soft-700">
                {formatPrice(order.totalAmount, order.currency)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto border border-soft-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="admin-kicker border-b border-soft-200">
            <tr>
              <th scope="col" className="px-5 py-4">
                Order
              </th>
              <th scope="col">Customer</th>
              <th scope="col">Items</th>
              <th scope="col">Payment</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col" className="pr-5">
                Placed
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-soft-200">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-soft-50">
                <th scope="row" className="px-5 py-4 text-left">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-soft-800 underline underline-offset-4"
                  >
                    #{order.id.slice(0, 8)}
                  </Link>
                </th>
                <td className="text-soft-500">{order.user.name ?? order.user.email}</td>
                <td className="tabular-nums text-soft-500">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </td>
                <td className="text-xs text-soft-500">{order.paymentProvider}</td>
                <td className="tabular-nums text-soft-600">
                  {formatPrice(order.totalAmount, order.currency)}
                </td>
                <td>
                  <Badge status={order.status} />
                </td>
                <td className="whitespace-nowrap pr-5 text-xs text-soft-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="admin-panel mt-4 p-10 text-center text-sm text-soft-500">
          No orders match these filters.
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Orders pagination"
          className="mt-6 flex items-center justify-between gap-4 border-t border-soft-200 pt-5"
        >
          {page > 1 ? (
            <Link href={hrefFor({ status, q, page: page - 1 })} className="type-micro text-soft-600 hover:text-soft-900">
              ← Newer
            </Link>
          ) : (
            <span />
          )}

          <p className="admin-kicker">
            Page {page} of {totalPages} · {total} {total === 1 ? "order" : "orders"}
          </p>

          {page < totalPages ? (
            <Link href={hrefFor({ status, q, page: page + 1 })} className="type-micro text-soft-600 hover:text-soft-900">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  return <StatusPill status={status} label={shortStatusLabel(status)} />;
}
