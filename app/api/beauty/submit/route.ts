import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { validateEngineBody } from "@/lib/validate-engine-body";
import { deriveFromBirthData, type DeriveFromBirthDataResult } from "@/lib/astrology/deriveFromBirthData";
import { computeSunMoonContext, type SunContext, type MoonContext } from "@/lib/astronomy/computeSunMoonContext";
import { getOnThisDayContext, type OnThisDayContext } from "@/lib/history/onThisDay";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import {
  extractExecutionKey,
  getEngineExecutionGrantViolation,
} from "@/lib/engine-execution-grant";
import { buildFreeWhoisReport } from "@/lib/free-whois-report";
import { buildWhoisProtocol, buildProtocolWhoisProfile } from "@/lib/whois-protocol";
import { saveWhoisProfileV1 } from "@/lib/whois-profile-store";
import { buildAgentPriorLayer } from "@/lib/whois-agent-prior";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";

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
  const kill = killSwitchResponse();
  if (kill) return kill;
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

    const bodyRecord = body as Record<string, unknown>;
    // DEV GUARD: local testing uses dry-run by default to avoid paid OpenAI calls.
    const forceLive = bodyRecord.forceLive === true;
    const isDev = process.env.NODE_ENV !== "production";
    const effectiveDryRun = dryRun === true || (isDev && !forceLive);
    const executionKey = extractExecutionKey(request, bodyRecord);
    const grantErr = await getEngineExecutionGrantViolation(executionKey, {
      dryRun: effectiveDryRun,
    });
    if (grantErr) {
      return errorResponse(403, grantErr, requestId);
    }

    // FREE TIER: protocol only — no engine, no deriveFromBirthData, no paid API calls.
    if (effectiveDryRun) {
      const protocol = buildWhoisProtocol({
        fullName,
        birthDate,
        birthTime: birthTime ?? "",
        birthLocation,
      });
      const reportId = randomUUID();
      const lon = birthDate?.trim() ? approximateSunLongitudeFromDate(birthDate.trim().slice(0, 10)) : null;
      const archetype = lon != null ? getPrimaryArchetypeFromSolarLongitude(lon) : "Stabiliora";
      const profile = buildProtocolWhoisProfile(reportId, protocol, {
        fullName,
        birthDate,
        birthTime: birthTime ?? "",
        birthLocation,
        archetype,
      });
      try {
        await saveWhoisProfileV1(reportId, profile as Parameters<typeof saveWhoisProfileV1>[1], requestId);
      } catch (saveErr) {
        const saveMsg = saveErr instanceof Error ? saveErr.message : String(saveErr);
        if (saveMsg === "BEAUTY_PROFILE_STORAGE_UNAVAILABLE") {
          log("error", "free_tier_save_storage_unavailable", { requestId, reportId });
          return errorResponse(
            503,
            "Storage not configured. Set BLOB_READ_WRITE_TOKEN for deployment.",
            requestId
          );
        }
        throw saveErr;
      }
      const freeWhoisReport = buildFreeWhoisReport({
        email: email ?? "",
        created_at: new Date().toISOString(),
        name: fullName,
        birthDate: birthDate ?? "",
        birthTime: birthTime ?? "",
        birthPlace: birthLocation ?? "",
        preview_archetype: archetype,
      });
      const agentPriorLayer = buildAgentPriorLayer({
        birthDate: birthDate ?? null,
        dominantArchetype: archetype,
      });
      log("info", "free_tier_protocol", { requestId, reportId });
      return NextResponse.json({
        status: "ok",
        requestId,
        data: {
          reportId,
          protocol,
          intakeStatus: "PROTOCOL_CREATED",
          note: "Free WHOIS protocol created. Unlock for expanded report.",
          freeWhoisReport,
          agentPriorLayer,
        },
      });
    }

    // Always run deriveFromBirthData so birth context is available server-side.
    // Paid flow must not proceed without resolved birthContext — blank output is a bug.
    let birthContext: EnrichedBirthContext | null = null;
    try {
      birthContext = await deriveFromBirthData({
        birthdate: birthDate,
        birthtime: birthTime ?? "",
        birthplace: birthLocation,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("error", "deriveFromBirthData_failed", { requestId, message: msg });
      return errorResponse(500, "Birth data resolution failed. Please verify date, time, and location.", requestId);
    }
    if (!birthContext) {
      log("error", "deriveFromBirthData_returned_null", { requestId });
      return errorResponse(500, "Birth data resolution failed. Please verify date, time, and location.", requestId);
    }

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
    if (birthContext != null && !effectiveDryRun) {
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
      ...(birthContext != null ? { birthContext } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(executionKey ? { executionKey } : {}),
    };

    log("info", "stage", { requestId, stage: "beauty_submit_forward", engineUrl });
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
    });

    const engineData = await engineRes.json().catch(() => ({})) as Record<string, unknown> & {
      error?: string;
      data?: { reportId?: string };
      reportId?: string;
    };
    if (!engineRes.ok) {
      const status = engineRes.status >= 500 ? 503 : engineRes.status;
      return errorResponse(
        status,
        (engineData.error as string) ?? "Engine request failed",
        requestId
      );
    }

    const reportId =
      typeof engineData.data?.reportId === "string"
        ? engineData.data.reportId
        : typeof engineData.reportId === "string"
          ? engineData.reportId
          : undefined;
    if (!reportId) {
      log("warn", "beauty_submit_missing_report_id", { requestId });
      return errorResponse(502, "ENGINE_MISSING_REPORT_ID", requestId);
    }

    const freeWhoisReport = buildFreeWhoisReport({
      email: email ?? "",
      created_at: new Date().toISOString(),
      name: fullName,
      birthDate: birthDate ?? "",
      birthTime: birthTime ?? "",
      birthPlace: birthLocation ?? "",
    });

    return NextResponse.json({
      status: "ok",
      requestId,
      data: {
        reportId,
        intakeStatus: "CREATED",
        note: "Report created server-side. Full identity payload is available after checkout and unlock.",
        freeWhoisReport,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "Beauty submit error", { requestId, message });
    return errorResponse(500, `Beauty submit failed: ${message}`, requestId);
  }
}
