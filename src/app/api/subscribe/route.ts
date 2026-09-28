import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subscribeSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Newsletter sign-up.
 *
 * Public and unauthenticated, which is the whole point and also the risk: this
 * is an endpoint anyone can POST to, that writes a row. Hence the rate limit,
 * the strict schema, and an upsert rather than a create.
 */
export async function POST(req: NextRequest) {
  return withSafeErrors(async () => {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { ok } = await rateLimit(`subscribe:${ip}`, 5, 60_000); // 5 per minute per IP
    if (!ok) {
      return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
    }

    const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Enter a valid email address." },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;

    // Upsert, so signing up twice is not an error the visitor has to see. The
    // unique index means two simultaneous requests cannot both insert; without
    // the upsert, the loser of that race would surface as a 500.
    await prisma.subscriber.upsert({
      where: { email },
      update: { source },
      create: { email, source }
    });

    // The same response either way. Telling a caller "you are already
    // subscribed" turns this endpoint into a way to test whether a given
    // address is on the list, which is not something a public form should
    // answer.
    return NextResponse.json({ ok: true });
  });
}
