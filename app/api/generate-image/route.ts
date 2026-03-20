import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { getImageUrlFromBlob, saveImageToBlob } from "@/lib/report-store";
import { isTestMode } from "@/lib/runtime-mode";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import {
  extractExecutionKey,
  getEngineExecutionGrantViolation,
} from "@/lib/engine-execution-grant";

/** Placeholder data URL for TEST_MODE dry image generation. */
const DRY_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024' viewBox='0 0 1024 1024'%3E%3Crect fill='%23050814' width='1024' height='1024'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='24' text-anchor='middle' dy='.3em' font-family='system-ui'%3ETEST MODE – no image generated%3C/text%3E%3C/svg%3E";

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "POST", path: "/api/generate-image" });
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const reportId = typeof body.reportId === "string" ? body.reportId.trim() : null;
    const slug = typeof body.slug === "string" ? body.slug.trim() || "image" : "image";

    if (!prompt) {
      log("warn", "validation failed", { requestId, error: "Missing or invalid prompt" });
      return errorResponse(400, "Missing or invalid prompt", requestId);
    }

    if (isTestMode) {
      log("info", "TEST_MODE – returning placeholder image", { requestId, reportId, slug });
      return successResponse(200, { url: DRY_IMAGE_PLACEHOLDER }, requestId);
    }

    if (reportId && slug !== "image") {
      const existingUrl = await getImageUrlFromBlob(reportId, slug);
      if (existingUrl) return successResponse(200, { url: existingUrl }, requestId);
    }

    const bodyRec = body as Record<string, unknown>;
    const exKey = extractExecutionKey(request, bodyRec);
    const gv = await getEngineExecutionGrantViolation(exKey, { dryRun: false });
    if (gv) {
      return errorResponse(403, gv, requestId);
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      log("warn", "OPENAI_API_KEY not set", { requestId });
      return errorResponse(500, "OPENAI_API_KEY not set", requestId);
    }

    const openai = new OpenAI({ apiKey });
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const tempUrl = imageResponse.data?.[0]?.url ?? null;
    if (!tempUrl) {
      log("warn", "No image URL in response", { requestId });
      return errorResponse(500, "No image URL in response", requestId);
    }

    const idForBlob = reportId || randomUUID();
    let url = tempUrl;
    try {
      const imageRes = await fetch(tempUrl);
      if (imageRes.ok) {
        const imageBuffer = await imageRes.arrayBuffer();
        const contentType = imageRes.headers.get("content-type") || "image/png";
        const blobUrl = await saveImageToBlob(idForBlob, slug, imageBuffer, contentType);
        if (blobUrl) url = blobUrl;
      }
    } catch (e) {
      log("warn", "Blob upload failed, returning temporary URL", { requestId, message: e instanceof Error ? e.message : String(e) });
    }
    return successResponse(200, { url }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "Generate image error", { requestId, message });
    return errorResponse(500, message, requestId);
  }
}
