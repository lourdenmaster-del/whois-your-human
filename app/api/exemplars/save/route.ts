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
} from "@/lib/exemplar-store";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";

const VALID_ARCHETYPES = new Set(LIGS_ARCHETYPES);

function validArchetype(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && VALID_ARCHETYPES.has(v as (typeof LIGS_ARCHETYPES)[number]);
}

function validVersion(v: unknown): boolean {
  return typeof v === "string" && /^[a-z0-9_-]+$/i.test(v);
}

export async function POST(req: Request) {
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

    const exemplarCardB64 = (b.exemplarCardB64 ?? (b.assets as Record<string, unknown>)?.exemplarCardB64) as string | undefined;
    if (typeof exemplarCardB64 !== "string" || !exemplarCardB64.trim()) {
      return NextResponse.json(
        { error: "EXEMPLAR_SAVE_INVALID", message: "exemplarCardB64 required (composed image base64)", requestId },
        { status: 400 }
      );
    }

    const overlay = (b.overlay ?? (b.prompts as Record<string, unknown>)?.overlay) as Record<string, unknown> | undefined ?? {};

    let exemplarCardBlobUrl: string | null = null;

    try {
      const exemplarB64 = exemplarCardB64.replace(/^data:image\/\w+;base64,/, "").trim();
      const exemplarBuf = Buffer.from(exemplarB64, "base64");
      exemplarCardBlobUrl = await saveExemplarToBlob(
        exemplarPath(archetype, version, "exemplar_card"),
        exemplarBuf,
        "image/png"
      );
    } catch (err) {
      log("warn", "exemplar_save_exemplar_card_failed", {
        requestId,
        archetype,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          error: "EXEMPLAR_SAVE_FAILED",
          message: "Failed to decode or save exemplar_card",
          requestId,
        },
        { status: 502 }
      );
    }

    const createdAt = new Date().toISOString();
    const manifest = {
      archetype,
      version,
      createdAt,
      overlayCopy: {
        headline: overlay?.headline ?? "",
        subhead: overlay?.subhead ?? "",
        cta: overlay?.cta ?? "",
      },
      urls: {
        marketingBackground: undefined as string | undefined,
        shareCard: undefined as string | undefined,
        exemplarCard: exemplarCardBlobUrl ?? undefined,
      },
    };

    await saveExemplarManifest(exemplarManifestPath(archetype, version), manifest);

    log("info", "exemplar_saved", {
      requestId,
      archetype,
      version,
      exemplarCardUrl: !!exemplarCardBlobUrl,
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
