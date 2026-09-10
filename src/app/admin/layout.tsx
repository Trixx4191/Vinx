import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "ADMIN") redirect("/");

  return (
    <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12">
      <AdminSidebar />
      <section className="min-w-0">{children}</section>
    </div>
  );
}