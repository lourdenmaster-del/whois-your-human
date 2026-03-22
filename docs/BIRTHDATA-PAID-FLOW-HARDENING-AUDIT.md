# Birthdata Paid Flow Hardening Audit

**Date:** 2026-03-21  
**Rule:** If paid WHOIS generation starts, the engine must already have normalized, resolvable birthdata. No blank paid output. No soft unresolved sections.

---

## 1. Birthdata Path Trace (Intake → Engine)

| Stage | File(s) | Function / Flow |
|-------|---------|-----------------|
| **Intake** | `OriginTerminalIntake.jsx`, `LightIdentityForm.jsx` | User enters name, birthDate, birthPlace, birthTime, email |
| **Parsing** | `lib/terminal-intake/parseInputs.ts` | `parseDate()` → iso `YYYY-MM-DD`; `parseTime()` → api `HH:MM:SS` (or `12:00:00` for unknown); `normalizePlace()` (title-case) |
| **Payload build** | `lib/engine-client.js` | `buildEnginePayload()` maps `formData.name`→`fullName`, `birthLocation`, `birthDate`, `birthTime`, `email` |
| **API validation** | `lib/validate-engine-body.ts` | `validateEngineBody()` — requires fullName, birthDate YYYY-MM-DD, birthTime parseable, birthLocation non-whitespace, email |
| **Resolution** | `lib/astrology/deriveFromBirthData.ts` | Geocode place → tz-lookup → local→UTC → astronomy-engine (sun/moon/rising) |
| **Compute** | `lib/engine/computeBirthContextForReport.ts` | `computeBirthContextForReport()` — calls deriveFromBirthData + computeSunMoonContext + getSolarSeasonProfile; throws on failure |
| **Engine input** | `app/api/beauty/submit/route.ts`, `app/api/engine/generate/route.ts` | birthContext + birthDate/birthTime/birthLocation passed to engine |
| **Report generation** | `app/api/engine/generate/route.ts` | `buildReportGenerationPrompt(birthData, archetype, birthContext)` → OpenAI; deterministic blocks injected |

---

## 2. Weak Points Identified

| Weak Point | Location | Risk |
|------------|----------|------|
| **birthDate format not validated** | `validate-engine-body.ts` | Non–YYYY-MM-DD (e.g. `8/14/1993`) could reach deriveFromBirthData and fail late |
| **birthLocation whitespace-only** | `validate-engine-body.ts` | `"   "` passed as truthy, could cause geocode/null issues |
| **deriveFromBirthData returns null** | `deriveFromBirthData.ts` (line 92) | Theoretical: geocodePlace returns null → birthContext null → engine receives no context → BOUNDARY CONDITIONS uses "unknown" |
| **deriveFromBirthData throws** | `beauty/submit` | Previously: generic catch; now: explicit 500 with clear message |
| **Paid flow without birthContext** | `engine/generate` | Non-dryRun could proceed with incomplete birthContext (studio fallback in dev) → "unknown" in deterministic blocks |
| **No pre-generation guard** | `engine/generate` | Paid path could call OpenAI with incomplete birthContext; blank/unknown sections in output |

---

## 3. Hardening Changes Made

### 3.1 `lib/validate-engine-body.ts`

- **birthDate format:** Require `YYYY-MM-DD`; reject anything else with `BIRTH_DATE_INVALID_MESSAGE`
- **birthLocation:** Require non-empty after trim; reject whitespace-only with `BIRTH_LOCATION_INVALID_MESSAGE`
- **fullName:** Trim and require non-empty
- **Output:** Normalized `fullName`, `birthDate`, `birthLocation`, `birthTime` (HH:MM:SS)

### 3.2 `app/api/beauty/submit/route.ts`

- **deriveFromBirthData wrap:** Explicit try/catch; on throw → 500 "Birth data resolution failed. Please verify date, time, and location."
- **Null guard:** If `deriveFromBirthData` returns null → 500 (same message)
- Ensures paid flow never proceeds with unresolved birthdata

### 3.3 `app/api/engine/generate/route.ts`

- **Paid flow pre-generation guard (non-dryRun):** Before OpenAI call, assert birthContext has:
  - `lat`, `lon` (numbers)
  - `utcTimestamp` (non-empty string)
  - `sun` (non-empty object)
  - `solarSeasonProfile` or `sunLonDeg`
- If any missing → 500 "Birth context incomplete. Report generation requires resolved date, time, location, and coordinates."
- Makes blank/unknown sections in paid output a detectable bug (fail-fast before generation)

---

## 4. Paid Flow Guarantee

**Yes.** After these changes:

1. **Validation:** Only `YYYY-MM-DD` dates, parseable times, and non-whitespace locations reach the API.
2. **Resolution:** `beauty/submit` does not proceed if `deriveFromBirthData` throws or returns null.
3. **Engine guard:** `engine/generate` does not run paid (non-dryRun) generation without complete birthContext (coords, UTC, sun, solar profile).
4. **Result:** Paid report generation only runs when birthdata has been resolved to engine-ready values. Blank output from missing birth context should no longer occur; if it does, it is a bug and the guard should surface a 500.

---

## 5. What Was Not Changed

- No "cannot complete" or similar copy in paid report output
- No redesign of the engine
- Core method and canonical terms unchanged
- Deterministic blocks still use "unknown" when context is missing — but paid flow will not reach that path due to the guard
