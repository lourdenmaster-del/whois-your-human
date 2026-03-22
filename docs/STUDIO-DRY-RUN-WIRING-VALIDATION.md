# Studio WHOIS-Capable Dry Run — Implementation Validation

**Date:** 2026-03-15  
**Goal:** Studio in dry-run mode returns a reportId that has a saved BeautyProfileV1, works with buildPaidWhoisReport(...), and does not trigger image generation or OpenAI image cost.

---

## 1. Files changed

| File | Change |
|------|--------|
| `components/LigsStudio.tsx` | In `runReportOnly`: when `effectiveDryRun` is true, call `POST /api/beauty/dry-run` with `birthData` + `dryRun: true` and map response to `reportOnlyResult`; set `lastReportId` when reportId returned. When `effectiveDryRun` is false, keep existing `POST /api/engine/generate` (report-only). Updated button hint text to "Dry run (full profile saved — WHOIS-capable)" / "Report only (Live OpenAI)". |
| `SYSTEM_SNAPSHOT.md` | Added Verification Log 2026-03-15 (Studio WHOIS-capable dry run). |

---

## 2. Which Studio control now hits /api/beauty/dry-run

- **Control:** The single **"Generate Report"** button in the "Report Only" section of LigsStudio (same button as before).
- **When:** Only when the **DRY RUN** checkbox is enabled (`effectiveDryRun === true`). In that case the handler calls **POST /api/beauty/dry-run** with:
  - `birthData: { fullName: liveFullName, birthDate: liveBirthDate, birthTime: liveBirthTime, birthLocation: liveBirthLocation, email: "dev@example.com" }`
  - `dryRun: true`
- **When DRY RUN is off:** The same button still calls **POST /api/engine/generate** (report-only / live path). No second button was added; behavior is branched inside `runReportOnly`.

---

## 3. BeautyProfileV1 saved

- **Yes.** When the Studio calls `/api/beauty/dry-run`, that route:
  1. Calls `POST /api/engine/generate` with `dryRun: true` (mock report).
  2. Builds a minimal profile with `buildDryRunBeautyProfileV1(reportId, subjectName, snippet, fullReport)`.
  3. Calls `saveBeautyProfileV1(reportId, profile, requestId)`.
- So the returned reportId has a stored BeautyProfileV1 in Blob (when `BLOB_READ_WRITE_TOKEN` is set).

---

## 4. Returned reportId works with buildPaidWhoisReport(...)

- **Yes.** `buildPaidWhoisReport({ reportId, requestId })` loads the profile via `loadBeautyProfileV1(reportId, requestId)`. For reportIds produced by `/api/beauty/dry-run`, that profile exists (saved in step above). send-beauty-profile and paid WHOIS email can use this reportId as before; no contract changes.

---

## 5. Image generation skipped

- **Yes.** The dry-run path only uses `/api/beauty/dry-run`, which internally calls only `/api/engine/generate` (no `/api/engine`). So the image-generation block in `app/api/engine/route.ts` is never run for this path. No `/api/generate-image` calls and no DALL·E usage; existing dry-run behavior is unchanged.

---

## 6. Build result

```
npm run build
✓ Compiled successfully
✓ Generating static pages
Build completed successfully (exit code 0).
```

---

## Summary

| Requirement | Status |
|-------------|--------|
| Studio dry-run calls POST /api/beauty/dry-run when DRY RUN on | ✓ |
| Same source fields (fullName, birthDate, birthTime, birthLocation, email, dryRun: true) | ✓ |
| Report-only path kept when DRY RUN off (POST /api/engine/generate) | ✓ |
| reportId surfaced same way (reportOnlyResult + lastReportId) | ✓ |
| No new image generation path | ✓ |
| BeautyProfileV1 saved for dry-run reportId | ✓ |
| buildPaidWhoisReport(reportId) works | ✓ |
| Image generation skipped | ✓ |
| Stripe / webhook / paid email / waitlist unchanged | ✓ |
