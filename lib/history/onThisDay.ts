/**
 * On this day in world history — factual context from Wikipedia/Wikimedia.
 * Used as optional context for report prompts; not causal. Free-first, cached 24h.
 */

export type OnThisDayItem = { year: number; text: string };

export type OnThisDayContext = {
  month: number;
  day: number;
  source: "wikimedia_onthisday";
  items: OnThisDayItem[];
};

const MAX_ITEMS = 6;
const MAX_EVENTS = 4;
const MAX_BIRTHS_OR_HOLIDAYS = 2;
const MAX_TEXT_LEN = 140;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type RawItem = { text?: string; year?: number };

type ApiResponse = {
  events?: RawItem[];
  births?: RawItem[];
  holidays?: RawItem[];
};

const cache = new Map<
  string,
  { ts: number; value: OnThisDayContext }
>();

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function truncate(text: string): string {
  const n = normalizeText(text);
  if (n.length <= MAX_TEXT_LEN) return n;
  return n.slice(0, MAX_TEXT_LEN - 3) + "...";
}

function dedupeKey(year: number, text: string): string {
  const t = normalizeText(text).slice(0, 80);
  return `${year}:${t}`;
}

function extractItems(
  arr: RawItem[] | undefined,
  defaultYear: number
): OnThisDayItem[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: OnThisDayItem[] = [];
  for (const x of arr) {
    const text = typeof x?.text === "string" ? x.text : "";
    if (!text) continue;
    const year = typeof x?.year === "number" ? x.year : defaultYear;
    const key = dedupeKey(year, text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ year, text: truncate(text) });
  }
  return out;
}

function curate(data: ApiResponse): OnThisDayItem[] {
  const events = extractItems(data.events, 0).slice(0, MAX_EVENTS);
  const births = extractItems(data.births, 0).slice(0, MAX_BIRTHS_OR_HOLIDAYS);
  const holidays = extractItems(data.holidays, 0).slice(
    0,
    MAX_BIRTHS_OR_HOLIDAYS
  );

  const seen = new Set<string>();
  const add = (items: OnThisDayItem[]) => {
    for (const it of items) {
      const key = dedupeKey(it.year, it.text);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(it);
      if (result.length >= MAX_ITEMS) return;
    }
  };

  const result: OnThisDayItem[] = [];
  add(events);
  if (result.length < MAX_ITEMS) add(births);
  if (result.length < MAX_ITEMS) add(holidays);
  return result.slice(0, MAX_ITEMS);
}

async function fetchFromUrl(url: string): Promise<ApiResponse | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LIGS-BeautyEngine/1.0 (OnThisDay)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (data == null || typeof data !== "object") return null;
    return data as ApiResponse;
  } catch {
    return null;
  }
}

/**
 * Fetch "on this day" factual context from Wikipedia/Wikimedia.
 * Prefer events (up to 4), then 1–2 from births or holidays. Max 6 items.
 * Returns null on fetch failure (omit block, no errors).
 */
export async function getOnThisDayContext(
  month: number,
  day: number,
  lang = "en"
): Promise<OnThisDayContext | null> {
  const MM = String(month).padStart(2, "0");
  const DD = String(day).padStart(2, "0");
  const cacheKey = `${lang}-${MM}-${DD}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.value;
  }

  const primary =
    `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/all/${MM}/${DD}`;
  const fallback =
    `https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/all/${MM}/${DD}`;

  let data = await fetchFromUrl(primary);
  if (!data) data = await fetchFromUrl(fallback);
  if (!data) return null;

  const items = curate(data);
  if (items.length === 0) return null;

  const value: OnThisDayContext = {
    month,
    day,
    source: "wikimedia_onthisday",
    items,
  };
  cache.set(cacheKey, { ts: Date.now(), value });
  return value;
}
