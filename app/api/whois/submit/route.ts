/**
 * POST /api/whois/submit — WHOIS-owned alias for /api/beauty/submit.
 * Delegates to the beauty route; preserves response shape and behavior.
 */

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const body = await request.text();
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${origin}/api/beauty/submit`, {
    method: "POST",
    headers,
    body,
  });
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
