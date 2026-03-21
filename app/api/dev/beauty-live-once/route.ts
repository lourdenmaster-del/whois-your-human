/**
 * POST /api/dev/beauty-live-once
 * Dev-only: Golden Run — exactly one live run per browser session unless idempotencyKey
 * matches (retries allowed). Rate-limited per session via cookie.
 */

import { NextResponse } from "next/server";
import { runPreflight } from "@/lib/preflight";
import { log } from "@/lib/log";

const COOKIE_NAME = "beauty-live-once-key";

const DEFAULT_BIRTH_DATA = {
  fullName: "Live Test User",
  birthDate: "1990-06-15",
  birthTime: "14:30",
  birthLocation: "New York, NY",
  email: "dev@example.com",
};

function parseSessionKey(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function POST(request: Request) {
  const allowPreview = process.env.ALLOW_PREVIEW_LIVE_TEST === "1" || process.env.ALLOW_PREVIEW_LIVE_TEST === "true";
  if (process.env.NODE_ENV === "production" && !allowPreview) {
    return NextResponse.json(
      { error: "BEAUTY_LIVE_ONCE is dev-only" },
      { status: 403 }
    );
  }

  const preflight = runPreflight();
  if (!preflight.ok) {
    return NextResponse.json(
      { error: "Preflight failed", preflight: preflight.checks },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json().catch(() => ({}));
    body = typeof raw === "object" && raw != null ? raw : {};
  } catch {
    // empty body is ok
  }

  const birthData = {
    fullName: (body.fullName as string) ?? DEFAULT_BIRTH_DATA.fullName,
    birthDate: (body.birthDate as string) ?? DEFAULT_BIRTH_DATA.birthDate,
    birthTime: (body.birthTime as string) ?? DEFAULT_BIRTH_DATA.birthTime,
    birthLocation: (body.birthLocation as string) ?? DEFAULT_BIRTH_DATA.birthLocation,
    email: (body.email as string) ?? DEFAULT_BIRTH_DATA.email,
  };

  const cookieHeader = request.headers.get("cookie");
  const sessionKey = parseSessionKey(cookieHeader);

  const idempotencyKey =
    (typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : null) ?? sessionKey ?? crypto.randomUUID();

  // Golden Run: one live run per session. Retries with same key allowed (idempotency returns cached).
  if (sessionKey != null && sessionKey !== idempotencyKey) {
    log("info", "beauty_live_once_rejected", {
      reason: "session_already_used",
      sessionKeyPrefix: sessionKey.slice(0, 8),
      requestedKeyPrefix: idempotencyKey.slice(0, 8),
    });
    return NextResponse.json(
      {
        error: "BEAUTY_LIVE_ONCE already used this session. Use same idempotencyKey to retry, or clear cookies for a new run.",
      },
      { status: 429 }
    );
  }

  const requestId = crypto.randomUUID();
  log("info", "beauty_live_once_start", {
    requestId,
    birthData,
    idempotencyKeyPrefix: idempotencyKey.slice(0, 8),
    sessionKeyExists: sessionKey != null,
  });

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const submitUrl = `${origin}/api/beauty/submit`;

  try {
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...birthData,
        dryRun: false,
        idempotencyKey,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: string;
      data?: Record<string, unknown> & { reportId?: string; idempotencyHit?: boolean };
    };

    if (!res.ok) {
      log("warn", "beauty_live_once_failed", {
        requestId,
        status: res.status,
        error: data.error,
      });
      return NextResponse.json(
        { error: data.error ?? "Beauty submit failed", detail: data },
        { status: res.status }
      );
    }

    const payload = (data.data ?? data) as Record<string, unknown>;
    const reportId = payload.reportId as string | undefined;
    const idempotencyHit = payload.idempotencyHit === true;
    const imagePromptsUsed = payload.imagePromptsUsed as Array<unknown> | undefined;
    const imageCount = Array.isArray(imagePromptsUsed) ? imagePromptsUsed.length : 0;

    if (!reportId) {
      return NextResponse.json(
        { error: "No reportId in response", data, payload },
        { status: 502 }
      );
    }

    const meta = (payload.meta ?? data.data?.meta ?? data.meta) as Record<string, unknown> | undefined;
    const cylindersReport = {
      llmCallsAttempted: meta?.llmCallsAttempted ?? (idempotencyHit ? 0 : "unknown"),
      imageCallsAttempted: meta?.imageCallsAttempted ?? imageCount,
      allowExternalWrites: meta?.allowExternalWrites ?? process.env.ALLOW_EXTERNAL_WRITES === "true",
      idempotencyHit,
      routesHit: meta?.routesHit ?? [],
    };
    log("info", "cylinders_report", cylindersReport);

    log("info", "beauty_live_once_success", {
      requestId,
      reportId,
      subjectName: payload.subjectName,
      dominantArchetype: payload.dominantArchetype,
      idempotencyHit,
      cacheHit: idempotencyHit,
      cacheMiss: !idempotencyHit,
      imageCount,
      llmCalls: idempotencyHit ? 0 : "1 report + 1 E.V.E.",
    });

    const response = NextResponse.json({
      reportId,
      subjectName: payload.subjectName,
      dominantArchetype: payload.dominantArchetype,
      viewUrl: `/whois/view?reportId=${encodeURIComponent(reportId)}`,
      meta: { idempotencyHit, imageCount, cylindersReport },
    });

    // Set session cookie so we enforce one run per session (retries with same key allowed)
    response.headers.set(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(idempotencyKey)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "beauty_live_once_error", { requestId, message });
    return NextResponse.json(
      { error: `Beauty live-once failed: ${message}` },
      { status: 500 }
    );
  }
}
