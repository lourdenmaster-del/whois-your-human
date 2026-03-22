# WHOIS Report Canon Audit — Read-Only Forensic Map

**Scope:** Complete map of existing WHOIS report canon, data flow, and source-of-truth resolution. No code changes. No proposed fixes.

**Date:** 2026-03-19

---

## A. Existing Canon by Section

### 1. Archetype Resolution

| Item | Value |
|------|-------|
| **Section name** | Archetype Classification (top block) |
| **Authoritative files** | `src/ligs/image/triangulatePrompt.ts` (`getPrimaryArchetypeFromSolarLongitude`), `src/ligs/astronomy/solarSeason.ts` (`SOLAR_SEASONS`, `getSolarSeasonByIndex`), `src/ligs/archetypes/contract.ts` (`LIGS_ARCHETYPES`) |
| **Authoritative functions** | `getPrimaryArchetypeFromSolarLongitude(sunLonDeg)` — 12 equal 30° segments, 0° = vernal equinox; `Math.min(Math.floor(normalized / 30), 11)` → `LIGS_ARCHETYPES[index]` |
| **Canonical intent** | Archetype is the structural regime resolved from solar longitude at birth. 12 archetypes in fixed order. |
| **Type** | Canonically derived from sun longitude |
| **Runtime path (free)** | `buildFreeWhoisReport`: `approximateSunLongitudeFromDate(birthDate)` → `getPrimaryArchetypeFromSolarLongitude(lon)`; fallback `preview_archetype` when birthDate missing |
| **Runtime path (paid)** | `buildPaidWhoisReport`: `profile.solarSeasonProfile` → `solarProfile.archetype`; else `profile.dominantArchetype`; else `approximateSunLongitudeFromDate(birthDateStr)` → `getPrimaryArchetypeFromSolarLongitude` |
| **Notes** | `SOLAR_SEASONS` in `solarSeason.ts` maps index → archetype; same 12 archetypes. `triangulatePrompt` uses `LIGS_ARCHETYPES[index]` directly. |

---

### 2. Solar Segment / solarSeasonProfile

| Item | Value |
|------|-------|
| **Section name** | Solar Segment (Seasonal Context) |
| **Authoritative files** | `lib/free-whois-report.ts` (`CANONICAL_SOLAR_SEGMENT_NAMES`), `src/ligs/astronomy/solarSeason.ts` (`SOLAR_SEASONS`, `getSolarSeasonProfile`, `getSolarSeasonByIndex`) |
| **Authoritative functions** | `getSolarSeasonProfile({ sunLonDeg, latitudeDeg, date, sunAltitudeDeg?, dayLengthMinutes?, twilightPhase? })`; index = `Math.min(Math.floor(normalized / 30), 11)` |
| **Canonical intent** | 12 equal 30° segments with boundaries shifted +15° so equinox/solstice names are centered. Index = `floor(((lon % 360 + 360) % 360 + 15) % 360 / 30)`. |
| **Type** | Canonically derived; stored in `solarSeasonProfile` when engine/computeBirthContext produces it |
| **Runtime path (free)** | `approximateSunLongitudeFromDate` → `(normalized + 15) % 360` → `seasonIndex = floor(shifted / 30)` → `CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex]` |
| **Runtime path (paid)** | `profile.solarSeasonProfile` → `getSolarSeasonByIndex(profile.seasonIndex)` → `CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex]`; else date-derived same as free |
| **Notes** | **Drift:** Free path uses `(normalized + 15) % 360` for segment names; `getSolarSeasonProfile` uses `Math.floor(normalized / 30)` (no +15). Different formulas can yield different segment indices for boundary values. `buildPaidWhoisReport` uses `solarProfile.seasonIndex` directly when profile has it. |

---

### 3. Civilizational Function / Placement

| Item | Value |
|------|-------|
| **Section name** | CIVILIZATIONAL FUNCTION |
| **Authoritative files** | `src/ligs/voice/civilizationalFunction.ts` (`CIVILIZATIONAL_FUNCTION_MAP`, `getCivilizationalFunction`, `hasCivilizationalFunction`), `lib/report-composition.ts` (`composeCivilizationalFunctionSection`) |
| **Authoritative functions** | `getCivilizationalFunction(archetype)` returns `{ structuralFunction, contributionEnvironments, frictionEnvironments, civilizationalRole, integrationInsight }`; `hasCivilizationalFunction(arch)` true for all 12 `LIGS_ARCHETYPES` |
| **Canonical intent** | One authoritative record per LigsArchetype. No runtime generation; display only. "Every archetypal structure performs a role in the larger human system." |
| **Type** | Canonically derived from archetype |
| **Runtime path** | `buildPaidWhoisReport` always calls `composeCivilizationalFunctionSection({ dominantArchetype: archetypeClassification })`. When archetype unknown/invalid, `hasCivilizationalFunction` false → falls back to `"Ignispectrum"`. Never parsed from `full_report`. |
| **Notes** | All 12 archetypes have entries. No empty-string path in composer; always returns content (Ignispectrum when unknown). Render fallback `"[Civilizational Function section unavailable]"` when builder sets empty (defense-in-depth). |

---

### 4. Field Conditions

| Item | Value |
|------|-------|
| **Section name** | FIELD CONDITIONS |
| **Authoritative files** | `lib/report-store.ts` (`FieldConditionsContext`), `lib/free-whois-report.ts` (`formatFieldConditionsContextForWhois`), `lib/field-conditions/` (`resolveFieldConditionsForBirth`, `formatFieldDisplays`), `app/api/engine/generate/route.ts` (`buildFieldConditionsContext`) |
| **Authoritative functions** | `formatFieldConditionsContextForWhois(ctx)` — formats sun altitude, azimuth, sunrise, sunset, day length, moon phase, illumination, solar lon, anchor type into lines; `buildFieldConditionsContext(birthContext)` extracts from birthContext.sun, birthContext.moon, birthContext.solarSeasonProfile |
| **Canonical intent** | Physics at birth moment: sun/moon/solar season. Engine spec §2–5: SPECTRAL ORIGIN through DIRECTIONAL FIELD. |
| **Type** | Stored/persisted (`field_conditions_context` on StoredReport) when engine has birthContext; else parsed from `full_report` s2–5 |
| **Runtime path** | `buildPaidWhoisReport`: (1) `storedReport.field_conditions_context` → `formatFieldConditionsContextForWhois`; (2) else `parseSectionRange(fullReport, 2, 5)`; (3) else `"[Field Conditions section unavailable]"` |
| **Notes** | `resolveFieldConditionsForBirth` (GFZ Kp, Open-Meteo) produces `magneticFieldIndexDisplay`, `climateSignatureDisplay`, `sensoryFieldConditionsDisplay` — different from `field_conditions_context`. Genesis table uses those three; FIELD CONDITIONS body uses `field_conditions_context` or s2to5. |

---

### 5. Identity Architecture

| Item | Value |
|------|-------|
| **Section name** | IDENTITY ARCHITECTURE |
| **Authoritative files** | `lib/free-whois-report.ts` (`parseSectionBody`), `lib/report-composition.ts` (`composeArchetypeOpening`), `lib/archetype-preview-config.js` (`getArchetypePreviewConfig`), `src/ligs/archetypes/contract.ts` (`preview.humanExpression`, `displayName`) |
| **Authoritative functions** | `parseSectionBody(full_report, 1)` + `parseSectionBody(2)`; fallback composer: `composeArchetypeOpening(profile)` → `This identity operates as ${article}${humanExpression} within the ${displayName} regime.` |
| **Canonical intent** | Engine §1 INITIATION + §2 SPECTRAL ORIGIN. Composer canon: archetype contract `preview.humanExpression` (e.g. "The Architect" for Structoris). |
| **Type** | Parsed from full_report; composed fallback from archetype contract |
| **Runtime path** | `buildPaidWhoisReport`: s1 || s2 → combined trim; else `"[Identity Architecture section unavailable]"`. No composed fallback in builder; render uses same placeholder. |
| **Notes** | **Drift (PAID-WHOIS-BODY-CANON-AUDIT):** `composeArchetypeOpening` adds "the " before `humanExpression`; contract stores "The Architect" → "as the The Architect". Builder does NOT use composer for identityArchitectureBody; it only parses. Composer used elsewhere (e.g. TerminalResolutionSequence). |

---

### 6. Interpretive Notes

| Item | Value |
|------|-------|
| **Section name** | INTERPRETIVE NOTES |
| **Authoritative files** | `lib/free-whois-report.ts` (`parseSectionRange`), `lib/engine-spec.ts` (sections 12–14 intent: IDENTITY FIELD EQUATION, LEGACY TRAJECTORY, INTEGRATION) |
| **Authoritative functions** | `parseSectionRange(fullReport, 12, 14)` |
| **Canonical intent** | Engine §12–14: synthesis, persistence, integration. No reusable canon paragraph in repo. |
| **Type** | Parsed from full_report only; no composer |
| **Runtime path** | `buildPaidWhoisReport`: s12to14 → `interpretiveNotesBody`; else `"[Interpretive Notes section unavailable]"` |
| **Notes** | PAID-WHOIS-BODY-CANON-AUDIT: "No composition function. No reusable canon in repo." |

---

### 7. Cosmic Analogue / Cosmic Twin

| Item | Value |
|------|-------|
| **Section name** | Cosmic Twin (top block), COSMIC TWIN RELATION (body) |
| **Authoritative files** | `src/ligs/cosmology/cosmicAnalogues.ts` (`COSMIC_ANALOGUES`, `getCosmicAnalogue`), `lib/report-composition.ts` (`composeCosmicTwin`) |
| **Authoritative functions** | `getCosmicAnalogue(arch).phenomenon` for top block; `composeCosmicTwin({ dominantArchetype })` for body — uses `lightBehaviorKeywords`, fixed line "Each identity maps to a cosmic analogue…" |
| **Canonical intent** | Observational physics phenomena mapped to LIGS archetypes. One phenomenon per archetype. |
| **Type** | Canonically derived from archetype |
| **Runtime path** | Top block: `getCosmicAnalogue(archForCosmic).phenomenon`; archForCosmic = archetypeClassification or "Ignispectrum". Body: parse s11 → else `composeCosmicTwin({ dominantArchetype })`; render fallback `Cosmic Twin: ${report.cosmicAnalogue}` |
| **Notes** | PAID-WHOIS-BODY-CANON-AUDIT: "Using canon correctly." |

---

### 8. Vector Zero Addendum

| Item | Value |
|------|-------|
| **Section name** | OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO |
| **Authoritative files** | `lib/vector-zero.ts` (`VectorZero` type, `VECTOR_ZERO_SPEC`), `lib/free-whois-report.ts` (`formatVectorZeroThreeVoice`) |
| **Authoritative functions** | `formatVectorZeroThreeVoice(three_voice)` — joins `raw_signal`, `custodian`, `oracle` with `\n\n` when non-empty |
| **Canonical intent** | Vector Zero = unperturbed baseline of Light Signature. Three voices: raw_signal, custodian, oracle. Derived from report by LLM per VECTOR_ZERO_SPEC. |
| **Type** | Stored/persisted (`vector_zero` on StoredReport or BeautyProfile) |
| **Runtime path** | `buildPaidWhoisReport`: `v0 = storedReport.vector_zero ?? profile.vector_zero`; if `threeVoice` and `formatVectorZeroThreeVoice(threeVoice)` non-empty → `vectorZeroAddendumBody`. Else not set. Render: `"[Vector Zero addendum unavailable]"` when null/empty. |
| **Notes** | **Card vs full report:** `renderFreeWhoisCard` / `renderFreeWhoisCardText` use hardcoded "As an early registry participant, your WHOIS record has been expanded…" — different artifact, locked per SYSTEM_SNAPSHOT. Full report uses `vectorZeroAddendumBody` or explicit placeholder. |

---

### 9. Genesis Metadata / Origin Coordinates

| Item | Value |
|------|-------|
| **Section name** | Origin Coordinates, Magnetic Field Index, Climate Signature, Sensory Field Conditions |
| **Authoritative files** | `lib/engine/computeBirthContextForReport.ts`, `lib/free-whois-report.ts` (`formatOriginCoordinatesDisplay`), `lib/report-store.ts` (StoredReport fields), `lib/field-conditions/` |
| **Authoritative functions** | `formatOriginCoordinatesDisplay(birthContext)` — "PlaceName, lat°N/S, lon°E/W"; `resolveFieldConditionsForBirth` → GFZ Kp, Open-Meteo → formatters |
| **Canonical intent** | Origin Coordinates: geocoded place + lat/lon. Magnetic: Kp at birth. Climate: location+time weather. Sensory: day/night + weather. |
| **Type** | Stored/persisted; origin also from birthContext param |
| **Runtime path** | `buildPaidWhoisReport`: `originCoordinatesDisplay` = birthContext → profile → storedReport; `magneticFieldIndexDisplay`, `climateSignatureDisplay`, `sensoryFieldConditionsDisplay` = storedReport only. Render: "Restricted Node Data" when null. |
| **Notes** | LIGS-WHOIS-PIPELINE-AUDIT: `storedReport.originCoordinatesDisplay` fallback added so Studio dry-run path shows coords when engine persisted them. |

---

### 10. Archetype Expression

| Item | Value |
|------|-------|
| **Section name** | ARCHETYPE EXPRESSION |
| **Authoritative files** | `lib/report-composition.ts` (`composeArchetypeSummary`), `src/ligs/voice/archetypePhraseBank.ts` (`getArchetypePhraseBank` — `behavioralTells`, `relationalTells`) |
| **Authoritative functions** | `composeArchetypeSummary({ dominantArchetype })` → "In practice, you tend to [behavioral]." + "[Relational]." |
| **Canonical intent** | Phrase bank behavioral and relational tells. |
| **Type** | Parsed from s6+s7; composed fallback from phrase bank |
| **Runtime path** | `buildPaidWhoisReport`: s6||s7 → combined; else `composeArchetypeSummary`; render fallback `Archetype Classification: ${report.archetypeClassification}` |
| **Notes** | PAID-WHOIS-BODY-CANON-AUDIT: "Using canon correctly." |

---

### 11. Integration Note

| Item | Value |
|------|-------|
| **Section name** | INTEGRATION NOTE |
| **Authoritative files** | `lib/free-whois-report.ts` (`INTEGRATION_NOTE_DEFAULT`) |
| **Authoritative functions** | Constant string; always set in `buildPaidWhoisReport` |
| **Canonical intent** | Closing prose: "This registry record describes the physical and structural pattern…" |
| **Type** | Constant; always set |
| **Runtime path** | `report.integrationNoteBody = INTEGRATION_NOTE_DEFAULT`; render fallback same constant |
| **Notes** | No parse; no variation. |

---

## B. Source-of-Truth Map

| Field | Source Priority | Actual Winner | Conflicts |
|-------|-----------------|---------------|-----------|
| **registryId** | computed | `generateLirId(seed)` | — |
| **registryStatus** | constant | `"Registered"` | — |
| **created_at** | storedReport.createdAt | StoredReport | — |
| **recordAuthority** | constant | `"LIGS Human WHOIS Registry"` | — |
| **name** | params → profile.subjectName | params overrides profile | "—" when both empty |
| **birthDate/Time/Location** | params → profile | params override | "—" when empty |
| **solarSignature** | profile.solarSeasonProfile → date-derived | Profile when present; else date | Different formula (free +15 shift vs profile floor/30) |
| **archetypeClassification** | profile.solarSeasonProfile.archetype → profile.dominantArchetype → date | solarSeasonProfile > dominantArchetype > date | Can diverge from engine-injected body |
| **cosmicAnalogue** | getCosmicAnalogue(archetypeClassification) | Follows archetype | Ignispectrum when archetype "—" |
| **sunLongitudeDeg** | profile.solarSeasonProfile.lonCenterDeg → date | Profile > date | — |
| **solarAnchorType** | profile → getSolarSeasonByIndex → date | Same chain as solar | — |
| **chronoImprintResolved** | resolveChronoImprintDisplay(birthDate, birthTime, birthLocation) | Async; failure → birthTime or "Limited Access" | — |
| **originCoordinatesDisplay** | birthContext → profile → storedReport | birthContext > profile > storedReport | — |
| **magneticFieldIndexDisplay** | storedReport only | StoredReport | No profile/birthContext path |
| **climateSignatureDisplay** | storedReport only | StoredReport | Same |
| **sensoryFieldConditionsDisplay** | storedReport only | StoredReport | Same |
| **identityArchitectureBody** | parse(s1,s2) | Parsed full_report | Explicit placeholder when null |
| **fieldConditionsBody** | field_conditions_context → parse(s2–5) | field_conditions_context > s2to5 | Explicit placeholder when both null |
| **cosmicTwinBody** | parse(s11) → composeCosmicTwin | s11 when present | Composed uses top-block archetype |
| **archetypeExpressionBody** | parse(s6,s7) → composeArchetypeSummary | s6+s7 when present | Same |
| **civilizationalFunctionBody** | composeCivilizationalFunctionSection | Always composed | Ignispectrum when unknown archetype |
| **interpretiveNotesBody** | parse(s12–14) | Parsed only | Explicit placeholder when null |
| **integrationNoteBody** | INTEGRATION_NOTE_DEFAULT | Always set | — |
| **vectorZeroAddendumBody** | storedReport.vector_zero ?? profile.vector_zero | storedReport > profile | Set only when three_voice yields non-empty; else omitted |

---

## C. Documented Canon (from docs/comments)

| Source | Summary |
|--------|---------|
| `lib/free-whois-report.ts` header | "Solar Segment = canonical 12-part solar-physics season (sun longitude → segment index). Archetype Classification = archetype resolved from that segment. Cosmic analogue from that archetype." |
| `lib/free-whois-report.ts` CANONICAL_SOLAR_SEGMENT_NAMES | "12 equal 30° segments with boundaries shifted +15° so equinox/solstice names are centered on anchor points. Index = floor(((lon % 360 + 360) % 360 + 15) % 360 / 30)." |
| `src/ligs/voice/civilizationalFunction.ts` header | "Canonical civilizational function interpretation for WHOIS CIVILIZATIONAL FUNCTION section. One authoritative record per LigsArchetype. No runtime generation; display only." |
| `lib/vector-zero.ts` header | "Vector Zero: derived baseline state from the Light Signature. Not a new system or calculation pipeline — the unperturbed baseline before deviations." |
| `lib/engine-spec.ts` | 14-section structure, RAW SIGNAL → CUSTODIAN → ORACLE, allowed citation keys, archetype list, section intent map. |
| `docs/PAID-WHOIS-BODY-CANON-AUDIT.md` | Identity Architecture template bug ("the The"); FIELD CONDITIONS from cosmic/phrase bank; COSMIC TWIN and ARCHETYPE EXPRESSION use canon correctly; INTERPRETIVE NOTES has no canon. |
| `docs/BUILD-PAID-WHOIS-SOURCE-OF-TRUTH-AUDIT.md` | Full field→source priority; fallback types; high-risk masking; implemented placeholders for identityArchitectureBody, interpretiveNotesBody. |
| `docs/WHOIS-FIELD-GOVERNANCE-AUDIT.md` | No-blanks, no-fake-filler contract; placeholder constants; civilizationalFunctionBody and vectorZeroAddendumBody fixed. |
| `SYSTEM_SNAPSHOT.md` §0.7 | "WHOIS Human Registration Card… locked as stable… do not casually modify." |
| `lib/report-composition.ts` header | "Deterministic sentence assembly from profile data. Converts phrase-bank fragments into complete sentences. No repetition of archetype resolution or cosmic analogue." |

---

## D. Drift / Conflicts

| Location | Description |
|----------|-------------|
| **Solar segment index formula** | **Resolved 2026-03-19:** All call sites now use `getSolarSeasonIndexFromLongitude` = `floor(normalized / 30)`. |
| **Identity Architecture composer** | `composeArchetypeOpening` adds "the " before `humanExpression`; contract has "The Architect" → "as the The Architect". Builder does NOT use composer for identityArchitectureBody (parses only); composer used in TerminalResolutionSequence, etc. |
| **Profile vs storedReport for paid WHOIS** | `buildPaidWhoisReport` requires both `getReport` and `loadBeautyProfileV1`. Profile supplies name, birth fields, solarSeasonProfile, dominantArchetype, originCoordinatesDisplay, vector_zero. When profile lacks solarSeasonProfile (e.g. dry-run before fix), date-derived path used; can diverge from engine body. |
| **FIELD CONDITIONS: two bodies** | `field_conditions_context` (structured physics) vs `parseSectionRange(2,5)` (raw report text). Different content. field_conditions_context preferred. |
| **Vector Zero: card vs full report** | Card (`renderFreeWhoisCard`) uses hardcoded "As an early registry participant…" paragraph. Full report uses `vectorZeroAddendumBody` or `"[Vector Zero addendum unavailable]"`. Different artifacts. |
| **buildDryRunBeautyProfileV1** | Per LIGS-WHOIS-PIPELINE-AUDIT: did not set `originCoordinatesDisplay`, `solarSeasonProfile`, `dominantArchetype`. Engine dry-run now passes these; beauty/dry-run wires them. |

---

## E. Classification (from existing system)

| Field | Category |
|-------|----------|
| registryId, registryStatus, created_at, recordAuthority | Required (constant/computed) |
| name, birthDate, birthTime, birthLocation | User input (with "—" placeholder) |
| solarSignature, archetypeClassification, cosmicAnalogue | Required derived |
| sunLongitudeDeg, solarAnchorType, chronoImprintResolved | Optional (Limited Access / Restricted when missing) |
| originCoordinatesDisplay, magneticFieldIndexDisplay, climateSignatureDisplay, sensoryFieldConditionsDisplay | Optional (Restricted Node Data when missing) |
| identityArchitectureBody, fieldConditionsBody, interpretiveNotesBody | Required (paid); explicit placeholder when missing |
| cosmicTwinBody, archetypeExpressionBody | Required (paid); derived fallback from archetype when parse null |
| civilizationalFunctionBody | Required (paid); always composed (Ignispectrum fallback) |
| integrationNoteBody | Required (paid); always constant |
| vectorZeroAddendumBody | Optional (paid); omitted when three_voice empty; explicit placeholder in render |
| artifactImageUrl | Optional |

---

## F. Do-Not-Touch Zones

| Zone | Reason |
|------|--------|
| **renderFreeWhoisCard / renderFreeWhoisCardText** | Locked per SYSTEM_SNAPSHOT §0.7. "Do not casually modify." Vector Zero block uses hardcoded prose. |
| **CANONICAL_SOLAR_SEGMENT_NAMES** | Canonical 12 names; used by free and paid paths. |
| **CIVILIZATIONAL_FUNCTION_MAP** | One record per archetype; no generation. |
| **COSMIC_ANALOGUES** | Canonical phenomenon/description/keywords per archetype. |
| **SOLAR_SEASONS** | Canonical 12-season dataset; lonStart/lonEnd/lonCenter/archetype/anchorType. |
| **LIGS_ARCHETYPES** | Canonical 12 archetypes; order matters for solar mapping. |
| **INTEGRATION_NOTE_DEFAULT** | Single constant; always used. |
| **SECTION_HEADING_RE / parseSectionBody** | Parser expects `N. TITLE` format; engine spec mandates it. |
| **Engine spec 14-section structure** | Pipeline and validators depend on it. |
| **VECTOR_ZERO_SPEC** | LLM derives Vector Zero from report; structure fixed. |

---

## G. Solar Segment Index — Resolved (2026-03-19)

**Canonical formula:** `getSolarSeasonIndexFromLongitude(lon)` = `Math.min(Math.floor(normalized / 30), 11)` where `normalized = ((lon % 360) + 360) % 360`.

**Alignment applied:** All call sites now use `getSolarSeasonIndexFromLongitude` from `src/ligs/astronomy/solarSeason.ts`. The previous `(normalized + 15) % 360` formula in free-whois-report and agent whois was drift; it produced index mismatches at boundaries (e.g. lon=15° → index 1 vs SOLAR_SEASONS index 0).

**Files changed:** `solarSeason.ts`, `free-whois-report.ts`, `triangulatePrompt.ts`, `app/api/agent/whois/route.ts`, `app/api/waitlist/route.ts`, `lib/terminal-intake/resolveArchetypeFromDate.js`, `app/beauty/view/TerminalResolutionSequence.jsx`.
