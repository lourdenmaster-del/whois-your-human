/**
 * Lightweight in-memory rate limiting. Not production-grade; replace with Upstash or Vercel KV for production.
 * Key: `${key}:${ip}`. Tracks timestamps in a sliding window; throws if count exceeds limit.
 */
const store = new Map<string, number[]>();

function getIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "anonymous";
}

export async function rateLimit(
  request: Request,
  key: string,
  limit: number,
  windowMs: number
): Promise<void> {
  const ip = getIp(request);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = store.get(bucketKey) ?? [];
  timestamps = timestamps.filter((t) => t >= windowStart);
  timestamps.push(now);

  if (timestamps.length > limit) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  store.set(bucketKey, timestamps);
}
