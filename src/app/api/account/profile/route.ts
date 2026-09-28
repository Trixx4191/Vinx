import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withSafeErrors } from "@/lib/safeErrors";
import { profileSchema } from "@/lib/validation";

/**
 * Change the display name, or the VIP drop-email preference. Email is deliberately not editable here: it is the
 * login identifier, and changing it safely needs a confirmation sent to the new
 * address — without that, anyone holding a session could move the account to
 * an address they control and lock the owner out.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return withSafeErrors(async () => {
    const parsed = profileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, vipDropEmails } = parsed.data;
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(vipDropEmails !== undefined ? { vipDropEmails } : {})
      }
    });
    return NextResponse.json({ ok: true });
  });
}
