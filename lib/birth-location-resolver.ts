/**
 * Birth location resolution for paid WHOIS generation.
 * Freeform input must be resolved to a deterministic geolocation:
 * canonical place name, lat, lon, timezone, precision, anchor type.
 * Policy: prefer civic anchors (city hall > courthouse > hospital) when city-level input.
 */

import tzlookup from "tz-lookup";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_DELAY_MS = 1100;
const GEOCODE_TIMEOUT_MS = 10000;
const USER_AGENT = "LIGS-BeautyEngine/1.0";

/** US state abbreviation → full name for structured search. */
const US_STATE_ABBREV: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

export type ResolvedBirthLocation = {
  lat: number;
  lon: number;
  placeName: string;
  timezoneId: string;
  resolutionPrecision: "address" | "city" | "region" | "country";
  anchorType: "civic" | "centroid" | "point";
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  place_id?: number;
  display_name?: string;
  type?: string;
  class?: string;
  addresstype?: string;
  category?: string;
  place_rank?: number;
};

const CACHE = new Map<string, ResolvedBirthLocation>();

function cacheKey(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

async function nominatimFetch(params: Record<string, string>): Promise<NominatimResult[]> {
  const url = new URL(NOMINATIM_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "10");
  url.searchParams.set("addressdetails", "1");

  await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Geocoding failed: HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as NominatimResult[];
}

/** Pick deterministic result: sort by place_id ascending, take first with valid lat/lon. */
function pickResult(results: NominatimResult[], place: string): NominatimResult | null {
  const valid = results.filter((r) => r?.lat && r?.lon && !Number.isNaN(parseFloat(r.lat)) && !Number.isNaN(parseFloat(r.lon)));
  if (valid.length === 0) return null;
  valid.sort((a, b) => (a.place_id ?? 0) - (b.place_id ?? 0));
  return valid[0] ?? null;
}

/** Settlement types that warrant civic anchor fallback. */
const SETTLEMENT_TYPES = new Set(["city", "town", "village", "municipality", "suburb", "hamlet", "locality", "place"]);

function isSettlementType(r: NominatimResult): boolean {
  const t = (r.type ?? r.class ?? r.addresstype ?? r.category ?? "").toLowerCase();
  return SETTLEMENT_TYPES.has(t) || t.includes("place") || t.includes("admin");
}

/** Precision from place_rank: Nominatim rank; lower = more precise. */
function precisionFromRank(placeRank: number | undefined): ResolvedBirthLocation["resolutionPrecision"] {
  if (placeRank == null) return "city";
  if (placeRank <= 16) return "address";
  if (placeRank <= 18) return "city";
  if (placeRank <= 20) return "region";
  return "country";
}

/** Try civic anchor search in priority order. Returns null if none found. */
async function tryCivicAnchor(cityName: string, regionOrCountry: string): Promise<NominatimResult | null> {
  const queries = [
    `city hall ${cityName} ${regionOrCountry}`,
    `courthouse ${cityName} ${regionOrCountry}`,
    `hospital ${cityName} ${regionOrCountry}`,
  ];
  for (const q of queries) {
    try {
      const results = await nominatimFetch({ q });
      const picked = pickResult(results, q);
      if (picked) return picked;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Canonical place name from display_name: prefer "City, State, Country" format. */
function canonicalPlaceName(r: NominatimResult, fallback: string): string {
  const d = (r.display_name ?? "").trim();
  if (!d) return fallback;
  const parts = d.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).join(", ");
  return d || fallback;
}

/**
 * Resolve freeform birth location to a deterministic geolocation.
 * Same input resolves to same lat/lon every time.
 */
export async function resolveBirthLocation(place: string): Promise<ResolvedBirthLocation> {
  const trimmed = place.trim();
  if (!trimmed) throw new Error("Birth location is required");

  const key = cacheKey(trimmed);
  const cached = CACHE.get(key);
  if (cached) return cached;

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  let firstResult: NominatimResult | null = null;

  if (parts.length >= 2 && parts[1]!.length === 2 && /^[A-Za-z]{2}$/.test(parts[1]!)) {
    const city = parts[0]!;
    const stateAbbrev = parts[1]!.toUpperCase();
    const stateFull = US_STATE_ABBREV[stateAbbrev];
    if (stateFull) {
      const results = await nominatimFetch({
        city,
        state: stateFull,
        country: "United States",
      });
      firstResult = pickResult(results, trimmed);
    }
  }

  if (!firstResult) {
    const results = await nominatimFetch({ q: trimmed });
    firstResult = pickResult(results, trimmed);
  }

  if (!firstResult?.lat || !firstResult?.lon) {
    throw new Error(`Geocoding failed: no results for place "${trimmed}"`);
  }

  const lat = parseFloat(firstResult.lat);
  const lon = parseFloat(firstResult.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new Error(`Geocoding failed: invalid lat/lon for place "${trimmed}"`);
  }

  let placeName = canonicalPlaceName(firstResult, trimmed);
  let anchorType: ResolvedBirthLocation["anchorType"] = "point";
  let resolutionPrecision = precisionFromRank(firstResult.place_rank);
  let finalLat = lat;
  let finalLon = lon;

  if (isSettlementType(firstResult)) {
    const civic = await tryCivicAnchor(parts[0] ?? trimmed, parts.slice(1).join(", ") || trimmed);
    if (civic?.lat && civic?.lon) {
      const cLat = parseFloat(civic.lat);
      const cLon = parseFloat(civic.lon);
      if (!Number.isNaN(cLat) && !Number.isNaN(cLon)) {
        finalLat = cLat;
        finalLon = cLon;
        placeName = canonicalPlaceName(civic, placeName);
        anchorType = "civic";
      }
    } else {
      anchorType = "centroid";
    }
  }

  let timezoneId = "UTC";
  try {
    timezoneId = tzlookup(finalLat, finalLon);
  } catch {
    /* keep UTC */
  }

  const resolved: ResolvedBirthLocation = {
    lat: finalLat,
    lon: finalLon,
    placeName,
    timezoneId,
    resolutionPrecision,
    anchorType,
  };
  CACHE.set(key, resolved);
  return resolved;
}
