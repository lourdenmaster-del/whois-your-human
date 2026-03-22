# Commit audit — 2026-03-16

## 1. Local working tree (grouped)

### A) Report engine / enrichment fixes
- `app/api/engine/generate/route.ts` — explicit persistence of field-condition fields; try/catch around resolver; logging
- `app/api/engine/generate/__tests__/route.test.ts` — route tests
- `app/api/beauty/dry-run/route.ts` — calls engine with dryRun: true
- `app/api/beauty/dry-run/__tests__/route.test.ts` — dry-run route tests (untracked)
- `app/api/dev/latest-paid-whois-report/route.ts` — dev WHOIS by reportId (untracked)
- `lib/field-conditions/` — resolver, fetchers, formatters (untracked)
- `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts` — WHOIS build from stored report (untracked)

### B) Studio UI changes
- `components/LigsStudio.tsx` — path label, lastReportId for Live, fetch latest-paid-whois-report for both paths

### C) Unrelated (not staged)
- `app/api/engine/route.ts`
- `lib/beauty-profile-schema.ts`
- `lib/engine-spec.ts`
- `lib/engine/__tests__/initiation-anchor.test.ts`
- `lib/engine/__tests__/reportValidators.test.ts`
- `lib/engine/buildReportGenerationPrompt.ts`
- `lib/engine/deterministic-blocks.ts`
- `lib/engine/initiation-anchor.ts`
- `lib/engine/reportValidators.ts`
- `lib/free-whois-report.ts`
- `lib/report-composition.ts`
- `lib/report-store.ts`
- `package.json`

### D) Docs
- `SYSTEM_SNAPSHOT.md` — verification log (staged)
- `docs/STUDIO-REPORT-PATH-AUDIT.md` — path audit (staged)
- Other docs/scripts/tmp — not staged

## 2. Fixes verified present before commit
- Explicit persistence: dryRunPayload/payload.magneticFieldIndexDisplay, climateSignatureDisplay, sensoryFieldConditionsDisplay (engine/generate/route.ts)
- resolveFieldConditionsForBirth: logging (fetchGeomagneticKp, fetchWeatherAtMoment), try/catch, fallbacks (lib/field-conditions/resolveFieldConditions.ts)
- Studio: Path line, lastReportId set for both paths, GET /api/dev/latest-paid-whois-report for Test and Live (LigsStudio.tsx)
