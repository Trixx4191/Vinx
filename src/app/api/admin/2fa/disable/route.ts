import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const code = body?.code;

    const user = await prisma.user.findUnique({ where: { id: admin.session.user!.id! } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    // Require a currently-valid code to turn 2FA off, not just being
    // logged in — otherwise a hijacked session alone could strip the
    // account's strongest protection.
    if (typeof code !== "string" || !authenticator.check(code, user.twoFactorSecret)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
    await logAdminAction(user.id, "admin.2fa_disabled", "User", user.id);

    return NextResponse.json({ enabled: false });
  });
}
