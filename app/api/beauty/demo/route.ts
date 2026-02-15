import { NextResponse } from "next/server";
import OpenAI from "openai";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { getReport } from "@/lib/report-store";

/**
 * Leonardo da Vinci — public birth data (historically referenced).
 * Demo-only; does not touch the user form or engine logic for real submissions.
 */
const DEMO_SUBJECT = {
  fullName: "Leonardo da Vinci",
  birthDate: "April 15, 1452",
  birthTime: "22:30",
  birthLocation: "Vinci, Italy",
  email: "test@ligs.io",
};

/** First 2–3 paragraphs of full_report for excerpt. */
function excerptFromReport(fullReport: string, maxParagraphs = 3): string {
  const paragraphs = fullReport.split(/\n\n+/).filter((p) => p.trim().length > 0);
  return paragraphs.slice(0, maxParagraphs).join("\n\n");
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "GET", path: "/api/beauty/demo" });
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      log("warn", "OPENAI_API_KEY not set", { requestId });
      return errorResponse(503, "OPENAI_API_KEY not set. Demo unavailable.", requestId);
    }

    const origin =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin;

    const engineUrl = `${origin}/api/engine/generate`;
    log("info", "fetch start", { requestId, url: engineUrl });
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_SUBJECT),
    });
    log("info", "fetch end", { requestId, url: engineUrl, status: engineRes.status });

    if (!engineRes.ok) {
      const err = await engineRes.json().catch(() => ({}));
      const status = engineRes.status >= 500 ? 503 : 400;
      return errorResponse(
        status,
        (err as { error?: string }).error || "Engine failed. Demo unavailable.",
        requestId
      );
    }

    const engineData = (await engineRes.json()) as {
      data?: {
        reportId?: string;
        emotional_snippet?: string;
        image_prompts?: string[];
      };
    };
    const reportId = engineData.data?.reportId;
    const imagePrompts = engineData.data?.image_prompts ?? [];

    if (!reportId) {
      log("warn", "No reportId from engine", { requestId });
      return errorResponse(500, "No reportId from engine. Demo unavailable.", requestId);
    }

    const report = await getReport(reportId);
    const fullReport = report?.full_report ?? "";

    const promptForDalle =
      imagePrompts.length > 0
        ? imagePrompts[0]
        : "Abstract light field, structural grid, deep navy, violet and soft red accents, scientific-mythic portal aesthetic, no figures, no faces, identity architecture, soft glows.";

    const openai = new OpenAI({ apiKey });
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: promptForDalle,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = imageResponse.data?.[0]?.url ?? null;

    const reportExcerpt = excerptFromReport(fullReport);

    const data = {
      reportExcerpt,
      fullReport,
      imageUrl,
      emotionalSnippet: engineData.data?.emotional_snippet ?? "",
      subjectName: DEMO_SUBJECT.fullName,
    };
    log("info", "response", { requestId, status: 200 });
    return NextResponse.json(
      { status: "ok", requestId, data },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo failed.";
    log("error", "Beauty demo error", { requestId, message });
    return errorResponse(500, message, requestId);
  }
}
