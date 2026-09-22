import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, logAdminAction } from "@/lib/requireAdmin";
import { createStaffSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

/**
 * Staff management. Every handler here gates on requireSuperAdmin, not
 * requireAdmin — a regular ADMIN must not be able to grant access, otherwise
 * any admin could promote themselves and the two roles would be the same role.
 */

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      // passwordHash and twoFactorSecret are never selected. Listing fields
      // explicitly means a future column can't leak into this response by
      // default.
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });

    return NextResponse.json({ staff });
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const parsed = createStaffSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing) {
      // Promoting an existing customer is a separate, deliberate action via
      // PATCH. Silently upgrading an account here would mean a typo'd email
      // could hand admin rights to whoever already owns that address.
      return NextResponse.json(
        { error: "An account with that email already exists. Change their role from the staff list instead." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    // The password is never written to the audit log, or anywhere else in
    // plaintext — only the fact that an account was created, and with what role.
    await logAdminAction(admin.session.user!.id!, "staff.create", "User", user.id, {
      email: user.email,
      role: user.role
    });

    return NextResponse.json({ user }, { status: 201 });
  });
}
