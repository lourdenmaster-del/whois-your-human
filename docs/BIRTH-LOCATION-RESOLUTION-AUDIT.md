# Birth Location Resolution Pipeline Audit

**Date:** 2026-03-21  
**Rule:** Freeform birth location text must not be the final engine input. Engine must receive resolved geolocation with canonical place name, lat, lon, timezone, precision, anchor type.

---

## 1. Location Pipeline Trace (Intake → Engine)

| Stage | File | Flow |
|-------|------|------|
| **Intake** | `OriginTerminalIntake.jsx`, `LightIdentityForm.jsx` | User enters freeform `birthLocation` (e.g. "Dallas, TX") |
| **Validation** | `lib/validate-engine-body.ts` | Requires non-whitespace birthLocation |
| **Resolution** | `lib/birth-location-resolver.ts` | `resolveBirthLocation(place)` → deterministic geolocation |
| **Derivation** | `lib/astrology/deriveFromBirthData.ts` | Calls `resolveBirthLocation`, uses lat/lon/placeName/timezoneId for astronomy |
| **Compute** | `lib/engine/computeBirthContextForReport.ts` | `deriveFromBirthData` → sun/moon/solar profile; passes through resolutionPrecision, anchorType |
| **Engine input** | `app/api/beauty/submit`, `app/api/engine/generate` | birthContext with lat, lon, placeName, timezoneId, resolutionPrecision, anchorType |

---

## 2. Weak Points (Before Hardening)

| Weak point | Location | Risk |
|------------|----------|------|
| Freeform text as engine input | `geocodePlace` returned first Nominatim result | Non-deterministic; "Dallas, TX" could resolve to different points |
| No canonical place name | `display_name` from Nominatim varied | Inconsistent display in BOUNDARY CONDITIONS |
| No precision/confidence | — | Engine could not distinguish address vs city vs centroid |
| No civic anchor | — | City-level input used centroid or random building |
| Result order non-deterministic | Nominatim relevance sort | Same input → different lat/lon over time |

---

## 3. Resolution Strategy Implemented

1. **Structured search for US city/state:** When input matches "City, ST" (2-letter state), use Nominatim structured params (`city`, `state`, `country=United States`) for deterministic city match.

2. **Deterministic result selection:** Request `limit=10`; sort results by `place_id` ascending; pick first valid result. Same query → same place_id ordering → same lat/lon.

3. **Civic anchor fallback:** When first result is settlement (city/town/village/municipality), try follow-up searches in order:
   - "city hall {city} {region}"
   - "courthouse {city} {region}"
   - "hospital {city} {region}"
   Use first result found; else keep centroid (anchorType="centroid").

4. **Canonical place name:** From `display_name`, take first 3 comma-separated parts for "City, State, Country" format.

5. **Caching:** In-memory cache keyed by normalized input (trim, lowercase, collapse whitespace). Same input → cache hit → identical output.

6. **Output shape:** `ResolvedBirthLocation` with lat, lon, placeName, timezoneId, resolutionPrecision, anchorType.

---

## 4. Final Engine Location Payload Shape

The `birthContext` passed to the engine now includes:

| Field | Type | Description |
|-------|------|-------------|
| `lat` | number | Latitude (resolved point) |
| `lon` | number | Longitude (resolved point) |
| `placeName` | string | Canonical location (e.g. "Dallas, Texas, United States") |
| `timezoneId` | string | IANA timezone (e.g. "America/Chicago") |
| `resolutionPrecision` | string | "address" \| "city" \| "region" \| "country" |
| `anchorType` | string | "civic" \| "centroid" \| "point" |
| `localTimestamp` | string | ISO local datetime |
| `utcTimestamp` | string | ISO UTC datetime |
| `sun`, `moon`, `solarSeasonProfile` | object | Astronomy / solar season (unchanged) |

---

## 5. Files Changed

- `lib/birth-location-resolver.ts` (new) — Resolution logic, cache, civic anchor fallback
- `lib/astrology/deriveFromBirthData.ts` — Use `resolveBirthLocation` instead of `geocodePlace`; add resolutionPrecision, anchorType to result
- `lib/engine/computeBirthContextForReport.ts` — Remove unused `geocodePlace` import; BirthContextForReport type includes resolutionPrecision, anchorType
