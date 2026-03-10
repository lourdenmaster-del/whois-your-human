# Implementation Plan: WHOIS Dossier-Style Report Document

**Purpose:** Convert the final report page from a dark step-sequenced presentation into a continuous Human WHOIS / registry-style document that appears after the reveal sequence. Planning only — no code changes in this step.

**Date:** 2026-03-10

---

## 1. Approach: Modify Existing vs New Component

**Recommendation: Add a new dedicated report-document component rendered after the reveal.**

| Option | Pros | Cons |
|--------|------|------|
| **Modify InteractiveReportSequence** | Single component to maintain. | Large behavioral change (step-by-step → scrollable document) in one place; higher risk of regressions; harder to roll back; mixes two UX modes. |
| **New component (recommended)** | Clear separation of concerns; existing flow untouched; easy rollback (swap back to InteractiveReportSequence); can share data layer only. | One extra component and one swap in BeautyViewClient. |

**Conclusion:** Introduce a new component (e.g. `ReportDocument.jsx` or `WhoisReportDocument.jsx`) that renders the dossier-style layout. After the reveal (and for real reports), `BeautyViewClient` renders this component instead of `InteractiveReportSequence`. Leave `InteractiveReportSequence` in the codebase unused (or behind a feature flag) until the new document is verified; then optionally remove or repurpose it.

---

## 2. Reuse of Existing Content

### 2.1 `lib/report-composition.ts`

**Reuse as-is.** No changes required.

- `composeArchetypeOpening(profile, config)` → registry “Archetype classification” / opening line.
- `composeArchetypeSummary(profile)` → Archetype summary section (+ optional `config.teaser.archetypalVoice`).
- `composeLightExpression(profile)` → Light expression section.
- `composeCosmicTwin(profile)` → Cosmic twin relation section.
- `composeReturnToCoherence(profile)` → Closing / return-to-coherence section.

Same profile shape; same return types (string arrays). The new document will call these and render the returned lines as paragraph blocks.

### 2.2 `buildIgnisSteps()` (InteractiveReportSequence.jsx)

**Reuse the data it produces; optionally extract a shared data function.**

- **Option A:** New component calls `buildIgnisSteps(profile)` (export it or move to a shared module) and iterates over the steps: for each step, render a document section (title + lines + artifact when `hasImage`). No change to step sequencing or ContinuePrompt; we only consume the same section titles, lines, and image props.
- **Option B:** Extract a pure function, e.g. `getReportSections(profile)`, that returns the same structure (array of { title, lines, hasImage, imageSrc, baselineImage, … }). `buildIgnisSteps` and the new document both use it. Single source of truth for section structure.

**Recommendation:** Option A for minimal change: export `buildIgnisSteps` from `InteractiveReportSequence.jsx` (or move it to a small `lib/report-sections.js`), and have the new document import it and render each step as a continuous section. Option B can follow if we want to refactor InteractiveReportSequence later.

### 2.3 `ReportStep.jsx`

**Reuse `ArtifactReveal` only** for the artifact figure block.

- **ArtifactReveal:** Keep using it for the single “artifact figure” section: same props (imageSrc, baselineImage, lightSignatureImage, finalArtifactImage, archetypeImagePath, useArcFamilyOverlay, displayName, humanExpression). Either export `ArtifactReveal` from `ReportStep.jsx` and import it in the new document, or move `ArtifactReveal` to a shared file (e.g. `app/beauty/view/ArtifactReveal.jsx`) and use it from both ReportStep and the new document.
- **Step wrapper, ContinuePrompt, “Press ENTER to continue”:** Do not reuse for the document; the document has no step-by-step advance. Section title + lines can be rendered with simple markup (e.g. `<h2>` + `<p>`s) in the new component, using the same `title` and `lines` from the step data.

---

## 3. Files to Change or Add

| File | Action |
|------|--------|
| **New:** `app/beauty/view/ReportDocument.jsx` (or `WhoisReportDocument.jsx`) | Add. Implements the dossier-style layout: registry header, sections (archetype classification, summary, light expression, cosmic twin, artifact figure, return to coherence), footer nav. Uses report-composition, buildIgnisSteps (or getReportSections), and ArtifactReveal. |
| **Change:** `app/beauty/view/BeautyViewClient.jsx` | After reveal (and for real reports), render the new report document component instead of `<InteractiveReportSequence profile={profile} />`. No change to data loading or PreviewRevealSequence. |
| **Optional change:** `app/beauty/view/InteractiveReportSequence.jsx` | Export `buildIgnisSteps` or move it to `lib/report-sections.js` so the new document can import it. If we keep buildIgnisSteps in place, the new document can import from InteractiveReportSequence or from a shared module. |
| **Optional change:** `app/beauty/view/ReportStep.jsx` | Export `ArtifactReveal` (if not already) so ReportDocument can import it; or extract ArtifactReveal to `app/beauty/view/ArtifactReveal.jsx` and use from both. |
| **Change:** `app/globals.css` | Add classes for the document layout if needed (e.g. `.whois-document`, `.whois-document-section`, `.registry-document-header`, `.registry-metadata-block`), or reuse/adapt existing `.registry-view`, `.registry-whois-block` from the dossier/audit. Prefer reusing dossier-like styles for consistency. |
| **No change** | `lib/report-composition.ts`, `PreviewRevealSequence.jsx`, `app/beauty/view/page.jsx`, `app/api/beauty/[reportId]/route.ts`, data fetching, or profile shape. |

---

## 4. Proposed Document Structure

Use the same content sources as the current report; only the layout and presentation change from step-by-step to continuous.

| Section | Content source | Notes |
|---------|----------------|--------|
| **Registry header / metadata block** | Title: “LIGS HUMAN IDENTITY DOSSIER” (or “Human WHOIS Registry Record”). Metadata: Registry ID (LIR-ID from `generateLirId(profile.reportId)` in `src/ligs/marketing/identity-spec.ts`), Subject (`profile.subjectName`), Primary Archetype (`profile.dominantArchetype`). Birth timestamp / location if present on profile or from saved intake; otherwise omit or “—”. | Match dossier-style block: bordered, mono labels, clear key/value. |
| **Archetype classification** | `composeArchetypeOpening(profile, config)`. Single line or short block. Section heading e.g. “Archetype classification” or “Identity resolution”. | Same as current “ARCHETYPE RESOLVED” content. |
| **Archetype summary** | `composeArchetypeSummary(profile)` plus optional `getArchetypePreviewConfig(arch).teaser.archetypalVoice`. Section heading “Archetype summary”. | Same as current step 2. |
| **Light expression** | `composeLightExpression(profile)`. Section heading “Light expression”. | Same as current step 3. |
| **Cosmic twin relation** | `composeCosmicTwin(profile)`. Section heading “Cosmic twin relation”. | Same as current step 4. |
| **Artifact figure block** | One figure: base image = `finalArtifactImage ?? lightSignatureImage ?? baselineImage` (i.e. `profile.imageUrls[2]` then `[1]` then `[0]`), optional archetype overlay, caption “Identity artifact resolved.” Use ArtifactReveal or same structure. Section heading “Identity artifact” or “Artifact”. | Same assets and logic as current ARTIFACT REVEAL step; no step advance. |
| **Return to coherence / closing** | `composeReturnToCoherence(profile)`. Section heading “Return to coherence”. | Same as current step 6. |
| **Footer** | “Human WHOIS protocol” label; links: “← Return to Origin” (`/origin`), “View Dossier” (`/dossier`). Same copy and behavior as current report footer. | Preserve exactly. |

Section numbering (e.g. SECTION I–VI) can mirror the static dossier page for consistency, or use the shorter headings above; the plan does not depend on numbering.

---

## 5. What Must Be Preserved

| Requirement | How |
|-------------|-----|
| **Return to Origin** | Render the same “← Return to Origin” link (`href="/origin"`) in the new document’s footer, with the same protocol-nav styling (e.g. 11px monospace, gray/hover). |
| **View Dossier** | Same: “View Dossier” (`href="/dossier"`) in the same footer block. |
| **Current reveal sequence** | Do not change `PreviewRevealSequence` or when it runs. `BeautyViewClient` continues to show it for exemplars; on complete it will render the new ReportDocument instead of InteractiveReportSequence. |
| **Current report data sources** | Same `profile` from `GET /api/beauty/[reportId]`. Same use of `lib/report-composition.ts` and of the step/section data (buildIgnisSteps or getReportSections). No API or schema changes. |

---

## 6. Safest Implementation Path (Recommended Order)

1. **Add the new component only (no swap yet).**
   - Create `ReportDocument.jsx` (or `WhoisReportDocument.jsx`) that:
     - Accepts `profile` prop.
     - Uses composition functions and buildIgnisSteps (or shared getReportSections) to get section data.
     - Renders: registry header (with LIR-ID from `generateLirId(profile.reportId)`), each section as a continuous block (heading + lines), ArtifactReveal for the artifact step, closing section, then footer with “Human WHOIS protocol”, “← Return to Origin”, “View Dossier”.
     - Uses dossier-like layout (e.g. white or light background, max-width article, bordered registry block, section headings) to match Human WHOIS aesthetic.
   - Export `ArtifactReveal` from ReportStep (or extract to shared file) and use it in the new document.
   - Export `buildIgnisSteps` from InteractiveReportSequence (or move to `lib/report-sections.js`) and call it from ReportDocument to get section titles, lines, and image props.

2. **Wire document behind a flag (optional but safest).**
   - In `BeautyViewClient`, add a way to choose between InteractiveReportSequence and ReportDocument (e.g. `useDocumentReport` from URL param or env). Default to current behavior (InteractiveReportSequence) so production is unchanged until the flag is enabled.

3. **Add minimal CSS.**
   - Reuse existing registry/dossier patterns where possible; add only what’s needed for the new document layout (e.g. `.whois-document`, section spacing, metadata block).

4. **Switch default to the new document.**
   - When satisfied (e.g. after local and preview verification), change BeautyViewClient so that after reveal (and for real reports) it always renders ReportDocument. Remove or keep the flag for quick rollback.

5. **Decommission or repurpose InteractiveReportSequence.**
   - Once the document is the only report view, leave InteractiveReportSequence in the repo but unused, or remove it. No change to PreviewRevealSequence or data fetching.

**Risk mitigation:** No changes to report-composition, API, or profile shape. No changes to PreviewRevealSequence. Single point of change for “what renders after the reveal” is BeautyViewClient. Rollback = render InteractiveReportSequence again.

---

*End of implementation plan. No code has been modified.*
