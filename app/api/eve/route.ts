import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { EngineResponse, ReportResponse } from "@/lib/api-types";
import type { BeautyProfileV1 } from "@/lib/beauty-profile-schema";
import { EVE_FILTER_SPEC, buildBeautyProfile } from "@/lib/eve-spec";
import type { VectorZero } from "@/lib/vector-zero";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { saveBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { validateEngineBody } from "@/lib/validate-engine-body";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const mark = () => Date.now() - start;
  log("info", "request", { requestId, method: "POST", path: "/api/eve" });
  try {
    const body = await request.json();
    const validation = validateEngineBody(body);
    if (!validation.ok) {
      log("warn", "validation failed", { requestId, error: validation.error.message });
      return errorResponse(400, validation.error.message, requestId);
    }
    const { fullName, birthDate, birthTime, birthLocation, email } = validation.value;

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      log("warn", "OPENAI_API_KEY not set", { requestId });
      return errorResponse(
        500,
        "OPENAI_API_KEY not set. Add it to .env.local in ligs-frontend, then restart.",
        requestId
      );
    }

    const origin =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin;
    const engineUrl = `${origin}/api/engine`;
    log("info", "stage", { requestId, stage: "engine_request_start", durationMs: mark() });
    const tEngineStart = Date.now();
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        birthDate,
        birthTime: birthTime ?? "",
        birthLocation,
        email,
      }),
    });
    const engineMs = Date.now() - tEngineStart;
    log("info", "stage", { requestId, stage: "engine_request_end", durationMs: mark() });

    let engineData: EngineResponse;
    try {
      engineData = (await engineRes.json()) as EngineResponse;
    } catch {
      return errorResponse(502, "ENGINE_JSON_PARSE_FAILED", requestId);
    }

    if (!engineRes.ok || engineData.error) {
      const status = engineRes.status >= 400 ? engineRes.status : 500;
      return errorResponse(
        status,
        engineData.error ?? "LIGS engine request failed",
        requestId
      );
    }

    const reportId = engineData.reportId;
    const vectorZero = engineData.vector_zero;

    if (!reportId) {
      log("warn", "engine did not return reportId", { requestId });
      return errorResponse(502, "ENGINE_MISSING_REPORT_ID", requestId);
    }

    const reportUrl = `${origin}/api/report/${reportId}`;
    log("info", "stage", { requestId, stage: "report_fetch_start", durationMs: mark() });
    const tReportStart = Date.now();
    const reportRes = await fetch(reportUrl);
    const reportFetchMs = Date.now() - tReportStart;
    log("info", "stage", { requestId, stage: "report_fetch_end", durationMs: mark() });
    const reportData = (await reportRes.json()) as ReportResponse & { error?: string };

    if (!reportRes.ok || reportData.error) {
      const status = reportRes.status >= 400 ? reportRes.status : 502;
      return errorResponse(status, "REPORT_NOT_FOUND", requestId);
    }

    const fullReport = reportData.full_report ?? "";
    const emotionalSnippet = reportData.emotional_snippet ?? "";
    const vectorZeroFromReport = reportData.vector_zero ?? vectorZero;

    if (!fullReport) {
      log("warn", "stored report has no full_report", { requestId });
      return errorResponse(502, "REPORT_MISSING_FULL_REPORT", requestId);
    }

    const openai = new OpenAI({ apiKey });

    log("info", "stage", { requestId, stage: "beauty_filter_start", durationMs: mark() });
    const tBeautyStart = Date.now();
    const eveFilterResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: EVE_FILTER_SPEC },
        {
          role: "user",
          content: `Transform this LIGS output into the Beauty-Only Profile. Output only the JSON object.\n\nFull report:\n${fullReport.slice(0, 8000)}\n\nEmotional snippet: ${emotionalSnippet}\n\n${vectorZeroFromReport ? `Vector Zero (use this for vector_zero section):\n${JSON.stringify(vectorZeroFromReport)}` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    const beautyFilterMs = Date.now() - tBeautyStart;
    log("info", "stage", { requestId, stage: "beauty_filter_end", durationMs: mark() });

    const filterText = eveFilterResponse.choices[0]?.message?.content;
    if (!filterText) {
      log("warn", "E.V.E. filter did not return output", { requestId });
      return errorResponse(500, "BEAUTY_FILTER_EMPTY_OUTPUT", requestId);
    }

    const filterOutput = JSON.parse(filterText) as Record<string, unknown>;
    const beautyProfile = buildBeautyProfile(filterOutput, vectorZeroFromReport);

    const timings = {
      totalMs: mark(),
      engineMs,
      reportFetchMs,
      beautyFilterMs,
    };
    const payload: BeautyProfileV1 = {
      version: "1.0",
      reportId,
      ...beautyProfile,
      timings,
    };
    await saveBeautyProfileV1(reportId, payload, requestId);

    return successResponse(200, payload, requestId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    log("error", "E.V.E. filter failed", { requestId, message });
    return errorResponse(500, `E.V.E. filter failed: ${message}`, requestId);
  }
}
