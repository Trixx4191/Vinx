import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import AdminProductForm from "@/components/AdminProductForm";
import { modelOptions } from "@/lib/modelShots";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Independent re-check, matching every other admin page. This one had none.
  const session = await getServerSession(authOptions);
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) redirect("/");

  const { id } = await params;
  const [product, auditLogs, models] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { category: true, variants: true, modelShots: { orderBy: { sortOrder: "asc" } } } }),
    prisma.adminAuditLog.findMany({ where: { targetType: "Product", targetId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { admin: { select: { name: true, email: true } } } }),
    modelOptions()
  ]);
  if (!product) notFound();
  return <div className="max-w-3xl"><div className="mb-8"><Link href="/admin/products" className="admin-kicker hover:text-soft-700">← Products</Link><h1 className="type-d3 mt-4 text-soft-800">Edit product</h1><p className="mt-2 text-sm text-soft-500">Update the catalog record and inventory variants.</p></div><AdminProductForm models={models} initial={{ id: product.id, name: product.name, description: product.description, material: product.material, price: product.price, categorySlug: product.category.slug, frontImageUrl: product.frontImageUrl, backImageUrl: product.backImageUrl, hoverVideoUrl: product.hoverVideoUrl ?? "", galleryImages: product.galleryImages, modelShots: product.modelShots.map((shot) => ({ modelId: shot.modelId, imageUrl: shot.imageUrl })), isPublished: product.isPublished, variants: product.variants.map((variant) => ({ size: variant.size, color: variant.color, colorHex: variant.colorHex ?? "", sku: variant.sku, quantity: variant.quantity })) }} /><section className="admin-panel mt-6 p-5 sm:p-7"><p className="admin-kicker">Audit history</p><div className="mt-4 space-y-4">{auditLogs.map((log) => <div key={log.id} className="flex justify-between gap-4 border-b border-soft-200/60 pb-3 last:border-0 last:pb-0"><div><p className="text-sm text-soft-700">{log.action}</p><p className="mt-1 text-xs text-soft-400">{log.admin.name ?? log.admin.email}</p></div><time className="shrink-0 text-xs text-soft-400">{new Date(log.createdAt).toLocaleString()}</time></div>)}{auditLogs.length === 0 && <p className="text-sm text-soft-500">No changes recorded yet.</p>}</div></section></div>;
}