import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  if (!session || role !== "ADMIN") {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }) // 404, not 403 — don't confirm the route exists
    };
  }

  return { authorized: true as const, session };
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
