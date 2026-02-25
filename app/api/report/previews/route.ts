/**
 * GET /api/report/previews
 * Returns curated previews for the landing page from Beauty Profiles in Blob.
 * Fetches existing Beauty Profile images from ligs-beauty/ and ligs-images/.
 * Query params: useBlob (default true when configured), maxPreviews / maxCards (default 3).
 * Response: { previewCards: [{ reportId, subjectName, emotionalSnippet, imageUrls }] }.
 * Read-only; falls back to DRY_RUN mock cards when Blob is empty.
 */

import { head, list } from "@vercel/blob";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import {
  getStorageInfo,
  BLOB_BEAUTY_PREFIX,
  getImageUrlFromBlob,
} from "@/lib/report-store";

const IMAGE_SLUGS = [
  "vector_zero_beauty_field",
  "light_signature_aesthetic_field",
  "final_beauty_field",
] as const;

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em' font-family='system-ui'%3ELight Signature%3C/text%3E%3C/svg%3E";

const MOCK_PREVIEW_CARDS = [
  {
    reportId: "preview-1",
    subjectName: "Anonymous",
    emotionalSnippet:
      "A resonance between structure and expression — the Light Signature reveals coherence where pattern meets possibility.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
    summaryText: "DRY_RUN: No Beauty Profiles in Blob. Generate a report via /beauty to see previews.",
  },
  {
    reportId: "preview-2",
    subjectName: "Anonymous",
    emotionalSnippet:
      "The forces that shape identity imprint a unique pattern at initialization — a baseline that endures.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
  },
  {
    reportId: "preview-3",
    subjectName: "Anonymous",
    emotionalSnippet:
      "Spectral gradients, structural grids — the aesthetic field maps the invisible forces that define who you become.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
  },
];

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "GET", path: "/api/report/previews" });

  const url = new URL(request.url);
  const maxPreviews = Math.min(
    20,
    Math.max(
      1,
      parseInt(url.searchParams.get("maxPreviews") ?? url.searchParams.get("maxCards") ?? "3", 10) || 3
    )
  );
  const useBlobParam = url.searchParams.get("useBlob");
  const useBlobStorage =
    useBlobParam === null
      ? undefined
      : useBlobParam === "1" || useBlobParam === "true";

  const info = getStorageInfo();
  const actuallyUseBlob = useBlobStorage ?? info.storage === "blob";

  const previewCards: Array<{
    reportId: string;
    subjectName: string;
    emotionalSnippet: string;
    imageUrls: string[];
    summaryText?: string;
  }> = [];

  if (actuallyUseBlob && info.storage === "blob") {
    const { blobs } = await list({ prefix: BLOB_BEAUTY_PREFIX, limit: 50 });
    const sorted = blobs
      .map((b) => ({ pathname: b.pathname, uploadedAt: (b as { uploadedAt?: Date }).uploadedAt }))
      .sort((a, b) => (b.uploadedAt?.getTime() ?? 0) - (a.uploadedAt?.getTime() ?? 0));
    const reportIds = sorted
      .slice(0, maxPreviews)
      .map((p) => p.pathname.replace(BLOB_BEAUTY_PREFIX, "").replace(/\.json$/, ""))
      .filter(Boolean);

    for (const reportId of reportIds) {
      try {
        const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
        const meta = await head(pathname);
        const res = await fetch(meta.url);
        if (!res.ok) continue;
        const raw = (await res.json()) as Record<string, unknown>;
        const subjectName =
          typeof raw.subjectName === "string"
            ? raw.subjectName
            : typeof (raw as { fullName?: string }).fullName === "string"
              ? (raw as { fullName: string }).fullName
              : "Anonymous";
        const emotionalSnippet =
          typeof raw.emotionalSnippet === "string"
            ? raw.emotionalSnippet
            : typeof (raw as { emotional_snippet?: string }).emotional_snippet === "string"
              ? (raw as { emotional_snippet: string }).emotional_snippet
              : "";

        if (!emotionalSnippet) continue;

        const storedUrls = raw.imageUrls as string[] | undefined;
        const isPlaceholder = (u: string | undefined) =>
          !u || typeof u !== "string" || u.startsWith("data:image/svg+xml");

        const imageUrls: string[] = [];
        for (let i = 0; i < 3; i++) {
          const stored =
            Array.isArray(storedUrls) && storedUrls[i] != null && typeof storedUrls[i] === "string"
              ? storedUrls[i]
              : i === 0 && Array.isArray(storedUrls) && storedUrls.length === 1 && typeof storedUrls[0] === "string"
                ? storedUrls[0]
                : undefined;

          const blobUrl = await getImageUrlFromBlob(reportId, IMAGE_SLUGS[i]);
          if (blobUrl) {
            imageUrls.push(blobUrl);
          } else if (stored && !isPlaceholder(stored)) {
            imageUrls.push(stored);
          } else {
            imageUrls.push(PLACEHOLDER_SVG);
          }
        }
        const marketingCardUrl =
          (typeof raw.marketingCardUrl === "string" && raw.marketingCardUrl)
            ? raw.marketingCardUrl
            : await getImageUrlFromBlob(reportId, "marketing_card");
        const summaryText = typeof raw.fullReport === "string"
          ? raw.fullReport.slice(0, 200).trim() + (raw.fullReport.length > 200 ? "…" : "")
          : undefined;

        previewCards.push({
          reportId,
          subjectName,
          emotionalSnippet,
          imageUrls,
          ...(marketingCardUrl && { marketingCardUrl }),
          ...(summaryText && { summaryText }),
        });
      } catch (err) {
        log("warn", "preview fetch failed", {
          requestId,
          reportId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (previewCards.length === 0) {
    const toUse = Math.min(3, MOCK_PREVIEW_CARDS.length);
    for (let i = 0; i < toUse; i++) {
      previewCards.push(MOCK_PREVIEW_CARDS[i]);
    }
  }

  return successResponse(200, { previewCards }, requestId);
}
