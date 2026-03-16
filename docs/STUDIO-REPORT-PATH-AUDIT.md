# Studio Report Path Audit

**Date:** 2026-03-16  
**Purpose:** Confirm which code is live, trace exact report paths for Test Paid Report vs Live Report, and document whether Studio is testing the proper paid WHOIS pipeline.

---

## 1. What is pushed / live

- **Branch:** `main` (tracking `origin/main`).
- **HEAD commit (local):** `0222ef5` — "feat(report): add paid WHOIS report builder".
- **Uncommitted changes:** Multiple modified files including:
  - `app/api/engine/generate/route.ts` (field-condition persistence, logging, try/catch)
  - `lib/field-conditions/` (resolver logging, fallbacks)
  - `components/LigsStudio.tsx`
  - `app/api/beauty/dry-run/route.ts`
  - Others (see `git status`).

**Conclusion:** The latest report-enrichment fixes (explicit payload persistence, `resolveFieldConditionsForBirth` logging and fallbacks, `field_conditions_context` and three display fields) are in the **local working tree**. They are not necessarily pushed to `origin` until you commit and push. Studio UI and engine/dry-run behavior reflect the current **local** state of these files.

---

## 2. Button traces

### A. Test Paid Report (safe / no image cost)

- **When:** Checkbox "Test mode (safe, no image cost)" is **checked** → `effectiveDryRun === true` (because `forceDryRun` is true).
- **UI handler:** `runReportOnly()` in `components/LigsStudio.tsx` (same button as Live Report; branch on `effectiveDryRun`).
- **API route called:**  
  `POST /api/beauty/dry-run`
- **Payload:**  
  `{ birthData: { fullName, birthDate, birthTime, birthLocation, email: "dev@example.com" }, dryRun: true }`
- **dryRun:** `true` (in body; dry-run route always forwards `dryRun: true` to engine).
- **OpenAI:** Not called. dry-run route does not call OpenAI; it calls `POST /api/engine/generate` with `dryRun: true`; engine/generate skips OpenAI and returns a placeholder `full_report`.
- **Image generation:** Not called. No image pipeline in dry-run path.
- **computeBirthContextForReport:** **Yes.** Called inside `POST /api/engine/generate` when `birthDate && birthLocation && birthTime` (engine/generate route).
- **resolveFieldConditionsForBirth:** **Yes.** Called in engine/generate with `skipExternalLookups: false` on both dry-run and live paths when `birthContext != null`.
- **StoredReport persisted:** **Yes.** engine/generate builds `dryRunPayload` with `full_report`, `emotional_snippet`, `image_prompts`, `vector_zero`, `field_conditions_context` (when `birthContext` present), `originCoordinatesDisplay`, and the three field-condition display fields; calls `saveReportAndConfirm(reportId, dryRunPayload)`.
- **Final WHOIS text:** After dry-run returns `reportId`, Studio calls `GET /api/dev/latest-paid-whois-report?reportId={reportId}`. That route loads `BeautyProfileV1` and calls `buildPaidWhoisReport({ reportId })`, which uses `getReport(reportId)` (StoredReport from Blob/memory) and builds the paid WHOIS text. So the displayed WHOIS is **from the same stored report** just persisted by engine/generate.

### B. Live Report (uses real AI)

- **When:** Checkbox "Test mode" is **unchecked** and server returns `allowExternalWrites: true` from `GET /api/ligs/status` (i.e. `ALLOW_EXTERNAL_WRITES === "true"`).
- **UI handler:** Same `runReportOnly()`; branch `effectiveDryRun === false`.
- **API route called:**  
  `POST /api/engine/generate`  
  (direct; no dry-run route.)
- **Headers:** `X-Force-Live: 1`, `Content-Type: application/json`.
- **Payload:**  
  `{ fullName, birthDate, birthTime, birthLocation, email: "dev@example.com", dryRun: false, idempotencyKey: crypto.randomUUID() }`
- **dryRun:** `false`.
- **OpenAI:** **Yes.** engine/generate runs full report generation (OpenAI), then builds payload with field conditions and persists via `saveReportAndConfirm`.
- **Image generation:** Not called from this button. Report-only path does not trigger image generation.
- **computeBirthContextForReport:** **Yes.** Same engine/generate flow when birth data provided.
- **resolveFieldConditionsForBirth:** **Yes.** Same engine/generate flow; payload includes `field_conditions_context` and the three display fields when present.
- **StoredReport persisted:** **Yes.** engine/generate builds `payload` and calls `saveReportAndConfirm(reportId, payload)`.
- **Final WHOIS text (before fix):** Studio only set `reportOnlyResult({ full_report, reportId, emotional_snippet })` and did **not** call `latest-paid-whois-report`. So the panel showed **raw `full_report`**, not the built paid WHOIS text. **After fix:** Studio also sets `lastReportId(reportId)` and fetches `GET /api/dev/latest-paid-whois-report?reportId=...` when available (dev-only), so the same panel can show built WHOIS for Live runs too.

### C. Results panel (section 04) and `lastReportId`

- **Source:** Section "04 – Results" shows links/actions keyed by `lastReportId` (e.g. "Open Viewer", "Refresh result") and `lastResultProfile` (from `GET /api/beauty/{lastReportId}`).
- **Before fix:** `lastReportId` was only set in the **Test Paid Report** path. After a **Live Report** run, `lastReportId` could still be from an earlier Test run, so "Results" was misleading.
- **After fix:** Both Test and Live paths set `lastReportId` when a `reportId` is returned, so "Results" reflects the last run.

---

## 3. Is Test Paid Report a faithful paid WHOIS test?

**Yes.**

- It hits the **same** `POST /api/engine/generate` route (via dry-run’s internal fetch) with `dryRun: true`.
- It **persists** a StoredReport (Blob or memory) with the same shape: `full_report`, `field_conditions_context`, `magneticFieldIndexDisplay`, `climateSignatureDisplay`, `sensoryFieldConditionsDisplay`, `originCoordinatesDisplay`, etc.
- It **runs field-condition enrichment** (computeBirthContextForReport, resolveFieldConditionsForBirth, buildFieldConditionsContext) and writes those into the stored payload.
- The displayed WHOIS is built by **buildPaidWhoisReport(reportId)**, which loads **getReport(reportId)** (the same StoredReport) and composes the paid WHOIS text. So the UI is showing exactly what paid WHOIS would show for that reportId.

**Only differences from a full paid flow:** No OpenAI-generated narrative (placeholder dry-run text) and no images. Persistence, field conditions, and WHOIS build-from-stored-report are the same.

---

## 4. UI confusion points (addressed by minimal fixes)

- **Mode vs path:** The badge text ("Test Paid Report (safe / no image cost)" vs "Live Report (uses real AI)") correctly describes what the **button** will do for the current mode; it was not always obvious that this is the **path** that runs. Fix: show an explicit "Path: …" line after a run.
- **Which reportId is shown:** reportId was shown in the card but it wasn’t explicit that the WHOIS text is "from this stored report". Fix: short label when WHOIS is from stored report.
- **Stale Results (section 04):** After Live Report, `lastReportId` was not updated, so "Results" could point at an old Test report. Fix: set `lastReportId` in the Live path and, in dev, fetch WHOIS for the new reportId so the same card can show WHOIS for both modes.
- **Clarity of path:** No post-run indication of which API path was used. Fix: "Path: POST /api/beauty/dry-run → /api/engine/generate (dryRun: true)" vs "Path: POST /api/engine/generate (dryRun: false)".

---

## 5. Minimal clarity fixes applied

- **Live path:** Set `lastReportId(reportId)` when Live run succeeds. In dev, fetch `GET /api/dev/latest-paid-whois-report?reportId=...` and merge `paidWhoisText` into `reportOnlyResult` so the same panel can show built WHOIS for Live runs when the dev endpoint is available.
- **Report result card:** Add a "Path:" line (dry-run vs direct engine) and reportId; when `paidWhoisText` is present, add a note that the content is rendered from the stored report (buildPaidWhoisReport).
- No changes to engine/generate, field-condition resolver, or persistence logic.

---

## 6. Exact routes summary

| Action              | Route(s) called                                                    | dryRun  | StoredReport | WHOIS from stored report (by reportId) |
|---------------------|---------------------------------------------------------------------|---------|--------------|----------------------------------------|
| Test Paid Report    | POST /api/beauty/dry-run → POST /api/engine/generate                | true    | Yes          | Yes (GET …/latest-paid-whois-report)    |
| Live Report         | POST /api/engine/generate                                           | false   | Yes          | Yes in dev (same GET after fix)        |
