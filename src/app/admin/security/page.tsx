import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SecurityForm from "./SecurityForm";
import { prisma } from "@/lib/prisma";

export default async function AdminSecurityPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/");
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/");

  const [user, activity] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } }),
    prisma.adminAuditLog.findMany({ where: { adminId: userId, action: { startsWith: "admin.2fa" } }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return <SecurityForm enabled={user?.twoFactorEnabled ?? false} activity={activity.map((entry) => ({ id: entry.id, action: entry.action, createdAt: entry.createdAt.toISOString() }))} />;
}
