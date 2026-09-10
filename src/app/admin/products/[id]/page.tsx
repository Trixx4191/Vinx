import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminProductForm from "@/components/AdminProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, auditLogs] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { category: true, variants: true } }),
    prisma.adminAuditLog.findMany({ where: { targetType: "Product", targetId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { admin: { select: { name: true, email: true } } } })
  ]);
  if (!product) notFound();
  return <div className="max-w-3xl"><div className="mb-8"><Link href="/admin/products" className="text-xs uppercase tracking-[0.12em] text-soft-400 hover:text-soft-700">← Products</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight text-soft-700">Edit product</h1><p className="mt-2 text-sm text-soft-500">Update the catalog record and inventory variants.</p></div><AdminProductForm initial={{ id: product.id, name: product.name, description: product.description, material: product.material, price: product.price, categorySlug: product.category.slug, frontImageUrl: product.frontImageUrl, backImageUrl: product.backImageUrl, isPublished: product.isPublished, variants: product.variants.map((variant) => ({ size: variant.size, color: variant.color, sku: variant.sku, quantity: variant.quantity })) }} /><section className="glass mt-6 rounded-3xl p-5 sm:p-7"><p className="text-[10px] uppercase tracking-[0.16em] text-soft-400">Audit history</p><div className="mt-4 space-y-4">{auditLogs.map((log) => <div key={log.id} className="flex justify-between gap-4 border-b border-soft-200/60 pb-3 last:border-0 last:pb-0"><div><p className="text-sm text-soft-700">{log.action}</p><p className="mt-1 text-xs text-soft-400">{log.admin.name ?? log.admin.email}</p></div><time className="shrink-0 text-xs text-soft-400">{new Date(log.createdAt).toLocaleString()}</time></div>)}{auditLogs.length === 0 && <p className="text-sm text-soft-500">No changes recorded yet.</p>}</div></section></div>;
}