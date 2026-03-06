/**
 * GET /api/dev/exemplar-manifest?archetype=Ignispectrum
 * Dev-only: returns raw manifest and resolved URLs for exemplar verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { loadExemplarManifestWithPreferred } from "@/lib/exemplar-store";
import { exemplarManifestPath } from "@/lib/exemplar-store";
import { getPreferredExemplarVersion } from "@/lib/exemplar-store";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev-only" }, { status: 403 });
  }
  const archetype = req.nextUrl.searchParams.get("archetype") ?? "Ignispectrum";
  const requestedVersion = req.nextUrl.searchParams.get("version") ?? "v1";
  const preferred = getPreferredExemplarVersion(archetype, requestedVersion);
  const manifestPath = exemplarManifestPath(archetype, preferred);
  const manifest = await loadExemplarManifestWithPreferred(archetype, requestedVersion);
  if (!manifest || typeof manifest !== "object") {
    return NextResponse.json({
      ok: false,
      error: "Manifest not found",
      manifestPath,
      preferred,
    });
  }
  const m = manifest as Record<string, unknown>;
  const urls = (m.urls as Record<string, string>) ?? {};
  const exemplarCard = urls.exemplarCard ?? urls.exemplar_card;
  const marketingBg = urls.marketingBackground ?? urls.marketing_background;
  const shareCard = urls.shareCard ?? urls.share_card;
  const resolved = {
    vectorZero: marketingBg ?? null,
    lightSignature: exemplarCard ?? null,
    finalBeautyField: shareCard ?? null,
  };
  const missing = [
    !resolved.vectorZero && "marketing_background",
    !resolved.lightSignature && "exemplar_card",
    !resolved.finalBeautyField && "share_card",
  ].filter(Boolean);
  return NextResponse.json({
    ok: true,
    manifestPath,
    preferred,
    rawUrls: urls,
    resolved,
    imageUrlsOrder: ["Vector Zero (marketing_background)", "Light Signature (exemplar_card)", "Final Beauty Field (share_card)"],
    missing: missing.length > 0 ? missing : undefined,
  });
}
