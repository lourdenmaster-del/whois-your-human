/**
 * GET /api/exemplars?version=v1
 * Returns list of exemplar manifests for the given version (all 12 archetypes that exist).
 * For Ignispectrum: when no Blob manifest exists, injects synthetic manifest with IGNIS_CANONICAL_FALLBACK.
 */

import { NextResponse } from "next/server";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import {
  loadExemplarManifestWithPreferred,
  IGNIS_CANONICAL_FALLBACK,
  getPreferredExemplarVersion,
} from "@/lib/exemplar-store";

const IGNIS_ARCHETYPE = "Ignispectrum";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version")?.trim() || "v1";

    const manifests: unknown[] = [];
    let hasIgnis = false;
    for (const archetype of LIGS_ARCHETYPES) {
      const manifest = await loadExemplarManifestWithPreferred(archetype, version);
      if (manifest != null) {
        manifests.push(manifest);
        if (archetype === IGNIS_ARCHETYPE) hasIgnis = true;
      }
    }
    if (!hasIgnis) {
      const ignisVersion = getPreferredExemplarVersion(IGNIS_ARCHETYPE, version);
      manifests.push({
        archetype: IGNIS_ARCHETYPE,
        version: ignisVersion,
        urls: { exemplarCard: IGNIS_CANONICAL_FALLBACK, exemplar_card: IGNIS_CANONICAL_FALLBACK },
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
