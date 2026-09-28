import { NextRequest, NextResponse } from "next/server";
import { authoriseCron as authorise } from "@/lib/cronAuth";
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
