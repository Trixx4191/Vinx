// Lightweight in-memory rate limiter.
//
// IMPORTANT: this resets whenever the server restarts and does not work
// across multiple server instances. It's fine for local dev / a single
// instance, but before going to production behind more than one server
// process, swap this for a shared store like Upstash Redis
// (https://github.com/upstash/ratelimit) using the same function signature.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}
