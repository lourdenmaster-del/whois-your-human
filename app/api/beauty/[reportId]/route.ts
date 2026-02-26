import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { getImageUrlFromBlob } from "@/lib/report-store";

const IMAGE_SLUGS = [
  "vector_zero_beauty_field",
  "light_signature_aesthetic_field",
  "final_beauty_field",
] as const;

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E";

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
