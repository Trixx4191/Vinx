import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";

// 404, not 403 — don't confirm the route exists to a caller who shouldn't
// know about it.
const notFound = () =>
  ({
    authorized: false as const,
    response: NextResponse.json({ error: "Not found" }, { status: 404 })
  }) as const;

/**
 * Call this at the top of every /api/admin/* route handler.
 *
 * This deliberately does NOT trust the middleware alone — if this route is
 * ever called directly (misconfigured matcher, internal call, future
 * refactor), it still has to pass this check. Defense in depth: two
 * independent places both have to agree the caller is an admin.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || !isAdminRole(role)) {
    return notFound();
  }

  return { authorized: true as const, session, role: role as string };
}

/**
 * Stricter gate for anything that grants or revokes access.
 *
 * A regular ADMIN passes requireAdmin but must fail here — otherwise any admin
 * could promote themselves to master, which would make the distinction
 * between the two roles decorative. Staff routes call this, never requireAdmin.
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || !isSuperAdminRole(role)) {
    return notFound();
  }

  return { authorized: true as const, session, role: role as string };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  const jsonMetadata = metadata === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue);

  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, metadata: jsonMetadata }
  });
}
