import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { ENGINE_SPEC, IMAGE_PROMPT_SPEC } from "@/lib/engine-spec";
import { VECTOR_ZERO_SPEC } from "@/lib/vector-zero";
import type { VectorZero } from "@/lib/vector-zero";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { saveReport } from "@/lib/report-store";
import { validateEngineBody } from "@/lib/validate-engine-body";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "POST", path: "/api/engine/generate" });
  let apiKey: string | undefined;
  try {
    const body = await request.json();
    const validation = validateEngineBody(body);
    if (!validation.ok) {
      log("warn", "validation failed", { requestId, error: validation.error.message });
      return errorResponse(400, validation.error.message, requestId);
    }
    const { fullName, birthDate, birthTime, birthLocation, email, dryRun: bodyDryRun } = validation.value; // notes is accepted but not yet used

    const dryRun = process.env.DRY_RUN === "1" || bodyDryRun === true;
    if (dryRun) {
      const reportId = randomUUID();
      const emotionalSnippet = `[DRY RUN] Light signature for ${fullName} at ${birthLocation}: a structural pattern formed by forces at initialization.`;
      const imagePrompts = [
        `Abstract light field, structural grid, deep navy #050814 with violet #7A4FFF accents, scientific-mythic portal, no figures.`,
        `Cosmic identity architecture, infrared red #FF3B3B and ultraviolet violet #7A4FFF, spectral imprint, 50-80 words.`,
      ];
      const fullReport = `[DRY RUN] Full report placeholder for ${fullName}\n\nInitiation: forces at ${birthDate} ${birthTime || "—"} in ${birthLocation}.\nSpectral Origin, Temporal Encoding, Gravitational Patterning, Directional Field, Archetype Revelation, Behavioral Expression, Relational Field, Environmental Resonance, Cosmology Overlay, Integration.\n\n(Set DRY_RUN=0 or remove the env var to generate real reports.)`;
      const vectorZero: VectorZero = {
        coherence_score: 0.85,
        primary_wavelength: "580–620 nm",
        secondary_wavelength: "450–480 nm",
        symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
        beauty_baseline: {
          color_family: "warm-neutral",
          texture_bias: "smooth",
          shape_bias: "balanced",
          motion_bias: "steady",
        },
        three_voice: {
          raw_signal: "Baseline field: spectral gradient stable; symmetry axes within nominal range. Unperturbed Light Signature before deviation.",
          custodian: "Vector Zero is the baseline coherence state: the organism's default geometry before environmental or temporal modulation. Biological calibration holds at the unbent configuration.",
          oracle: "The baseline state is the identity at rest—the structure that remains when no force bends it. This is the default; everything else is variation.",
        },
      };
      await saveReport(reportId, {
        full_report: fullReport,
        emotional_snippet: emotionalSnippet,
        image_prompts: imagePrompts,
        vector_zero: vectorZero,
      });
      return successResponse(
        200,
        {
          reportId,
          emotional_snippet: emotionalSnippet,
          image_prompts: imagePrompts,
          vector_zero: vectorZero,
        },
        requestId
      );
    }

    apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      log("warn", "OPENAI_API_KEY not set", { requestId });
      return errorResponse(
        500,
        "OPENAI_API_KEY not set. Set it in your environment (e.g. Vercel Project Settings → Environment Variables).",
        requestId
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const birthData = `
Full Name: ${fullName}
Birth Date: ${birthDate}
Birth Time: ${birthTime || "Unknown"}
Birth Location: ${birthLocation}
Email: ${email}
`.trim();

    // Generate report + emotional snippet
    const reportResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ENGINE_SPEC },
        {
          role: "user",
          content: `Generate the full Light Identity Report and emotional snippet for this birth data using LIGS Engine v1.1 (canonical 14-section structure + Cosmology Marbling Patch):\n\n${birthData}\n\nOutput valid JSON only with exactly these keys: "full_report" (string, the complete 14-section report: Initiation, Spectral Origin, Temporal Encoding, Gravitational Patterning, Directional Field, Archetype Revelation, Archetype Micro-Profiles, Behavioral Expression, Relational Field, Environmental Resonance, Cosmology Overlay, Identity Field Equation, Legacy Trajectory, Integration. In EVERY section: RAW SIGNAL with 1 subtle cosmological echo; CUSTODIAN with 1 ancient physiological mirror; ORACLE with full fusion of physics, metaphysics, and human meaning—cosmology woven into sentences, not listed. Tone: mythic-scientific, elegant, readable. No shortening.) and "emotional_snippet" (string, 1-2 declarative sentences). No other text.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const reportText = reportResponse.choices[0]?.message?.content;
    if (!reportText) {
      log("warn", "No report generated", { requestId });
      return errorResponse(500, "No report generated", requestId);
    }

    const reportData = JSON.parse(reportText) as {
      full_report?: string;
      emotional_snippet?: string;
    };

    const fullReport = reportData.full_report ?? "";
    const emotionalSnippet = reportData.emotional_snippet ?? "";

    // Generate image prompts based on report
    const imagePromptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: IMAGE_PROMPT_SPEC },
        {
          role: "user",
          content: `Based on this (L)igs report, generate 2 image prompts as a JSON object with key "image_prompts" (array of 2 strings):\n\n${fullReport.slice(0, 4000)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const imagePromptText = imagePromptResponse.choices[0]?.message?.content;
    const imagePromptData = imagePromptText
      ? (JSON.parse(imagePromptText) as { image_prompts?: string[] })
      : { image_prompts: [] };
    const imagePrompts = imagePromptData.image_prompts ?? [];

    // Derive Vector Zero from the report (baseline state; no new pipeline)
    let vectorZero: VectorZero | undefined;
    try {
      const vectorZeroResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: VECTOR_ZERO_SPEC },
          {
            role: "user",
            content: `Derive Vector Zero from this Light Identity Report. Output only the JSON object.\n\n${fullReport.slice(0, 6000)}\n\nEmotional snippet: ${emotionalSnippet}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
      const vzText = vectorZeroResponse.choices[0]?.message?.content;
      if (vzText) {
        const raw = JSON.parse(vzText) as Record<string, unknown>;
        const clamp = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0));
        const sym = raw.symmetry_profile as Record<string, unknown> | undefined;
        const beauty = raw.beauty_baseline as Record<string, unknown> | undefined;
        const voices = raw.three_voice as Record<string, unknown> | undefined;
        vectorZero = {
          coherence_score: clamp(raw.coherence_score),
          primary_wavelength: String(raw.primary_wavelength ?? ""),
          secondary_wavelength: String(raw.secondary_wavelength ?? ""),
          symmetry_profile: {
            lateral: clamp(sym?.lateral),
            vertical: clamp(sym?.vertical),
            depth: clamp(sym?.depth),
          },
          beauty_baseline: {
            color_family: String(beauty?.color_family ?? ""),
            texture_bias: String(beauty?.texture_bias ?? ""),
            shape_bias: String(beauty?.shape_bias ?? ""),
            motion_bias: String(beauty?.motion_bias ?? ""),
          },
          three_voice: {
            raw_signal: String(voices?.raw_signal ?? ""),
            custodian: String(voices?.custodian ?? ""),
            oracle: String(voices?.oracle ?? ""),
          },
        };
      }
    } catch (e) {
      log("warn", "Vector Zero derivation failed, report will not include it", { requestId, message: e instanceof Error ? e.message : String(e) });
    }

    const reportId = randomUUID();
    await saveReport(reportId, {
      full_report: fullReport,
      emotional_snippet: emotionalSnippet,
      image_prompts: imagePrompts,
      ...(vectorZero != null && { vector_zero: vectorZero }),
    });

    return successResponse(
      200,
      {
        reportId,
        emotional_snippet: emotionalSnippet,
        image_prompts: imagePrompts,
        ...(vectorZero != null && { vector_zero: vectorZero }),
      },
      requestId
    );
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    log("error", "Engine error", { requestId, message: e?.message ?? String(err) });

    const message = e?.message ?? (err instanceof Error ? err.message : "Unknown error");
    const isQuota = e?.status === 429 || e?.status === 402 || /quota|billing|exceeded|insufficient_quota|rate_limit/i.test(message);

    if (isQuota) {
      log("info", "response", { requestId, status: 503 });
      return NextResponse.json(
        {
          error:
            "OpenAI API quota exceeded. Check your plan and billing at https://platform.openai.com/account/billing. If you just added funds, wait a few minutes and try again. You can set DRY_RUN=1 in your environment to test without using the API.",
          code: "QUOTA_EXCEEDED",
          detail:
            process.env.NODE_ENV === "development"
              ? {
                  openaiStatus: e?.status,
                  openaiCode: e?.code,
                  rawMessage: message,
                  keyLoaded: !!process.env.OPENAI_API_KEY?.trim(),
                  keyPrefix: process.env.OPENAI_API_KEY?.trim()
                    ? `${process.env.OPENAI_API_KEY.trim().slice(0, 12)}…`
                    : "none",
                }
              : undefined,
        },
        { status: 503 }
      );
    }

    return errorResponse(500, `Report generation failed: ${message}`, requestId);
  }
}
