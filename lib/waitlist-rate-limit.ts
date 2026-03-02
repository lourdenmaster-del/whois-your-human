/**
 * Lightweight in-memory rate limit for /api/waitlist.
 * Resets on cold start (serverless). Per-key: max 5 requests per 60s.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

/** key -> timestamps of recent requests */
const store = new Map<string, number[]>();

function prune(key: string, now: number): void {
  const entries = store.get(key);
  if (!entries) return;
  const cutoff = now - WINDOW_MS;
  const filtered = entries.filter((t) => t > cutoff);
  if (filtered.length === 0) store.delete(key);
  else store.set(key, filtered);
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  prune(key, now);
  const entries = store.get(key) ?? [];
  if (entries.length >= MAX_PER_WINDOW) {
    const oldest = Math.min(...entries);
    return { allowed: false, retryAfter: Math.ceil((oldest + WINDOW_MS - now) / 1000) };
  }
  entries.push(now);
  store.set(key, entries);
  return { allowed: true };
}

export function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = (forwarded ?? realIp ?? "unknown").split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  return `${ip.slice(0, 50)}|${ua.length > 0 ? ua.slice(0, 32) : "no-ua"}`;
}
