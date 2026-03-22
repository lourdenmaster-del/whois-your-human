# WHOIS Identity Resolution Consistency Audit

**Scope:** End-to-end trace of identity-defining fields (solarSeasonProfile, dominantArchetype, archetypeClassification) across engine, profile, storedReport, and report composition.

**Date:** 2026-03-19

**Mode:** Read-first; minimal-change alignment.

---

## 1. Identity Pipeline Map

### A. Engine Paths

| Path | Entry | Identity Computation | Persistence |
|------|-------|---------------------|-------------|
| **engine/generate (dry-run)** | POST /api/engine/generate, dryRun=true | `dryRunBirthContext` from birthDate: `getSolarSeasonProfile(sunLon)` when birthContext missing. `getSolarProfileFromContext(dryRunBirthContext)` → archetype. | StoredReport: full_report, vector_zero, field_conditions_context, originCoordinatesDisplay. **Returns** dryPayload with dominantArchetype, solarSeasonProfile, originCoordinatesDisplay (not persisted on StoredReport). |
| **engine/generate (live)** | POST /api/engine/generate, dryRun=false | `computeBirthContextForReport` → birthContext with solarSeasonProfile from `getSolarSeasonProfile(derived.sunLonDeg)`. LLM generates full_report. Deterministic blocks inject RESOLUTION KEYS. | StoredReport: full_report, vector_zero, field_conditions_context, originCoordinatesDisplay. No dominantArchetype/solarSeasonProfile on StoredReport. |
| **engine (E.V.E. live)** | POST /api/engine (full pipeline) | Fetches stored report. `extractArchetypeFromReport(fullReport)` → archetypeName. `getSolarSeasonProfile(derived)` from deriveFromBirthData sunLonDeg. | BeautyProfileV1: dominantArchetype=archetypeName, solarSeasonProfile from getSolarSeasonProfile. |

### B. Profile Construction

| Builder | When | solarSeasonProfile | dominantArchetype | Source |
|---------|------|--------------------|-------------------|--------|
| **buildDryRunBeautyProfileV1** | beauty/dry-run after engine/generate | From birthFields (engine response) | From birthFields (engine response) | Engine dry-run returns these in dryPayload; beauty/dry-run extracts and passes. |
| **engine route (E.V.E.)** | After E.V.E. filter, before saveBeautyProfileV1 | getSolarSeasonProfile(derived) | extractArchetypeFromReport(fullReport) | Two different sources: solar from birthContext, archetype from report text. |

### C. Report Composition (buildPaidWhoisReport)

| Field | Priority | Source |
|-------|----------|--------|
| **solarSegmentName** | 1. profile.solarSeasonProfile → CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex] | 2. date-derived: getSolarSeasonIndexFromLongitude(lon) → CANONICAL_SOLAR_SEGMENT_NAMES |
| **archetypeClassification** | 1. profile.solarSeasonProfile.archetype | 2. profile.dominantArchetype | 3. date-derived: getPrimaryArchetypeFromSolarLongitude(lon) |
| **sunLongitudeDeg** | 1. profile.solarSeasonProfile.lonCenterDeg | 2. date-derived lon |
| **solarAnchorType** | getSolarSeasonByIndex(seasonIndex).anchorType | From profile or date-derived index |
| **seasonalPolarity** | profile.solarSeasonProfile.seasonalPolarity | Or computed from normalized lon |

### D. buildFreeWhoisReport

| Field | Source |
|-------|--------|
| solarSignature | getSolarSeasonIndexFromLongitude(lon) → CANONICAL_SOLAR_SEGMENT_NAMES |
| archetypeClassification | getPrimaryArchetypeFromSolarLongitude(lon) |
| solarAnchorType | getSolarSeasonByIndex(seasonIndex).anchorType |

**No profile.** Pure date-derived. Same canonical formula everywhere.

### E. Agent WHOIS Route

| Field | Priority |
|-------|----------|
| solarSegment | profile.solarSeasonProfile.seasonIndex → CANONICAL_SOLAR_SEGMENT_NAMES; else getSolarSeasonIndexFromLongitude(storedSunLon) |
| archetype | profile.solarSeasonProfile.archetype ?? profile.dominantArchetype ?? getPrimaryArchetypeFromSolarLongitude(storedSunLon) |

---

## 2. Per-Field Trace

### solarSeasonProfile

| Location | Computed | Passed Through | Recomputed |
|----------|----------|----------------|------------|
| **computeBirthContextForReport** | ✅ getSolarSeasonProfile(derived.sunLonDeg) | → birthContext.solarSeasonProfile | — |
| **engine/generate dry-run** | ✅ getSolarSeasonProfile when enriching dryRunBirthContext | → dryRunBirthContext.solarSeasonProfile | — |
| **engine/generate dry-run return** | — | dryPayload.solarSeasonProfile | — |
| **beauty/dry-run** | — | Extracts from engine response → buildDryRunBeautyProfileV1 | — |
| **engine route (E.V.E.)** | ✅ getSolarSeasonProfile(derived) | → payload.solarSeasonProfile → saveBeautyProfileV1 | — |
| **buildPaidWhoisReport** | — | Reads profile.solarSeasonProfile | ✅ When null: approximateSunLongitudeFromDate + getSolarSeasonIndexFromLongitude + getSolarSeasonByIndex (partial recompute for segment name + anchor) |
| **agent whois** | — | Reads profile.solarSeasonProfile | ✅ When null: getSolarSeasonIndexFromLongitude(storedSunLon) for fallback |

### dominantArchetype

| Location | Computed | Passed Through | Recomputed |
|----------|----------|----------------|------------|
| **engine/generate dry-run** | From getSolarProfileFromContext → archetype | dryPayload.dominantArchetype | — |
| **beauty/dry-run** | — | Extracts → buildDryRunBeautyProfileV1 | — |
| **engine route (E.V.E.)** | ✅ extractArchetypeFromReport(fullReport) | → payload.dominantArchetype | — |
| **buildPaidWhoisReport** | — | Reads profile.dominantArchetype (fallback after solarProfile.archetype) | ✅ When both null: getPrimaryArchetypeFromSolarLongitude(lon) |
| **agent whois** | — | Reads profile.dominantArchetype | ✅ When null: getPrimaryArchetypeFromSolarLongitude(storedSunLon) |

### archetypeClassification (output field)

| Location | Source |
|----------|--------|
| **buildFreeWhoisReport** | getPrimaryArchetypeFromSolarLongitude(lon) — always recomputed from date |
| **buildPaidWhoisReport** | profile.solarSeasonProfile.archetype ?? profile.dominantArchetype ?? getPrimaryArchetypeFromSolarLongitude(lon) |

---

## 3. Drift Risks

| Risk | Location | Description |
|------|----------|-------------|
| **E.V.E. dual source** | engine route | dominantArchetype from extractArchetypeFromReport (report text); solarSeasonProfile from getSolarSeasonProfile(derived). LLM could output different archetype than sunLonDeg implies. buildPaidWhoisReport uses solarProfile.archetype first, so solar wins when both present. |
| **Profile vs storedReport** | buildPaidWhoisReport | Identity comes only from profile. StoredReport does not persist dominantArchetype or solarSeasonProfile. When profile lacks these (e.g. old profile, failed save), buildPaidWhoisReport recomputes from birthDate. No storedReport fallback for identity. |
| **beauty/dry-run extraction** | beauty/dry-run | Depends on engine/generate returning dominantArchetype, solarSeasonProfile in response. successResponse wraps in `{ status, requestId, data }`; beauty/dry-run reads data.data?.dominantArchetype. If engine response shape changes, profile may miss these. |
| **approximateSunLongitude vs deriveFromBirthData** | Multiple | engine/generate dry-run uses approximateSunLongitudeFromDate (date-only). computeBirthContextForReport uses deriveFromBirthData (date+time+place) → different sunLonDeg. Same birth date can yield different longitudes when time/place differ. |
| **extractArchetypeFromReport vs solar** | engine route | extractArchetypeFromReport parses "Dominant: X" or first occurrence of archetype name. RESOLUTION KEYS block injects regime from solar. If LLM ignores RESOLUTION KEYS, report text could conflict. |

---

## 4. Canonical Source Definition

**Single source of truth for identity (when available):**

1. **solarSeasonProfile** — Computed from `getSolarSeasonProfile(sunLonDeg)` where sunLonDeg comes from:
   - **Preferred:** deriveFromBirthData (date+time+place) → precise geocentric longitude
   - **Fallback:** approximateSunLongitudeFromDate (date-only) → approximate

2. **dominantArchetype** — Should align with solarSeasonProfile.archetype. When both are set:
   - **Preferred:** solarSeasonProfile.archetype (derived from sun longitude)
   - **Secondary:** dominantArchetype (from report parse or solar)

3. **Canonical rule:** solarSeasonProfile is the authoritative identity state. dominantArchetype should equal solarSeasonProfile.archetype when both are set. Layers that only consume identity should read from profile, not recompute, when profile has solarSeasonProfile.

---

## 5. Minimal Fix Plan

### 5.1 No Code Change Required (Current State)

- **Dry-run path:** engine/generate returns dominantArchetype and solarSeasonProfile from getSolarProfileFromContext. beauty/dry-run passes to profile. buildPaidWhoisReport reads profile. **Aligned.**

- **buildPaidWhoisReport priority:** solarProfile.archetype before dominantArchetype. **Correct.**

- **Recompute fallback:** When profile lacks solarSeasonProfile, buildPaidWhoisReport uses getSolarSeasonIndexFromLongitude + getPrimaryArchetypeFromSolarLongitude. Same canonical formula. **Acceptable.**

### 5.2 Optional Hardening (If Drift Observed)

| Change | Purpose | Risk |
|--------|---------|------|
| **Engine route: prefer solar over extractArchetypeFromReport** | Set dominantArchetype = solarSeasonProfile.archetype when solarSeasonProfile present; use extractArchetypeFromReport only when solar missing. | Low. Ensures profile never has conflicting dominantArchetype vs solarSeasonProfile.archetype. |
| **StoredReport: persist dominantArchetype, solarSeasonProfile** | Add to StoredReport so buildPaidWhoisReport can fall back when profile lacks. | Medium. Schema change; engine/generate must persist. |
| **beauty/dry-run: validate engine response shape** | Log when data.data?.solarSeasonProfile or data.data?.dominantArchetype is missing. | Low. Observability only. |

### 5.3 Implemented (2026-03-19)

**Engine route alignment:** When building BeautyProfileV1 payload, `dominantArchetype = solarSeasonProfile.archetype` when `derived.sunLonDeg` is a number (birth context has valid sun longitude); else fallback to `extractArchetypeFromReport(fullReport)`. All downstream uses (buildCondensedFullReport, secondaryFromReport, buildMinimalVoiceProfile, getMarketingDescriptor, overlays) use `canonicalArchetype`. E.V.E. prompt still uses `extractArchetypeFromReport` for voice block (pre-solar); profile is canonical for consumers.

---

## 6. Verification

### 6.1 Same Input → Same Identity

| Test | Input | Expected |
|------|-------|----------|
| buildFreeWhoisReport | birthDate "1990-01-15" | solarSignature + archetypeClassification from getSolarSeasonIndexFromLongitude + getPrimaryArchetypeFromSolarLongitude |
| buildPaidWhoisReport (profile has solarSeasonProfile) | profile with solarSeasonProfile { seasonIndex: 9, archetype: "Structoris" } | archetypeClassification = "Structoris", solarSignature = "December Solstice" |
| buildPaidWhoisReport (profile lacks solarSeasonProfile) | profile with birthDate "1990-01-15", no solarSeasonProfile | Same as buildFreeWhoisReport for that date |

### 6.2 Existing Test Coverage

- `buildPaidWhoisReport-dry-run.test.ts`: "uses profile.solarSeasonProfile and profile.dominantArchetype when present" — asserts Structoris, December Solstice.
- `buildPaidWhoisReport-dry-run.test.ts`: "solar segment index: same birth date yields same segment and archetype" — asserts free report archetype matches getPrimaryArchetypeFromSolarLongitude and SOLAR_SEASONS.

### 6.3 Recommended Additional Test

- **Engine route:** When derived has sunLonDeg, assert payload.dominantArchetype === payload.solarSeasonProfile.archetype.
- **beauty/dry-run:** Assert profile.solarSeasonProfile and profile.dominantArchetype are set when engine response includes them.

---

## 7. Summary

| Item | Status |
|------|--------|
| **Canonical formula** | getSolarSeasonIndexFromLongitude (unified 2026-03-19) |
| **Profile as identity source** | buildPaidWhoisReport reads profile.solarSeasonProfile, profile.dominantArchetype first |
| **Fallback recompute** | Date-derived when profile lacks; uses same canonical formula |
| **Drift risk** | E.V.E. live path: extractArchetypeFromReport can differ from solarSeasonProfile; buildPaidWhoisReport prefers solar so output is correct |
| **Minimal fix** | Optional: engine route set dominantArchetype = solarSeasonProfile.archetype when solar present |
| **StoredReport** | Does not persist identity; profile is sole source for buildPaidWhoisReport |
