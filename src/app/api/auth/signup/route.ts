import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { withSafeErrors } from "@/lib/safeErrors";

// bcrypt cost factor 12: a deliberate slow hash. Higher costs make
// brute-forcing a stolen hash dump slower; 12 is a solid 2026 baseline.
const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  return withSafeErrors(async () => {
    // Rate limit by IP to slow down automated account-creation abuse.
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { ok } = await rateLimit(`signup:${ip}`, 5, 60_000); // 5 signups per minute per IP
    if (!ok) {
      return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Same generic message a real signup would use for other failures,
      // to avoid confirming which emails are already registered.
      return NextResponse.json({ error: "Could not create account" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true } // never return passwordHash
    });

    return NextResponse.json({ user }, { status: 201 });
  });
}
