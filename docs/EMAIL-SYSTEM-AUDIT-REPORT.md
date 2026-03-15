# Email System Audit Report — WHOIS Landing / Waitlist Flow

**Date:** 2026-03-13  
**Scope:** Full end-to-end email path for waitlist / free WHOIS registration. Read-only test; no code changed except this report.

---

## A. FILES IN EMAIL FLOW

| Role | File | Notes |
|------|------|--------|
| **Intake submit** | `components/OriginTerminalIntake.jsx` | Form state, `fetch("/api/waitlist", { method: "POST", body })` when `waitlistState === "running"` and WAITLIST_ONLY. Payload: email, source, birthDate, name, birthPlace, birthTime, preview_archetype. |
| **API route** | `app/api/waitlist/route.ts` | POST: rate limit → Blob token check (503 if missing) → parse body → compute preview_archetype/solar_season from birthDate → `insertWaitlistEntry` → duplicate vs new path → build report → send email → response. |
| **Report builder** | `lib/free-whois-report.ts` | `buildFreeWhoisReport(data)` → FreeWhoisReport (registryId, solarSignature, archetypeClassification, cosmicAnalogue, etc.). Solar Segment from lon + 15°-shift; archetype from `getPrimaryArchetypeFromSolarLongitude(lon)`. |
| **Email template/render** | `lib/free-whois-report.ts` | `renderFreeWhoisReport(report, { siteUrl })` (HTML), `renderFreeWhoisReportText(report, { siteUrl })` (plain). Same content for email and in-page; includes registry table, Solar Segment, Archetype Classification, artifact image, sections. |
| **Email send / provider** | `lib/email-waitlist-confirmation.ts` | `sendWaitlistConfirmation(email, report)`. Reads `process.env.RESEND_API_KEY?.trim()`, `process.env.SENDGRID_API_KEY?.trim()`. If both falsy → return `{ sent: false, reason: "provider_key_missing" }`. Else Resend (preferred) or SendGrid fetch; from = `process.env.EMAIL_FROM?.trim() || "LIGS <onboarding@resend.dev>"`. |
| **Resend (duplicate path)** | `app/api/waitlist/route.ts` | When `result.alreadyRegistered`, load entry; if cooldown → return with report, no send; else build report, `sendWaitlistConfirmation(entry.email, report)`, then return with report and confirmationSent/Reason. |
| **Resend (operator)** | `app/api/waitlist/resend/route.ts` | POST body `{ email }`; studio cookie; get entry; build report; `sendWaitlistConfirmation`; return confirmationSent/Reason. |
| **Env/config checks** | `app/api/waitlist/route.ts` | `BLOB_READ_WRITE_TOKEN` checked once at top (503 if missing). No pre-check for RESEND/SENDGRID; `sendWaitlistConfirmation` does the check internally. |
| **Pipeline status (observability)** | `app/api/studio/pipeline-status/route.ts` | Returns `emailConfigured: Boolean(resend \|\| sendgrid)` from same env vars (for Studio only). |

**Other references:**  
- `lib/waitlist-store.ts`: Blob insert/get/update; `recordConfirmationSent` updates `last_confirmation_sent_at`, `confirmation_send_count`.  
- `components/OriginTerminalIntake.jsx`: `waitlistConfirmationLabel(reason)` maps API reason → UI string; `provider_key_missing` → "failed (provider not configured)".  
- `components/LigsStudio.tsx`: Displays resend result (confirmationSent, confirmationReason).

---

## B. NEW SIGNUP EMAIL FLOW

1. **Form submit** — `OriginTerminalIntake.jsx`: user completes intake → phase "executing" → `executeSubmitRef.current()` (or WAITLIST_ONLY path: `waitlistState` set to "running" → useEffect runs).
2. **API request** — `fetch("/api/waitlist", { method: "POST", body: JSON.stringify({ email, source: "origin-terminal", birthDate, name, birthPlace, birthTime, preview_archetype }) })`.
3. **API route** — `app/api/waitlist/route.ts`: POST → rate limit → `hasBlobToken` (503 if false) → parse body → normalize email, source, optional name/birthDate/birthPlace/birthTime → if birthDateRaw: `approximateSunLongitudeFromDate` + `getPrimaryArchetypeFromSolarLongitude` + SOLAR_SEASONS → set preview_archetype, solar_season → `insertWaitlistEntry({ email, source, preview_archetype, solar_season, name, birthDate, birthPlace, birthTime })`.
4. **Insert** — `lib/waitlist-store.ts`: `insertWaitlistEntry` → `insertIfNew` → head(path); if exists return alreadyRegistered; else put(path, JSON.stringify(payload)).
5. **New signup branch** — `result.alreadyRegistered` false → `createdAt = new Date().toISOString()` → `report = buildFreeWhoisReport({ email, created_at, source, preview_archetype, solar_season, name, birthDate: birthDateRaw, birthPlace, birthTime })` → `report.artifactImageUrl = getRegistryArtifactImageUrl(report.archetypeClassification, email)`.
6. **Report creation** — `lib/free-whois-report.ts`: `buildFreeWhoisReport` → solarSignature from lon (15°-shift segment names), archetypeClassification from `getPrimaryArchetypeFromSolarLongitude(lon)`.
7. **Email payload** — `lib/email-waitlist-confirmation.ts`: `sendWaitlistConfirmation(email, report)` → `html = renderFreeWhoisReport(report, { siteUrl })`, `text = renderFreeWhoisReportText(report, { siteUrl })`, `subject = "Your identity query has been logged"`, `from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM`.
8. **Provider send** — If `RESEND_API_KEY` set: fetch Resend API (from, to, subject, html, text). If not and `SENDGRID_API_KEY` set: fetch SendGrid. If both unset: return `{ sent: false, reason: "provider_key_missing" }` (no fetch).
9. **API response** — `confirmationSent = sendResult.sent`, `confirmationReason = sendResult.reason`; if sent, `recordConfirmationSent(email)`; then `NextResponse.json({ ok: true, alreadyRegistered: false, confirmationSent, confirmationReason, report })`.
10. **Client** — OriginTerminalIntake receives data → `setWaitlistConfirmation({ confirmationSent, confirmationReason, alreadyRegistered: false })`, `setRegistrySolarSignature(data?.report?.solarSignature)` → `beginRegistryReveal()`.

---

## C. DUPLICATE SIGNUP EMAIL FLOW

1. **Same intake/API request** as new signup.
2. **Insert** — `insertWaitlistEntry` → `insertIfNew` → head(path) finds existing → return `{ inserted: false, alreadyRegistered: true }`.
3. **Duplicate branch** — `getWaitlistEntryByEmail(email)` → get(path), JSON.parse.
4. **No entry** — If !entry: build report from request body (email, created_at: new Date().toISOString(), source, preview_archetype, solar_season, name, birthDate, birthPlace, birthTime) → return 200 with report, confirmationSent: false, confirmationReason: "duplicate_skipped". No send.
5. **Cooldown** — If entry exists and `last_confirmation_sent_at` within RESEND_COOLDOWN_MS (10 min): build report from entry → return 200 with report, confirmationSent: false, confirmationReason: "duplicate_recently_sent". No send.
6. **Resend attempt** — Else: build report from entry, set `report.artifactImageUrl`, then `sendWaitlistConfirmation(entry.email, report)` (same provider check and send as new signup).
7. **Result** — dupConfirmationSent = sendResult.sent, dupConfirmationReason = sendResult.reason (or "duplicate_resent" if sent); if sent, `recordConfirmationSent(email)`; return 200 with report, confirmationSent, confirmationReason.

---

## D. CONFIG / ENV CHECK

| Variable | Required for send | Where read | Effect if missing |
|----------|--------------------|------------|--------------------|
| `BLOB_READ_WRITE_TOKEN` | No (for email); yes for waitlist | `app/api/waitlist/route.ts` (top) | 503 "Waitlist not configured"; no insert, no email. |
| `RESEND_API_KEY` | One of Resend or SendGrid required | `lib/email-waitlist-confirmation.ts`: `process.env.RESEND_API_KEY?.trim()` | If both Resend and SendGrid missing → `provider_key_missing`, no send. |
| `SENDGRID_API_KEY` | Same as above | `process.env.SENDGRID_API_KEY?.trim()` | Same. |
| `EMAIL_FROM` | Optional | Same file: `process.env.EMAIL_FROM?.trim() \|\| DEFAULT_FROM` | Default `"LIGS <onboarding@resend.dev>"`. Unverified custom from can cause provider_rejected. |

- **From address:** Resend path uses `from` as-is or wraps as `LIGS <${from}>` if no `<`. SendGrid parses name/email from same string.
- **Domain/sender:** Resend allows default onboarding@resend.dev without verification; custom domain/address must be verified in Resend. SendGrid requires verified sender.
- **Provider init:** No separate init; keys read at send time. No guard that could falsely report failure when config exists except (1) key empty after trim(), (2) key not in runtime env (see H).

---

## E. ACTUAL SEND BEHAVIOR

**Controlled test (local/dev):**  
- Request: `POST /api/waitlist` with `{ "email": "test-audit@example.com", "source": "origin-terminal", "birthDate": "1990-06-21" }`.  
- Response (200): `ok: true`, `alreadyRegistered: false`, `confirmationSent: false`, `confirmationReason: "provider_key_missing"`, `report` (registryId, solarSignature: "June Solstice", archetypeClassification: "Tenebris", etc.).  
- **Conclusion:** In the test environment, Blob is configured (insert succeeded), but at the time `sendWaitlistConfirmation` ran, both `process.env.RESEND_API_KEY?.trim()` and `process.env.SENDGRID_API_KEY?.trim()` were falsy, so the code correctly returned `provider_key_missing` and did not call any provider. Real send was not performed because provider keys are not set in that environment.

---

## F. API RESPONSE FIELDS TO UI

**New signup (200):**  
- `ok: true`  
- `alreadyRegistered: false`  
- `confirmationSent: boolean`  
- `confirmationReason: "sent" | "provider_key_missing" | "provider_rejected" | "provider_error"`  
- `report: FreeWhoisReport` (registryId, registryStatus, created_at, recordAuthority, name, birthDate, birthLocation, birthTime, solarSignature, archetypeClassification, cosmicAnalogue, artifactImageUrl)

**Duplicate signup (200):**  
- `ok: true`  
- `alreadyRegistered: true`  
- `confirmationSent: boolean`  
- `confirmationReason: "duplicate_skipped" | "duplicate_recently_sent" | "duplicate_resent" | "provider_key_missing" | "provider_rejected" | "provider_error"`  
- `report: FreeWhoisReport` (same shape)

**UI usage:** OriginTerminalIntake reads `data.confirmationSent`, `data.confirmationReason`, `data.report?.solarSignature`; displays "Confirmation dispatch: " + `waitlistConfirmationLabel(confirmationReason)`.

---

## G. EMAIL CONTENT CHECK

- **Subject:** "Your identity query has been logged" (constant in `lib/email-waitlist-confirmation.ts`).
- **Solar Segment:** Present. In `renderFreeWhoisReport` / `renderFreeWhoisReportText`: row/label "Solar Segment" with value `report.solarSignature`.
- **Archetype Classification:** Present. Same tables plus "ARCHETYPE EXPRESSION" section with "Archetype Classification: {report.archetypeClassification}".
- **Artifact / report preview:** Present. `report.artifactImageUrl` used in HTML as `<img src="...">`; plain text has no image but has full text blocks. "Return to the registry" link uses siteUrl.
- **Labels:** Single canonical label "Solar Segment" (no "Solar Signature" in template).

---

## H. ROOT CAUSE OF "provider not configured" MESSAGE

- **UI string:** "Confirmation dispatch: failed (provider not configured)" is the exact mapping of `confirmationReason === "provider_key_missing"` via `waitlistConfirmationLabel()` in `OriginTerminalIntake.jsx`.
- **Single code path for that reason:** In `lib/email-waitlist-confirmation.ts`, the only place that returns `reason: "provider_key_missing"` is when `!resendKey && !sendgridKey` (i.e. both `process.env.RESEND_API_KEY?.trim()` and `process.env.SENDGRID_API_KEY?.trim()` are falsy).
- **No other code** sets confirmationReason to provider_key_missing; no catch-path or client logic overrides it.

**So when the UI shows "provider not configured", the server that handled the request did not have a usable Resend or SendGrid key at send time.** Possible causes:

1. **True config failure** — Neither key set in the environment that runs the API (e.g. `.env.local` missing or keys not set; Vercel env not set for that deployment).
2. **Wrong env scope** — Key set only in Build/Preview but not in the runtime environment used for that request (e.g. Production vs Preview in Vercel).
3. **Runtime env missing** — Key present in dashboard or .env file but not loaded into `process.env` for the Node/Edge runtime (e.g. server not restarted after adding to .env.local; Vercel env not applied to the correct environment).
4. **Empty or invalid key** — Key set to empty string or whitespace-only; `.trim()` yields "" and is falsy.
5. **Provider init bug** — None; there is no separate init; keys are read once at the top of `sendWaitlistConfirmation`.
6. **Catch-path masking** — If `sendWaitlistConfirmation` threw, the route catch sets `confirmationReason = "provider_error"`, not provider_key_missing. So provider_key_missing is not from a catch.
7. **Stale client message** — Unlikely; the message is derived from the last POST response's confirmationReason.

**Recommended checks when provider "is configured" but message appears:**  
- Confirm `RESEND_API_KEY` or `SENDGRID_API_KEY` is set in the **runtime** environment that serves `/api/waitlist` (e.g. Vercel → Project → Settings → Environment Variables → correct environment).  
- Call `GET /api/studio/pipeline-status` (with studio auth); if `emailConfigured: false`, the server process does not see either key.  
- Ensure no typo (e.g. `RESEND_API_KEY` not `RESEND_KEY`).  
- After changing .env.local, restart the dev server.

---

## I. MINIMUM FIX POINT(S), IF ANY

- **No code bug identified.** The behavior is consistent: provider_key_missing is returned only when both API keys are falsy at runtime. The controlled test reproduced this when keys were not set.
- **If the intent is to reduce confusion when keys are missing:** Optional improvement (not required for correctness): add a single log line in the waitlist route when `confirmationReason === "provider_key_missing"` (e.g. "RESEND_API_KEY and SENDGRID_API_KEY not set — confirmation not sent") so logs clearly state the cause. The email module already logs `[waitlist] confirmation provider=none reason=provider_key_missing to=...`.
- **Operational fix:** Set `RESEND_API_KEY` (or `SENDGRID_API_KEY`) in the environment that runs the API and redeploy or restart.
