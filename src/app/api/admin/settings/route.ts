import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { siteSettingsSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

/**
 * Save storefront settings. Only the keys `siteSettingsSchema` names are
 * accepted; Zod strips anything else before it reaches the database.
 *
 * A key sent as "" is deleted rather than stored empty, so "not set" has one
 * representation — a missing row — and the reader never has to decide whether
 * an empty string means "cleared" or "broken".
 */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const parsed = siteSettingsSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const entries = Object.entries(parsed.data).filter(([, value]) => value !== undefined) as Array<
      [string, string]
    >;

    await prisma.$transaction(
      entries.map(([key, value]) =>
        value === ""
          ? prisma.siteSetting.deleteMany({ where: { key } })
          : prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );

    await logAdminAction(admin.session.user!.id!, "settings.update", "SiteSetting", undefined, {
      keys: entries.map(([key]) => key)
    });

    return NextResponse.json({ ok: true });
  });
}
