import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { prisma } from "@/lib/prisma";

// Step 1 of enabling 2FA: generate a fresh secret, store it (but leave
// twoFactorEnabled false), and hand back a QR code to scan. It only takes
// effect once /api/admin/2fa/verify confirms the admin can actually produce
// a valid code from it — otherwise someone could lock themselves out with a
// typo'd authenticator app setup.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const secret = authenticator.generateSecret();
    const email = admin.session.user!.email!;

    await prisma.user.update({
      where: { id: admin.session.user!.id! },
      data: { twoFactorSecret: secret, twoFactorEnabled: false }
    });

    const otpauthUrl = authenticator.keyuri(email, "Vinx Admin", secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({ qrCodeDataUrl, secret });
  });
}
