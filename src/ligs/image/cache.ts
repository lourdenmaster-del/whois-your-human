import { createHash } from "node:crypto";

export interface CachedImageResult {
  images: Array<{ url?: string; b64?: string }>;
  spec: unknown;
  validation: { pass: boolean; score: number; issues: unknown[] };
}

const MAX_ENTRIES = 200;

/**
 * LRU in-memory cache for image generation results.
 * Key = sha256(profile.id + profile.version + purpose + aspectRatio + size + count + archetype + variationKey)
 */
class ImageResultCache {
  private map = new Map<string, CachedImageResult>();
  private order: string[] = [];

  get(key: string): CachedImageResult | undefined {
    const val = this.map.get(key);
    if (!val) return undefined;
    this.touch(key);
    return val;
  }

  set(key: string, value: CachedImageResult): void {
    if (this.map.has(key)) {
      this.touch(key);
      this.map.set(key, value);
      return;
    }
    if (this.order.length >= MAX_ENTRIES) {
      const oldest = this.order.shift();
      if (oldest) this.map.delete(oldest);
    }
    this.map.set(key, value);
    this.order.push(key);
  }

  private touch(key: string): void {
    const idx = this.order.indexOf(key);
    if (idx >= 0) {
      this.order.splice(idx, 1);
      this.order.push(key);
    }
  }
}

const cache = new ImageResultCache();

export function computeImageCacheKey(params: {
  profileId: string;
  profileVersion: string;
  purpose: string;
  aspectRatio: string;
  size: string;
  count: number;
  archetype: string;
  variationKey: string;
}): string {
  const input = [
    params.profileId,
    params.profileVersion,
    params.purpose,
    params.aspectRatio,
    params.size,
    String(params.count),
    params.archetype,
    params.variationKey,
  ].join("|");
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function getCachedResult(key: string): CachedImageResult | undefined {
  return cache.get(key);
}

export function setCachedResult(key: string, result: CachedImageResult): void {
  cache.set(key, result);
}
