import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/types/product";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/");

  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <Link href="/admin/products/new" className="border border-black px-4 py-2 text-sm">
          Add product
        </Link>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Variants</th>
            <th>Total stock</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const totalStock = p.variants.reduce((sum, v) => sum + v.quantity, 0);
            return (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.name}</td>
                <td>{p.category.name}</td>
                <td>{formatPrice(p.price, p.currency)}</td>
                <td>{p.variants.length}</td>
                <td>{totalStock}</td>
                <td>{p.isPublished ? "Yes" : "No"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
