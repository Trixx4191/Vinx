import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withSafeErrors } from "@/lib/safeErrors";
import { rateLimit } from "@/lib/rateLimit";
import { AVATAR_MAX_BYTES, buildAvatarKey, sniffImageType, storeObject } from "@/lib/storage";

/**
 * Upload a profile photo. The body is the raw image file.
 *
 * Unlike admin product uploads this goes through the server, because any
 * visitor can create an account: the size is enforced here, and the file is
 * checked to BE an image from its own bytes — the declared type and filename
 * are the sender's claim, not evidence.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return withSafeErrors(async () => {
    const { ok } = await rateLimit(`avatar:${userId}`, 10, 10 * 60_000);
    if (!ok) return NextResponse.json({ error: "Too many uploads. Try again shortly." }, { status: 429 });

    // Refused on the header first, so an oversized upload is rejected before
    // the server reads a byte of it. Checked again on the real body below,
    // because the header is the client's claim too.
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > AVATAR_MAX_BYTES) {
      return NextResponse.json({ error: "Photos must be under 2MB." }, { status: 413 });
    }

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length === 0) return NextResponse.json({ error: "No file received." }, { status: 400 });
    if (bytes.length > AVATAR_MAX_BYTES) {
      return NextResponse.json({ error: "Photos must be under 2MB." }, { status: 413 });
    }

    const type = sniffImageType(bytes);
    if (!type) {
      return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 415 });
    }

    const url = await storeObject(buildAvatarKey(type), bytes, type);
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });

    return NextResponse.json({ avatarUrl: url });
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return withSafeErrors(async () => {
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    return NextResponse.json({ ok: true });
  });
}
