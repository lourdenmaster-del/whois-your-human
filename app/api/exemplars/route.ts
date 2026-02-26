/**
 * GET /api/exemplars?version=v1
 * Returns list of exemplar manifests for the given version (all 12 archetypes that exist).
 */

import { NextResponse } from "next/server";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import { exemplarManifestPath, loadExemplarManifest } from "@/lib/exemplar-store";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version")?.trim() || "v1";

    const manifests: unknown[] = [];
    for (const archetype of LIGS_ARCHETYPES) {
      const pathname = exemplarManifestPath(archetype, version);
      const manifest = await loadExemplarManifest(pathname);
      if (manifest != null) {
        manifests.push(manifest);
      }
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
