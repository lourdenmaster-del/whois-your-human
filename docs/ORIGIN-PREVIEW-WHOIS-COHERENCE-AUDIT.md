# Origin Preview vs Free WHOIS Report — Coherence Audit (Read-Only)

**Purpose:** Identify the exact preview/report UI path for the local on-site screen after intake, compare it to the free WHOIS document/email renderer, and recommend minimal coherence with fewest moving parts. No code changes; audit only.

---

## 1. PREVIEW RENDER PATH

The on-site preview the user sees after intake is rendered **entirely inside a single file**:

| File | Role |
|------|------|
| **`components/OriginTerminalIntake.jsx`** | Only component responsible for the local preview. No other file renders the post-intake WHOIS-style UI. |

**Two distinct render regions:**

- **Above-fold (terminal reveal sequence)**  
  Rendered when `phase === "registryReveal"` (lines ~722–938). Sections appear in sequence controlled by `REVEAL_TIMING_MS` and local state (`showRegistry`, `showConfirmation`, `showArtifacts`, `showArchetypeExpression`, `showReportPreview`, `showCTA`).

- **Below-fold (#whois-preview)**  
  Rendered when `showCTA` is true (lines 963–1055). Single `<section id="whois-preview">` containing the “WHOIS HUMAN REGISTRATION REPORT” / “Preview Extract” and all analytical section blocks.

**Exact locations of the copy you asked about:**

| Copy | Location |
|------|----------|
| **"WHOIS HUMAN REGISTRY RECORD"** | (1) Line 761 — above-fold registry block header. (2) Line 1079 — phase `completeAwaitingEnterRedirect` minimal view. |
| **"REGISTRY EXTRACT — EXPANDED REPORT FIELDS"** | Line 899 — above-fold section header (inside `showReportPreview`). |
| **"WHOIS HUMAN REGISTRATION REPORT PREVIEW"** | Not present verbatim. The CTA link text is **"View Your WHOIS Registration Report Preview"** (line 933). The below-fold section title is **"WHOIS HUMAN REGISTRATION REPORT"** plus **"Preview Extract"** (lines 973–975). |

**Helper files that define preview section content (not order):**

- **`lib/archetype-preview-config.js`** — `getArchetypePreviewConfig(archetype).teaser` supplies `civilizationFunction` and `environments` used in the **Archetype Expression** block of the below-fold preview (lines 1007–1022) and in the above-fold Archetype Expression section (lines 871–882).
- **`components/OriginTerminalIntake.jsx`** — Inline `getArchetypeExpressionLines(archetype)` (lines 83–97) builds line1/line2 from that teaser for the above-fold Archetype Expression block.

No other helper defines section **order** or section **labels** for the preview; both are hardcoded in the JSX.

---

## 2. SEPARATE VS SHARED RENDERING

| Aspect | Free WHOIS (email/document) | On-site preview |
|--------|----------------------------|------------------|
| **Source of truth** | `lib/free-whois-report.ts`: `buildFreeWhoisReport()` + `renderFreeWhoisReport()` / `renderFreeWhoisReportText()` | `components/OriginTerminalIntake.jsx` only |
| **Uses `lib/free-whois-report.ts`?** | Yes. Email body is `renderFreeWhoisReport(report)` / `renderFreeWhoisReportText(report)` from `lib/email-waitlist-confirmation.ts`. | **No.** The preview never imports or calls `free-whois-report.ts`. |
| **Data** | Full `FreeWhoisReport` (registry fields, Genesis Metadata, cosmic twin, artifact URL, etc.). | Local state: `formData` (name, birthDate, birthLocation, birthTime), `registrySolarSignature` (from `data?.report?.solarSignature`), `archetypeForCompletion`, `previewTeaser` from `getArchetypePreviewConfig(archetypeForCompletion).teaser`. The API returns the full `report` in the waitlist response; the client **does not store it** — only `solarSignature` is extracted (line 679). |
| **Section/copy** | Section titles and body copy live inside `renderFreeWhoisReport` / `renderFreeWhoisReportText` (e.g. “IDENTITY PHYSICS — GENESIS METADATA”, “COSMIC TWIN RELATION”, row labels). | Section titles and body copy are **hardcoded in the JSX** in `OriginTerminalIntake.jsx` (e.g. “IDENTITY ARCHITECTURE”, “FIELD CONDITIONS”, “ARCHETYPE EXPRESSION”, “COSMIC TWIN RELATION”, “INTERPRETIVE NOTES”). |
| **Field definitions** | **Canonical** in `free-whois-report.ts`: record table rows, Genesis rows (Solar Light Vector, Seasonal Context, Solar Anchor Type, Chrono-Imprint, etc.), “Cosmic Twin” label, “° solar longitude”, “Inter-segment position” for anchor type `none`. | **Duplicated conceptually:** registry-style fields in the above-fold block (Subject Name, Birth Date, etc., Solar Segment, Archetype Classification) are written by hand; no Genesis Metadata block; Cosmic Twin copy says “cosmic analogue” in one place (line 1030) and uses “COSMIC TWIN RELATION” as heading but does not show the actual Cosmic Twin value. |

**Conclusion:** The preview uses a **separate section/copy system** and **duplicated field definitions**. It does **not** use `lib/free-whois-report.ts` for rendering; the only link is reading `data?.report?.solarSignature` from the same API response that was built with `buildFreeWhoisReport()`.

---

## 3. CURRENT PREVIEW SECTION ORDER

**Above-fold (terminal reveal), in DOM order:**

1. Terminal handshake line (“Identity registration complete.” etc.)
2. **WHOIS HUMAN REGISTRY RECORD** — Query, Registry, Registry Record, Subject Name, Birth Date, Birth Location, Birth Time, Solar Segment, Archetype Classification, Registry Status, Created Date, Record Authority, Registry Node
3. **Identity Registration Confirmation**
4. **Registry Artifacts** — Archetype Identity Mark, Archetype Field Visualization
5. **Archetype Expression** — Archetype Classification + line1/line2 or teaser/fallback
6. **Registry Extract — Expanded Report Fields** — short paragraph about full report
7. **CTA block** — NOTICE, “Official WHOIS Human Registration Report — Not Yet Released”, links (Return to Origin, View Your WHOIS Registration Report Preview)

**Below-fold (#whois-preview), in DOM order:**

1. **WHOIS HUMAN REGISTRATION REPORT** / **Preview Extract** — intro paragraph
2. **IDENTITY ARCHITECTURE** — two paragraphs (stable identity structure; pattern resolution)
3. **FIELD CONDITIONS** — two paragraphs (field conditions; expanded mapping in full report)
4. **ARCHETYPE EXPRESSION** — teaser/line1/line2 or fallback
5. **COSMIC TWIN RELATION** — single paragraph (“Connects the resolved regime to its cosmic analogue in the full report. No pairing is published in this extract.”)
6. **INTERPRETIVE NOTES** — two paragraphs (interpretive sections; extract closes)
7. Closing notice (provisionally registered; not yet released; notified when available)

**Free WHOIS (email / document) section order (from `lib/free-whois-report.ts`):**

1. REGISTRATION LOG (table)
2. Human WHOIS Registry Record (table: Subject Name, Birth Date, Birth Location, Birth Time, Solar Segment, Archetype Classification, **Cosmic Twin**)
3. **IDENTITY PHYSICS — GENESIS METADATA** (table: Solar Light Vector, Seasonal Context, Solar Anchor Type, Chrono-Imprint, Origin Coordinates, Magnetic Field Index, Climate Signature, Sensory Field Conditions)
4. “You now have access…” + artifact block
5. IDENTITY ARCHITECTURE
6. FIELD CONDITIONS
7. **COSMIC TWIN RELATION** (with actual Cosmic Twin value)
8. **ARCHETYPE EXPRESSION** (Archetype Classification)
9. INTERPRETIVE NOTES
10. Footer + Vector Zero addendum

So: the **preview** has no Genesis Metadata block, and its order is Identity Architecture → Field Conditions → Archetype Expression → Cosmic Twin → Interpretive Notes. The **free WHOIS** order is Registry Record → Genesis Metadata → artifact → Identity Architecture → Field Conditions → **Cosmic Twin → Archetype Expression** → Interpretive Notes.

---

## 4. MINIMAL COHERENCE PATH

Without changing business logic, the smallest safe way to make the preview coherent with the free WHOIS renderer is:

1. **Use the same conceptual order** in the below-fold preview as in the free WHOIS document:  
   **Registry Record** (already above-fold; below-fold can reference “registry record above”) → **Genesis Metadata** → **Cosmic Twin** → **Archetype Expression** → (then Identity Architecture, Field Conditions, Interpretive Notes if kept).

2. **Add a Genesis Metadata block** to the below-fold preview: same section title “IDENTITY PHYSICS — GENESIS METADATA” and the same row labels (Solar Light Vector, Seasonal Context, Solar Anchor Type, Chrono-Imprint, etc.) with values derived from the **same report object** the API already returns, so the preview can show “° solar longitude”, “Inter-segment position” for anchor type `none`, etc., without recomputing.

3. **Reorder below-fold sections** so that **Cosmic Twin** comes **before** **Archetype Expression**, and (optionally) place **Genesis Metadata** immediately after the intro (or after a short “registry record above” line) so the flow matches: Registry → Genesis → Cosmic Twin → Archetype Expression.

4. **Expose the full report on the client:** The waitlist API already returns `report` in the JSON. The component currently does `setRegistrySolarSignature(data?.report?.solarSignature ?? null)`. The minimal additive change is to also store the full `data.report` in state (e.g. `setWhoisReport(data?.report ?? null)`) and pass that into the below-fold section so it can render Genesis rows and Cosmic Twin value from `report.sunLongitudeDeg`, `report.solarAnchorType`, `report.seasonalPolarity`, `report.cosmicAnalogue`, etc., using the **same display rules** as `free-whois-report.ts` (e.g. “° solar longitude”, “Inter-segment position” for `solarAnchorType === "none"`).

5. **Align copy:** In the preview, replace the single “cosmic analogue” phrase (line 1030) with “Cosmic Twin” and, when `report` is available, show the actual Cosmic Twin value (e.g. “Cosmic Twin: {report.cosmicAnalogue}”) instead of “No pairing is published in this extract.”

No change to `buildFreeWhoisReport`, `renderFreeWhoisReport`, or email sending; no change to reveal timing or phase machine unless needed to show the new block.

---

## 5. LOWEST-RISK REUSE POINT

- **Current state:** Section labels and ordering are maintained in **two places**: (1) `lib/free-whois-report.ts` (email/document), (2) hardcoded JSX in `components/OriginTerminalIntake.jsx` (preview).

- **Safest minimal approach:**  
  - **Option A (minimal moving parts):** Do **not** introduce a shared constants file yet. In this phase, update **only** `OriginTerminalIntake.jsx`: (1) store `data.report` in state and pass it into the below-fold section; (2) add a Genesis Metadata block and reorder sections (Cosmic Twin before Archetype Expression); (3) reuse the **same display logic** (labels, “° solar longitude”, “Inter-segment position”) by either copying the same strings in the component or calling a small **pure helper** that takes `report` and returns the display strings for Genesis rows and Cosmic Twin (the helper can live in `free-whois-report.ts` and be imported by the component so labels and formatting live in one place).  
  - **Option B (centralize labels/order):** In `lib/free-whois-report.ts`, export a **tiny constant** (e.g. `FREE_WHOIS_SECTION_ORDER` or an array of section keys) and optionally a **small helper** that returns the Genesis row list and Cosmic Twin display string for a given `FreeWhoisReport`. The preview component then imports that and iterates over the same section order and uses the same labels/values. That keeps a single source of truth for section order and field labels with minimal surface area.

- **Concrete recommendation:** Prefer **Option A** with a **small helper in `free-whois-report.ts`** that takes `FreeWhoisReport` and returns `{ genesisRows: Array<{ label, value }>, cosmicTwinDisplay: string }` (or similar). The preview stays in the component but gets labels and formatting from that helper so we don’t maintain two copies of “° solar longitude”, “Inter-segment position”, or “Cosmic Twin”. No need for a separate constants file if the helper is the single reuse point.

---

## 6. DO-NOT-TOUCH LIST

Do **not** change the following in this phase:

| File / area | Reason |
|-------------|--------|
| **`lib/free-whois-report.ts`** — `buildFreeWhoisReport`, `renderFreeWhoisReport`, `renderFreeWhoisReportText` | Core report build and email/HTML render. Only additive exports (e.g. helper or section order constant) are in scope. |
| **`lib/email-waitlist-confirmation.ts`** | Sends email using `renderFreeWhoisReport`; no change needed for preview coherence. |
| **`app/api/waitlist/route.ts`** | Builds and returns `report`; response shape already correct. |
| **`app/api/waitlist/resend/route.ts`** | Same. |
| **`lib/terminal-intake/approximateSunLongitude.ts`**, **`getPrimaryArchetypeFromSolarLongitude`**, **`getCosmicAnalogue`**, **`getSolarSeasonByIndex`** | Used by `buildFreeWhoisReport`; no change. |
| **`lib/vector-zero-assets.ts`** | Used for Vector Zero image in email; not used by origin preview. |
| **`components/OriginTerminalIntake.jsx`** — `REVEAL_TIMING_MS`, phase machine, `beginRegistryReveal`, waitlist submit flow | Timing and phase logic; only additive state (e.g. store `report`) and below-fold content/order changes are in scope. |
| **`lib/archetype-preview-config.js`** | Provides teaser for Archetype Expression; no change needed for coherence. |
| **`app/origin/page.jsx`**, **`app/origin/layout.jsx`** | Locked per workspace rules. |
| **`app/beauty/BeautyLandingClient.jsx`**, **`components/LandingPreviews.jsx`**, **`app/globals.css`** (origin/landing styles) | Locked per workspace rules. |

---

**Summary:** The on-site preview is rendered only in `components/OriginTerminalIntake.jsx` and does **not** use `lib/free-whois-report.ts`. It uses a separate, hardcoded section order and copy, and only reads `solarSignature` from the API `report`. To align with the free WHOIS document with minimal moving parts: store the full `report` from the API in the component, add a Genesis Metadata block and reorder the below-fold sections to match the free WHOIS order (Registry → Genesis → Cosmic Twin → Archetype Expression), and centralize display strings in a small helper in `free-whois-report.ts` so both the email and the preview use the same labels and formatting.
