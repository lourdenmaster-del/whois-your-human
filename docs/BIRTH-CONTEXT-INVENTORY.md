# Birth Context Inventory — Read-Only

**Purpose:** Identify every place that derives, fetches, or computes birth date/time, location, timezone, astronomy, weather, space weather, or environment data.

**Scope:** No code changes. Inventory only.

---

## 1. Entry Points (API Routes / Functions)

| Entry Point | File | Function | What It Receives |
|-------------|------|----------|------------------|
| **Form submit (Beauty)** | `app/beauty/BeautyLandingClient.jsx` | `handleFormSubmit` → `submitToBeautySubmit` | `formData`: name, birthDate, birthTime, birthLocation, email |
| **Form submit (Main landing)** | `app/LandingPage.jsx` | `submitToEngine` or `submitToBeautyDryRun` | Same formData |
| **POST /api/beauty/submit** | `app/api/beauty/submit/route.ts` | `POST` handler | `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email`, `dryRun` — **only this route runs deriveFromBirthData** |
| **POST /api/beauty/dry-run** | `app/api/beauty/dry-run/route.ts` | `POST` handler | `birthData`: birthDate, birthTime, birthLocation, etc. — forwards to engine/generate; **no deriveFromBirthData** |
| **POST /api/beauty/create** | `app/api/beauty/create/route.ts` | `POST` handler | `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email` — forwards to /api/engine; **no deriveFromBirthData** |
| **POST /api/engine** | `app/api/engine/route.ts` | `POST` handler | Receives body (may include `astrology` from beauty/submit); forwards only `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email` to engine/generate |
| **POST /api/engine/generate** | `app/api/engine/generate/route.ts` | `POST` handler | `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email`; **does NOT receive astrology** |

**Client payload builder:** `lib/engine-client.js` → `buildEnginePayload(formData)` maps `formData.name` → `fullName`, `formData.birthDate` → `birthDate`, etc.

**Form fields:** `components/LightIdentityForm.jsx` — inputs: `name`, `birthDate`, `birthTime`, `birthLocation`, `email`.

---

## 2. Derived Fields (What We Compute) + Where

| Derived Field | Computed In | Function | Notes |
|---------------|-------------|----------|-------|
| **lat, lon** | `lib/astrology/deriveFromBirthData.ts` | `geocodePlace(place)` | From OpenStreetMap Nominatim |
| **sun_sign** | `lib/astrology/deriveFromBirthData.ts` | `deriveFromBirthData()` | Ecliptic longitude → zodiac sign via `longitudeToZodiacSign(sunLon)` |
| **moon_sign** | `lib/astrology/deriveFromBirthData.ts` | `deriveFromBirthData()` | Same mapping |
| **rising_sign** | `lib/astrology/deriveFromBirthData.ts` | `deriveFromBirthData()` | Ascendant from LST (Greenwich + lon/15), obliquity; `Math.atan2` formula |

**Call chain:** Only `POST /api/beauty/submit` calls `deriveFromBirthData`. Result (`astrology`) is passed to `/api/engine` but **the engine route does NOT forward astrology to engine/generate**. So `sun_sign`, `moon_sign`, `rising_sign` are computed but **never used** in report generation.

**Timezone conversion:** None. `parseBirthDateTime` in `deriveFromBirthData.ts` builds `YYYY-MM-DDTHH:mm:ssZ` — treats user birth time as **UTC**. No IANA timezone lookup or conversion. Geocoding returns only lat/lon; Nominatim can return timezone but we do not use it.

**Astronomy-engine usage:** `astronomy-engine` package (v2.1.19). Used for:
- `AstroTime(date)` — epoch from Date
- `EclipticLongitude(Body.Sun, time)` — Sun ecliptic longitude
- `EclipticLongitude(Body.Moon, time)` — Moon ecliptic longitude  
- `SiderealTime(time)` — Greenwich Apparent Sidereal Time (GAST)
- Manual ascendant formula: `LST = GAST + lon/15`, then `atan2` with obliquity 23.436°

**No computation of:** sunrise, sunset, solar altitude/azimuth, lunar phase, lunar altitude, local sidereal time (beyond LST for ascendant), twilight phase, day length, season anchor, moonrise/moonset, Kp/Dst, weather, elevation, Köppen, terrain, Bortle.

---

## 3. External Calls (Services + URLs)

| Service | File | Function | URL / Endpoint |
|---------|------|----------|----------------|
| **OpenStreetMap Nominatim** | `lib/astrology/deriveFromBirthData.ts` | `geocodePlace(place)` | `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1` |
| **OpenAI** | `app/api/engine/generate/route.ts` | `openai.chat.completions.create` | (API key; no URL in code) |
| **OpenAI** | `app/api/engine/route.ts` | E.V.E. filter | Same |
| **Vercel Blob** | `lib/report-store.ts`, `lib/beauty-profile-store.ts` | put, head, list | Blob storage (reports, beauty profiles, images) |

**No external calls for:** weather (NOAA, NWS, Open-Meteo), space weather (Kp, Dst, solar cycle), timezone (IANA), elevation, climate/terrain datasets.

---

## 4. Caches / Storage

| Cache/Storage | File | Purpose |
|---------------|------|---------|
| **Vercel Blob** | `lib/report-store.ts` | Reports: `ligs-reports/{reportId}.json` |
| **Vercel Blob** | `lib/beauty-profile-store.ts` | Beauty profiles: `ligs-beauty/{reportId}.json` |
| **Vercel Blob** | `lib/report-store.ts` | Images: `ligs-images/{reportId}/{slug}.png` |
| **In-memory fallback** | `lib/report-store.ts` | `memoryStore` when `BLOB_READ_WRITE_TOKEN` unset |
| **LRU cache** | `src/ligs/image/cache.ts` | Image generation results (keyed by profile+purpose+aspectRatio+etc.); **not** birth/geo data |
| **localStorage** | `lib/landing-storage.js` | `saveLastFormData` / `loadLastFormData` — form data only (birthDate, birthTime, birthLocation, etc.) |

**No cache for:** geocoding, astrology derivation, weather, space weather. Each request re-runs `deriveFromBirthData` (Nominatim + astronomy-engine).

---

## 5. Output Shape (Report / Beauty Profile)

| Field | Source | Where It Ends Up |
|-------|--------|------------------|
| **full_report** | LLM (engine/generate) | Stored in report Blob; E.V.E. extracts from it; `buildCondensedFullReport` → `fullReport` in BeautyProfileV1 |
| **emotional_snippet** | LLM (engine/generate) | Report Blob; BeautyProfileV1.emotionalSnippet |
| **vector_zero** | LLM (engine/generate) or E.V.E. | Report Blob; BeautyProfileV1.vectorZero |
| **light_signature**, **archetype**, **deviations**, **corrective_vector** | E.V.E. filter (extracted from full_report) | BeautyProfileV1; `buildCondensedFullReport` uses for fullReport text |
| **imagery_prompts** | E.V.E. filter | BeautyProfileV1.imageryPrompts |
| **subjectName** | fullName from form | BeautyProfileV1 |
| **dominantArchetype** | `extractArchetypeFromReport(fullReport)` | BeautyProfileV1; engine route |
| **sun_sign, moon_sign, rising_sign** | `deriveFromBirthData` | Computed, passed to engine in request body, **but engine does not forward to engine/generate** → **never in report or Beauty Profile** |

**Conclusion:** The only birth-derived data that could influence the report is the **string** passed to the LLM: `Birth Date: ${birthDate}\nBirth Time: ${birthTime}\nBirth Location: ${birthLocation}`. No structured astronomy, no lat/lon, no timezone, no weather.

---

## 6. Gaps (What We Do NOT Compute but Could)

| Category | Gap | BirthContext Schema Field | Notes |
|----------|-----|---------------------------|-------|
| **Timezone** | No IANA timezone from location | `BirthGeo.timezoneId` | Nominatim can return timezone; we don't use it. Birth time is treated as UTC. |
| **UTC timestamp** | No proper local→UTC conversion | `BirthGeo.utcTimestamp` | Would need timezone + moment/date-fns-tz |
| **Elevation** | Not fetched | `BirthGeo.elevationM` | Nominatim can return elevation |
| **Solar** | No sunrise, sunset, altitude, azimuth, twilight, day length, season | `SolarContext` | astronomy-engine or suncalc could compute |
| **Lunar** | No moon phase, altitude, illumination, moonrise/moonset, sun-moon separation | `LunarContext` | astronomy-engine supports |
| **Sky** | No local sidereal time (we compute LST for ascendant only), no Bortle | `SkyContext` | |
| **Space weather** | No Kp, Dst, solar cycle phase | `SpaceWeatherContext` | Would need NOAA/SWPC API |
| **Weather** | No temperature, humidity, clouds, conditions at birth | `WeatherContext` | Would need NOAA, NWS, Open-Meteo |
| **Environment** | No Köppen, terrain, distance to ocean | `GeoEnvironmentContext` | Would need climate datasets |
| **Highlights** | No pre-digested bullet facts for prompts | `BirthContext.highlights` | Could populate from above |

**Schema exists but unused:** `src/ligs/context/birthContext.ts` defines `BirthContext` with all of the above; nothing populates or consumes it yet.

---

## 7. File Reference Summary

| File | Role |
|------|------|
| `lib/astrology/deriveFromBirthData.ts` | Geocoding (Nominatim), Sun/Moon/Rising via astronomy-engine |
| `app/api/beauty/submit/route.ts` | Calls deriveFromBirthData; passes astrology to engine (not forwarded) |
| `app/api/engine/route.ts` | Forwards only name/date/time/location to engine/generate |
| `app/api/engine/generate/route.ts` | Builds birthData string; no astrology |
| `lib/engine-client.js` | buildEnginePayload; submitToBeautySubmit, etc. |
| `lib/validate-engine-body.ts` | Validates fullName, birthDate, birthLocation, email |
| `components/LightIdentityForm.jsx` | Form inputs |
| `src/ligs/context/birthContext.ts` | BirthContext type (unused) |
| `docs/dry-run-report-v1.txt` | Example report with rich physics (not from code; illustrative) |
| `package.json` | astronomy-engine dependency; no weather/space-weather packages |
