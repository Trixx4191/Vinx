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

    if (typeof code !== "string") {
      return NextResponse.json({ error: "code required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: admin.session.user!.id! } });
    if (!user?.twoFactorSecret) {
      return NextResponse.json({ error: "Run setup first" }, { status: 400 });
    }

    const validCode = authenticator.check(code, user.twoFactorSecret);
    if (!validCode) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    await logAdminAction(user.id, "admin.2fa_enabled", "User", user.id);

    return NextResponse.json({ enabled: true });
  });
}
