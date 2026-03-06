/**
 * POST /api/exemplars/save
 * Persist Studio outputs to Blob and create/update manifest.
 * No image generation — just persistence.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import {
  exemplarPath,
  exemplarManifestPath,
  saveExemplarToBlob,
  saveExemplarManifest,
  loadExemplarManifest,
  getPreferredExemplarVersion,
} from "@/lib/exemplar-store";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import { killSwitchResponse } from "@/lib/api-kill-switch";

const VALID_ARCHETYPES = new Set(LIGS_ARCHETYPES);

function validArchetype(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && VALID_ARCHETYPES.has(v as (typeof LIGS_ARCHETYPES)[number]);
}

function validVersion(v: unknown): boolean {
  return typeof v === "string" && /^[a-z0-9_-]+$/i.test(v);
}

export async function POST(req: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "EXEMPLAR_SAVE_INVALID", message: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const archetype = String(b.archetype ?? "").trim();
    const version = String(b.version ?? "v1").trim() || "v1";

    if (!validArchetype(archetype)) {
      return NextResponse.json(
        { error: "EXEMPLAR_SAVE_INVALID", message: "Invalid archetype", requestId },
        { status: 400 }
      );
    }
    if (!validVersion(version)) {
      return NextResponse.json(
        { error: "EXEMPLAR_SAVE_INVALID", message: "Invalid version", requestId },
        { status: 400 }
      );
    }

    const targetRaw = b.target as string;
    const target =
      targetRaw === "share_card"
        ? "share_card"
        : targetRaw === "marketing_background"
          ? "marketing_background"
          : "exemplar_card";

    let imageB64: string;
    if (target === "marketing_background") {
      const mb = (b.marketingBackgroundB64 ?? (b.assets as Record<string, unknown>)?.marketingBackgroundB64) as string | undefined;
      if (typeof mb !== "string" || !mb.trim()) {
        return NextResponse.json(
          { error: "EXEMPLAR_SAVE_INVALID", message: "marketingBackgroundB64 required when target=marketing_background", requestId },
          { status: 400 }
        );
      }
      imageB64 = mb.replace(/^data:image\/\w+;base64,/, "").trim();
    } else {
      const exemplarCardB64 = (b.exemplarCardB64 ?? (b.assets as Record<string, unknown>)?.exemplarCardB64) as string | undefined;
      if (typeof exemplarCardB64 !== "string" || !exemplarCardB64.trim()) {
        return NextResponse.json(
          { error: "EXEMPLAR_SAVE_INVALID", message: "exemplarCardB64 required (composed image base64)", requestId },
          { status: 400 }
        );
      }
      imageB64 = exemplarCardB64.replace(/^data:image\/\w+;base64,/, "").trim();
    }
    const overlay = (b.overlay ?? (b.prompts as Record<string, unknown>)?.overlay) as Record<string, unknown> | undefined ?? {};
    const resolvedVersion = getPreferredExemplarVersion(archetype, version);

    let blobUrl: string | null = null;
    const slug = target === "marketing_background" ? "marketing_background" : target === "share_card" ? "share_card" : "exemplar_card";

    try {
      const imageBuf = Buffer.from(imageB64, "base64");
      blobUrl = await saveExemplarToBlob(
        exemplarPath(archetype, resolvedVersion, slug),
        imageBuf,
        "image/png"
      );
    } catch (err) {
      log("warn", "exemplar_save_failed", {
        requestId,
        archetype,
        target,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          error: "EXEMPLAR_SAVE_FAILED",
          message: `Failed to decode or save ${target}`,
          requestId,
        },
        { status: 502 }
      );
    }

    const existing = await loadExemplarManifest(exemplarManifestPath(archetype, resolvedVersion));
    const ex = existing && typeof existing === "object" ? (existing as Record<string, unknown>) : null;
    const prevUrls = (ex?.urls as Record<string, string> | undefined) ?? {};
    const prevOverlay = (ex?.overlayCopy as Record<string, string> | undefined) ?? {};
    const createdAt = (ex?.createdAt as string | undefined) ?? new Date().toISOString();

    const manifest = {
      archetype,
      version: resolvedVersion,
      createdAt,
      markType: ex?.markType ?? "brand",
      markArchetype: ex?.markArchetype ?? undefined,
      overlayCopy: {
        headline: overlay?.headline != null && String(overlay.headline).trim() !== "" ? String(overlay.headline) : (prevOverlay?.headline ?? ""),
        subhead: overlay?.subhead != null && String(overlay.subhead).trim() !== "" ? String(overlay.subhead) : (prevOverlay?.subhead ?? ""),
        cta: overlay?.cta != null && String(overlay.cta).trim() !== "" ? String(overlay.cta) : (prevOverlay?.cta ?? ""),
      },
      urls: {
        marketingBackground: target === "marketing_background" ? (blobUrl ?? prevUrls.marketingBackground ?? prevUrls.marketing_background) : (prevUrls.marketingBackground ?? prevUrls.marketing_background),
        shareCard: target === "share_card" ? (blobUrl ?? prevUrls.shareCard ?? prevUrls.share_card) : (prevUrls.shareCard ?? prevUrls.share_card),
        exemplarCard: target === "exemplar_card" ? (blobUrl ?? prevUrls.exemplarCard ?? prevUrls.exemplar_card) : (prevUrls.exemplarCard ?? prevUrls.exemplar_card),
      },
    };

    await saveExemplarManifest(exemplarManifestPath(archetype, resolvedVersion), manifest);

    log("info", "exemplar_saved", {
      requestId,
      archetype,
      version,
      target,
      blobUrl: !!blobUrl,
    });

    return NextResponse.json({
      requestId,
      archetype,
      version,
      urls: manifest.urls,
      manifest,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "exemplar_save_failed", { requestId, error: message });
    return NextResponse.json(
      { error: "EXEMPLAR_SAVE_FAILED", message, requestId },
      { status: 500 }
    );
  }
}
