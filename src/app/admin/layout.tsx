import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!isAdminRole(role)) redirect("/");

  return (
    <div className="admin-shell grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-14">
      <AdminSidebar />
      <section className="min-w-0">{children}</section>
    </div>
  );
}