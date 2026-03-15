# Email Audit — WHOIS Registration Path (Read-Only)

**Scope:** Email send path only. No solar/report logic.  
**Problem:** UI shows "Confirmation dispatch: failed (provider not configured)" while provider is believed configured.

---

## A. FILES IN EMAIL FLOW

| Role | File |
|------|------|
| **Waitlist submit route** | `app/api/waitlist/route.ts` — POST: rate limit, Blob check, body parse, insert, new vs duplicate branches, builds report, calls `sendWaitlistConfirmation`, returns `confirmationSent` / `confirmationReason` / `report`. |
| **Duplicate branch (same route)** | `app/api/waitlist/route.ts` — When `result.alreadyRegistered`, loads entry; no-entry / cooldown / resend-attempt sub-branches; resend-attempt builds report and calls `sendWaitlistConfirmation(entry.email, report)`. |
| **Resend route (operator)** | `app/api/waitlist/resend/route.ts` — POST `{ email }`, studio auth, get entry, build report, `sendWaitlistConfirmation(entry.email, report)`, returns `confirmationSent` / `confirmationReason`. |
| **Report builder for email payload** | `lib/free-whois-report.ts` — `buildFreeWhoisReport(data)` produces `FreeWhoisReport`; route sets `report.artifactImageUrl = getRegistryArtifactImageUrl(...)` before calling send. |
| **Email render / template** | `lib/free-whois-report.ts` — `renderFreeWhoisReport(report, { siteUrl })` (HTML), `renderFreeWhoisReportText(report, { siteUrl })` (plain). Same body for Resend/SendGrid. |
| **Provider integration / send** | `lib/email-waitlist-confirmation.ts` — `sendWaitlistConfirmation(email, report)`: reads `RESEND_API_KEY`, `SENDGRID_API_KEY`; if both falsy returns `provider_key_missing`; else Resend (preferred) or SendGrid `fetch()`; returns `WaitlistConfirmationResult`. |
| **Env/config checks** | `lib/email-waitlist-confirmation.ts` — Only place that checks provider keys: `process.env.RESEND_API_KEY?.trim()`, `process.env.SENDGRID_API_KEY?.trim()` at start of `sendWaitlistConfirmation`. No pre-check in route. |
| **Map reason → UI message** | `components/OriginTerminalIntake.jsx` — `waitlistConfirmationLabel(reason)` maps API strings to display; `provider_key_missing` → `"failed (provider not configured)"`. |

---

## B. NEW SIGNUP EMAIL PATH

1. **Request received** — `app/api/waitlist/route.ts` POST: rate limit, `hasBlobToken` (503 if false), parse body, normalize email/source/birthDate/name/etc., compute preview_archetype/solar_season if birthDate.
2. **Insert** — `insertWaitlistEntry(...)` → Blob put; assume `result.alreadyRegistered === false`.
3. **Report built** — `report = buildFreeWhoisReport({ email, created_at, source, preview_archetype, solar_season, name, birthDate: birthDateRaw, ... })`, then `report.artifactImageUrl = getRegistryArtifactImageUrl(report.archetypeClassification, email)`.
4. **Send function called** — `sendResult = await sendWaitlistConfirmation(email, report)`.
5. **Provider init/config check** — Inside `sendWaitlistConfirmation`: `resendKey = process.env.RESEND_API_KEY?.trim()`, `sendgridKey = process.env.SENDGRID_API_KEY?.trim()`. If `!resendKey && !sendgridKey` → return `{ sent: false, reason: "provider_key_missing" }` (no fetch). Else continue.
6. **Provider request** — If resendKey: `fetch("https://api.resend.com/emails", { ... })`. If only sendgridKey: `fetch("https://api.sendgrid.com/v3/mail/send", { ... })`. Catch → return `provider_error`; non-2xx → return `provider_rejected`.
7. **API JSON to client** — `confirmationSent = sendResult.sent`, `confirmationReason = sendResult.reason`; if send threw, catch sets `confirmationReason = "provider_error"`. Return `NextResponse.json({ ok: true, alreadyRegistered: false, confirmationSent, confirmationReason, report })`.

---

## C. DUPLICATE/RESEND EMAIL PATH

1. **Duplicate detection** — Same route: `insertWaitlistEntry` returns `result.alreadyRegistered === true`.
2. **Load entry** — `entry = await getWaitlistEntryByEmail(email)`.
3. **Sub-branch** — If no entry: return with report (no send). If within cooldown: return with report (no send). Else **resend-attempt**: build report from entry (with `entry.birthDate || birthDateRaw`), set `report.artifactImageUrl`.
4. **Send function called** — `sendResult = await sendWaitlistConfirmation(entry.email, report)`.
5. **Provider init/config check** — Same as new signup: inside `sendWaitlistConfirmation`, both keys trimmed; if both falsy → `provider_key_missing`.
6. **Provider response/error** — Same as new signup. If send throws, route catch sets `dupConfirmationReason = "provider_error"`.
7. **API JSON to client** — `NextResponse.json({ ok: true, alreadyRegistered: true, confirmationSent: dupConfirmationSent, confirmationReason: dupConfirmationReason, report })`.

---

## D. EXACT SOURCE OF "provider not configured"

- **API value:** `confirmationReason === "provider_key_missing"`.
- **Set only here:** `lib/email-waitlist-confirmation.ts` lines 111–119:
  - `resendKey = process.env.RESEND_API_KEY?.trim()`
  - `sendgridKey = process.env.SENDGRID_API_KEY?.trim()`
  - `if (!resendKey && !sendgridKey) { console.warn("[waitlist] confirmation provider=none reason=provider_key_missing ..."); return { sent: false, reason: "provider_key_missing" }; }`
- **Route:** Does not set `provider_key_missing` itself. New signup: `confirmationReason = sendResult.reason`. Duplicate resend: `dupConfirmationReason = sendResult.reason` (or `"provider_error"` only in catch). So `provider_key_missing` always comes from `sendWaitlistConfirmation` return.
- **UI label:** `components/OriginTerminalIntake.jsx` — `waitlistConfirmationLabel("provider_key_missing")` → `"failed (provider not configured)"`.

No other error is mapped to `provider_key_missing`. Network/provider errors become `provider_error` or `provider_rejected`; only the “both keys falsy” branch returns `provider_key_missing`.

---

## E. CONFIG / ENV CHECK

| Item | Detail |
|------|--------|
| **Env var names in code** | `RESEND_API_KEY`, `SENDGRID_API_KEY`. Read in `lib/email-waitlist-confirmation.ts` as `process.env.RESEND_API_KEY?.trim()`, `process.env.SENDGRID_API_KEY?.trim()`. |
| **When checked** | At runtime, at the start of each `sendWaitlistConfirmation()` call. Not at build time. |
| **Missing/blank/trimmed** | If either key is undefined, empty string, or whitespace-only, `.trim()` yields `""` → falsy. Both falsy → `provider_key_missing`. |
| **Scope** | Keys must be in the **runtime** environment of the process that executes the API route (e.g. Node server, Vercel serverless). If set only in build env, or in a different Vercel environment (e.g. Preview vs Production), the running API may not see them. `.env.local` is loaded by Next.js for the dev server; Vercel env vars must be set per environment and are injected at runtime. |

No other module sets or overrides these for the waitlist email path. Pipeline-status (`/api/studio/pipeline-status`) reads the same vars for `emailConfigured: Boolean(resend \|\| sendgrid)` and can be used to confirm what the server sees.

---

## F. ACTUAL TEST RESULTS

**Environment:** Local (server handling requests had no RESEND_API_KEY or SENDGRID_API_KEY set in process).

| Test | confirmationSent | confirmationReason |
|------|------------------|--------------------|
| **New signup** (POST with email + birthDate) | `false` | `"provider_key_missing"` |
| **Duplicate** (second POST same email + birthDate) | `false` | `"provider_key_missing"` |

So in this run, both paths received `provider_key_missing` from `sendWaitlistConfirmation` because both keys were falsy in that process. No send was attempted; no provider request was made.

---

## G. EMAIL CONTENT CHECK

When a send is attempted, the following are used (from `lib/email-waitlist-confirmation.ts` and `lib/free-whois-report.ts`):

| Item | Value / source |
|------|----------------|
| **Subject** | `"Your identity query has been logged"` (constant in email module). |
| **From** | `process.env.EMAIL_FROM?.trim() \|\| "LIGS <onboarding@resend.dev>"`. |
| **Recipient** | `email` argument (to: [email] for Resend; personalizations for SendGrid). |
| **Solar Segment in body** | Yes. `renderFreeWhoisReport` includes `recordRows` with `row("Solar Segment", report.solarSignature)`; plain text has `"Solar Segment: " + report.solarSignature`. |
| **Archetype Classification** | Yes. Same table row; plus section "ARCHETYPE EXPRESSION" with "Archetype Classification: {report.archetypeClassification}". |
| **Artifact / report preview** | Yes. HTML uses `report.artifactImageUrl` in an `<img>` block; both HTML and text include full registry record and sections. |
| **Labels** | Single canonical "Solar Segment" (no "Solar Signature"); "Archetype Classification" and other labels consistent in template. |

---

## H. ROOT CAUSE

"Provider not configured" is **not** from a collapsed or misreported error. It is returned only when `sendWaitlistConfirmation()` sees **both** `process.env.RESEND_API_KEY?.trim()` and `process.env.SENDGRID_API_KEY?.trim()` falsy at the moment of the call.

So if the UI shows "Confirmation dispatch: failed (provider not configured)", the **runtime that served that request** did not have a usable Resend or SendGrid key. Common causes:

1. **Keys not set** in the environment that runs the API (e.g. missing from `.env.local` or Vercel env for that deployment).
2. **Wrong scope** — e.g. keys set only for Build or only for Production while the request ran on Preview.
3. **Empty/whitespace** — variable set to `""` or spaces so `.trim()` is falsy.
4. **Process not restarted** after adding keys to `.env.local`.
5. **Typo** — e.g. `RESEND_KEY` instead of `RESEND_API_KEY`.

There is no code path that maps network failure, 4xx/5xx, or thrown errors to `provider_key_missing`; those become `provider_error` or `provider_rejected`.

---

## I. MINIMUM FIX POINT

**No code bug identified.** The behavior is correct: `provider_key_missing` is used only when both provider keys are falsy at runtime.

**Operational fix:** Ensure at least one of `RESEND_API_KEY` or `SENDGRID_API_KEY` is set and non-empty in the **runtime** environment that serves `POST /api/waitlist` (and `/api/waitlist/resend` if used):

- **Local:** Set in `.env.local`, then restart the dev server.
- **Vercel:** Set in Project → Settings → Environment Variables for the environment that handles the request (Production/Preview/etc.); redeploy if needed.

**Optional verification:** Call `GET /api/studio/pipeline-status` (with studio auth). If `emailConfigured` is `false`, the server process does not see either key.

No change to solar or report logic; email flow only.
