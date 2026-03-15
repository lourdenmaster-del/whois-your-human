# Recent changes: WHOIS preview coherence, polish, and UTC Chrono-Imprint

Summary of changes from the session that implemented preview alignment with the free WHOIS renderer, display polish, and timezone-aware Chrono-Imprint.

---

## 1. Read-only audit (no code changes)

- Added **`docs/ORIGIN-PREVIEW-WHOIS-COHERENCE-AUDIT.md`** describing:
  - Where the on-site WHOIS preview is rendered (only **`components/OriginTerminalIntake.jsx`**).
  - That the preview did **not** use `lib/free-whois-report.ts` (separate copy/sections).
  - Section order, a minimal way to align preview with free WHOIS, a safe reuse point, and a do-not-touch list.

---

## 2. Preview ↔ free WHOIS alignment

- **`lib/free-whois-report.ts`**
  - New **`getFreeWhoisPreviewDisplay(report, options?)`** returning Genesis Metadata rows and Cosmic Twin display (same display rules as email).
  - New type **`FreeWhoisPreviewDisplay`** (and later **`FreeWhoisPreviewDisplayOptions`**).
- **`components/OriginTerminalIntake.jsx`**
  - Store full **`whoisReport`** from waitlist API (`setWhoisReport(data?.report ?? null)`).
  - Below-fold preview: **Genesis Metadata** block (when report has data), section order **Genesis → Cosmic Twin → Archetype Expression**, and **Cosmic Twin** value from `report` when present.

---

## 3. Display polish (display-only)

- **`lib/free-whois-report.ts`**
  - **Solar Light Vector:** `formatSolarLongitudeDisplay(deg)` → max 2 decimals (e.g. `14.78° solar longitude`).
  - **Solar Anchor Type:** `humanizeSolarAnchorType()` — equinox/solstice/crossquarter/none → “Equinox anchor”, “Solstice anchor”, “Cross-quarter anchor”, “Inter-segment position”.
  - **Chrono-Imprint:** `chronoImprintDisplay(reportBirthTime, override?)`; preview can pass **`chronoImprintOverride: formData.birthTime`** so it matches the registry block when the report has no usable birth time.
- **`components/OriginTerminalIntake.jsx`**
  - Calls **`getFreeWhoisPreviewDisplay(whoisReport, { chronoImprintOverride: formData.birthTime })`**.

---

## 4. UTC / Chrono-Imprint (timezone-aware)

- **`lib/free-whois-report.ts`**
  - New optional **`chronoImprintResolved`** on `FreeWhoisReport` (e.g. `"13:30 local / 18:30 UTC"`).
  - **`resolveChronoImprintDisplay(birthDate, birthTime, birthPlace)`** — async, uses **`deriveFromBirthData`** (geocode → IANA tz → Luxon local→UTC); returns formatted string or `null`.
  - **`enrichReportChrono(report)`** — sets `report.chronoImprintResolved` when date+time+place are present; no-op on missing data or failure.
  - Chrono-Imprint in HTML, text, and preview uses **`report.chronoImprintResolved ??`** existing fallback (birthTime / override / “Limited Access”).
- **`app/api/waitlist/route.ts`**
  - After building the report in all success paths, **`await enrichReportChrono(report)`**.
- **`app/api/waitlist/resend/route.ts`**
  - After building the report, **`await enrichReportChrono(report)`** before sending the email.

**Result:** When birth date, time, and place are present, Chrono-Imprint shows **“HH:mm local / HH:mm UTC”** with correct EST/EDT for that date and location. No changes to archetype or engine logic; section order and report shape otherwise unchanged.
