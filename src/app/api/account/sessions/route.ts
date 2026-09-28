import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withSafeErrors } from "@/lib/safeErrors";
import { logAdminAction } from "@/lib/requireAdmin";
import { isAdminRole } from "@/lib/roles";

/**
 * Sign out of every device.
 *
 * Bumps the user's session version, which invalidates every token issued
 * before now — a phone left logged in, a shared computer, a session someone
 * else is using. The caller's own session ends too; the client signs out and
 * returns to the login page.
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const userId = user.id;

  return withSafeErrors(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } }
    });

    if (isAdminRole(user.role)) {
      await logAdminAction(userId, "account.sign_out_everywhere", "User", userId);
    }

    return NextResponse.json({ ok: true });
  });
}
