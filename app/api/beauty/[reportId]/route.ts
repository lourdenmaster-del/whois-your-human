/**
 * Exemplar path: manifest-first for all archetypes.
 * When manifest exists: use manifest.urls (marketingBackground, exemplarCard, shareCard).
 * When manifest missing: Ignis → IGNIS_V1_ARTIFACTS fallback; others → locked static preview.
 */

import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { getImageUrlFromBlob } from "@/lib/report-store";
import {
  loadExemplarManifestWithPreferred,
  IGNIS_V1_ARTIFACTS,
} from "@/lib/exemplar-store";
import {
  getArchetypePublicAssetUrls,
  getArchetypePublicAssetUrlsWithRotation,
} from "@/lib/archetype-public-assets";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import {
  buildExemplarBackfill,
  buildExemplarSyntheticSections,
  buildExemplarFullReport,
} from "@/lib/exemplar-synthetic";
import { LIGS_ARCHETYPES } from "@/lib/archetypes";

const IMAGE_SLUGS = [
  "vector_zero_beauty_field",
  "light_signature_aesthetic_field",
  "final_beauty_field",
] as const;

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3EWHOIS%20record%3C/text%3E%3C/svg%3E";

async function enrichProfileImages(
  profile: Record<string, unknown>,
  reportId: string
): Promise<Record<string, unknown>> {
  const existing = (profile.imageUrls ?? []) as string[];
  const urls: string[] = [];
  for (let i = 0; i < 3; i++) {
    const fromProfile = existing[i];
    const fromBlob = await getImageUrlFromBlob(reportId, IMAGE_SLUGS[i]);
    urls.push(fromProfile ?? fromBlob ?? PLACEHOLDER_SVG);
  }
  let marketingBackgroundUrl = profile.marketingBackgroundUrl as string | undefined;
  if (!marketingBackgroundUrl) {
    const fromBlob = await getImageUrlFromBlob(reportId, "marketing_background");
    if (fromBlob) marketingBackgroundUrl = fromBlob;
  }
  let logoMarkUrl = profile.logoMarkUrl as string | undefined;
  if (!logoMarkUrl) {
    const fromBlob = await getImageUrlFromBlob(reportId, "logo_mark");
    if (fromBlob) logoMarkUrl = fromBlob;
  }
  let marketingCardUrl = profile.marketingCardUrl as string | undefined;
  if (!marketingCardUrl) {
    const fromBlob = await getImageUrlFromBlob(reportId, "marketing_card");
    if (fromBlob) marketingCardUrl = fromBlob;
  }
  let shareCardUrl = profile.shareCardUrl as string | undefined;
  if (!shareCardUrl) {
    const fromBlob = await getImageUrlFromBlob(reportId, "share_card");
    if (fromBlob) shareCardUrl = fromBlob;
  }
  // When composed scientific share card exists, use it for imageUrls[2] (Final Beauty Field)
  // so preview/report UI shows the identity card instead of raw final_beauty_field
  if (shareCardUrl) {
    urls[2] = shareCardUrl;
  }
  return {
    ...profile,
    imageUrls: urls,
    ...(marketingBackgroundUrl && { marketingBackgroundUrl }),
    ...(logoMarkUrl && { logoMarkUrl }),
    ...(marketingCardUrl && { marketingCardUrl }),
    ...(shareCardUrl && { shareCardUrl }),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    await rateLimit(request, "beauty_view", 20, 60_000);
  } catch {
    return errorResponse(429, "RATE_LIMIT_EXCEEDED", requestId);
  }

  const { reportId } = await params;
  log("info", "report_fetch", { requestId, route: "/api/beauty/[reportId]", reportId: reportId ?? "" });

  if (!reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  try {
    if (reportId.startsWith("exemplar-")) {
      const archetype = reportId.replace(/^exemplar-/, "");
      // Try manifest first for all archetypes; fall back to IGNIS_V1_ARTIFACTS (Ignis) or public assets (others)
      const manifest = await loadExemplarManifestWithPreferred(archetype, "v1");

      let exemplarSlots: { label: string; url: string }[];
      let m: Record<string, unknown>;

      if (manifest && typeof manifest === "object") {
        m = manifest as Record<string, unknown>;
        const urls = (m.urls as Record<string, string>) ?? {};
        exemplarSlots = [
          { label: "Vector Zero", url: urls.marketingBackground ?? urls.marketing_background },
          { label: "WHOIS record", url: urls.exemplarCard ?? urls.exemplar_card },
          { label: "Final Beauty Field", url: urls.shareCard ?? urls.share_card },
        ];
      } else {
        // Manifest missing: Ignis → IGNIS_V1_ARTIFACTS; others → rotated public assets
        if (archetype === "Ignispectrum") {
          m = {};
          exemplarSlots = [
            { label: "Vector Zero", url: IGNIS_V1_ARTIFACTS.vectorZero },
            { label: "WHOIS record", url: IGNIS_V1_ARTIFACTS.lightSignature },
            { label: "Final Beauty Field", url: IGNIS_V1_ARTIFACTS.finalBeautyField },
          ];
        } else {
          // Deterministic rotation: seed = reportId + version for archetype-consistent variation
          const rotationSeed = `${reportId}:v1`;
          const publicUrls =
            getArchetypePublicAssetUrlsWithRotation(archetype, rotationSeed) ??
            getArchetypePublicAssetUrls(archetype);
          if (publicUrls) {
            m = { urls: publicUrls };
            exemplarSlots = [
              { label: "Vector Zero", url: publicUrls.marketingBackground },
              { label: "WHOIS record", url: publicUrls.exemplarCard },
              { label: "Final Beauty Field", url: publicUrls.shareCard },
            ];
          } else {
            if (!LIGS_ARCHETYPES.includes(archetype as (typeof LIGS_ARCHETYPES)[number])) {
              return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
            }
            const staticImage = `/exemplars/${archetype.toLowerCase()}.png`;
            const syntheticSections = buildExemplarSyntheticSections(archetype);
            const fullReport = buildExemplarFullReport(archetype);
            const lockedSynthetic = {
              reportId,
              subjectName: archetype,
              dominantArchetype: archetype,
              emotionalSnippet: getMarketingDescriptor(archetype)?.tagline ?? archetype,
              imageUrls: [staticImage, staticImage, staticImage],
              isExemplar: true,
              isLockedPreview: true,
              exemplarBackfill: buildExemplarBackfill(archetype, undefined),
              ...(syntheticSections && {
                light_signature: syntheticSections.light_signature,
                archetype: syntheticSections.archetype,
                deviations: syntheticSections.deviations,
                corrective_vector: syntheticSections.corrective_vector,
              }),
              ...(fullReport && { fullReport }),
            };
            log("info", "images_loaded", { requestId, reportId, source: "exemplar_locked_static" });
            return successResponse(200, lockedSynthetic, requestId);
          }
        }
      }
      const filteredSlots = exemplarSlots.filter(
        (s): s is { label: string; url: string } => typeof s.url === "string" && s.url.length > 0
      );
      const imageUrls = filteredSlots.map((s) => s.url);
      const exemplarArtifactLabels = filteredSlots.map((s) => s.label);
      const exemplarCard = filteredSlots.find((s) => s.label === "WHOIS record")?.url;
      const marketingBg = filteredSlots.find((s) => s.label === "Vector Zero")?.url;
      const shareCard = filteredSlots.find((s) => s.label === "Final Beauty Field")?.url;
      const oc = (m.overlayCopy as Record<string, unknown>) ?? {};
      const overlayCopy = typeof oc === "object" && oc !== null ? (oc as Record<string, string>) : {};
      const descriptor = getMarketingDescriptor(archetype);
      const manifestVersion = (m.version as string) ?? undefined;
      const exemplarBackfill = buildExemplarBackfill(archetype, manifestVersion);
      const syntheticSections = buildExemplarSyntheticSections(archetype);
      const fullReport = buildExemplarFullReport(archetype);
      const synthetic = {
        reportId,
        subjectName: archetype,
        dominantArchetype: archetype,
        emotionalSnippet: overlayCopy.subhead ?? descriptor?.tagline ?? descriptor?.archetypeLabel ?? archetype,
        imageUrls,
        exemplarArtifactLabels: exemplarArtifactLabels.length > 0 ? exemplarArtifactLabels : undefined,
        marketingCardUrl: exemplarCard ?? undefined,
        marketingBackgroundUrl: marketingBg ?? undefined,
        shareCardUrl: shareCard ?? undefined,
        isExemplar: true,
        exemplarBackfill,
        ...(syntheticSections && {
          light_signature: syntheticSections.light_signature,
          archetype: syntheticSections.archetype,
          deviations: syntheticSections.deviations,
          corrective_vector: syntheticSections.corrective_vector,
        }),
        ...(fullReport && { fullReport }),
      };
      log("info", "images_loaded", { requestId, reportId, imageCount: imageUrls.length, source: "exemplar" });
      return successResponse(200, synthetic, requestId);
    }

    const profile = await loadBeautyProfileV1(reportId, requestId);
    const enriched = await enrichProfileImages(profile as unknown as Record<string, unknown>, reportId);
    log("info", "images_loaded", { requestId, reportId, imageCount: (enriched.imageUrls as string[])?.length ?? 0 });
    return successResponse(200, enriched, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("warn", "beauty_view_error", { requestId, reportId, message });
    if (message === "BEAUTY_PROFILE_NOT_FOUND") {
      return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
    }
    if (message === "BEAUTY_PROFILE_PARSE_FAILED" || message === "BEAUTY_PROFILE_SCHEMA_MISMATCH") {
      return errorResponse(500, message, requestId);
    }
    return errorResponse(500, "BEAUTY_PROFILE_READ_FAILED", requestId);
  }
}
