# buildPaidWhoisReport — Source-of-Truth Audit

**Scope:** Map every user-visible field to its source priority; flag fallback logic that can mask missing or inconsistent identity data.

**Focus file:** `lib/free-whois-report.ts`

---

## 1. Enumerated User-Visible Fields

All fields below are rendered in `renderFreeWhoisReport` and/or `renderFreeWhoisReportText`.

### REGISTRATION LOG
| Field | Rendered as |
|-------|-------------|
| registryStatus | "Registry Status" |
| created_at | "Created Date" |
| recordAuthority | "Record Authority" |
| registryId | "Registry ID" |

### Human WHOIS Registry Record
| Field | Rendered as |
|-------|-------------|
| name | "Subject Name" |
| birthDate | "Birth Date" |
| birthLocation | "Birth Location" |
| birthTime | "Birth Time" |
| solarSignature | "Solar Segment" |
| archetypeClassification | "Archetype Classification" |
| cosmicAnalogue | "Cosmic Twin" |

### IDENTITY PHYSICS — GENESIS METADATA
| Field | Rendered as |
|-------|-------------|
| sunLongitudeDeg | "Solar Light Vector" |
| solarSignature | "Seasonal Context" |
| solarAnchorType | "Solar Anchor Type" |
| chronoImprintResolved / birthTime | "Chrono-Imprint" |
| originCoordinatesDisplay | "Origin Coordinates" |
| magneticFieldIndexDisplay | "Magnetic Field Index" |
| climateSignatureDisplay | "Climate Signature" |
| sensoryFieldConditionsDisplay | "Sensory Field Conditions" |

### Paid WHOIS Body Sections
| Field | Rendered as |
|-------|-------------|
| identityArchitectureBody | "IDENTITY ARCHITECTURE" |
| fieldConditionsBody | "FIELD CONDITIONS" |
| cosmicTwinBody | "COSMIC TWIN RELATION" |
| archetypeExpressionBody | "ARCHETYPE EXPRESSION" |
| civilizationalFunctionBody | "CIVILIZATIONAL FUNCTION" |
| interpretiveNotesBody | "INTERPRETIVE NOTES" |
| integrationNoteBody | "INTEGRATION NOTE" |
| vectorZeroAddendumBody | "OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO" intro |

---

## 2. Source Priority by Field

### Top Block / Registry Metadata

| Field | Source Priority | Fallback Type | Notes |
|-------|-----------------|---------------|-------|
| **registryId** | computed (seed from reportId + createdAt) | — | No upstream; always generated. |
| **registryStatus** | constant `"Registered"` | — | No upstream. |
| **created_at** | storedReport.createdAt | new Date().toISOString() | Formatting fallback when null. |
| **recordAuthority** | constant `"LIGS Human WHOIS Registry"` | — | No upstream. |
| **name** | params → profile.subjectName | `"—"` | **Content fallback.** Empty profile → "—" masks missing subject. |
| **birthDate** | params.birthDate → profile.birthDate | `"—"` | **Content fallback.** |
| **birthLocation** | params.birthLocation → profile.birthLocation | `"—"` | **Content fallback.** |
| **birthTime** | params.birthTime → profile.birthTime | `"—"` | **Content fallback.** |
| **solarSignature** | profile.solarSeasonProfile → CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex] | date-derived (approximateSunLongitudeFromDate) → `"—"` | **Identity-state fallback.** Profile null → recompute from birthDate. Different formula than engine can cause mismatch. |
| **archetypeClassification** | profile.solarSeasonProfile.archetype → profile.dominantArchetype | date-derived (getPrimaryArchetypeFromSolarLongitude) → `"—"` | **Identity-state fallback.** Same as solarSignature; can diverge from engine-injected body. |
| **cosmicAnalogue** | getCosmicAnalogue(archetypeClassification) | getCosmicAnalogue("Ignispectrum") when archetype "—" | **Identity-state fallback.** Follows archetype; wrong archetype → wrong cosmic twin. |

### Genesis Metadata

| Field | Source Priority | Fallback Type | Notes |
|-------|-----------------|---------------|-------|
| **sunLongitudeDeg** | profile.solarSeasonProfile.lonCenterDeg | date-derived (approximateSunLongitudeFromDate) | **Identity-state fallback.** Render: "Limited Access" when null. |
| **solarAnchorType** | profile.solarSeasonProfile → getSolarSeasonByIndex | date-derived → getSolarSeasonByIndex | **Identity-state fallback.** Render: humanizeSolarAnchorType(undefined) → "Restricted Node Data". |
| **chronoImprintResolved** | resolveChronoImprintDisplay(birthDate, birthTime, birthLocation) | chronoImprintDisplay(birthTime) → "Limited Access" | **Content fallback.** Async resolution; failure → birthTime or "Limited Access". |
| **originCoordinatesDisplay** | birthContext → profile → storedReport | `"Restricted Node Data"` (render) | **Content fallback.** Three-tier; storedReport fallback added in prior audit. |
| **magneticFieldIndexDisplay** | storedReport only | `"Restricted Node Data"` (render) | **Content fallback.** No profile/birthContext path. |
| **climateSignatureDisplay** | storedReport only | `"Restricted Node Data"` (render) | **Content fallback.** |
| **sensoryFieldConditionsDisplay** | storedReport only | `"Restricted Node Data"` (render) | **Content fallback.** |

### Body Sections (Paid WHOIS)

| Field | Source Priority | Fallback Type | Notes |
|-------|-----------------|---------------|-------|
| **identityArchitectureBody** | parseSectionBody(full_report, 1) + parseSectionBody(2) | `"The registry identifies a stable identity structure arising within the total field of forces present at birth."` | **Content fallback.** Generic prose masks parse failure or empty sections. |
| **fieldConditionsBody** | storedReport.field_conditions_context → formatFieldConditionsContextForWhois | parseSectionRange(2–5) | `"Classification emerges from field conditions…"` (render) | **Content fallback.** Two sources; field_conditions_context preferred. Parse failure → s2to5 or generic render fallback. |
| **cosmicTwinBody** | parseSectionBody(11) | composeCosmicTwin({ dominantArchetype: archetypeClassification }) | **Identity-state fallback.** Composed from top-block archetype; can mask body/header mismatch. |
| **archetypeExpressionBody** | parseSectionBody(6) + parseSectionBody(7) | composeArchetypeSummary({ dominantArchetype }) | **Identity-state fallback.** Same as cosmicTwinBody. |
| **interpretiveNotesBody** | parseSectionRange(12–14) | `"Expanded interpretive sections ship with the complete registration report."` | **Content fallback.** Generic placeholder masks parse failure. |
| **civilizationalFunctionBody** | composeCivilizationalFunctionSection({ dominantArchetype }) | Always composed; no parse. | **Identity-state.** Uses archetypeClassification; fallback to Ignispectrum when archetype invalid. |
| **integrationNoteBody** | INTEGRATION_NOTE_DEFAULT (always set in buildPaidWhoisReport) | — | No parse; always default. |
| **vectorZeroAddendumBody** | storedReport.vector_zero ?? profile.vector_zero → formatVectorZeroThreeVoice | `"As an early registry participant…"` (long default paragraph) | **Content fallback.** Generic default masks missing three_voice. |

---

## 3. Fields Where Fallback Masks Upstream Failure

| Field | Danger | Reason |
|-------|--------|--------|
| **identityArchitectureBody** | High | Generic "The registry identifies a stable identity structure…" looks like real content. Parse failure or non-standard section format → user sees placeholder. |
| **cosmicTwinBody** | Medium | composeCosmicTwin uses top-block archetype. If body (s11) had different archetype, we replace with composed text. Mismatch hidden. |
| **archetypeExpressionBody** | Medium | Same as cosmicTwinBody. |
| **interpretiveNotesBody** | High | "Expanded interpretive sections ship with the complete registration report." is clearly placeholder but still masks parse failure. |
| **vectorZeroAddendumBody** | Medium | Long default paragraph; user may not realize three_voice was missing. |
| **fieldConditionsBody** | Medium | formatFieldConditionsContextForWhois vs s2to5: two sources. If both fail, no body set; render uses "Classification emerges from field conditions…" |
| **name** | Low | "—" is obviously placeholder. |
| **birthDate/Time/Location** | Low | "—" is obviously placeholder. |
| **solarSignature / archetypeClassification** | Medium | "—" when all fail; but date-derived path often succeeds, so wrong identity can look valid. |

---

## 4. Fallback Type Summary

| Type | Definition | Examples |
|------|------------|----------|
| **Formatting fallback** | Display transform when value present but needs formatting (e.g. date slice, number format). | created_at slice, formatSolarLongitudeDisplay |
| **Content fallback** | Substitute text when upstream value missing. User sees plausible or placeholder text. | "Restricted Node Data", "Limited Access", generic paragraphs |
| **Identity-state fallback** | Recomputed identity (archetype, solar segment) from secondary source (e.g. birth date) when primary (profile) missing. Can produce different identity than engine/body. | date-derived archetype, composeCosmicTwin, composeArchetypeSummary |

---

## 5. Multiple Sources — Potential Silent Conflict

| Field | Sources | Conflict Scenario |
|-------|---------|-------------------|
| **archetypeClassification** | profile.solarSeasonProfile.archetype, profile.dominantArchetype, date-derived | Profile has dominantArchetype A; solarSeasonProfile has archetype B; date yields C. Priority: solarProfile > dominantArchetype > date. If solarProfile present but wrong (stale), we show wrong archetype. |
| **cosmicTwinBody** | parseSectionBody(11) vs composeCosmicTwin(archetypeClassification) | Body (s11) says "Fluxionis"; top block says "Structoris". We use s11 when present. If s11 null, we compose from Structoris. So body can show Fluxionis while cosmicAnalogue (top) shows Structoris phenomenon. **Explicit mismatch** when both rendered. |
| **fieldConditionsBody** | storedReport.field_conditions_context vs parseSectionRange(2–5) | field_conditions_context is structured; s2to5 is raw full_report. Different content. Prefer field_conditions_context; fallback to s2to5. No conflict if only one present. |
| **originCoordinatesDisplay** | birthContext, profile, storedReport | Three-tier. If birthContext has wrong coords (e.g. wrong geocode), we use it over correct storedReport. birthContext is param; rarely passed in buildPaidWhoisReport. |

---

## 6. Concise Report: Field → Source Priority → Danger → Recommendation

| Field | Source Priority | Danger | Recommendation |
|-------|-----------------|--------|-----------------|
| registryId | computed | — | None. |
| registryStatus | constant | — | None. |
| created_at | storedReport | Low | None. |
| recordAuthority | constant | — | None. |
| name | params → profile | Low | "—" is explicit. Optional: log when profile.subjectName empty. |
| birthDate/Time/Location | params → profile | Low | Same as name. |
| solarSignature | profile.solarSeasonProfile → date | Medium | Identity-state fallback can diverge from engine. Document; consider logging when using date path. |
| archetypeClassification | profile.solarSeasonProfile → profile.dominantArchetype → date | Medium | Same as solarSignature. |
| cosmicAnalogue | derived from archetypeClassification | Medium | Follows archetype; no separate fix. |
| sunLongitudeDeg | profile → date | Low | Render shows "Limited Access" when null. |
| solarAnchorType | profile → date | Low | humanizeSolarAnchorType(undefined) → "Restricted Node Data". |
| chronoImprintResolved | async resolve | Low | chronoImprintDisplay fallback is acceptable. |
| originCoordinatesDisplay | birthContext → profile → storedReport | Low | Fixed. |
| magneticFieldIndexDisplay | storedReport | Low | "Restricted Node Data" when missing. |
| climateSignatureDisplay | storedReport | Low | Same. |
| sensoryFieldConditionsDisplay | storedReport | Low | Same. |
| identityArchitectureBody | parse(s1,s2) | **High** | Generic fallback masks parse failure. Consider: log when parse returns null; or use distinct placeholder (e.g. "[Section not available]"). |
| fieldConditionsBody | field_conditions_context → parse(s2–5) | Medium | Two sources; fallback is generic. |
| cosmicTwinBody | parse(s11) → composeCosmicTwin | Medium | Composed fallback uses top-block archetype; can hide body/top mismatch. |
| archetypeExpressionBody | parse(s6,s7) → composeArchetypeSummary | Medium | Same. |
| interpretiveNotesBody | parse(s12–14) | **High** | Generic placeholder masks parse failure. |
| civilizationalFunctionBody | composeCivilizationalFunctionSection | Low | Always composed; no parse. |
| integrationNoteBody | constant | — | None. |
| vectorZeroAddendumBody | vector_zero.three_voice | Medium | Long default masks missing three_voice. |

---

## 7. High-Risk Masking Summary

**Narrowly scoped, high-risk masking:**

1. **identityArchitectureBody** — When parseSectionBody returns null for s1 and s2, user sees "The registry identifies a stable identity structure…" which looks like real report content. **Recommendation:** Log when s1 and s2 are both null; optionally use a distinct placeholder (e.g. "[Identity Architecture section not available]") so failures are visible.

2. **interpretiveNotesBody** — When parseSectionRange(12–14) returns null, user sees "Expanded interpretive sections ship with the complete registration report." **Recommendation:** Same as above: log parse failure; consider distinct placeholder.

**No narrowly scoped refactor recommended** for other fields without evidence of real failures. Current fallbacks are acceptable for most cases; the main risk is parse failure being invisible.

---

## 8. Safety Fix Implemented (2026-03-16)

**identityArchitectureBody** and **interpretiveNotesBody** now use explicit placeholders when parse fails:

- `[Identity Architecture section unavailable]` — when s1 and s2 both null or combined empty after trim
- `[Interpretive Notes section unavailable]` — when s12to14 null

**Logging:** `log("warn", "paid_whois_section_parse_fallback", { reportId, requestId, section, reason })` when placeholder is used.

**Files:** `lib/free-whois-report.ts`, `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts`
