/**
 * POST /api/exemplars/generate
 * Generate exemplar pack for one archetype (minimal spend: 2 images + compose).
 * Input: { archetype, mode: "dry"|"live", version: "v1" }
 *
 * Requires Node runtime: sharp, node:fs, path.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { buildMinimalVoiceProfile } from "@/lib/marketing/minimal-profile";
import { buildOverlaySpecWithCopy } from "@/src/ligs/marketing";
import { getDefaultOverlayCopy } from "@/lib/marketing/defaultOverlayCopy";
import { pickBackgroundSource } from "@/lib/ligs-studio-utils";
import {
  exemplarPath,
  exemplarManifestPath,
  saveExemplarToBlob,
  saveExemplarManifest,
} from "@/lib/exemplar-store";
import { deriveIdempotencyKey } from "@/lib/idempotency-store";
import { LIGS_ARCHETYPES, FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import { GLOBAL_LOGO_PATH } from "@/lib/brand";
import { renderStaticCardOverlay, renderIdentityCardOverlay } from "@/lib/marketing/static-overlay";
import { buildIdentityOverlaySpec } from "@/src/ligs/marketing/identity-spec";
import { buildGlyphReferenceLogoMarkPrompt } from "@/lib/marketing/glyphReferencePrompt";
import { allowExternalWrites, isDryRun } from "@/lib/runtime-mode";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import {
  extractExecutionKey,
  getEngineExecutionGrantViolation,
} from "@/lib/engine-execution-grant";
import sharp from "sharp";
import { buildImagePromptSpec } from "@/src/ligs/image";

const VALID_ARCHETYPES = new Set(LIGS_ARCHETYPES);

function getBaseUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    const v = process.env.VERCEL_URL;
    if (v) return `https://${v}`;
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
}

/** Create a minimal 1024x1024 placeholder for DRY compose. */
async function createDryBackgroundPlaceholder(): Promise<Buffer> {
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2d3748"/>
      <stop offset="100%" stop-color="#1a202c"/>
    </linearGradient></defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
    <text x="512" y="512" font-size="24" fill="#718096" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">DRY — placeholder</text>
  </svg>`;
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

const zSchema = {
  archetype: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  mode: (v: unknown) => v === "dry" || v === "live",
  version: (v: unknown) => typeof v === "string" && /^[a-z0-9_-]+$/i.test(v),
};

export async function POST(req: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();
  const ALLOW_EXTERNAL_WRITES = process.env.ALLOW_EXTERNAL_WRITES === "true";

  try {
    // Dev diagnostic: log env state (no secrets)
    log("info", "exemplar_generate_env", {
      requestId,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY?.trim(),
      hasBlobToken: !!(
        typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
        process.env.BLOB_READ_WRITE_TOKEN.length > 0
      ),
      ALLOW_EXTERNAL_WRITES_env: String(process.env.ALLOW_EXTERNAL_WRITES ?? ""),
      ALLOW_EXTERNAL_WRITES_IN_DEV: String(process.env.ALLOW_EXTERNAL_WRITES_IN_DEV ?? ""),
      isDryRun,
      allowExternalWrites_from_runtime_mode: allowExternalWrites,
    });
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "EXEMPLAR_REQUEST_INVALID", message: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const archetype = String(b.archetype ?? "").trim();
    const dryRunParam = b.dryRun === true || b.dryRun === "true";
    const mode = dryRunParam ? "dry" : ((b.mode as string) ?? "dry");
    const version = String(b.version ?? "v1").trim() || "v1";

    if (!zSchema.archetype(archetype)) {
      return NextResponse.json(
        { error: "EXEMPLAR_REQUEST_INVALID", message: "archetype required", requestId },
        { status: 400 }
      );
    }
    if (!zSchema.mode(mode)) {
      return NextResponse.json(
        { error: "EXEMPLAR_REQUEST_INVALID", message: "mode must be 'dry' or 'live'", requestId },
        { status: 400 }
      );
    }
    if (!zSchema.version(version)) {
      return NextResponse.json(
        { error: "EXEMPLAR_REQUEST_INVALID", message: "version must be alphanumeric", requestId },
        { status: 400 }
      );
    }

    const arch = VALID_ARCHETYPES.has(archetype as (typeof LIGS_ARCHETYPES)[number])
      ? archetype
      : FALLBACK_PRIMARY_ARCHETYPE;

    const isLive = mode === "live";
    if (isLive && !ALLOW_EXTERNAL_WRITES) {
      return NextResponse.json(
        {
          error: "EXEMPLAR_LIVE_DISABLED",
          message: "mode=live requires ALLOW_EXTERNAL_WRITES=true",
          requestId,
        },
        { status: 400 }
      );
    }

    const exemplarExKey = extractExecutionKey(req, b);
    if (isLive) {
      const gv = await getEngineExecutionGrantViolation(exemplarExKey, { dryRun: false });
      if (gv) {
        return NextResponse.json({ error: gv, requestId }, { status: 403 });
      }
    }

    const baseUrl = getBaseUrl(req);
    const profile = buildMinimalVoiceProfile(arch, { deterministicId: `exemplar_${arch}_${version}` });
    const exemplarBaseKey = "a1b2c3d4-e5f6-4789-a012-345678901234"; // fixed base for exemplar derivation
    const idempotencyKeyBg = deriveIdempotencyKey(exemplarBaseKey, `${arch}-${version}-marketing_background`);

    let marketingBackgroundUrl: string | null = null;
    let shareCardUrl: string | null = null;
    const providerPrompts: {
      marketing_background?: { positive?: string; negative?: string; full?: string };
      share_card?: { positive?: string; negative?: string; full?: string };
    } = {};

    // 1) marketing_background (LIVE only). All archetypes use DALL·E 3; Ignis gets CENTER VOID (field-first) + glyph in compose.
    let backgroundBuffer: Buffer;
    if (isLive) {
      const res = await fetch(`${baseUrl}/api/image/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(exemplarExKey ? { "X-LIGS-Execution-Key": exemplarExKey } : {}),
        },
        body: JSON.stringify({
          profile,
          purpose: "marketing_background",
          image: {
            aspectRatio: arch === "Ignispectrum" ? "1:1" : "16:9",
            size: "1024",
            count: 1,
          },
          variationKey: `exemplar-${arch}-${version}`,
          idempotencyKey: idempotencyKeyBg,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        log("warn", "exemplar_marketing_background_failed", {
          requestId,
          archetype: arch,
          status: res.status,
          error: data.message ?? data.error,
        });
        return NextResponse.json(
          { error: "MARKETING_BACKGROUND_FAILED", message: data.message ?? data.error, requestId },
          { status: 502 }
        );
      }
      providerPrompts.marketing_background = (data.providerPrompt as Record<string, string>) ?? undefined;
      const bgSource = pickBackgroundSource(data);
      if (!bgSource?.url && !bgSource?.b64) {
        return NextResponse.json(
          { error: "NO_BACKGROUND", message: "No image in marketing_background response", requestId },
          { status: 502 }
        );
      }
      if (bgSource.b64) {
        backgroundBuffer = Buffer.from(bgSource.b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      } else {
        const bgRes = await fetch(bgSource.url!);
        if (!bgRes.ok) {
          return NextResponse.json(
            { error: "BACKGROUND_FETCH_FAILED", requestId },
            { status: 502 }
          );
        }
        backgroundBuffer = Buffer.from(await bgRes.arrayBuffer());
      }
      marketingBackgroundUrl = await saveExemplarToBlob(
        exemplarPath(arch, version, "marketing_background"),
        backgroundBuffer,
        "image/png"
      );
    } else {
      backgroundBuffer = await createDryBackgroundPlaceholder();
    }

    // 2) share_card — ALL archetypes: compose scientific identity card from marketing_background (no DALL·E)
    // Uses same pipeline as real Beauty report share cards: top-left archetype header, bottom-left metadata, bottom-right system mark
    if (isLive) {
      const exemplarReportId = `exemplar-${arch}`;
      const createdAt = new Date().toISOString();
      const identitySpec = buildIdentityOverlaySpec({
        subjectName: "Sample Subject",
        archetypeName: arch,
        reportId: exemplarReportId,
        generatedAt: createdAt,
        markArchetype: arch,
        systemPhrase: "Human identity vector resolved.",
      });
      try {
        const shareCardBuf = await renderIdentityCardOverlay(identitySpec, backgroundBuffer);
        shareCardUrl = await saveExemplarToBlob(
          exemplarPath(arch, version, "share_card"),
          shareCardBuf,
          "image/png"
        );
        providerPrompts.share_card = { positive: "[composed identity overlay]", negative: "", full: "[composed]" };
      } catch (e) {
        log("warn", "exemplar_share_card_compose_failed", {
          requestId,
          archetype: arch,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // 3) compose exemplar_card (always; free) — marketing-style for Light Signature slot; share_card above is identity-style
    const overlayCopy = getDefaultOverlayCopy(arch);
    const overlaySpec = buildOverlaySpecWithCopy(
      profile,
      { purpose: "exemplar_card", templateId: "square_card_v1", size: "1024", variationKey: `exemplar-${version}` },
      overlayCopy,
      arch
    );

    const fs = await import("node:fs/promises");
    const { join } = await import("path");
    const logoPath = join(process.cwd(), "public", GLOBAL_LOGO_PATH.replace(/^\//, ""));
    let logoBuffer: Buffer;
    try {
      logoBuffer = await fs.readFile(logoPath);
    } catch {
      logoBuffer = Buffer.alloc(0);
    }

    let pngBuffer: Buffer;
    try {
      const result = await renderStaticCardOverlay(overlaySpec, backgroundBuffer, {
        size: 1024,
        logoBuffer:
          ("markType" in overlaySpec && (overlaySpec as any).markType === "archetype")
            ? null
            : logoBuffer,
      });
      pngBuffer = result.buffer;
    } catch (e) {
      log("error", "exemplar_compose_failed", { requestId, archetype: arch, error: e instanceof Error ? e.message : String(e) });
      return NextResponse.json(
        { error: "EXEMPLAR_COMPOSE_FAILED", message: e instanceof Error ? e.message : "Glyph load or overlay failed", requestId },
        { status: 500 }
      );
    }

    let exemplarCardUrl: string | null = null;
    if (isLive) {
      exemplarCardUrl = await saveExemplarToBlob(
        exemplarPath(arch, version, "exemplar_card"),
        pngBuffer,
        "image/png"
      );
    }

    const createdAt = new Date().toISOString();
    const manifest = {
      archetype: arch,
      version,
      createdAt,
      markType: ("markType" in overlaySpec ? (overlaySpec as { markType?: string }).markType : undefined) ?? "brand",
      markArchetype: (overlaySpec as { markArchetype?: string }).markArchetype ?? undefined,
      overlayCopy: {
        headline: overlayCopy.headline,
        subhead: overlayCopy.subhead,
        cta: overlayCopy.cta,
      },
      urls: {
        marketingBackground: marketingBackgroundUrl ?? undefined,
        shareCard: shareCardUrl ?? undefined,
        exemplarCard: exemplarCardUrl ?? undefined,
      },
      providerPrompts: isLive ? providerPrompts : undefined,
    };

    if (isLive) {
      await saveExemplarManifest(exemplarManifestPath(arch, version), manifest);
    }

    if (!isLive) {
      const specBg = buildImagePromptSpec(profile, {
        purpose: "marketing_background",
        aspectRatio: "16:9",
        size: "1024",
        variationKey: `exemplar-${version}`,
      });
      const specShare = buildImagePromptSpec(profile, {
        purpose: "share_card",
        aspectRatio: "16:9",
        size: "1024",
        variationKey: `exemplar-${version}`,
      });
      const promptBg = specBg.prompt?.positive ?? "";
      const promptShare = specShare.prompt?.positive ?? "";
      const negativeBg = specBg.prompt?.negative ?? "";
      const negativeShare = specShare.prompt?.negative ?? "";
      const marketingLogoMarkPrompt =
        arch === "Ignispectrum" ? buildGlyphReferenceLogoMarkPrompt(arch) : null;

      const filePlan = {
        marketing_background: exemplarPath(arch, version, "marketing_background"),
        share_card: exemplarPath(arch, version, "share_card"),
        exemplar_card: exemplarPath(arch, version, "exemplar_card"),
        manifest: exemplarManifestPath(arch, version),
      };

      const manifestShape = {
        archetype: arch,
        version,
        createdAt,
        markType: ("markType" in overlaySpec ? (overlaySpec as { markType?: string }).markType : undefined) ?? "brand",
        overlayCopy: manifest.overlayCopy,
        urls: {
          marketingBackground: "[LIVE: Blob URL]",
          shareCard: "[LIVE: Blob URL]",
          exemplarCard: "[LIVE: Blob URL]",
        },
      };

      return NextResponse.json({
        requestId,
        dryRun: true,
        mode: "dry",
        archetype: arch,
        version,
        plan: {
          providerUsed: "dall-e-3",
          providerChoice: {
            marketing_background: arch === "Ignispectrum" ? "dall-e-3 (field-first, center void)" : "dall-e-3 (no referenceImage)",
            share_card: "compose (identity overlay on marketing_background; all archetypes)",
            exemplar_card: "compose (archetype image from public/arc-static-images/ when markType=archetype)",
          },
          prompts: {
            marketing_background: {
              positive: promptBg,
              negative: negativeBg,
              full: `${promptBg} Avoid: ${negativeBg}.`,
            },
            share_card: {
              positive: promptShare,
              negative: negativeShare,
              full: `${promptShare} Avoid: ${negativeShare}.`,
            },
            ...(marketingLogoMarkPrompt && {
              marketing_logo_mark_glyph_reference: {
                note: "For emblem-from-glyph flow (referenceImage present → dalle2_edits)",
                positive: marketingLogoMarkPrompt,
              },
            }),
          },
          filePlan,
          manifestShape,
        },
      });
    }

    log("info", "exemplar_pack_generated", {
      requestId,
      archetype: arch,
      version,
      mode,
      exemplarCardUrl: !!exemplarCardUrl,
      marketingBackgroundUrl: !!marketingBackgroundUrl,
      shareCardUrl: !!shareCardUrl,
    });

    return NextResponse.json({
      requestId,
      archetype: arch,
      version,
      mode,
      manifest,
      urls: manifest.urls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log("error", "exemplar_generate_failed", { requestId, error: message });
    const payload: Record<string, unknown> = {
      error: "EXEMPLAR_GENERATE_FAILED",
      message,
      requestId,
    };
    if (process.env.NODE_ENV !== "production" && stack) {
      payload.stack = stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
