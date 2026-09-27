import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";
import { logAdminAction } from "@/lib/requireAdmin";
import { isAdminRole } from "@/lib/roles";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Captured after the guard: TypeScript does not carry the narrowing on
  // `user.id` into the async closure below.
  const userId = user.id;

  return withSafeErrors(async () => {
    const parsed = changePasswordSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    const record = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });
    if (!record) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    // Possession of a session is not enough. Re-proving the current password
    // is what stops an unattended browser or a stolen cookie from turning into
    // permanent control of the account.
    const valid = await bcrypt.compare(currentPassword, record.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Your current password is not correct." }, { status: 400 });
    }

    // Reusing the same password is not an error worth blocking, but it is
    // worth saying, because a customer who thinks they rotated a leaked
    // password and did not is worse off than one who knows they did nothing.
    if (await bcrypt.compare(newPassword, record.passwordHash)) {
      return NextResponse.json(
        { error: "That is already your password. Choose a different one." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) }
    });

    // An admin changing their own credential belongs in the audit trail; a
    // customer changing theirs does not, and logging it would fill the trail
    // with routine activity that hides the entries that matter.
    if (isAdminRole(user.role)) {
      await logAdminAction(userId, "account.password_change", "User", userId);
    }

    // The session stays valid on purpose. NextAuth's JWT does not carry the
    // password hash, so it is not invalidated by this change — signing every
    // device out would need a token version on the user record, which is worth
    // doing but is a larger change than this one.
    return NextResponse.json({ ok: true });
  });
}
