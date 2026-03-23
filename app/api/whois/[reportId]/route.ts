/**
 * GET /api/whois/[reportId] — WHOIS-owned alias for /api/beauty/[reportId].
 * Delegates to the beauty route; preserves response shape and behavior.
 * Parses and re-serializes JSON so canonical { status: "ok", data } reaches client.
 */

import { NextResponse } from "next/server";

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
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
