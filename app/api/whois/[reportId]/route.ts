/**
 * GET /api/whois/[reportId] — WHOIS-owned alias for /api/beauty/[reportId].
 * Delegates to the beauty route; preserves response shape and behavior.
 */

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/beauty/${encodeURIComponent(reportId)}`, {
    headers: request.headers,
    cache: "no-store",
  });
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
