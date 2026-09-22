import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, logAdminAction } from "@/lib/requireAdmin";
import { updateStaffRoleSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

/**
 * Change a staff member's role — promote to master, demote to admin, or
 * revoke admin access entirely by setting them back to CUSTOMER.
 *
 * There is deliberately no DELETE handler. Orders and audit-log rows point at
 * this user, and the audit trail is append-only by design, so destroying the
 * account would either fail on those foreign keys or erase history that exists
 * to be kept. Revoking the role removes every privilege while leaving the
 * record of what that account did intact.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin.authorized) return admin.response;

  const { id } = await params;
  const actorId = admin.session.user!.id!;

  return withSafeErrors(async () => {
    const parsed = updateStaffRoleSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { role } = parsed.data;

    // Guard 1: no acting on yourself. Demoting yourself would drop you out of
    // the staff area mid-session with no way back in short of the CLI, and
    // "promote yourself" is meaningless for the only role that can get here.
    if (id === actorId) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const target = await tx.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true }
          });

          if (!target) return { error: "User not found", status: 404 } as const;
          if (target.role === role) return { error: "That account already has this role.", status: 400 } as const;

          // Guard 2: never remove the last master admin. Without this, the
          // final SUPER_ADMIN can be demoted and nobody can administer staff
          // again without shell access to run the CLI script.
          if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
            const remaining = await tx.user.count({ where: { role: "SUPER_ADMIN" } });
            if (remaining <= 1) {
              return {
                error: "This is the only master admin. Promote another account first.",
                status: 400
              } as const;
            }
          }

          const updated = await tx.user.update({
            where: { id },
            data: { role },
            select: { id: true, name: true, email: true, role: true }
          });

          return { updated, previousRole: target.role } as const;
        },
        // Serializable, because Guard 2 is a read-then-write: two masters
        // demoting each other at the same moment would each read a count of 2
        // and both succeed under the default isolation level, leaving zero.
        // Postgres aborts one of the two conflicting transactions instead.
        { isolationLevel: "Serializable" }
      );

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      await logAdminAction(actorId, "staff.role_change", "User", result.updated.id, {
        email: result.updated.email,
        from: result.previousRole,
        to: result.updated.role
      });

      return NextResponse.json({ user: result.updated });
    } catch (err) {
      // A serialization failure means a concurrent role change won the race.
      // It is not a server fault — ask the caller to retry against fresh data.
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2034") {
        return NextResponse.json(
          { error: "Another role change happened at the same time. Reload and try again." },
          { status: 409 }
        );
      }
      throw err;
    }
  });
}
