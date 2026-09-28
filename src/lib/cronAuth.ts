import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Shared check for `/api/cron/*`. Compares in constant time and fails closed:
 * with CRON_SECRET unset every scheduled route is disabled, rather than open
 * to anyone who guesses the path.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function authoriseCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Some schedulers cannot set headers. Query strings end up in logs, so the
  // header is preferred.
  const fromQuery = req.nextUrl.searchParams.get("secret") ?? "";

  const provided = bearer || fromQuery;
  return provided.length > 0 && secretMatches(provided, expected);
}
