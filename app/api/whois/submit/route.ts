/**
 * POST /api/whois/submit — WHOIS-owned alias for /api/beauty/submit.
 * Delegates to the beauty route; preserves response shape and behavior.
 * Explicitly re-serializes JSON so canonical { status: "ok", data } reaches client.
 */

import { NextResponse } from "next/server";

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
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
