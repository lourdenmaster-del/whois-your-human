/**
 * POST /api/dev/live-once
 * Dev-only: runs exactly one real OpenAI report generation.
 * Bypasses DRY_RUN. Costs money. Rate-limited to 1 per server process.
 */

import { NextResponse } from "next/server";
import { validateEngineBody } from "@/lib/validate-engine-body";

let used = false;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "LIVE_ONCE is dev-only; not available in production" },
      { status: 403 }
    );
  }

  if (used) {
    return NextResponse.json(
      { error: "LIVE_ONCE already used; restart dev server." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const engineBody = {
    ...body,
    email: body.email ?? "dev@example.com",
    dryRun: false,
  };

  const validation = validateEngineBody(engineBody);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  used = true;

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const engineUrl = `${origin}/api/engine/generate`;

  try {
    const res = await fetch(engineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Force-Live": "1",
      },
      body: JSON.stringify(validation.value),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? data.message ?? "Engine request failed", detail: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    used = false;
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Live-once failed: ${message}` },
      { status: 500 }
    );
  }
}
