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

console.log("ENGINE ROUTE LOADED");

export async function POST(req: Request) {
  console.log("ENTERED_ENGINE_ROUTE");
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const mark = () => Date.now() - start;
  log("info", "request", { requestId, method: "POST", path: "/api/engine" });
  try {
    const body = await req.json();
    console.log("REQUEST_BODY:", body);
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
        "OPENAI_API_KEY not set. Set it in your environment (e.g. Vercel Project Settings → Environment Variables).",
        requestId
      );
    }

    const origin =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : new URL(req.url).origin;
    const engineUrl = `${origin}/api/engine/generate`;
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
    let filterText: string;
    try {
      console.log("VALIDATION_PASSED");
      console.log("BEFORE_MODEL_CALL");
      const eveFilterResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `${EVE_FILTER_SPEC}\n\nSTRICT OUTPUT: You must respond with valid JSON only. No prose, no markdown, no comments, no trailing commas, no additional fields. The only allowed shape is: {"image":"<base64 or URL>","report":"<string>"}`,
          },
          {
            role: "user",
            content: `Transform this LIGS output into the Beauty-Only Profile. Output only a single JSON object with exactly two keys: "image" (base64 or URL string) and "report" (string). Nothing else.\n\nFull report:\n${fullReport.slice(0, 8000)}\n\nEmotional snippet: ${emotionalSnippet}\n\n${vectorZeroFromReport ? `Vector Zero (use this for vector_zero section):\n${JSON.stringify(vectorZeroFromReport)}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
      console.log("AFTER_MODEL_CALL");
      console.log("MODEL_CALL_RESPONSE:", eveFilterResponse);
      filterText = eveFilterResponse.choices[0]?.message?.content ?? "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "E.V.E. model call failed", { requestId, message: msg });
      throw new Error(`E.V.E. model call failed: ${msg}`);
    }
    const beautyFilterMs = Date.now() - tBeautyStart;
    log("info", "stage", { requestId, stage: "beauty_filter_end", durationMs: mark() });

    if (!filterText || typeof filterText !== "string") {
      log("warn", "E.V.E. filter did not return output", { requestId });
      return errorResponse(500, "BEAUTY_FILTER_EMPTY_OUTPUT", requestId);
    }

    let parsed: { image: string; report: string };
    try {
      console.log("RAW_MODEL_OUTPUT:", filterText);
      const raw = JSON.parse(filterText) as unknown;
      if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("E.V.E. response is not a JSON object");
      }
      const obj = raw as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length !== 2 || !keys.includes("image") || !keys.includes("report")) {
        throw new Error(
          `E.V.E. response must have exactly "image" and "report" keys; got: ${keys.join(", ") || "none"}`
        );
      }
      if (typeof obj.image !== "string" || typeof obj.report !== "string") {
        throw new Error('E.V.E. response "image" and "report" must be strings');
      }
      parsed = { image: obj.image, report: obj.report };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "E.V.E. invalid JSON or shape", { requestId, message: msg });
      throw new Error(`E.V.E. invalid JSON output: ${msg}`);
    }

    const filterOutput = {
      vector_zero: {
        three_voice: { raw_signal: "", custodian: "", oracle: "" },
        beauty_baseline: { color_family: "", texture_bias: "", shape_bias: "", motion_bias: "" },
      },
      light_signature: { raw_signal: parsed.report, custodian: "", oracle: "" },
      archetype: { raw_signal: "", custodian: "", oracle: "" },
      deviations: { raw_signal: "", custodian: "", oracle: "" },
      corrective_vector: { raw_signal: "", custodian: "", oracle: "" },
      imagery_prompts: {
        vector_zero_beauty_field: "",
        light_signature_aesthetic_field: "",
        final_beauty_field: "",
      },
    };
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
      imageUrls: [parsed.image],
      fullReport: parsed.report,
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
