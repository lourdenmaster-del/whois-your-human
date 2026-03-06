# LIGS Report System → WHOIS-Style Identity Record Mapping

**Read-only structural mapping.** No code changes. Verifies existing data sources against a WHOIS-style identity record schema.

---

## PART 1 — WHOIS Field Set (Conceptual)

| Category | Field |
|----------|-------|
| **Registry** | Registry |
| | Record ID |
| | Status |
| | Generated Timestamp |
| **Subject** | Subject |
| | Birth Date |
| | Birth Time |
| | Birth Location |
| **Archetype** | Archetype |
| | Solar Season |
| | Declination |
| | Anchor Type |
| | Cosmic Analogue |
| **Vector Baseline** | Vector Baseline |
| | Color Family |
| | Texture Bias |
| **Interpretive Report** | Light Signature |
| | Archetype Expression |
| | Field Deviations |
| | Corrective Vector |
| | Key Moves |
| **Artifacts** | Image Artifacts |

---

## PART 2 — Mapping Table

| WHOIS Field | Code Field | Produced In | Stored In | API Route | Render Component | Status |
|-------------|------------|-------------|-----------|-----------|------------------|--------|
| **Registry** | Static "LIGS Identity Network" | — | — | — | BeautyViewClient (WHOIS block) | **Present** |
| **Record ID** | `profile.reportId` | Engine route | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | BeautyViewClient, ArchetypeArtifactCard, ArtifactInfoPanel | **Present** |
| **Status** | Derived: `profile.isExemplar ? "Sample" : "Active"` | — | — | — | BeautyViewClient (WHOIS block) | **Present** |
| **Generated Timestamp** | `profile.timings?.createdAt` | — | — | — | buildArtifactsFromProfile (dateTime) | **Missing** |
| **Subject** | `profile.subjectName` | Engine route (fullName) | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | BeautyViewClient (Identity Registry), ArtifactInfoPanel | **Present** |
| **Birth Date** | — | Engine input (birthData.birthDate) | Not stored in Beauty Profile | — | — | **Missing** |
| **Birth Time** | — | Engine input (birthData.birthTime) | Not stored in Beauty Profile | — | — | **Missing** |
| **Birth Location** | — | Engine input (birthData.birthLocation) | Not stored in Beauty Profile | — | buildArtifactsFromProfile uses `profile.birthLocation` but field not persisted | **Missing** |
| **Archetype** | `profile.dominantArchetype` | Engine route (extractArchetypeFromReport) | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | BeautyViewClient, ArchetypeArtifactCard, ArtifactInfoPanel | **Present** |
| **Solar Season** | `profile.solarSeasonProfile` → `getSolarSeasonByIndex` | Engine route (getSolarSeasonProfile from birthContext) | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | buildArtifactsFromProfile → ArtifactInfoPanel, BeautyViewClient (Identity Registry) | **Present** |
| **Declination** | `profile.solarSeasonProfile.solarDeclinationDeg` | Engine route | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | buildArtifactsFromProfile → ArtifactInfoPanel, BeautyViewClient | **Present** |
| **Anchor Type** | `getSolarSeasonByIndex(sp.seasonIndex).anchorType` | Derived from solarSeasonProfile | — | — | buildArtifactsFromProfile → ArtifactInfoPanel, BeautyViewClient | **Derivable** |
| **Cosmic Analogue** | `getCosmicAnalogue(archetype).phenomenon` | `src/ligs/cosmology/cosmicAnalogues.ts` | Not stored (deterministic from archetype) | — | buildArtifactsFromProfile → ArtifactInfoPanel, BeautyViewClient | **Derivable** |
| **Vector Baseline** | `profile.vector_zero.beauty_baseline` | E.V.E. filter / engine Vector Zero | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | ArtifactInfoPanel (colorFamily, textureBias) | **Present** |
| **Color Family** | `profile.vector_zero.beauty_baseline.color_family` | E.V.E. / Vector Zero | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | ArtifactInfoPanel, BeautyViewClient (Identity Registry) | **Present** |
| **Texture Bias** | `profile.vector_zero.beauty_baseline.texture_bias` | E.V.E. / Vector Zero | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | ArtifactInfoPanel, BeautyViewClient (Identity Registry) | **Present** |
| **Light Signature** | `profile.light_signature` (ThreeVoice) | E.V.E. filter | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | FullReportAccordion (parsed from fullReport) | **Present** |
| **Archetype Expression** | `profile.archetype` (ThreeVoice) | E.V.E. filter | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | FullReportAccordion | **Present** |
| **Field Deviations** | `profile.deviations` (ThreeVoice) | E.V.E. filter | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | FullReportAccordion | **Present** |
| **Corrective Vector** | `profile.corrective_vector` (ThreeVoice) | E.V.E. filter | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | FullReportAccordion | **Present** |
| **Key Moves** | Parsed from `profile.fullReport` (buildCondensedFullReport) | E.V.E. filter (buildCondensedFullReport) | `ligs-beauty/{reportId}.json` | GET `/api/beauty/[reportId]` | FullReportAccordion | **Present** |
| **Image Artifacts** | `profile.imageUrls`, `profile.marketingCardUrl`, `profile.shareCardUrl` | Image generation routes | Blob (see Part 4) | GET `/api/beauty/[reportId]` (enriches from Blob) | PreviewCarousel, ShareCard | **Present** |

---

## PART 3 — Gap Classification

### A) Already present in the system
- Registry (static)
- Record ID
- Status (derived)
- Subject
- Archetype
- Solar Season
- Declination
- Color Family
- Texture Bias
- Vector Baseline (beauty_baseline)
- Light Signature, Archetype Expression, Field Deviations, Corrective Vector, Key Moves
- Image Artifacts (URLs)

### B) Derivable from existing mappings
- **Anchor Type** — from `solarSeasonProfile.seasonIndex` → `getSolarSeasonByIndex(seasonIndex).anchorType`
- **Cosmic Analogue** — from `dominantArchetype` → `getCosmicAnalogue(archetype).phenomenon`

### C) Not currently stored
- **Generated Timestamp** — `timings` has `totalMs`, `engineMs`, `reportFetchMs`, `beautyFilterMs`; no `createdAt`. `buildArtifactsFromProfile` references `profile.timings?.createdAt` but it is never set.
- **Birth Date** — used in engine flow, not persisted to Beauty Profile
- **Birth Time** — used in engine flow, not persisted to Beauty Profile
- **Birth Location** — used in engine flow; `buildArtifactsFromProfile` uses `profile.birthLocation` but BeautyProfileV1 does not include it. `placeName` exists in birthContext but birthContext is not stored in the profile.

---

## PART 4 — Image Artifacts Mapping

| WHOIS Concept | Slug / Key | Generation Route | Blob Storage Path | Render Component |
|---------------|------------|-------------------|-------------------|------------------|
| **Vector Zero** | `vector_zero_beauty_field` | POST `/api/generate-image` (engine route) | `ligs-images/{reportId}/vector_zero_beauty_field.png` | PreviewCarousel (imageUrls[0]) |
| **Light Signature** | `light_signature_aesthetic_field` | POST `/api/generate-image` (engine route) | `ligs-images/{reportId}/light_signature_aesthetic_field.png` | PreviewCarousel (imageUrls[1]) |
| **Final Beauty Field** | `final_beauty_field` | POST `/api/generate-image` (engine route) | `ligs-images/{reportId}/final_beauty_field.png` | PreviewCarousel (imageUrls[2]) |
| **Share Card** | `share_card` | POST `/api/image/generate` (purpose share_card) | `ligs-images/{reportId}/share_card.png` | ShareCard |
| **Marketing Card** | `marketing_card` | POST `/api/image/compose` (bg + logo + overlay) | `ligs-images/{reportId}/marketing_card.png` | (Marketing block removed from report page) |
| **Exemplar Card** | `exemplar_card` | POST `/api/exemplars/generate` or `/api/exemplars/save` | `ligs-exemplars/{archetype}/{version}/exemplar_card.png` | PreviewCarousel (exemplar view), LandingPreviews |

**Additional marketing assets (not WHOIS core):**
- `marketing_background` — POST `/api/image/generate` → `ligs-images/{reportId}/marketing_background.png`
- `logo_mark` — POST `/api/image/generate` → `ligs-images/{reportId}/logo_mark.png`

---

## PART 5 — Report Consistency Check

### Does the system already contain enough data to support a WHOIS report?

**Yes.** The core WHOIS identity record fields are present or derivable:

- **Registry, Record ID, Status** — Present (static or from profile)
- **Subject, Archetype, Solar Season, Declination, Anchor Type, Cosmic Analogue** — Present or derivable
- **Color Family, Texture Bias** — Present (vector_zero.beauty_baseline)
- **Interpretive report sections** — Present (Light Signature, Archetype, Field Deviations, Corrective Vector, Key Moves)
- **Image artifacts** — Present (imageUrls, shareCardUrl, etc.)

### Which fields are missing?

1. **Generated Timestamp** — `timings.createdAt` is never set; schema has `totalMs`, `engineMs`, etc. only.
2. **Birth Date** — Not stored in Beauty Profile.
3. **Birth Time** — Not stored in Beauty Profile.
4. **Birth Location** — Not stored in Beauty Profile (used only during pipeline).

### Which fields are present but not displayed?

- **Birth Date / Time / Location** — Not stored, so cannot be displayed. If they were added to the profile, they could be shown in the Identity Registry Fields.
- **Generated Timestamp** — Referenced in `buildArtifactsFromProfile` as `dateTime` from `profile.timings?.createdAt`, but that field is never populated, so it renders as "—".
- **Vector Zero three_voice** — Stored in `profile.vector_zero.three_voice` but not rendered as a separate section; only beauty_baseline (color_family, texture_bias) is shown in the artifact panel.
- **shape_bias, motion_bias** — In `beauty_baseline`; ArtifactInfoPanel shows colorFamily and textureBias only; shape/motion not displayed in WHOIS block.

---

## Summary

| Status | Count | Fields |
|--------|-------|--------|
| **Present** | 18 | Registry, Record ID, Status, Subject, Archetype, Solar Season, Declination, Color Family, Texture Bias, Vector Baseline, Light Signature, Archetype Expression, Field Deviations, Corrective Vector, Key Moves, Image Artifacts |
| **Derivable** | 2 | Anchor Type, Cosmic Analogue |
| **Missing** | 4 | Generated Timestamp, Birth Date, Birth Time, Birth Location |

The LIGS report system **already supports a WHOIS-style identity record** for the core identity and interpretive content. The main gaps are birth context (date, time, location) and a generation timestamp, which are used in the pipeline but not persisted to the Beauty Profile.
