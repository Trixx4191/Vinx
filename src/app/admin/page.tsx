import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function AdminHome() {
  // Defense in depth, layer 3: even though middleware already gated this
  // route, the page itself re-checks. If middleware is ever misconfigured,
  // this still stops the page from rendering for a non-admin.
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/orders" className="border border-gray-300 p-4 hover:border-black">
          <p className="font-medium">Orders</p>
          <p className="text-sm text-gray-600">View, filter, update status and tracking</p>
        </Link>
        <Link href="/admin/products" className="border border-gray-300 p-4 hover:border-black">
          <p className="font-medium">Products</p>
          <p className="text-sm text-gray-600">View, add, and manage the catalog</p>
        </Link>
        <Link href="/admin/products/new" className="border border-gray-300 p-4 hover:border-black">
          <p className="font-medium">Add product</p>
          <p className="text-sm text-gray-600">Create a new product with variants</p>
        </Link>
        <Link href="/admin/restock" className="border border-gray-300 p-4 hover:border-black">
          <p className="font-medium">Bulk restock</p>
          <p className="text-sm text-gray-600">Upload SKU/quantity to update stock</p>
        </Link>
        <Link href="/admin/security" className="border border-gray-300 p-4 hover:border-black">
          <p className="font-medium">Security</p>
          <p className="text-sm text-gray-600">Set up two-factor authentication</p>
        </Link>
      </div>
    </div>
  );
}
