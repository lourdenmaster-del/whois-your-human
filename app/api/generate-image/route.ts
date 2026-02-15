import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { getImageUrlFromBlob, saveImageToBlob } from "@/lib/report-store";

export async function POST(request: Request) {
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

    if (reportId && slug !== "image") {
      const existingUrl = await getImageUrlFromBlob(reportId, slug);
      if (existingUrl) return successResponse(200, { url: existingUrl }, requestId);
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

    const tempUrl = imageResponse.data[0]?.url ?? null;
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
