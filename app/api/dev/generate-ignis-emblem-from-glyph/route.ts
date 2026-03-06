/**
 * POST /api/dev/generate-ignis-emblem-from-glyph
 * Dev-only: Generate 3D emblem from Ignis glyph using reference image (DALL·E edits flow).
 * Input: { dryRun?: boolean, mode?: "dry"|"live" }
 *
 * DRY: Returns plan only — no DALL·E calls, no Blob writes.
 * LIVE: (Not yet implemented — requires referenceImage support in image/generate)
 */

import { NextResponse } from "next/server";
import { buildGlyphReferenceLogoMarkPrompt } from "@/lib/marketing/glyphReferencePrompt";
import { exemplarPath, exemplarManifestPath } from "@/lib/exemplar-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARCHETYPE = "Ignispectrum";
const VERSION = "v1";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Route is dev-only" }, { status: 403 });
  }

  const requestId = crypto.randomUUID();
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const dryRun = body.dryRun === true || body.dryRun === "true" || body.mode === "dry";

    if (!dryRun) {
      return NextResponse.json({
        requestId,
        message: "LIVE mode not yet implemented. Use dryRun=true or mode=dry for preflight plan.",
        note: "Requires referenceImageBase64/referenceImageUrl support in /api/image/generate and dalle2_edits provider.",
      });
    }

    const marketingLogoMarkPrompt = buildGlyphReferenceLogoMarkPrompt(ARCHETYPE);

    const filePlan = {
      emblem_output: `ligs-exemplars/${ARCHETYPE}/${VERSION}/emblem_from_glyph.png`,
      marketing_background: exemplarPath(ARCHETYPE, VERSION, "marketing_background"),
      share_card: exemplarPath(ARCHETYPE, VERSION, "share_card"),
      exemplar_card: exemplarPath(ARCHETYPE, VERSION, "exemplar_card"),
      manifest: exemplarManifestPath(ARCHETYPE, VERSION),
    };

    return NextResponse.json({
      requestId,
      dryRun: true,
      mode: "dry",
      plan: {
        providerUsed: "dalle2_edits",
        providerChoice: "When referenceImage is present, use DALL·E 2 edits (image-conditioned generation).",
        prompts: {
          marketing_logo_mark: {
            note: "Fully assembled prompt for Ignispectrum with glyph reference. Includes Base bullet, Signature (lightSignatureOverlay), STRICT GEOMETRY block, and reference directive.",
            positive: marketingLogoMarkPrompt,
          },
        },
        filePlan,
        manifestShape: {
          archetype: ARCHETYPE,
          version: VERSION,
          markType: "archetype",
          urls: {
            exemplarCard: "[LIVE: Blob URL]",
            marketingBackground: "[LIVE: Blob URL]",
            shareCard: "[LIVE: Blob URL]",
          },
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "EMBLEM_DRY_FAILED", message, requestId },
      { status: 500 }
    );
  }
}
