import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductsTable from "./ProductsTable";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") redirect("/");
  const products = await prisma.product.findMany({ include: { category: { select: { name: true, slug: true } }, variants: true }, orderBy: { createdAt: "desc" } });
  return <div><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[0.18em] text-soft-400">Catalog / inventory</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-soft-700">Products.</h1><p className="mt-2 text-sm text-soft-500">Manage what is visible, priced, and available.</p></div><Link href="/admin/products/new" className="btn-primary text-xs uppercase tracking-[0.1em]">Add product</Link></div><ProductsTable products={products} /></div>;
}
