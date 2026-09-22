import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminRole } from "@/lib/roles";
import StaffManager from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  // A regular ADMIN reaching this URL is redirected exactly like a logged-out
  // visitor — no 403, nothing that confirms a staff page exists here.
  if (!isSuperAdminRole(user?.role)) redirect("/");

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true, createdAt: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  const superAdminCount = staff.filter((member) => member.role === "SUPER_ADMIN").length;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="admin-kicker">Vinx / studio</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-soft-700">Staff</h1>
        <p className="mt-2 max-w-xl text-sm text-soft-500">
          Master admins can grant and revoke admin access. Revoking sets an account back to customer —
          it keeps their order history and their entry in the audit log.
        </p>
      </div>

      <StaffManager
        staff={staff.map((member) => ({ ...member, createdAt: member.createdAt.toISOString() }))}
        currentUserId={user?.id ?? ""}
        superAdminCount={superAdminCount}
      />
    </div>
  );
}
