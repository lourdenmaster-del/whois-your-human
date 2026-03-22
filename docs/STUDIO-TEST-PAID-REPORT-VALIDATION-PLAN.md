# Studio “Test Paid Report” — Read-Only-First Validation Plan

**Target path:** LigsStudio (Test mode ON) → “Test Paid Report (safe / no image cost)” → POST /api/beauty/dry-run → POST /api/engine/generate (dryRun: true) → saveBeautyProfileV1 → buildPaidWhoisReport(reportId).

---

## 1. Minimal set of checks (read-only audit)

| # | Check | Where | Type |
|---|--------|------|------|
| 1 | **Studio path wiring** — Test mode ON triggers POST /api/beauty/dry-run with body `{ birthData: { fullName, birthDate, birthTime, birthLocation, email }, dryRun: true }` | `components/LigsStudio.tsx` `runReportOnly` when `effectiveDryRun` | Code inspection + route test (assert request shape) |
| 2 | **Dry-run safety** — dry-run path does not call image generation; engine/generate with dryRun: true returns mock and never calls OpenAI or image APIs | `app/api/beauty/dry-run/route.ts`, `app/api/engine/generate/route.ts` | Route test (mock fetch to engine, assert body has dryRun: true); engine/generate tests already cover dryRun branch |
| 3 | **Profile persistence** — dry-run response includes reportId; that reportId has stored report (getReport) and stored BeautyProfileV1 (loadBeautyProfileV1); profile has WHOIS-relevant fields | dry-run route + store | Route test with mocked save; unit test for buildPaidWhoisReport with mocked getReport + loadBeautyProfileV1 |
| 4 | **Paid WHOIS buildability** — buildPaidWhoisReport(reportId) runs without throwing for a reportId produced by dry-run (stored report + profile exist) | `lib/free-whois-report.ts` | Unit test: mock getReport + loadBeautyProfileV1 with dry-run-style data, call buildPaidWhoisReport, expect no throw |
| 5 | **Required field sanity** — Built FreeWhoisReport has required fields: registryId, name, birthDate, birthTime, birthLocation, solarSignature, archetypeClassification, cosmicAnalogue; optional behavior for lightSignatureDisplay, chronoImprintResolved, originCoordinatesDisplay | `lib/free-whois-report.ts` | Unit test: assert shape and key fields from buildPaidWhoisReport result |
| 6 | **No manual click** — All of the above verifiable via unit/route tests or a dev script; manual UI click only for end-to-end UX (optional) | Tests + script | Vitest route + unit tests; optional script against running server |

---

## 2. What to implement (minimal)

- **Route test:** `app/api/beauty/dry-run/__tests__/route.test.ts` — Mock fetch to engine/generate and saveBeautyProfileV1; POST with Studio-shaped body; assert 200, response shape (reportId, beautyProfile, checkout.url), and that fetch was called with dryRun: true (no image path).
- **Unit test:** `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` — Mock getReport and loadBeautyProfileV1 to return dry-run-style stored report + BeautyProfileV1; call buildPaidWhoisReport(reportId); assert required fields on result and that optional fields behave (lightSignatureDisplay when set, chrono/origin when available).
- **Optional:** Dev script `scripts/verify-studio-test-paid-report.mjs` — POST /api/beauty/dry-run then GET /api/beauty/[reportId] or call buildPaidWhoisReport via a small Node script (requires running server + Blob); for operator sanity-check without UI.

---

## 3. Files touched (audit)

| File | Purpose |
|------|--------|
| `components/LigsStudio.tsx` | Studio wiring: when effectiveDryRun, fetch POST /api/beauty/dry-run with birthData + dryRun: true. No change needed for validation; tests will assert contract. |
| `app/api/beauty/dry-run/route.ts` | Calls fetch(engine/generate) with dryRun: true; builds profile; saveBeautyProfileV1; returns reportId, beautyProfile, checkout. No change; tests will mock fetch and save. |
| `app/api/engine/generate/route.ts` | When dryRun true, returns mock report without OpenAI/images. Already tested in route.test.ts. |
| `lib/beauty-profile-store.ts` | saveBeautyProfileV1 / loadBeautyProfileV1. Mocked in tests. |
| `lib/report-store.ts` | getReport. Mocked in buildPaidWhoisReport test. |
| `lib/free-whois-report.ts` | buildPaidWhoisReport. Unit test will call it with mocks. |

---

## 4. Implemented tests and script

- **app/api/beauty/dry-run/__tests__/route.test.ts** — Route test: Studio-shaped payload → 200, reportId/beautyProfile/checkout; engine/generate called with dryRun: true; saveBeautyProfileV1 called with reportId and profile; 400 on invalid birthData.
- **lib/__tests__/buildPaidWhoisReport-dry-run.test.ts** — Unit test: buildPaidWhoisReport with mocked getReport + loadBeautyProfileV1 (dry-run-style data); required fields present; lightSignatureDisplay, originCoordinatesDisplay, profile birth fields, vectorZeroAddendumBody, PAID_WHOIS_REPORT_NOT_FOUND when getReport returns undefined.
- **scripts/verify-studio-test-paid-report.mjs** — Dev script: POST /api/beauty/dry-run then GET /api/beauty/[reportId]; requires running server (and Blob for profile load).

---

## 5. What is now automatically testable (no manual click)

| Check | How |
|-------|-----|
| Studio path wiring (payload + endpoint) | dry-run route test asserts POST body has birthData + dryRun: true and response has reportId, beautyProfile, checkout.url |
| Dry-run safety (no image path) | dry-run route test asserts fetch is called once to /api/engine/generate with body.dryRun === true |
| Profile persistence (saveBeautyProfileV1) | dry-run route test asserts saveBeautyProfileV1 called with reportId and profile (reportId, subjectName, emotionalSnippet, fullReport) |
| Paid WHOIS buildability | buildPaidWhoisReport-dry-run test mocks getReport + loadBeautyProfileV1, calls buildPaidWhoisReport(reportId), expects no throw |
| Required field sanity | buildPaidWhoisReport-dry-run test asserts registryId, name, birthDate, birthTime, birthLocation, solarSignature, archetypeClassification, cosmicAnalogue, registryStatus, recordAuthority, created_at; and optional lightSignatureDisplay, originCoordinatesDisplay, vectorZeroAddendumBody, PAID_WHOIS_REPORT_NOT_FOUND |

---

## 6. Exact commands to run locally

```bash
# Run only Studio test path tests (no server)
npm run test:run -- app/api/beauty/dry-run lib/__tests__/buildPaidWhoisReport-dry-run

# Run full test suite
npm run test:run

# Optional: verify against running server (start dev server in another terminal first)
npm run verify:studio-test
# Or with custom base URL:
node scripts/verify-studio-test-paid-report.mjs http://localhost:3000
```

---

## 7. When button-click testing is still needed

Only for **end-to-end UX** in the browser: that the "Test Paid Report (safe / no image cost)" button is visible when Test mode is ON, that the toggle switches between Test and Live copy, that clicking the button shows the result (report text / reportId) in the UI, and that "View report" or similar works with the returned reportId. All **contract and data path** validation (wiring, dry-run safety, profile persistence, WHOIS buildability, required fields) is covered by the automated tests above without clicking the button.
