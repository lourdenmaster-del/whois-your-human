import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { isTestMode } from "@/lib/runtime-mode";
import { parseComposeRequest } from "@/src/ligs/marketing/api/compose-request-schema";
import {
  generateOverlaySpec,
  validateOverlaySpec,
} from "@/src/ligs/marketing";
import { GLOBAL_LOGO_PATH } from "@/lib/brand";
import {
  createMonogramLogoSvg,
  composeMarketingCardToBuffer,
} from "@/lib/marketing/compose-card";
import { killSwitchResponse } from "@/lib/api-kill-switch";

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

    const overlaySpec = providedOverlaySpec ?? (await generateOverlaySpec(profile, {
      templateId,
      size: output.size,
      purpose,
      variationKey,
      allowExternalWrites: ALLOW_EXTERNAL_WRITES,
    }));

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
        overlaySpec,
        overlayValidation: {
          pass: overlayValidation.pass,
          score: overlayValidation.score,
          issues: overlayValidation.issues,
        },
      });
    }

    const backgroundBuffer = await loadBackgroundImage(background);
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

    const pngBuffer = await composeMarketingCardToBuffer(overlaySpec, backgroundBuffer, {
      size,
      logoBuffer,
    });

    const b64 = pngBuffer.toString("base64");
    return NextResponse.json({
      requestId,
      dryRun: false,
      logoUsed,
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
      composedDisplayUrl: `data:image/png;base64,${b64}`,
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
