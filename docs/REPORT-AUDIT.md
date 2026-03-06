# Report Implementation Audit

**Purpose:** Audit the current report implementation so the next repair/refinement pass can be directed precisely. No changes to the report yet.

**Date:** 2026-03-05

---

## 1. Current Report Route(s)

| Route | Method | Purpose |
|-------|--------|---------|
| **`/api/report/[reportId]`** | GET | Returns stored LIGS report: `full_report`, `emotional_snippet`, `image_prompts`, `vector_zero`. Reads from Blob (`ligs-reports/{reportId}.json`) or in-memory store. 404 when not found. |
| **`/api/report/previews`** | GET | Returns `previewCards` for blob-stored reports (summary, subjectName, emotionalSnippet, imageUrls). Used by landing/preview grids. |
| **`/api/report/debug`** | GET | Dev-only. Returns storage type, blob pathnames or in-memory report IDs, test pattern. |
| **`/api/beauty/[reportId]`** | GET | Returns Beauty Profile (BeautyProfileV1) for view page. For `exemplar-{archetype}`: loads exemplar manifest from Blob, returns synthetic profile (no full_report). For real reportId: loads from `ligs-beauty/{reportId}.json`, enriches with image URLs from Blob. |

**Key distinction:** The raw 14-section LIGS report lives in `ligs-reports/`. The user-facing Beauty Profile (condensed fullReport, light_signature, archetype, etc.) lives in `ligs-beauty/`. The view page consumes the Beauty Profile, not the raw report.

---

## 2. Data Flow: Intake/Purchase → Report Generation

```
Intake (OriginTerminalIntake / LightIdentityForm)
  → formData: { name, birthDate, birthTime, birthLocation, email }
  → submitToBeautySubmit(payload) or submitToBeautyDryRun(payload)
  → POST /api/engine (body: fullName, birthDate, birthTime, birthLocation, email)

/api/engine
  1. Validates body (validateEngineBody)
  2. POST /api/engine/generate (internal fetch)
  3. GET /api/report/{reportId} (fetch stored report)
  4. E.V.E. filter LLM: full_report → Beauty Profile (vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts)
  5. buildCondensedFullReport(beautyProfile) → fullReport string for BeautyProfileV1
  6. Image generation (3 slugs: vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field)
  7. saveBeautyProfileV1 → Blob ligs-beauty/{reportId}.json
  8. Returns reportId + full Beauty Profile to client

/api/engine/generate
  1. computeBirthContextForReport (geocode, timezone, sun/moon, solar season, cosmic analogue)
  2. LLM call: ENGINE_SPEC + birth context → full_report + emotional_snippet
  3. injectDeterministicBlocksIntoReport (BOUNDARY CONDITIONS, FIELD SOLUTION, LIGHT IDENTITY SUMMARY, RESOLUTION KEYS, ALLOWED CITATION KEYS)
  4. Three-voice validation + repair if needed
  5. Constraint gate (forbidden terms) + repair/redact if needed
  6. Report quality validation + repair if needed
  7. Vector Zero derivation LLM
  8. Image prompts LLM (2 prompts for report store)
  9. saveReportAndConfirm → Blob ligs-reports/{reportId}.json
  10. Returns reportId, full_report, emotional_snippet, vector_zero, image_prompts
```

**Purchase flow (when not WAITLIST_ONLY):**
- `prepurchaseBeautyDraft` → draft stored
- Stripe checkout → success → `verify-session` returns reportId
- Client redirects to `/beauty/view?reportId=...`
- View page fetches `GET /api/beauty/{reportId}` → Beauty Profile

---

## 3. Report Sections in Actual Output Order

**Raw LIGS report (14 sections, in full_report from engine/generate):**
1. INITIATION  
2. SPECTRAL ORIGIN  
3. TEMPORAL ENCODING  
4. GRAVITATIONAL PATTERNING  
5. DIRECTIONAL FIELD  
6. ARCHETYPE REVELATION  
7. ARCHETYPE MICRO-PROFILES (STRUCTURAL MODES)  
8. BEHAVIORAL EXPRESSION  
9. RELATIONAL FIELD  
10. ENVIRONMENTAL RESONANCE  
11. COSMOLOGY OVERLAY  
12. IDENTITY FIELD EQUATION  
13. LEGACY TRAJECTORY  
14. INTEGRATION  

**Deterministic blocks injected (after LLM, before storage):**
- `(L) BOUNDARY CONDITIONS` — at §2 (measured values: location, timezone, sun, moon, ecliptic)
- `(L) FIELD SOLUTION` — before §6 (solar season, cosmic analogue)
- `(L) LIGHT IDENTITY SUMMARY` — after §1 (archetype, solar season, cosmic analogue, wavelength bands, vector axes, coherence)
- `(L) RESOLUTION KEYS` — after LIGHT IDENTITY SUMMARY
- `(L) ALLOWED CITATION KEYS` — after RESOLUTION KEYS

**User-facing condensed report (buildCondensedFullReport):**
The 14-section report is **not** shown to the user. E.V.E. extracts four three-voice sections, and `buildCondensedFullReport` produces:

1. **Light Signature** (bridge: "How you shine when you're aligned.")
2. **Archetype** (bridge: "Your core pattern and how it presents.")
3. **Deviations** (bridge: "Where the pattern drifts under pressure.")
4. **Corrective Vector** (bridge: "How you return to center.")
5. **Key Moves** (archetype-specific phrase bank bullets, when archetype in LIGS_ARCHETYPES)

Each section: Signal / Ground / Reflection (or RAW SIGNAL / CUSTODIAN / ORACLE).

---

## 4. Where Archetype, Light Signature, and Supporting Visuals Are Assembled

| Element | Assembled In | Source |
|---------|--------------|--------|
| **Archetype** | E.V.E. filter extracts from full_report; `extractArchetypeFromReport` used for dominantArchetype | LLM (engine) + deterministic blocks (RESOLUTION KEYS) |
| **Light Signature** | E.V.E. filter extracts; `buildCondensedFullReport` formats | E.V.E. output (light_signature.raw_signal, custodian, oracle) |
| **Vector Zero** | Engine derives from report; E.V.E. can use or derive | Engine LLM (vector_zero) + E.V.E. |
| **Deviations, Corrective Vector** | E.V.E. filter extracts | E.V.E. output |
| **Imagery prompts** | E.V.E. generates 3 prompts (vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field) | E.V.E. output |
| **Images** | POST /api/image/generate (or compose for marketing card) | DALL·E 3 / compose pipeline; stored in Blob |
| **Exemplar card / share card / marketing card** | Image compose route; exemplar manifests from Blob | ligs-exemplars/{archetype}/{version}/ |

**Beauty view assembly:**
- `ArchetypeArtifactCard`: hero image + overlay + `ArtifactInfoPanel` (solar season, declination, polarity, anchor, cosmic analogue, etc.)
- `PreviewCarousel`: imageUrls (vector_zero, light_signature, final_beauty_field) or marketing/share cards
- `EmotionalSnippet`: emotionalSnippet from profile
- `FullReportAccordion`: fullReport (the condensed 4-section + Key Moves string)
- `ShareCard`: share card image, download, copy link

---

## 5. Placeholder vs Real

| Item | Placeholder | Real |
|------|-------------|------|
| **fullReport (condensed)** | DRY_RUN: E.V.E. fixture with generic three-voice strings. dry-run-preview: "[DRY RUN] Placeholder report for layout verification." | E.V.E. extraction from engine full_report → buildCondensedFullReport |
| **14-section raw report** | DRY_RUN: "[DRY RUN] Full report placeholder for {name}" (engine/generate) | LLM-generated, deterministic blocks injected |
| **Images** | PLACEHOLDER_SVG (gray rect + "Light Signature" text) when no Blob URL | Blob URLs from ligs-images/{reportId}/{slug}.png |
| **Exemplar view** | N/A | Exemplar manifest from ligs-exemplars; synthetic profile (no fullReport, no ThreeVoice cards) |
| **Archetype name** | FALLBACK_PRIMARY_ARCHETYPE ("Ignispectrum") when extraction fails | extractArchetypeFromReport or RESOLUTION KEYS |
| **ArtifactInfoPanel fields** | "—" when profile lacks solarSeasonProfile, birthContext, etc. | From profile.solarSeasonProfile, profile.birthContext |

---

## 6. Verbose, Broken, or Off-Brand

**Verbose / redundant:**
- **14-section spec vs 4-section display:** The engine produces 14 sections; the user sees only 4 (Light Signature, Archetype, Deviations, Corrective Vector). The raw report is never shown. E.V.E. condenses; some nuance may be lost.
- **Bridge lines** in buildCondensedFullReport ("How you shine when you're aligned.", etc.) add copy; may feel repetitive with section content.
- **Key Moves** block: archetype phrase bank; can feel list-like if not woven.

**Potentially broken:**
- **Exemplar profiles:** `GET /api/beauty/exemplar-Ignispectrum` returns synthetic profile with `imageUrls`, `emotionalSnippet`, `dominantArchetype` but **no** `fullReport`, `light_signature`, `archetype`, `deviations`, `corrective_vector`. BeautyViewClient checks `hasMajorFields` (light_signature, vector_zero, fullReport, isExemplar); exemplars set `isExemplar: true` so they pass, but ThreeVoice cards and FullReportAccordion would show empty/undefined.
- **BeautyViewClient DRY_RUN_PLACEHOLDER:** Uses "—" for all three-voice fields; FullReportAccordion shows placeholder fullReport string. Works for layout verification only.

**Off-brand / tone:**
- **E.V.E. CUSTODIAN rule:** "MUST include one sentence starting 'In practice…'" and "You tend to…" — can feel formulaic.
- **ORACLE:** "MUST include one concrete moment image" — may force unnatural metaphor.
- **Forbidden terms** (chakra, Kabbalah, etc.) are enforced; no evidence of drift in current outputs.
- **ENGINE_SPEC** forbids "suggests", "may indicate", "you are", "your type" — good. ORACLE allows "often", "tends to".

---

## 7. What Must Be Fixed First

**Priority 1 — Exemplar view completeness**
- Exemplar routes (`/beauty/view?reportId=exemplar-Ignispectrum`) return no fullReport and no three-voice sections. The view page may render empty cards or fallbacks. Either:
  - Add synthetic three-voice content to exemplar manifests, or
  - Add a dedicated exemplar fullReport template (e.g. from marketing descriptor + archetype), or
  - Clearly treat exemplars as "image-only" and hide FullReportAccordion / ThreeVoice when isExemplar.

**Priority 2 — Report repair pipeline**
- Validation + repair already exist (reportValidators, threeVoiceValidation, constraintGate). If outputs still show generic ORACLE, repetition, or missing citations, the repair prompts may need tightening.
- Section intent map (ENGINE_SPEC) is detailed; LLM compliance varies. Consider stronger few-shot or structured output.

**Priority 3 — Condensed report quality**
- buildCondensedFullReport produces 4 sections + Key Moves. If E.V.E. extraction is thin or generic, the user-facing report will be thin. E.V.E. prompt (EVE_FILTER_SPEC) and archetype voice injection are levers.

**Priority 4 — Full 14-section visibility (optional)**
- Currently the raw 14-section report is stored but never shown. If product wants "View full report" as expandable 14-section text, that would require a new UI path and possibly a different formatting pass.

---

## 8. File Reference

| File | Role |
|------|------|
| `lib/engine-spec.ts` | ENGINE_SPEC (14 sections, rules, constraints) |
| `lib/engine/deterministic-blocks.ts` | BOUNDARY CONDITIONS, FIELD SOLUTION, LIGHT IDENTITY SUMMARY, RESOLUTION KEYS, ALLOWED CITATION KEYS |
| `lib/engine/reportValidators.ts` | validateReport, buildReportRepairPrompt, hasDeterministicAnchors, extractCanonicalRegimeFromReport |
| `lib/engine/threeVoiceValidation.ts` | validateThreeVoiceSections, buildThreeVoiceRepairPrompt |
| `lib/engine/constraintGate.ts` | scanForbidden, redactForbidden |
| `lib/eve-spec.ts` | EVE_FILTER_SPEC, buildCondensedFullReport, buildBeautyProfile |
| `app/api/engine/generate/route.ts` | Report generation, deterministic injection, validation, repair, storage |
| `app/api/engine/route.ts` | E.V.E. filter, buildCondensedFullReport, image gen, Beauty Profile save |
| `app/api/beauty/[reportId]/route.ts` | Beauty Profile fetch, exemplar synthetic profile |
| `app/beauty/view/BeautyViewClient.jsx` | View page, profile load, ArchetypeArtifactCard, FullReportAccordion |
| `app/beauty/view/FullReportAccordion.jsx` | Renders fullReport string in `<pre>` |
| `components/ArchetypeArtifactCard.jsx` | Hero image, overlay, ArtifactInfoPanel |
| `lib/beauty-profile-schema.ts` | BeautyProfileV1 interface |

---

*End of audit. Use this to direct the next report repair and refinement pass.*
