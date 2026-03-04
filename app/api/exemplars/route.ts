/**
 * GET /api/exemplars?version=v1
 * Returns list of exemplar manifests. For Ignis: ALWAYS loads v2 (ligs-exemplars/Ignispectrum/v2/manifest.json).
 * When Blob manifest cannot be read: uses EXEMPLAR_IGNIS_CANONICAL_URL or NEXT_PUBLIC_IGNIS_EXEMPLAR_URL.
 * If neither env is set: returns null for Ignis exemplarCard (never the static placeholder).
 */

import { NextResponse } from "next/server";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import {
  loadExemplarManifestWithPreferred,
  IGNIS_CANONICAL_FALLBACK,
  exemplarManifestPath,
  loadExemplarManifest,
} from "@/lib/exemplar-store";

const IGNIS_ARCHETYPE = "Ignispectrum";
const IGNIS_VERSION = "v2";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version")?.trim() || "v1";

    const manifests: unknown[] = [];
    let ignisManifest: unknown = null;

    for (const archetype of LIGS_ARCHETYPES) {
      if (archetype === IGNIS_ARCHETYPE) {
        const ignis = await loadExemplarManifest(exemplarManifestPath(IGNIS_ARCHETYPE, IGNIS_VERSION));
        if (ignis != null) {
          manifests.push(ignis);
          ignisManifest = ignis;
        }
      } else {
        const manifest = await loadExemplarManifestWithPreferred(archetype, version);
        if (manifest != null) manifests.push(manifest);
      }
    }

    if (ignisManifest == null) {
      manifests.push({
        archetype: IGNIS_ARCHETYPE,
        version: IGNIS_VERSION,
        urls: {
          exemplarCard: IGNIS_CANONICAL_FALLBACK ?? undefined,
          exemplar_card: IGNIS_CANONICAL_FALLBACK ?? undefined,
        },
      });
    }

    return NextResponse.json({
      requestId,
      version,
      manifests,
      count: manifests.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "EXEMPLARS_FETCH_FAILED", message, requestId },
      { status: 500 }
    );
  }
}
