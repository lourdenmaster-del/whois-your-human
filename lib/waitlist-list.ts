/**
 * List and aggregate waitlist entries from Vercel Blob.
 * Internal/admin use only. Used by /api/waitlist/list.
 */

import { list, get } from "@vercel/blob";

const BLOB_PREFIX = "ligs-waitlist/entries/";
const RECENT_LIMIT = 50;
const FETCH_LIMIT = 150;
const LIST_LIMIT = 1000;

export interface WaitlistEntryForList {
  email: string;
  created_at: string;
  source: string;
  preview_archetype?: string;
  solar_season?: string;
  name?: string;
}

export interface WaitlistListResult {
  total: number;
  recent: WaitlistEntryForList[];
  metrics: {
    total: number;
    last24h: number;
    last7d: number;
    bySource: { source: string; count: number; newestAt?: string }[];
    byArchetype: { archetype: string; count: number }[];
    originTerminalPct: number | null;
  };
  hasMore?: boolean;
}

function isBlobEnabled(): boolean {
  return (
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

async function fetchBlobContent(pathname: string): Promise<WaitlistEntryForList | null> {
  try {
    const result = await get(pathname, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      email: String(parsed.email ?? ""),
      created_at: String(parsed.created_at ?? ""),
      source: String(parsed.source ?? "beauty"),
      preview_archetype: typeof parsed.preview_archetype === "string" ? parsed.preview_archetype : undefined,
      solar_season: typeof parsed.solar_season === "string" ? parsed.solar_season : undefined,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * List waitlist entries, compute metrics, return recent entries sorted newest first.
 * Paginates list for total count; fetches only FETCH_LIMIT most recent for content (metrics + recent table).
 */
export async function listWaitlistEntries(): Promise<WaitlistListResult> {
  if (!isBlobEnabled()) {
    return {
      total: 0,
      recent: [],
      metrics: {
        total: 0,
        last24h: 0,
        last7d: 0,
        bySource: [],
        byArchetype: [],
        originTerminalPct: null,
      },
    };
  }

  const allBlobs: { pathname: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  let hasMore = false;

  do {
    const res = await list({
      prefix: BLOB_PREFIX,
      limit: LIST_LIMIT,
      cursor,
    });
    for (const b of res.blobs) {
      allBlobs.push({ pathname: b.pathname, uploadedAt: b.uploadedAt });
    }
    hasMore = res.hasMore;
    cursor = res.cursor;
  } while (hasMore && cursor);

  const total = allBlobs.length;
  allBlobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

  const toFetch = allBlobs.slice(0, FETCH_LIMIT);
  const fetched = await Promise.all(toFetch.map((b) => fetchBlobContent(b.pathname)));
  const entries = fetched.filter((e): e is WaitlistEntryForList => e != null);

  const recent = entries.slice(0, RECENT_LIMIT);
  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms7d = 7 * 24 * 60 * 60 * 1000;
  const last24h = entries.filter((e) => now - new Date(e.created_at).getTime() < ms24h).length;
  const last7d = entries.filter((e) => now - new Date(e.created_at).getTime() < ms7d).length;

  const sourceCount = new Map<string, number>();
  const sourceNewest = new Map<string, string>();
  const archetypeCount = new Map<string, number>();

  for (const e of entries) {
    const s = e.source || "unknown";
    sourceCount.set(s, (sourceCount.get(s) ?? 0) + 1);
    const current = sourceNewest.get(s);
    if (!current || e.created_at > current) sourceNewest.set(s, e.created_at);
    const arch = e.preview_archetype || "—";
    archetypeCount.set(arch, (archetypeCount.get(arch) ?? 0) + 1);
  }

  const bySource = Array.from(sourceCount.entries())
    .map(([source, count]) => ({
      source,
      count,
      newestAt: sourceNewest.get(source),
    }))
    .sort((a, b) => b.count - a.count);

  const byArchetype = Array.from(archetypeCount.entries())
    .filter(([a]) => a !== "—")
    .map(([archetype, count]) => ({ archetype, count }))
    .sort((a, b) => b.count - a.count);

  const originCount = sourceCount.get("origin-terminal") ?? 0;
  const originTerminalPct = entries.length > 0 ? Math.round((100 * originCount) / entries.length) : null;

  return {
    total,
    recent,
    metrics: {
      total,
      last24h,
      last7d,
      bySource,
      byArchetype,
      originTerminalPct,
    },
    hasMore: total > FETCH_LIMIT,
  };
}
