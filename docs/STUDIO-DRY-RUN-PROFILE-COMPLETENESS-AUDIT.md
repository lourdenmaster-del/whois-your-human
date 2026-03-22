# Studio Dry-Run Profile Completeness Audit — 2026-03-16

**Scope:** Determine whether Studio dry-run produces an incomplete canonical profile that forces `buildPaidWhoisReport` to rely on silent fallbacks.

---

## 1. Every `profile.*` Field Read by `buildPaidWhoisReport`

| Field | Usage | Line |
|-------|-------|------|
| `profile.subjectName` | `name` (top block) | 433 |
| `profile.birthDate` | `birthDateStr` when params omitted | 434 |
| `profile.birthLocation` | `birthLocationStr` when params omitted | 435 |
| `profile.birthTime` | `birthTimeStr` when params omitted | 436 |
| `profile.dominantArchetype` | Initial `archetypeClassification`; fallback when `solarSeasonProfile` present | 439, 449 |
| `profile.solarSeasonProfile` | Solar segment, archetype, sun longitude, anchor type, polarity (top block) | 444–453 |
| `profile.originCoordinatesDisplay` | Genesis table Origin Coordinates | 519 |
| `profile.vector_zero` | Vector Zero addendum when `storedReport.vector_zero` null | 535 |

---

## 2. Guaranteed in Normal Paid Path vs Studio Dry-Run

| Field | Normal paid (engine route) | Studio dry-run (buildDryRunBeautyProfileV1) |
|-------|----------------------------|---------------------------------------------|
| `subjectName` | ✅ fullName | ✅ subjectName |
| `birthDate` | ✅ | ✅ (from birthFields) |
| `birthTime` | ✅ | ✅ (from birthFields) |
| `birthLocation` | ✅ | ✅ (from birthFields) |
| `dominantArchetype` | ✅ archetypeName from extractArchetypeFromReport | ❌ **MISSING** |
| `solarSeasonProfile` | ✅ getSolarSeasonProfile(birthContext) | ❌ **MISSING** |
| `originCoordinatesDisplay` | ✅ when birthContext has lat/lon | ❌ **MISSING** |
| `vector_zero` | ✅ from E.V.E. filter | ✅ minimal placeholder |

---

## 3. Missing Fields in Studio Dry-Run

- `dominantArchetype`
- `solarSeasonProfile`
- `originCoordinatesDisplay`

---

## 4. Which Missing Fields Are Masked by Fallbacks

| Field | Fallback in buildPaidWhoisReport | Result |
|-------|----------------------------------|--------|
| `dominantArchetype` | Initial `"—"`, then overwritten by `solarSeasonProfile.archetype` or date-derived `getPrimaryArchetypeFromSolarLongitude` | **Masked:** Top block uses date-derived archetype |
| `solarSeasonProfile` | `approximateSunLongitudeFromDate(birthDate)` → season index, archetype, anchor type | **Masked:** Top block recomputes from birth date |
| `originCoordinatesDisplay` | `storedReport.originCoordinatesDisplay` (fixed in prior audit) | **Masked:** Now fixed via storedReport fallback |

---

## 5. Top-Block/Body Mismatch Cause

**Confirmed:** The mismatch (Structoris in top vs Fluxionis in body) comes from **two sources of truth**:

- **Top block:** `buildPaidWhoisReport` uses `profile.solarSeasonProfile` when present; when null (dry-run), it uses **date-derived** archetype via `approximateSunLongitudeFromDate` + `getPrimaryArchetypeFromSolarLongitude`.
- **Body:** Parsed from `storedReport.full_report`, which was built by the engine with `dryRunBirthContext`. The engine injects (L) blocks using `getSolarProfileFromContext(dryRunBirthContext)`.

When `profile.solarSeasonProfile` is null, the top block is date-derived. The body is engine-context-derived. Both use the same birth date for solar computation when the engine enriches from date (e.g. `buildDryRunSyntheticBirthContext` with no lat/lon). So they **should** match when the engine enriches from date.

The mismatch occurs when:
1. **STUDIO_FALLBACK_BIRTH_CONTEXT** is used (non–dry-run dev, compute fails) — hardcodes Fluxionis.
2. **Geocoding succeeds** but engine and buildPaidWhoisReport use different solar logic (unlikely; both use same astronomy).

For **Studio dry-run specifically:** Engine uses `buildDryRunSyntheticBirthContext` on compute failure (no lat/lon) and enriches from birth date. So body archetype = date-derived. Top block = date-derived. **They match.** The profile is still incomplete; fallbacks hide that.

---

## 6. Minimal Fix Plan

**Goal:** Populate canonical fields in `buildDryRunBeautyProfileV1` so the profile matches the engine’s output and `buildPaidWhoisReport` does not rely on fallbacks for identity fields.

**Approach:** Extend the engine/generate dry-run response with `solarSeasonProfile`, `originCoordinatesDisplay`, `dominantArchetype`. Pass them from beauty/dry-run into `buildDryRunBeautyProfileV1`.

**Changes:**
1. **engine/generate:** Add `solarSeasonProfile`, `originCoordinatesDisplay`, `dominantArchetype` to `dryPayload` before `successResponse`.
2. **beauty/dry-run:** Read these from the engine response and pass them to `buildDryRunBeautyProfileV1`.
3. **buildDryRunBeautyProfileV1:** Accept optional `solarSeasonProfile`, `originCoordinatesDisplay`, `dominantArchetype` and set them on the profile.

**Scope:** No redesign. Preserves current behavior when fields are absent. Engine already computes these for dry-run; we only surface them in the response and profile.

---

## 7. Implementation (2026-03-16)

**Files changed:**
- `app/api/engine/generate/route.ts` — Add `dominantArchetype`, `solarSeasonProfile`, `originCoordinatesDisplay` to dry-run response payload.
- `app/api/beauty/dry-run/route.ts` — Read these from engine response; pass to `buildDryRunBeautyProfileV1`; extend `buildDryRunBeautyProfileV1` to accept and set them on the profile.
- `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` — Add test "uses profile.solarSeasonProfile and profile.dominantArchetype when present (complete dry-run profile)".

**Verification:** All 13 tests in `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` pass.
