/**
 * GET /api/exemplars?version=v1
 * Returns list of exemplar manifests. For Ignis: ALWAYS loads v2 (ligs-exemplars/Ignispectrum/v2/manifest.json).
 * When Blob manifest cannot be read: uses EXEMPLAR_IGNIS_CANONICAL_URL or NEXT_PUBLIC_IGNIS_EXEMPLAR_URL.
 * Only if both are missing: falls back to /exemplars/ignispectrum.png.
 */

import { NextResponse } from "next/server";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import {
  loadExemplarManifestWithPreferred,
  IGNIS_CANONICAL_FALLBACK,
  exemplarManifestPath,
  loadExemplarManifest,
} from "@/lib/exemplar-store";
import { getArchetypePublicAssetUrls } from "@/lib/archetype-public-assets";

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
        let manifest = await loadExemplarManifestWithPreferred(archetype, version);
        if (manifest == null) {
          const publicUrls = getArchetypePublicAssetUrls(archetype);
          if (publicUrls) {
            manifest = {
              archetype,
              version,
              urls: {
                marketingBackground: publicUrls.marketingBackground,
                exemplarCard: publicUrls.exemplarCard,
                shareCard: publicUrls.shareCard,
              },
            };
          }
        }
        if (manifest != null) manifests.push(manifest);
      }
    }

    if (ignisManifest == null) {
      const ignisPublic = getArchetypePublicAssetUrls(IGNIS_ARCHETYPE);
      manifests.push({
        archetype: IGNIS_ARCHETYPE,
        version: IGNIS_VERSION,
        urls: ignisPublic
          ? {
              marketingBackground: ignisPublic.marketingBackground,
              exemplarCard: ignisPublic.exemplarCard,
              shareCard: ignisPublic.shareCard,
            }
          : {
              exemplarCard: IGNIS_CANONICAL_FALLBACK,
              exemplar_card: IGNIS_CANONICAL_FALLBACK,
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
