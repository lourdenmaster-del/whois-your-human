/**
 * API client for frontend fetch calls.
 */

/**
 * @typedef {Object} PreviewCard
 * @property {string} reportId
 * @property {string} subjectName
 * @property {string} emotionalSnippet
 * @property {string[]} imageUrls - [vector_zero, light_signature, final_beauty]
 * @property {string} [summaryText]
 */

/**
 * Fetch preview cards from Blob Beauty Profiles.
 * Wrapper for GET /api/report/previews.
 * Returns real Blob data when available; DRY_RUN mock cards when Blob empty.
 * @param {{ maxCards?: number; maxPreviews?: number; useBlob?: boolean }} opts
 * @returns {Promise<{ previewCards: PreviewCard[] }>}
 */
export async function fetchBlobPreviews(opts = {}) {
  const max = opts.maxCards ?? opts.maxPreviews ?? 3;
  const useBlob = opts.useBlob ?? true;
  const params = new URLSearchParams();
  params.set("maxCards", String(max));
  params.set("useBlob", useBlob ? "1" : "0");
  const res = await fetch(`/api/report/previews?${params}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Failed to load previews");
  }
  const previewCards = json?.data?.previewCards ?? json?.previewCards ?? [];
  return { previewCards };
}
