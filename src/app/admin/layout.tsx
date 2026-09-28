import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Archivo } from "next/font/google";
import AdminSidebar from "@/components/AdminSidebar";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

/**
 * The admin's own typeface, loaded here rather than in the root layout.
 *
 * The storefront is set entirely in a monospace, which is right for a page of
 * product codes and wrong for a twenty-field product form. Declaring this font
 * in the admin layout means only admin routes request it — a shopper never
 * downloads a face they will never see.
 */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesque",
  display: "swap"
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!isAdminRole(role)) redirect("/");

  return (
    // `admin-root` switches the whole subtree to the proportional face and
    // restores real heading sizes — see the ADMIN block in globals.css.
    <div className={`${archivo.variable} admin-root pt-8`}>
      <div className="admin-shell grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-14">
        <AdminSidebar />
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
