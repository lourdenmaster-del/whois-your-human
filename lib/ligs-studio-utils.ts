/** 1x1 placeholder PNG base64 (used when no real background). */
export const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAEBgIApD5fRAAAAABJRU5ErkJggg==";

/**
 * Parse PNG dimensions from base64-encoded PNG (reads IHDR chunk).
 * Returns { width, height } or null if parse fails.
 */
export function getPngDimensionsFromBase64(b64: string): { width: number; height: number } | null {
  try {
    const binary = atob(b64.replace(/^data:image\/\w+;base64,/, "").trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length < 24) return null;
    // PNG: 8 sig + 4 len + 4 "IHDR" + 4 width + 4 height + ...
    const view = new DataView(bytes.buffer);
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null;
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the input is a placeholder PNG (data URL or contains TINY_PNG_B64).
 */
export function isPlaceholderPng(input?: string | null): boolean {
  if (!input) return false;
  return input.startsWith("data:image/png") || input.includes(TINY_PNG_B64);
}

/**
 * Extracts background URL or b64 from image/generate response.
 * Prefers url over b64 when both exist. Handles images[0] as string or { url, b64 }.
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
