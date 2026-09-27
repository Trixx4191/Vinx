import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { expirePendingOrders } from "@/lib/orders";
import { withSafeErrors } from "@/lib/safeErrors";

/**
 * Return stock held by expired pending orders.
 *
 * Checkout reserves stock for 30 minutes so two people cannot buy the last
 * item while one of them is still on a payment page. Releasing it was only
 * ever opportunistic — it happened when some other request touched a checkout
 * or payment endpoint — which means a quiet night leaves stock locked behind
 * orders nobody is going to pay for. This gives a scheduler something to call.
 *
 * Schedule it every five to fifteen minutes:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/release-stock
 *
 * On Vercel, a `vercel.json` cron entry pointing here does the same thing; its
 * scheduler sends the secret if you set it as an environment variable.
 */

export const dynamic = "force-dynamic";

/**
 * Compare in constant time.
 *
 * A plain `===` on a secret leaks its length and, in principle, its prefix
 * through timing. This endpoint mutates inventory, so the comparison is worth
 * doing properly even though the attack is impractical over the internet.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, which would itself be a length
  // oracle — so the lengths are compared first and the result folded in.
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

function authorise(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;

  // Fail closed. An endpoint that changes stock must not be open because a
  // variable was forgotten — an unset secret disables the route entirely
  // rather than leaving it callable by anyone who guesses the path.
  if (!expected) return false;

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Some schedulers cannot set headers, so a query parameter is accepted too.
  // It is the weaker option: query strings end up in server and proxy logs.
  const fromQuery = req.nextUrl.searchParams.get("secret") ?? "";

  const provided = bearer || fromQuery;
  return provided.length > 0 && secretMatches(provided, expected);
}

async function handle(req: NextRequest) {
  if (!authorise(req)) {
    // 404 rather than 401: an unauthenticated caller learns nothing about
    // whether this path exists, matching how /api/admin/* behaves.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return withSafeErrors(async () => {
    const started = Date.now();
    const released = await expirePendingOrders();
    const durationMs = Date.now() - started;

    console.info(`[cron] released ${released} expired order(s) in ${durationMs}ms`);

    return NextResponse.json({ ok: true, released, durationMs });
  });
}

// GET for schedulers that only issue GETs; POST for those that prefer it.
export const GET = handle;
export const POST = handle;
