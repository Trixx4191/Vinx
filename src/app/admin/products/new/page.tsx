import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import AdminProductForm from "@/components/AdminProductForm";

export default async function NewProductPage() {
  // This page previously had no check of its own and relied entirely on the
  // layout and middleware. Every other admin page re-checks independently —
  // that is the documented defense-in-depth model, and this was the gap.
  const session = await getServerSession(authOptions);
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) redirect("/");

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/products"
          className="text-xs uppercase tracking-[0.12em] text-soft-400 hover:text-soft-700"
        >
          ← Products
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-soft-700">Add product</h1>
        <p className="mt-2 text-sm text-soft-500">
          Build a complete product record before it reaches the storefront.
        </p>
      </div>
      <AdminProductForm />
    </div>
  );
}
