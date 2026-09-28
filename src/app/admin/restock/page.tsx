import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lowStockWhere } from "@/lib/inventory";
import RestockForm from "./RestockForm";
import { isAdminRole } from "@/lib/roles";

export default async function RestockPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) redirect("/");
  const lowStock = await prisma.productVariant.findMany({ where: lowStockWhere, orderBy: { quantity: "asc" }, take: 30, include: { product: { select: { name: true } } } });
  return <RestockForm lowStock={lowStock} />;
}
