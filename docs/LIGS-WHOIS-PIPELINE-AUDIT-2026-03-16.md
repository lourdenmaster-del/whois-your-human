# LIGS / WHOIS Report Pipeline Audit — 2026-03-16

**Scope:** Forensic audit of the report pipeline to identify why reports from the Studio arrive with missing or incomplete data in the final rendered output.

---

## 1. End-to-End Pipeline Map

| Stage | Entry Point | Key Files | Data Flow |
|-------|-------------|-----------|-----------|
| **1. Studio form submission** | LigsStudio "Test Paid Report" button | `app/studio/` (or equivalent) | POST → `/api/beauty/dry-run` with `dryRun: true` |
| **2. Beauty dry-run API** | `POST /api/beauty/dry-run` | `app/api/beauty/dry-run/route.ts` | Calls `POST /api/engine/generate` with dryRun; builds `buildDryRunBeautyProfileV1`; saves BeautyProfileV1 to Blob `ligs-beauty/{reportId}.json` |
| **3. Engine generate** | `POST /api/engine/generate` | `app/api/engine/generate/route.ts` | Dry-run: `buildDryRunReportFromContext` → `injectDeterministicBlocksIntoReport` → `saveReportAndConfirm` to Blob `ligs-reports/{reportId}.json` |
| **4. Storage** | Blob | `lib/report-store.ts`, `lib/beauty-profile-store.ts` | `saveReportAndConfirm`, `getReport`; `saveBeautyProfileV1`, `loadBeautyProfileV1` |
| **5. Report retrieval** | `buildPaidWhoisReport` | `lib/free-whois-report.ts` | `getReport(reportId)`, `loadBeautyProfileV1(reportId)` |
| **6. Composition** | `buildPaidWhoisReport` | `lib/free-whois-report.ts` | Parses `storedReport.full_report` via `parseSectionBody`/`parseSectionRange`; maps s1+s2→identityArchitectureBody, s2–5→fieldConditionsBody, s6+s7→archetypeExpressionBody, s11→cosmicTwinBody, s12–14→interpretiveNotesBody |
| **7. Rendering** | `renderFreeWhoisReport` / `renderFreeWhoisReportText` | `lib/free-whois-report.ts` | Uses fallbacks when body fields are null/empty |
| **8. Output** | Dev route / agent / email | `app/api/dev/latest-paid-whois-report/route.ts`, agent whois route | Returns `renderFreeWhoisReportText(report)` |

---

## 2. Exact Points Where Missing Data Can Occur

### A. Source data missing upstream

| Location | Field | Cause |
|----------|-------|-------|
| `buildDryRunBeautyProfileV1` | `originCoordinatesDisplay` | **Not set.** Dry-run profile builder does not include it. |
| `buildDryRunBeautyProfileV1` | `solarSeasonProfile` | **Not set.** Top block recomputes from birth date only. |
| `buildDryRunBeautyProfileV1` | `dominantArchetype` | **Not set.** Archetype derived from birth date in `buildPaidWhoisReport`. |

### B. Stored data incomplete

| Location | Field | Cause |
|----------|-------|-------|
| `StoredReport` | `originCoordinatesDisplay` | **Persisted by engine** when `birthContext` has lat/lon. Engine dry-run sets it when `originDisplay != null`. |
| `StoredReport` | `full_report` | Engine dry-run produces full 14-section report via `buildDryRunReportFromContext`; no `[DRY RUN]` prefix in current implementation. |

### C. Parser / composition failure

| Location | Issue | Cause |
|----------|-------|-------|
| `parseSectionBody` / `parseSectionRange` | Returns `null` when section not found | Regex expects `N. TITLE` format (e.g. `1. INITIATION`). Non-standard LLM output fails to parse. |
| `buildPaidWhoisReport` | `originCoordinatesDisplay` not used from `storedReport` | **Bug (fixed):** Logic used only `birthContext` or `profile.originCoordinatesDisplay`. When profile lacked it (dry-run path), value was never taken from `storedReport` even though engine persisted it. Result: "Restricted Node Data" in Genesis table. |

### D. UI / render layer omission

| Location | Issue | Cause |
|----------|-------|-------|
| `renderFreeWhoisReport` | Fallbacks hide upstream failure | When `identityArchitectureBody`, `cosmicTwinBody`, `archetypeExpressionBody`, etc. are null, renderer uses generic fallbacks. Broken or non-standard reports can appear valid. |

---

## 3. Silent Fallback Behavior (Dangerous)

When `parseSectionBody` returns null, body fields remain unset. The renderer then uses:

- **identityArchitectureBody:** "The registry identifies a stable identity structure…"
- **cosmicTwinBody:** `composeCosmicTwin({ dominantArchetype })`
- **archetypeExpressionBody:** `composeArchetypeSummary({ dominantArchetype })`
- **interpretiveNotesBody:** "Interpretive notes are held on the registry node…"
- **originCoordinatesDisplay:** "Restricted Node Data" (when neither birthContext, profile, nor storedReport had it)

**Risk:** Invalid or truncated upstream data produces a report that looks complete. No error is surfaced.

---

## 4. Root Cause Confirmed

**originCoordinatesDisplay missing in Studio dry-run reports**

- **Cause:** `buildPaidWhoisReport` set `originCoordinatesDisplay` from (1) `birthContext` or (2) `profile.originCoordinatesDisplay`. The Studio dry-run path does not pass `birthContext`, and `buildDryRunBeautyProfileV1` does not set `originCoordinatesDisplay` on the profile. The engine *does* persist `originCoordinatesDisplay` on `StoredReport` when `birthContext` has lat/lon, but `buildPaidWhoisReport` never read it from `storedReport`.
- **Result:** Genesis table showed "Restricted Node Data" for Origin Coordinates even when the stored report contained valid coordinates.

---

## 5. Minimal Safe Fix Implemented

**File:** `lib/free-whois-report.ts`

**Change:** Add fallback to `storedReport.originCoordinatesDisplay` when `birthContext` is not passed and `profile.originCoordinatesDisplay` is missing:

```ts
} else if (storedReport.originCoordinatesDisplay != null && String(storedReport.originCoordinatesDisplay).trim() !== "") {
  report.originCoordinatesDisplay = storedReport.originCoordinatesDisplay.trim();
}
```

**Scope:** Single addition; no other logic changed. Preserves existing behavior when profile or birthContext already provide the value.

---

## 6. Verification

- **Unit test:** `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` — added `"falls back to storedReport.originCoordinatesDisplay when profile lacks it (Studio dry-run path)"`. Passes.
- **Existing tests:** All 12 tests in `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` pass.

---

## 7. Summary

| Item | Value |
|------|-------|
| **Files changed** | `lib/free-whois-report.ts`, `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` |
| **Why** | `originCoordinatesDisplay` was never read from `storedReport` when profile lacked it; Studio dry-run profiles do not set it. |
| **Root cause** | Missing fallback chain: `birthContext` → `profile` → `storedReport` (storedReport was omitted). |
| **Fix** | Added `storedReport.originCoordinatesDisplay` as third fallback. |
| **Verification** | New unit test; all buildPaidWhoisReport dry-run tests pass. |

---

## 8. Remaining Recommendations (Not Implemented)

1. **Option B (PAID-WHOIS-TOP-BLOCK-BODY-MISMATCH-AUDIT):** For dry-run reports, skip using parsed `full_report` bodies and use fallbacks so top block and body share the same archetype. Note: Current engine dry-run output has no `[DRY RUN]` prefix; detection would need a flag or other marker.
2. **Enrich buildDryRunBeautyProfileV1:** Set `originCoordinatesDisplay`, `solarSeasonProfile`, `dominantArchetype` from engine response so profile and stored report stay aligned.
3. **Logging:** Log when `parseSectionBody` returns null so parsing failures are visible instead of silent.
