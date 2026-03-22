# Paid WHOIS minimal persistence upgrade — validation report

**Date:** 2026-03-15  
**Scope:** Preserve /origin identity inputs in BeautyProfileV1 so `buildPaidWhoisReport(...)` can populate paid registry record with real birth fields and chrono data.

---

## 1. Files changed

| File | Change |
|------|--------|
| `lib/beauty-profile-schema.ts` | Extended `BeautyProfileV1` with four optional fields. |
| `app/api/engine/route.ts` | Forward birth fields into profile payload; compute and set `originCoordinatesDisplay` when birthContext has lat/lon. |
| `lib/free-whois-report.ts` | `buildPaidWhoisReport` uses profile birth fields when params omitted; uses profile `originCoordinatesDisplay` when `birthContext` not passed. |
| `SYSTEM_SNAPSHOT.md` | Added Verification Log entry 2026-03-15. |

---

## 2. Exact new fields added

### BeautyProfileV1 (`lib/beauty-profile-schema.ts`)

- `birthDate?: string` — Origin birth date (YYYY-MM-DD).
- `birthTime?: string` — Origin birth time (normalized HH:MM:SS).
- `birthLocation?: string` — Origin place of birth.
- `originCoordinatesDisplay?: string` — Display string when birthContext had lat/lon (e.g. `"Place, 40.7128°N, 74.0060°W"`).

All are optional; no changes to `hasRequiredBeautyProfileV1` or `assertBeautyProfileV1`.

---

## 3. Additive-only

- **Schema:** New fields are optional; existing payloads remain valid; old profiles without these keys still load and behave as before.
- **Engine route:** Only added properties to the payload object; no existing properties removed or renamed.
- **buildPaidWhoisReport:** Logic is fallback-only: `(param?.trim() \|\| profile.field?.trim()) ?? "—"` for birth fields; `originCoordinatesDisplay` from profile only when `birthContext` is not provided. No changes to section parsing, solar resolution, or report shape.

---

## 4. Existing free flow unchanged

- **Free waitlist:** No changes to `app/api/waitlist/route.ts`, `lib/waitlist-store.ts`, or waitlist confirmation. Waitlist still uses `buildFreeWhoisReport` + `enrichReportChrono` with request/entry data only.
- **Free WHOIS card:** `renderFreeWhoisCard`, `renderFreeWhoisCardText`, `getFreeWhoisPreviewDisplay` unchanged. They still consume the same `FreeWhoisReport` shape; free reports are still built by `buildFreeWhoisReport` from waitlist/entry data.
- **Stripe / webhook / send-beauty-profile:** Request shape remains `{ reportId, email }`. No changes to checkout, webhook handler, or send-beauty-profile route signature.

---

## 5. buildPaidWhoisReport now resolves birth fields from profile

- When `buildPaidWhoisReport({ reportId, requestId })` is called (e.g. from send-beauty-profile) with no `birthDate`, `birthTime`, `birthLocation`, or `birthContext`:
  - `birthDateStr` = `(birthDate?.trim() \|\| profile.birthDate?.trim()) ?? "—"`.
  - `birthLocationStr` = `(birthLocation?.trim() \|\| profile.birthLocation?.trim()) ?? "—"`.
  - `birthTimeStr` = `(birthTime?.trim() \|\| profile.birthTime?.trim()) ?? "—"`.
- So when the profile was saved with birth data by the engine route (after /origin → beauty/submit → engine), the paid WHOIS report now gets real birth date, time, and location instead of "—".

---

## 6. chronoImprintResolved can now populate in paid flow

- Existing logic in `buildPaidWhoisReport` already runs when `birthDateStr`, `birthTimeStr`, and `birthLocationStr` are all non-empty and not "—":
  - It calls `resolveChronoImprintDisplay(birthDateStr, birthTimeStr, birthLocationStr)` and sets `report.chronoImprintResolved` on success.
- By populating the three strings from the profile when params are omitted, that block now runs for paid WHOIS when the profile contains birth date, time, and location (e.g. from a run that went through /origin → beauty/submit → engine).
- No new chrono logic was added; the existing chrono resolution is reused.

---

## Summary

| Requirement | Status |
|-------------|--------|
| No new storage system | ✓ Only BeautyProfileV1 (existing Blob store). |
| No payment architecture change | ✓ Stripe, webhook, send-beauty-profile unchanged. |
| No break to free waitlist flow | ✓ Free WHOIS still built from waitlist/entry only. |
| BeautyProfileV1 as persistence target | ✓ New optional fields on profile; engine route writes them. |
| Additive-only where possible | ✓ Optional fields; fallback-only in buildPaidWhoisReport. |
| buildPaidWhoisReport resolves birth from profile | ✓ When params omitted, uses profile.birthDate/birthTime/birthLocation. |
| chronoImprintResolved can populate in paid flow | ✓ Same block runs when profile supplies the three birth values. |
