/**
 * POST /api/beauty/dry-run
 * Simulates the full Beauty flow: report generation + Beauty Profile structure.
 * Saves a BeautyProfileV1 to Blob when BLOB_READ_WRITE_TOKEN is set (so previews and /beauty/view work locally for $0).
 * Does NOT call Stripe. Returns a simulated checkout URL for test flow.
 * Used by PayUnlockButton for DRY_RUN mode.
 */

import { errorResponse } from "@/lib/api-response";
import { successResponse } from "@/lib/success-response";
import { log } from "@/lib/log";
import { validateEngineBody } from "@/lib/validate-engine-body";
import { saveBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { saveImageToBlob } from "@/lib/report-store";
import { buildMinimalVoiceProfile } from "@/lib/marketing/minimal-profile";
import { buildOverlaySpecWithCopy } from "@/src/ligs/marketing";
import { createArchetypeGradientSvgBuffer } from "@/lib/marketing/gradient-background";
import { composeMarketingCardToBuffer } from "@/lib/marketing/compose-card";
import type { BeautyProfileV1 } from "@/lib/beauty-profile-schema";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em' font-family='system-ui'%3ELight Signature%3C/text%3E%3C/svg%3E";

function buildDryRunBeautyProfileV1(
  reportId: string,
  subjectName: string,
  emotionalSnippet: string,
  fullReport: string
): BeautyProfileV1 {
  const threeVoice = (s: string) => ({ raw_signal: s, custodian: "", oracle: "" });
  return {
    version: "1.0",
    reportId,
    subjectName,
    emotionalSnippet,
    fullReport: fullReport || "[DRY_RUN] Placeholder report.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
    timings: { totalMs: 0, engineMs: 0, reportFetchMs: 0, beautyFilterMs: 0 },
    vector_zero: {
      three_voice: threeVoice("—"),
      beauty_baseline: { color_family: "", texture_bias: "", shape_bias: "", motion_bias: "" },
    },
    light_signature: threeVoice("—"),
    archetype: threeVoice("—"),
    deviations: threeVoice("—"),
    corrective_vector: threeVoice("—"),
    imagery_prompts: {
      vector_zero_beauty_field: "",
      light_signature_aesthetic_field: "",
      final_beauty_field: "",
    },
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/beauty/dry-run" });

  let body: { birthData?: Record<string, unknown>; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body", requestId);
  }

  const birthDataRaw = body?.birthData ?? body;
  const dryRun = body?.dryRun !== false;
  const birthData = (birthDataRaw ?? {}) as Record<string, unknown>;

  const validation = validateEngineBody({
    fullName: (birthData.fullName ?? birthData.name) as string | undefined,
    birthDate: birthData.birthDate as string | undefined,
    birthTime: (birthData.birthTime ?? "") as string,
    birthLocation: birthData.birthLocation as string | undefined,
    email: birthData.email as string | undefined,
    dryRun: true,
  });

  if (!validation.ok) {
    return errorResponse(400, validation.error.message, requestId);
  }

  const { fullName, birthDate, birthTime, birthLocation, email } = validation.value;

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const engineUrl = `${origin}/api/engine/generate`;

  try {
    const res = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        birthDate,
        birthTime: birthTime ?? "",
        birthLocation,
        email,
        dryRun: true,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      data?: {
        reportId?: string;
        full_report?: string;
        emotional_snippet?: string;
        image_prompts?: string[];
      };
      reportId?: string;
      full_report?: string;
      emotional_snippet?: string;
      error?: string;
    };

    if (!res.ok || data?.error) {
      log("warn", "dry-run engine failed", { requestId, status: res.status, error: data?.error });
      return errorResponse(
        res.status >= 400 ? res.status : 500,
        data?.error ?? "Engine dry-run failed",
        requestId
      );
    }

    const reportId = data.data?.reportId ?? data.reportId;
    const fullReport = data.data?.full_report ?? data.full_report ?? "";
    const emotionalSnippet = data.data?.emotional_snippet ?? data.emotional_snippet ?? "";

    if (!reportId) {
      return errorResponse(502, "Engine did not return reportId", requestId);
    }

    const subjectName = fullName || "Anonymous";
    const snippet = emotionalSnippet || "A structural pattern formed by forces at initialization — the Light Signature reveals coherence.";
    const profile = buildDryRunBeautyProfileV1(reportId, subjectName, snippet, fullReport);
    try {
      await saveBeautyProfileV1(reportId, profile, requestId);
      log("info", "dry_run_beauty_profile_saved", { requestId, reportId });

      // DRY_RUN marketing card: deterministic composed card, no external API calls
      try {
        const archetypeName = "Stabiliora";
        const profileForOverlay = buildMinimalVoiceProfile(archetypeName);
        const overlaySpec = buildOverlaySpecWithCopy(profileForOverlay, {
          purpose: "beauty_marketing_card",
          templateId: "square_card_v1",
          size: "1024",
          variationKey: reportId,
        }, undefined, archetypeName);
        const backgroundBuffer = createArchetypeGradientSvgBuffer(archetypeName);
        const pngBuffer = await composeMarketingCardToBuffer(overlaySpec, backgroundBuffer, { size: 1024 });
        log("info", "marketing_card_composed", {
          requestId,
          reportId,
          archetypeName,
        });
        const imageBuffer = new Uint8Array(pngBuffer).buffer;
        const url = await saveImageToBlob(
          reportId,
          "marketing_card",
          imageBuffer,
          "image/png"
        );
        if (url) {
          (profile as unknown as Record<string, unknown>).marketingCardUrl = url;
          await saveBeautyProfileV1(reportId, profile, requestId);
          log("info", "marketing_card_saved", { requestId, reportId, url });
        }
      } catch (e) {
        log("warn", "marketing_card_compose_failed", {
          requestId,
          reportId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } catch (e) {
      log("warn", "dry_run_beauty_profile_save_failed", {
        requestId,
        reportId,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    const checkoutUrl = `${origin}/beauty/success?reportId=${encodeURIComponent(reportId)}`;

    const imageryPrompts = [PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE];

    return successResponse(
      200,
      {
        reportId,
        beautyProfile: {
          report: fullReport || "[DRY_RUN] Report generated successfully.",
          image: PLACEHOLDER_IMAGE,
          emotionalSnippet: emotionalSnippet || "",
          imageryPrompts,
        },
        checkout: {
          url: checkoutUrl,
        },
      },
      requestId
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "dry-run failed", { requestId, message });
    return errorResponse(500, `Dry-run failed: ${message}`, requestId);
  }
}
