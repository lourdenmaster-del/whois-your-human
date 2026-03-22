# Paid WHOIS Top Block vs Body Mismatch — Read-Only Audit

**Scope:** Why the same rendered paid WHOIS report shows **Structoris / Early-Winter / cosmic web filaments** in the top block but **Fluxionis / accretion disk / spiral flow** in the body, and what legacy/debug content is leaking into the body.

**No code was modified.** This document only inspects and reports.

---

## 1. Which exact fields in the top WHOIS block come from where

The **top WHOIS block** (Human WHOIS Registry Record + IDENTITY PHYSICS — GENESIS METADATA) is built entirely in **`buildPaidWhoisReport`** in `lib/free-whois-report.ts`. Sources:

| Field | Source |
|-------|--------|
| **Registry ID, Status, Created Date, Record Authority** | Generated in `buildPaidWhoisReport`: `generateLirId(seed)`, `"Registered"`, `storedReport.createdAt`, `"LIGS Human Identity Registry"`. |
| **Subject Name** | `profile.subjectName` (BeautyProfileV1). |
| **Birth Date / Time / Location** | Params override or `profile.birthDate`, `profile.birthTime`, `profile.birthLocation` (BeautyProfileV1). |
| **Chrono-Imprint** | `resolveChronoImprintDisplay(birthDate, birthTime, birthLocation)` when all three present; else `chronoImprintDisplay(report.birthTime)`. |
| **Origin Coordinates** | `birthContext` param or `profile.originCoordinatesDisplay` (BeautyProfileV1). |
| **Solar Segment** | (1) If `profile.solarSeasonProfile` exists: `CANONICAL_SOLAR_SEGMENT_NAMES[solarProfile.seasonIndex]` and `solarProfile.archetype`. (2) Else if `birthDateStr` is a valid date: `approximateSunLongitudeFromDate(birthDate)` → season index and `getPrimaryArchetypeFromSolarLongitude(lon)` → **solarSegmentName** and **archetypeClassification**. |
| **Archetype Classification** | Same as Solar Segment: from `profile.solarSeasonProfile.archetype` or from `getPrimaryArchetypeFromSolarLongitude(lon)` when derived from birth date. |
| **Cosmic Twin** | `getCosmicAnalogue(archetypeClassification).phenomenon` (so follows archetype above). |
| **Light Signature** | `profile.light_signature?.raw_signal` (BeautyProfileV1). |
| **Solar Light Vector, Seasonal Context, Solar Anchor Type, etc.** | Same solar resolution path: `sunLongitudeDeg`, `solarAnchorType`, `seasonalPolarity` from `solarSeasonProfile` or from date-based computation. |

**Conclusion:** For a **dry-run–generated** profile, `BeautyProfileV1` has **no `solarSeasonProfile`** (dry-run builder in `app/api/beauty/dry-run/route.ts` does not set it). So the top block uses the **birth-date–only path**: `approximateSunLongitudeFromDate("1990-01-15")` → ~296.92° → season index 10 (Early-Winter), `getPrimaryArchetypeFromSolarLongitude(296.92)` → **Structoris**, and `getCosmicAnalogue("Structoris")` → **cosmic web filaments**. All top-block identity fields are therefore **profile + paid WHOIS builder logic**; none come from the stored `full_report` text.

---

## 2. Which exact body sections are pulled from StoredReport.full_report parsing

In `buildPaidWhoisReport`, after building the report object, the following are taken from **parsed** `storedReport.full_report` via `parseSectionBody` / `parseSectionRange`:

| Body section (paid WHOIS) | Parsed from full_report | Fallback when null/empty |
|---------------------------|-------------------------|---------------------------|
| **IDENTITY ARCHITECTURE** | Sections **1** and **2** combined (`s1`, `s2`) → `report.identityArchitectureBody` | "The registry identifies a stable identity structure…" |
| **FIELD CONDITIONS** | Sections **2–5** (`s2to5`) → `report.fieldConditionsBody` | "Classification emerges from field conditions…" |
| **COSMIC TWIN RELATION** | Section **11** (`s11`) → `report.cosmicTwinBody` | `composeCosmicTwin({ dominantArchetype })` (uses top-block archetype) |
| **ARCHETYPE EXPRESSION** | Sections **6** and **7** (`s6`, `s7`) → `report.archetypeExpressionBody` | `composeArchetypeSummary({ dominantArchetype })` (uses top-block archetype) |
| **INTERPRETIVE NOTES** | Sections **12–14** (`s12to14`) → `report.interpretiveNotesBody` | "Interpretive notes are held on the registry node…" |
| **Vector Zero addendum** | Not from section parsing; from `storedReport.vector_zero ?? profile.vector_zero` → `formatVectorZeroThreeVoice(three_voice)` → `report.vectorZeroAddendumBody`. | Default Vector Zero paragraph. |

Section boundaries are defined by the regex in `lib/free-whois-report.ts`: `/(?:\n|^)(\s*)(\d+)\.\s*([^\n]+)/g` — i.e. lines like `1. INITIATION`, `2. SPECTRAL ORIGIN`, etc. The **content** of each section is everything after that heading until the next section. So for a dry-run report, the **entire** content of sections 1–2, 2–5, 6–7, 11, and 12–14 (including all injected blocks) becomes the body text. That includes every **(L)** block and **"Field reference: (L) resolved as …"** line that was injected into `full_report` by the engine.

---

## 3. Why dry-run full_report contains Fluxionis while the top block resolves to Structoris

- **Engine dry-run path** (`app/api/engine/generate/route.ts`, `dryRun === true`):
  - Builds a placeholder `fullReport` string (sections 1–14, no archetype in the template text).
  - Gets `birthContext` from either:
    - **Success path:** `computeBirthContextForReport(birthDate, birthLocation, birthTime)` (real solar profile), or
    - **Fallback (e.g. dev, geocoding failure):** `STUDIO_FALLBACK_BIRTH_CONTEXT`, which **hardcodes** `sunLonDeg: 295` and `solarSeasonProfile: { seasonIndex: 11, archetype: "Fluxionis", lonCenterDeg: 345, … }`.
  - Calls `injectDeterministicBlocksIntoReport(fullReport, { birthContext, vectorZero })`. That uses `getSolarProfileFromContext(birthContext)` → for the fallback, **Fluxionis** (index 11). So all **(L)** blocks and **"Field reference: (L) resolved as Fluxionis…"** are injected with **Fluxionis** and **accretion disk / spiral flow**.
  - Saves **that** `full_report` (with Fluxionis in the body) to the report store. The dry-run **BeautyProfileV1** builder does **not** persist `solarSeasonProfile` (or any solar data).

- **buildPaidWhoisReport** for that same reportId:
  - Loads the same stored report (so `full_report` still contains Fluxionis in the injected blocks) and the profile (no `solarSeasonProfile`).
  - **Top block:** Because `profile.solarSeasonProfile` is null, it uses **only** `birthDateStr` ("1990-01-15") → `approximateSunLongitudeFromDate("1990-01-15")` → ~296.92°. Longitude 296.92° falls in **Structoris** (270°–300°) and in segment index **10** (Early-Winter) with the +15° shift. So **archetypeClassification = Structoris**, **solarSignature = Early-Winter**, **cosmicAnalogue = cosmic web filaments**.
  - **Body:** Uses parsed sections from that same `full_report` → all the **(L)** blocks and anchor lines still say **Fluxionis** and **accretion disk / spiral flow**.

So:

- **Top block:** Derived from **birth date only** in the paid WHOIS builder (profile has no solar data).
- **Body:** Copied from **engine-generated full_report**, which was built with **birthContext** that (in the observed case) used the **STUDIO_FALLBACK** with **Fluxionis** (index 11). 295° in real astronomy is Structoris band (270–300°); the fallback’s index 11 / Fluxionis is inconsistent with that longitude.

Result: **Two different sources of truth** — engine injects using one (fallback) archetype; paid WHOIS recomputes from date and gets another. The dry-run path is **mixing** placeholder/mock report text (with Fluxionis) and real profile-derived WHOIS fields (Structoris from date).

---

## 4. Is the dry-run path mixing placeholder report text and real profile-derived WHOIS fields?

**Yes.**

- **Real / profile-derived in paid WHOIS:**
  - Top block: name, birth date/time/location, Chrono-Imprint (when resolved), Solar Segment, Archetype Classification, Cosmic Twin, Light Signature, Genesis metadata — all from `BeautyProfileV1` and/or date-based logic in `buildPaidWhoisReport`.
- **Placeholder / mock from stored report:**
  - Full report body sections 1–2, 2–5, 6–7, 11, 12–14 are the **raw** content of `storedReport.full_report`, which for dry-run is the **engine dry-run placeholder** plus **injected (L) blocks**. So the body is:
    - Placeholder narrative (e.g. "RAW SIGNAL / CUSTODIAN / ORACLE" boilerplate),
    - **(L)** blocks (LIGHT IDENTITY SUMMARY, RESOLUTION KEYS, ALLOWED CITATION KEYS, BOUNDARY CONDITIONS, FIELD SOLUTION) built from **engine** `birthContext`/vectorZero (Fluxionis in the fallback case),
    - "Field reference: (L) resolved as Fluxionis with Vector Zero coherence 0.85." repeated in sections 2–14,
    - And the literal line "(Set DRY_RUN=0 or remove the env var to generate real reports.)".

So the same document shows **Structoris** in the header and **Fluxionis** (and instructions to turn off DRY_RUN) in the body.

---

## 5. Legacy debug / engine debris leaking into the paid WHOIS body

All of the following appear **inside** the parsed section bodies and therefore in the rendered paid WHOIS (HTML and plain text):

| Debris | Where it comes from | In paid WHOIS section |
|--------|---------------------|-------------------------|
| **------------------------------------------------------------** | `lib/engine/deterministic-blocks.ts` block wrappers | All (L) blocks |
| **(L) LIGHT IDENTITY SUMMARY** (with Archetype, Solar season, Cosmic analogue, Wavelength bands, Vector Zero axes, Coherence score) | `buildLightIdentitySummaryBlock` injected after §1 | identityArchitectureBody (s1+s2) |
| **(L) RESOLUTION KEYS — cite these in RAW SIGNAL bullets** (Regime, Solar season, Cosmic analogue, Coherence, Vector Zero axes) | `buildResolutionKeysBlock` injected after §1 | identityArchitectureBody |
| **(L) ALLOWED CITATION KEYS — RAW SIGNAL [key=value] MUST use ONLY these keys** (ENVIRONMENT, SOLAR STRUCTURE, FIELD RESOLUTION, "Each RAW SIGNAL bullet must end…") | `buildAllowedCitationKeysBlock` injected after §1 | identityArchitectureBody |
| **(L) BOUNDARY CONDITIONS — measured values (no interpretation)** (Location, Coordinates, Timezone, Local/UTC, Sun, Moon, ecliptic) | `buildBoundaryConditionsBlock` injected at start of §2 | identityArchitectureBody (s2), fieldConditionsBody (s2–5) |
| **(L) FIELD SOLUTION — resolved regime** (Solar season, Cosmic analogue) | `buildFieldSolutionBlock` injected before §6 | fieldConditionsBody (s2–5) |
| **Field reference: (L) resolved as {Archetype} with Vector Zero coherence {score}.** | Injected at start of sections 2–14 by `injectDeterministicBlocksIntoReport` | identityArchitectureBody, fieldConditionsBody, cosmicTwinBody, archetypeExpressionBody, interpretiveNotesBody |
| **(Set DRY_RUN=0 or remove the env var to generate real reports.)** | Hardcoded at end of dry-run template in `app/api/engine/generate/route.ts` | interpretiveNotesBody (s12–14) |

So the paid WHOIS body currently includes **validator/debug scaffolding** (citation keys, resolution keys, boundary conditions, field solution) and **DRY_RUN instructions**, all of which are engine/authoring aids, not user-facing registry content.

---

## 6. Safest fix so the paid WHOIS body does not show mismatched identity content

**Goal:** One consistent identity (same archetype/segment/cosmic twin) in both top block and body, and no engine/debug debris in the paid WHOIS.

**Options:**

- **A. Strip (L) blocks and DRY_RUN line from parsed bodies before rendering**  
  - **Where:** In `lib/free-whois-report.ts`, when setting `identityArchitectureBody`, `fieldConditionsBody`, `cosmicTwinBody`, `archetypeExpressionBody`, `interpretiveNotesBody` from parsed sections, run a sanitizer that removes:
    - Blocks between `------------------------------------------------------------` and the next same delimiter (or line starting with `(L) …` through the closing `------------------------------------------------------------`),
    - Lines matching `Field reference: \(L\) resolved as .+\.`,
    - The exact line `(Set DRY_RUN=0 or remove the env var to generate real reports.)`.
  - **Risk:** Medium. Regex/string stripping must be robust so live (non–dry-run) reports are not broken; section boundaries and multi-line blocks need careful handling. Benefit: **all** reports (dry-run and live) get a cleaner body; body content may become very short for dry-run (mostly generic RAW/CUSTODIAN/ORACLE lines).

- **B. For dry-run reports, do not use parsed full_report bodies in paid WHOIS**  
  - **How:** Detect dry-run report (e.g. `storedReport.full_report?.startsWith("[DRY RUN]")` or a dedicated flag if you add one). When true, **do not** set `identityArchitectureBody`, `fieldConditionsBody`, `cosmicTwinBody`, `archetypeExpressionBody`, `interpretiveNotesBody` from parsing; leave them unset so the renderer uses the **fallback** paragraphs, which are driven by `report.archetypeClassification` and `report.cosmicAnalogue` (i.e. top-block values).  
  - **Where:** `lib/free-whois-report.ts`, inside `buildPaidWhoisReport`, guard the block that does `parseSectionBody`/`parseSectionRange` and assigns to `report.identityArchitectureBody` etc.  
  - **Risk:** Low. Dry-run reports then show consistent Structoris/Early-Winter/cosmic web filaments in both top and body; live reports unchanged. Only dry-run body becomes generic (fallback) text.

- **C. Both: strip debris everywhere and, for dry-run, skip parsed bodies**  
  - Strip (L) blocks and DRY_RUN line for **live** reports so the body is authoring content only.  
  - For **dry-run**, skip parsed bodies (so body = fallbacks, consistent with top block) and optionally still strip if any dry-run content is ever reused.  
  - **Risk:** Low for dry-run; medium for live (same as A for stripping).

**Recommendation:** **B** as the **smallest, safest** first step: when building paid WHOIS for a report whose `full_report` starts with `"[DRY RUN]"`, do not populate the paid body from parsed sections; use only the existing fallbacks. That removes the mismatch and the DRY_RUN line from the body for dry-run without touching live reports or adding stripping logic. Optionally add **A** later so live reports (and any future reuse of dry-run text) also drop (L) and debug lines.

---

## 7. Concrete recommendation with file names and risk

| Action | File(s) | Change | Risk |
|--------|--------|--------|------|
| **Recommended (minimal):** For dry-run reports, skip using parsed `full_report` for paid WHOIS body sections. | `lib/free-whois-report.ts` | In `buildPaidWhoisReport`, before calling `parseSectionBody`/`parseSectionRange` and assigning to `identityArchitectureBody`, `fieldConditionsBody`, `cosmicTwinBody`, `archetypeExpressionBody`, `interpretiveNotesBody`, check if `(storedReport.full_report ?? "").trimStart().startsWith("[DRY RUN]")`. If true, skip the whole parse-and-assign block so all five body fields stay unset and the renderer uses fallbacks (which use `report.archetypeClassification` and `report.cosmicAnalogue`). | **Low**: Only affects reports with a dry-run placeholder; top block and body become consistent; no change to live reports. |
| **Optional (later):** Strip (L) blocks, "Field reference: (L)…", and DRY_RUN line from parsed section text before assigning to `report.*Body`. | `lib/free-whois-report.ts` | Add a helper e.g. `stripEngineDebrisFromSectionBody(text: string): string` that removes the known patterns; call it on each parsed section result before assigning to the report. | **Medium**: Must not break live report content; needs tests for both dry-run and live. |

**Summary:** The top block is correct (profile + date-derived Structoris/Early-Winter). The body is wrong because it is the raw engine dry-run placeholder plus injected Fluxionis blocks. The safest fix is to **stop using parsed full_report bodies for dry-run reports** in `buildPaidWhoisReport` so the body uses the same identity as the top block and no debug/DRY_RUN text appears. Optionally add stripping of (L) and DRY_RUN for all reports in a second step.
