# LIGS Lockdown Snapshot

**Baseline reference for the approved system state.** This document records the current working configuration. Future changes should preserve this baseline unless explicitly approved.

**Last locked:** 2026-03-06

---

## 1. /origin behavior

- **Entry:** `/origin` is the canonical public landing (middleware rewrites `/` to it).
- **Component:** `OriginTerminalIntake` — terminal-style sequential intake.
- **Flow:** Boot sequence → Human WHOIS query → name → date (with confirm) → time → place → email → processing → CTA or waitlist.
- **WAITLIST_ONLY (default):** When `NEXT_PUBLIC_WAITLIST_ONLY` is not `"0"`:
  - No CTA button after processing.
  - Auto-call waitlist API on success.
  - Terminal lines: "Identity query logged.", "Waitlist registration complete.", "Email recorded: [email]", "Sample identity artifacts available.", "Press ENTER to view sample records."
  - Phase `completeAwaitingEnterRedirect`; Enter → redirect to `/beauty/view?reportId=exemplar-Ignispectrum`.
- **Non-waitlist:** CTA button for purchase/Stripe when `ctaVisible && !WAITLIST_ONLY`.
- **Back link:** "← Back to Origin" (href /origin).

---

## 2. Sample/exemplar path

- **Sample reportId:** `exemplar-Ignispectrum` — fixed redirect target from /origin when WAITLIST_ONLY.
- **Route:** `/beauty/view?reportId=exemplar-Ignispectrum`.
- **API:** GET `/api/beauty/[reportId]` — when `reportId.startsWith("exemplar-")`, archetype = `Ignispectrum` (or other).
- **Ignis sample:** Uses `IGNIS_V1_ARTIFACTS` only; never v2 (poster-like). Load v1 manifest directly (bypass PREFERRED).
- **Synthetic data:** `buildExemplarBackfill`, `buildExemplarSyntheticSections`, `buildExemplarFullReport` from `lib/exemplar-synthetic.ts` — deterministic, no LLM.
- **Label:** "Sample Identity Record" for exemplars; "Your Light Identity Report" for real reports.
- **Glyph overlay:** `showGlyphOverlay` and `glyphOverlayForIgnis` when `profile.isExemplar && profile.dominantArchetype === "Ignispectrum"`.

---

## 3. Real report layout/order

**BeautyViewClient** renders in this order:

1. Back + Paid notice
2. Header + EmotionalSnippet
3. **HUMAN WHOIS RECORD** (Registry: LIGS Identity Network)
4. **REGISTRY SUMMARY** (real reports only; exemplars skip)
5. **Field Conditions & Resolved Identity** (WhoisReportSections, sections="identity")
6. **Archetype Artifact** (hero + ArtifactInfoPanel)
7. **Report interpretation** (WhoisReportSections, sections="interpretation" — deviations + Return to Coherence)
8. **Identity Artifacts** (PreviewCarousel)
9. **Share Card**
10. Start Over + footer

---

## 4. WHOIS fields currently shown

From `buildArtifactsFromProfile` + BeautyViewClient `whoisFields`:

| Label        | Source                                      |
|-------------|---------------------------------------------|
| Record ID   | `profile.reportId`                          |
| Status      | "Sample" (exemplar) or "Active" (real)     |
| Subject     | `artifacts.subjectName`                     |
| Archetype   | `artifacts.archetype`                       |
| Solar Season| `artifacts.solarSeason`                      |
| Declination | `artifacts.declination`                     |
| Anchor Type | `artifacts.anchor`                          |
| Cosmic Analogue | `artifacts.cosmicAnalogue`              |
| Color Family| `artifacts.colorFamily`                     |
| Texture Bias| `artifacts.textureBias`                     |

Rows with empty/`—` values are filtered out (`hasValue`).

---

## 5. Registry Summary behavior

- **Component:** `RegistrySummary.jsx` — compact bridge between WHOIS and interpretation.
- **Renders:** Only for real reports (`profile.isExemplar` → return null).
- **Structure:** Answers (1) What regime resolved? (2) What stabilizes/destabilizes the field? (3) Return to coherence.
- **Data sources:** `profile.dominantArchetype`, `profile.corrective_vector`, `profile.deviations`, Key Moves from `profile.fullReport`.
- **Styling:** `beauty-form-card`, `border-l-4 border-[#7A4FFF]/60`, `space-y-2`.
- **Sanitization:** All lines pass `sanitizeForDisplay`.

---

## 6. Subject-name anchoring invariant

- **Rule:** INITIATION must contain the **full birth anchoring sentence** (name + location + date + "was born in" + "Earth rotated beneath").
- **Module:** `lib/engine/initiation-anchor.ts` — `fullBirthAnchorPresentInInitiation`, `subjectNamePresentInInitiation`, `injectBirthAnchoringSentence`.
- **Engine route:** Early injection immediately after `fullReport = reportData.full_report`; if missing and subjectInput present, inject deterministically; on failure return 500.
- **Fallback:** Post-repair pass uses same `injectInitiationAnchor`; on failure return 500 with logging.
- **Validation:** `validateSingleSubject` uses `fullBirthAnchorPresentInInitiation` as primary check; no partial name-only acceptance.
- **Canonical sentence:** "When {name} was born in {location} on {date}, the Earth rotated beneath a specific configuration of solar radiation, gravitational geometry, lunar illumination, and atmospheric conditions."

---

## 7. Ignis sample asset wiring

- **Source:** `IGNIS_V1_ARTIFACTS` in `lib/exemplar-store.ts` — v1 base path.
- **URLs:** `vectorZero`, `lightSignature`, `finalBeautyField` (marketing_background, light_signature, share_card).
- **API:** `/api/beauty/[reportId]` for `exemplar-Ignispectrum` loads v1 manifest directly; uses `IGNIS_V1_ARTIFACTS` when manifest missing.
- **Glyph:** `public/glyphs/ignis.svg` (canonical); `ignis_mark.svg` for proof overlay.
- **Overlay:** ArchetypeArtifactCard `showGlyphOverlay`; PreviewCarousel `glyphOverlayForIgnis` — only when Ignis exemplar.

---

## 8. Studio readiness / no automatic generation rule

- **LigsStudio:** Internal tool at `/ligs-studio` — control room for image generation, compose, full pipeline.
- **No auto-generation:** Cursor/agents must NOT trigger engine, image, or exemplar generation automatically. Studio is the control room; generation is explicit user action.
- **Dry Run:** When `DRY_RUN=1` or `NEXT_PUBLIC_PROOF_ONLY=1`, generation is simulated; Save buttons disabled.
- **Live Test:** POST `/api/dev/live-once` for end-to-end verification — explicit call only.

---

## Critical risks (blockers only)

These would block use. Not minor polish.

| Risk | Status | Notes |
|------|--------|-------|
| Broken routes | None observed | /origin, /beauty/view, /api/beauty/[reportId] functional |
| Missing Ignis v1 assets | Possible | IGNIS_V1_ARTIFACTS points to Blob paths; if Blob empty, exemplar-Ignispectrum may show placeholders |
| Failed report rendering | Mitigated | DRY_RUN placeholder; deduplicateFieldReference, sanitizeForDisplay in place |
| Failed subject-name anchoring | Mitigated | Early injection + fallback; 500 on failure with logging |
| Broken Studio entry | None observed | /ligs-studio loads; no auto-generation |
| Accidental auto-generation | Mitigated | Studio requires explicit user action; Cursor/agents should not trigger generation |

**Note:** If `IGNIS_V1_ARTIFACTS` Blob paths are empty (e.g. fresh deploy), the sample page will show placeholder SVGs until exemplar pack is generated via POST `/api/exemplars/generate` (LIVE mode).

---

## Files to preserve (do not refactor without approval)

- `app/origin/page.jsx`, `app/origin/layout.jsx`
- `app/beauty/BeautyLandingClient.jsx`
- `components/LandingPreviews.jsx`
- `components/OriginTerminalIntake.jsx`
- `app/beauty/view/BeautyViewClient.jsx`
- `app/beauty/view/RegistrySummary.jsx`
- `app/beauty/view/WhoisReportSections.jsx`
- `lib/engine/initiation-anchor.ts`
- `lib/beauty-report-presentation.js`
- `app/api/beauty/[reportId]/route.ts`
- `components/ArchetypeArtifactCard.jsx` (buildArtifactsFromProfile)

---

## Related docs

- `SYSTEM_SNAPSHOT.md` — full stack reference
- `.cursor/rules/landing-lock.mdc` — landing page lock
- `.cursor/rules/ligs-master.mdc` — LIGS task rules
- `.cursor/rules/glyph-law.mdc` — glyph geometry
