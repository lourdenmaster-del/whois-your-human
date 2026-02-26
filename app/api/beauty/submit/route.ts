import { NextResponse } from "next/server";
import { validateEngineBody } from "@/lib/validate-engine-body";
import { deriveFromBirthData, type DeriveFromBirthDataResult } from "@/lib/astrology/deriveFromBirthData";
import { computeSunMoonContext, type SunContext, type MoonContext } from "@/lib/astronomy/computeSunMoonContext";
import { getOnThisDayContext, type OnThisDayContext } from "@/lib/history/onThisDay";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";

/** Base derivation + optional sun/moon/onThisDay enrichment. */
type EnrichedBirthContext = DeriveFromBirthDataResult & {
  sun?: SunContext;
  moon?: MoonContext;
  onThisDay?: OnThisDayContext;
};

/**
 * POST /api/beauty/submit
 * Single server entry point for the Beauty flow. Always runs deriveFromBirthData
 * from birth data, then forwards to the E.V.E. pipeline. The browser must never
 * call OpenAI or the engine directly; all requests go through this route.
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "POST", path: "/api/beauty/submit" });

  try {
    const body = await request.json();
    const validation = validateEngineBody(body);
    if (!validation.ok) {
      log("warn", "validation failed", { requestId, error: validation.error.message });
      return errorResponse(400, validation.error.message, requestId);
    }

    const { fullName, birthDate, birthTime, birthLocation, email, dryRun } = validation.value;

    // Always run deriveFromBirthData so birth context is available server-side.
    let birthContext: EnrichedBirthContext | null = await deriveFromBirthData({
      birthdate: birthDate,
      birthtime: birthTime ?? "",
      birthplace: birthLocation,
    });

    // Sun/Moon context (computed locally, no external APIs).
    if (birthContext != null) {
      try {
        const { sun, moon } = computeSunMoonContext({
          lat: birthContext.lat,
          lon: birthContext.lon,
          utcTimestamp: birthContext.utcTimestamp,
          timezoneId: birthContext.timezoneId,
        });
        birthContext = { ...birthContext, sun, moon };
      } catch (e) {
        log("warn", "computeSunMoonContext failed", {
          requestId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Optional on-this-day history context (omit in DRY_RUN to avoid network).
    if (birthContext != null && dryRun !== true) {
      const match = birthDate.trim().match(/^\d{4}-(\d{2})-(\d{2})/);
      if (match) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const onThisDay = await getOnThisDayContext(month, day);
          if (onThisDay) {
            birthContext = { ...birthContext, onThisDay };
          }
        }
      }
    }

    const reqOrigin = new URL(request.url).origin;
    const isLocalhost =
      reqOrigin.includes("localhost") || reqOrigin.includes("127.0.0.1");
    const origin =
      isLocalhost
        ? reqOrigin
        : process.env.VERCEL_URL != null
          ? `https://${process.env.VERCEL_URL}`
          : reqOrigin;
    const engineUrl = `${origin}/api/engine`;

    const idempotencyKey = (body as Record<string, unknown>).idempotencyKey as string | undefined;
    const engineBody: Record<string, unknown> = {
      fullName,
      birthDate,
      birthTime: birthTime ?? "",
      birthLocation,
      email,
      ...(dryRun === true && { dryRun: true }),
      ...(birthContext != null && { birthContext }),
      ...(idempotencyKey && { idempotencyKey }),
    };

    log("info", "stage", { requestId, stage: "beauty_submit_forward", engineUrl });
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
    });

    const engineData = await engineRes.json().catch(() => ({})) as Record<string, unknown> & { error?: string };
    if (!engineRes.ok) {
      const status = engineRes.status >= 500 ? 503 : engineRes.status;
      return errorResponse(
        status,
        (engineData.error as string) ?? "Engine request failed",
        requestId
      );
    }

    return NextResponse.json(engineData);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "Beauty submit error", { requestId, message });
    return errorResponse(500, `Beauty submit failed: ${message}`, requestId);
  }
}
