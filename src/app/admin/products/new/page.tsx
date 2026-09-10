import Link from "next/link";
import AdminProductForm from "@/components/AdminProductForm";

export default function NewProductPage() {
  return <div className="max-w-3xl"><div className="mb-8"><Link href="/admin/products" className="text-xs uppercase tracking-[0.12em] text-soft-400 hover:text-soft-700">← Products</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight text-soft-700">Add product</h1><p className="mt-2 text-sm text-soft-500">Build a complete product record before it reaches the storefront.</p></div><AdminProductForm /></div>;
}
