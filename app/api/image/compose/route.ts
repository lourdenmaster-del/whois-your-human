import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { isTestMode } from "@/lib/runtime-mode";
import { parseComposeRequest } from "@/src/ligs/marketing/api/compose-request-schema";
import {
  buildOverlaySpecWithCopy,
  validateOverlaySpec,
} from "@/src/ligs/marketing";
import { GLOBAL_LOGO_PATH } from "@/lib/brand";
import { createMonogramLogoSvg } from "@/lib/marketing/compose-card";
import { renderStaticCardOverlay } from "@/lib/marketing/static-overlay";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import sharp from "sharp";

const MIN_BACKGROUND_DIM = 256;

async function loadBackgroundImage(
  background: { url?: string; b64?: string }
): Promise<Buffer> {
  if (background.b64) {
    const base64Data = background.b64.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }
  if (background.url) {
    const res = await fetch(background.url);
    if (!res.ok) throw new Error(`Failed to fetch background: ${res.status}`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }
  throw new Error("Either url or b64 required");
}

export async function POST(req: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();
  const { isTestMode } = await import("@/lib/runtime-mode");
  const ALLOW_EXTERNAL_WRITES =
    !isTestMode && process.env.ALLOW_EXTERNAL_WRITES === "true";

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "COMPOSE_REQUEST_INVALID", message: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const parsed = parseComposeRequest(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.errorType,
          message: parsed.message,
          issues: parsed.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    const { profile, background, purpose, templateId, output, variationKey, overlaySpec: providedOverlaySpec } = parsed.data;
    const size = output.size === "1536" ? 1536 : 1024;

    if (!providedOverlaySpec && (!profile || !purpose)) {
      return NextResponse.json(
        {
          error: "COMPOSE_REQUEST_INVALID",
          message: "overlaySpec required — or provide profile + purpose for server-side build",
          requestId,
        },
        { status: 400 }
      );
    }

    const overlaySpec =
      providedOverlaySpec ??
      buildOverlaySpecWithCopy(profile!, { templateId, size: output.size, purpose, variationKey }, undefined);

    const overlayValidation = validateOverlaySpec(overlaySpec);
    if (!overlayValidation.pass) {
      log("warn", "compose_overlay_invalid", {
        requestId,
        profileId: profile.id,
        score: overlayValidation.score,
      });
      return NextResponse.json(
        {
          error: "OVERLAY_SPEC_INVALID",
          message: "Overlay spec validation failed",
          issues: overlayValidation.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    log("info", "image_compose", {
      requestId,
      profileId: profile.id,
      templateId,
      size: output.size,
      score: overlayValidation.score,
      dryRun: !ALLOW_EXTERNAL_WRITES,
    });

    if (!ALLOW_EXTERNAL_WRITES) {
      return NextResponse.json({
        requestId,
        dryRun: true,
        buildOverlaySpec: !providedOverlaySpec,
        overlaySpec,
        overlayValidation: {
          pass: overlayValidation.pass,
          score: overlayValidation.score,
          issues: overlayValidation.issues,
        },
      });
    }

    const backgroundBuffer = await loadBackgroundImage(background);
    const bgMeta = await sharp(backgroundBuffer).metadata();
    const bgW = bgMeta.width ?? 0;
    const bgH = bgMeta.height ?? 0;
    if (bgW < MIN_BACKGROUND_DIM || bgH < MIN_BACKGROUND_DIM) {
      return NextResponse.json(
        {
          error: "BACKGROUND_TOO_SMALL",
          message: `Background dimensions ${bgW}x${bgH} below minimum ${MIN_BACKGROUND_DIM}x${MIN_BACKGROUND_DIM}. Generate a real background first.`,
          requestId,
        },
        { status: 400 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[COMPOSE] background dimensions", bgW, "x", bgH, "requestId:", requestId);
    }
    const ENABLE_PLACEHOLDER_LOGO = process.env.ENABLE_PLACEHOLDER_LOGO === "true";

    let logoBuffer: Buffer | null = null;
    let logoUsed: "brand" | "placeholder" = "brand";

    const fs = await import("node:fs/promises");
    const { join } = await import("path");
    const globalLogoFsPath = join(process.cwd(), "public", GLOBAL_LOGO_PATH.replace(/^\//, ""));

    try {
      logoBuffer = await fs.readFile(globalLogoFsPath);
    } catch {
      logoBuffer = null;
    }

    if (!logoBuffer) {
      if (!ENABLE_PLACEHOLDER_LOGO) {
        return NextResponse.json(
          {
            error: "BRAND_LOGO_REQUIRED",
            message:
              "Global logo missing. Add public/brand/ligs-mark-primary.png or set ENABLE_PLACEHOLDER_LOGO=true for demo.",
            requestId,
          },
          { status: 400 }
        );
      }
      logoBuffer = createMonogramLogoSvg(overlaySpec);
      logoUsed = "placeholder";
    }

    const markType = (overlaySpec as { markType?: string }).markType ?? "brand";
    let result: Awaited<ReturnType<typeof renderStaticCardOverlay>>;
    try {
      result = await renderStaticCardOverlay(overlaySpec, backgroundBuffer, {
        size,
        logoBuffer: markType === "brand" ? logoBuffer : null,
      });
    } catch (glyphErr: unknown) {
      const msg = glyphErr instanceof Error ? glyphErr.message : String(glyphErr);
      log("error", "compose_glyph_failed", { requestId, error: msg });
      return NextResponse.json(
        {
          error: "GLYPH_LOAD_FAILED",
          message: msg,
          requestId,
        },
        { status: 500 }
      );
    }

    const b64 = result.buffer.toString("base64");
    const composedUrl = `data:image/png;base64,${b64}`;
    if (process.env.NODE_ENV !== "production" && result.archetypeVisualUsed && result.archetypeImagePath) {
      console.log("[COMPOSE] archetypeImagePath at compose-time:", result.archetypeImagePath);
    }
    return NextResponse.json({
      requestId,
      dryRun: false,
      buildOverlaySpec: !providedOverlaySpec,
      composedUrl,
      glyphUsed: result.archetypeVisualUsed,
      glyphPath: result.archetypeImagePath ?? result.glyphPath ?? null,
      rasterDims: result.rasterDims ?? null,
      logoUsed: result.logoUsed,
      textRendered: result.textRendered,
      backgroundDims: { width: bgW, height: bgH },
      outputDims: { width: size, height: size },
      previewImageUrl: composedUrl,
      overlaySpec,
      overlayValidation: {
        pass: overlayValidation.pass,
        score: overlayValidation.score,
        issues: overlayValidation.issues,
      },
      image: {
        b64,
        contentType: "image/png",
      },
      composedDisplayUrl: composedUrl,
      composedBase64: b64,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "image_compose_failed", { requestId, error: message });
    return NextResponse.json(
      { error: "IMAGE_COMPOSE_FAILED", message, requestId },
      { status: 500 }
    );
  }
}
