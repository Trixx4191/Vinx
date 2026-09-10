// Uses Upstash Redis when configured and an in-memory fallback for local
// development or a single server instance.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

type RateLimitResult = { ok: boolean; remaining: number };

async function distributedRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `vinx:ratelimit:${key}`;
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, Math.ceil(windowMs / 1000)]
    ])
  });

  if (!response.ok) throw new Error(`Rate-limit store returned ${response.status}`);
  const [countResult] = (await response.json()) as [{ result?: number }];
  const count = Number(countResult?.result);
  if (!Number.isInteger(count)) throw new Error("Rate-limit store returned an invalid count");

  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const distributed = await distributedRateLimit(key, limit, windowMs);
  if (distributed) return distributed;

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
