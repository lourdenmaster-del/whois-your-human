/**
 * Extracts background URL or b64 from image/generate response.
 * Handles common shapes: images[0] as string or { url, b64 }, image.url, image.b64.
 * Returns { url } or { b64 } with string values only, or null if none found.
 */
export function pickBackgroundSource(
  imageResult: Record<string, unknown> | null
): { url?: string; b64?: string } | null {
  if (!imageResult || typeof imageResult !== "object") return null;

  const first = (imageResult.images as unknown[] | undefined)?.[0];
  if (first != null) {
    if (typeof first === "string") return { url: first };
    if (typeof first === "object" && first !== null) {
      const o = first as Record<string, unknown>;
      if (typeof o.url === "string" && o.url) return { url: o.url };
      if (typeof o.b64 === "string" && o.b64) return { b64: o.b64 };
    }
  }

  const image = imageResult.image as Record<string, unknown> | undefined;
  if (image && typeof image === "object") {
    if (typeof image.url === "string" && image.url) return { url: image.url };
    if (typeof image.b64 === "string" && image.b64) return { b64: image.b64 };
  }

  return null;
}

/**
 * Converts pickBackgroundSource result to a string for the Background input field.
 * - url → returns the URL string
 * - b64 → returns data:image/png;base64,{b64}
 */
export function backgroundToInputString(bg: { url?: string; b64?: string } | null): string {
  if (!bg) return "";
  if (bg.url) return bg.url;
  if (bg.b64) return `data:image/png;base64,${bg.b64}`;
  return "";
}
