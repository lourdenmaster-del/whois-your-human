# LIGS Registry Counter & Waitlist Email — Audit Report

**Date:** 2026-03-10  
**Scope:** /origin registry counter visibility and behavior; waitlist confirmation email flow and delivery confidence.

---

## 1. Registry counter — inspection

### Where it is rendered

- **File:** `components/OriginTerminalIntake.jsx`
- **Location:** Lines 760–779, inside the same outer wrapper as the protocol nav (below the aperture).
- **Markup:** A `div` with `whois-fade-in` animation containing:
  - `Registry nodes recorded: {registryCount}`
  - `Full identity reports released to registry members first.`
- **Styling:** `font-mono`, `text-[13px]` / `text-[11px]`, silver/gray (`rgba(180,182,190,0.78)` and `rgba(160,162,170,0.62)`). No buttons or extra tap targets.

### What controls visibility

- **Condition:** `phase !== "idle" && phase !== "handshake" && typeof registryCount === "number"`
- **Behavior:**
  - **Hidden** when `phase === "idle"` (initial WHOIS line only).
  - **Hidden** when `phase === "handshake"` (protocol lines after name).
  - **Visible** when phase is `intake`, `processing`, `completeAwaitingEnterRedirect`, or `executing`, and `registryCount` is a number.

So the counter is **hidden during idle and handshake only**; it is **not** removed from the app. It appears as a footer-style line once the user has passed the handshake.

### How it fetches the count

- **Effect:** Single `useEffect` with empty dependency array (runs once on mount).
- **Request:** `fetch("/api/waitlist/count")`.
- **Success:** If `r.ok` and `data.total` is a number, `setRegistryCount(data.total)`.
- **Fallback:** If response not OK, or `data.total` missing, or fetch throws, `setRegistryCount(FALLBACK_COUNT)` where `FALLBACK_COUNT = 117`.
- **No refetch** after a successful waitlist signup; the number stays at initial load until the user refreshes.

### Does it use `/api/waitlist/count`?

- **Yes.** The client calls `GET /api/waitlist/count` only.

### Summary

- **Desired:** Hidden during idle; hidden during handshake; visible after handshake / during intake and later; footer-like; real count endpoint; no flicker, no broken placeholder, no noisy styling.
- **Actual:** Matches. Visibility is correct; styling is minimal and secondary; endpoint is used; fallback avoids broken state. No code change required for the counter itself.

**Optional improvement:** Refetch count after successful waitlist POST so the footer updates without reload (not requested; document only).

---

## 2. Waitlist email — flow verification

### app/api/waitlist/route.ts

- **Rate limit:** Applied first via `checkRateLimit(getRateLimitKey(req))`; 429 if exceeded.
- **Blob token:** Required. If `BLOB_READ_WRITE_TOKEN` missing or empty → 503 "Waitlist not configured".
- **Body:** JSON with `email` (required), optional `source`, `birthDate`, `preview_archetype`, `solar_season`. Email validated with regex.
- **Archetype/season:** If `birthDate` present, server computes `preview_archetype` and `solar_season`; client-supplied values can be overridden.
- **Blob write:** `insertWaitlistEntry({ email, source, preview_archetype, solar_season })` from `@/lib/waitlist-store`. This performs dedupe and write.
- **Duplicate:** If `result.alreadyRegistered === true`, returns `200 { ok: true, alreadyRegistered: true }` and **does not** call `sendWaitlistConfirmation`.
- **New signup:** Logs `[waitlist] entry_received to=<masked>`, then `sendWaitlistConfirmation(email, payload)` in a try/catch. Returns `200 { ok: true, confirmationSent }`. If the send throws, logs `[waitlist] confirmation_email_error` and returns `200 { ok: true, confirmationSent: false }`.
- **Blob failure:** Any throw from `insertWaitlistEntry` is caught; logs `[waitlist] Blob write failed` and returns 500. Email is **never** attempted if the write fails.

### lib/waitlist-store.ts

- **Dedupe:** `insertIfNew` calls `existsByEmail(email)` (Blob `head` on `ligs-waitlist/entries/{sha256(email).slice(0,32)}.json`). If the blob exists, returns `{ inserted: false }`; no `put`.
- **Blob write:** Only when `!existsByEmail`; `put(path, JSON.stringify(payload), { access: "public", addRandomSuffix: false, contentType: "application/json" })`.
- **Return:** `insertWaitlistEntry` returns `{ ok: true, alreadyRegistered: true }` when duplicate, `{ ok: true }` when new.

### lib/email-waitlist-confirmation.ts

- **API keys:** `RESEND_API_KEY` or `SENDGRID_API_KEY` (either). If both missing: `console.warn("[waitlist] SKIP_CONFIRMATION_EMAIL: RESEND_API_KEY and SENDGRID_API_KEY not set")` and returns `false`.
- **From address:** `EMAIL_FROM` trimmed or `DEFAULT_FROM` (`"LIGS <onboarding@resend.dev>"`). Resend path: if `from` has no `<>`, wraps as `LIGS <${from}>`.
- **Resend:** `fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [email], subject, html, text }) })`.
- **Logging:**
  - Before send: `[waitlist] sending_confirmation provider=resend to=<masked>`.
  - Success: `[waitlist] confirmation_email_sent provider=resend ... status=... id=...`.
  - Failure (non-2xx): `[waitlist] confirmation_email_failed provider=resend ... status=... body=...`.
- **Return:** `true` on 2xx, `false` otherwise; exceptions propagate.

### Confirmation

| Question | Answer |
|----------|--------|
| Where does Blob write happen? | `lib/waitlist-store.ts`: `insertIfNew` → `put()` for new entries only. |
| Where does dedupe happen? | `waitlist-store`: `existsByEmail` (head) before `put`; route treats `result.alreadyRegistered` and skips email. |
| Where is email send triggered? | `app/api/waitlist/route.ts` after successful `insertWaitlistEntry` and only when `!result.alreadyRegistered`. |
| What conditions suppress email? | (1) Duplicate (`alreadyRegistered`). (2) No Resend and no SendGrid key (warn, return false). (3) Send throws (route catch, return false). (4) Resend/SendGrid returns non-2xx (log, return false). |
| Duplicate submissions? | 200 `{ ok: true, alreadyRegistered: true }`; no second email. |
| Errors swallowed or surfaced? | Blob errors → 500 and logged. Email errors → 200 with `confirmationSent: false`, logged (warn or error). Client sees success either way; ops see logs. |
| Send failures logged clearly? | Yes: `confirmation_email_error` (throw), `confirmation_email_failed` (non-2xx), and (after fix) route-level `signup_ok confirmation_not_sent` when `confirmationSent === false`. |

---

## 3. Delivery confidence

| Check | Status |
|-------|--------|
| `process.env.RESEND_API_KEY` used correctly? | Yes. Trimmed; used as Bearer token for Resend API. |
| `EMAIL_FROM` required / validated? | Not required. Optional; trimmed; fallback `LIGS <onboarding@resend.dev>`. |
| Sender format acceptable for Resend? | Yes. `"Name <email>"` or `"LIGS <email>"`; Resend accepts default `onboarding@resend.dev` without verification. |
| Email only after successful waitlist write? | Yes. Email code path is only reached after `insertWaitlistEntry` returns without throwing and `!result.alreadyRegistered`. |

**Conclusion:** With `RESEND_API_KEY` (or `SENDGRID_API_KEY`) and `BLOB_READ_WRITE_TOKEN` set, and optionally `EMAIL_FROM` for a custom sender, production **can** send confirmation emails successfully. No code bug blocks delivery.

---

## 4. Safe manual test plan (non-technical)

1. **Submit a test entry**
   - Go to the live site (e.g. https://ligs.io/origin).
   - Complete the WHOIS flow: name → handshake → birth date → time → place → email.
   - Use a real inbox you control (e.g. Gmail) for the contact email.
   - Submit and wait for the “Contact node recorded” / “Confirmation signal transmitted” screen.

2. **Success response**
   - Terminal shows: “Contact node recorded.”, “Identity query logged.”, “Confirmation signal transmitted.”, then “Press ENTER or tap to continue”.
   - (If “Identity record already exists.” and “Contact node verified.”, the email was already registered; no second email is sent.)

3. **Verify email delivery**
   - Check inbox (and spam) for subject: “Your identity query has been logged”.
   - Sender should be LIGS (or the configured `EMAIL_FROM`). Body: registry notice, artifact image, “Return to the registry” link.

4. **Verify duplicate behavior**
   - Run the same flow again with the **same** email.
   - Terminal should show: “Identity record already exists.” and “Contact node verified.” (no “Confirmation signal transmitted”).
   - Inbox should **not** receive a second confirmation for that email.

---

## 5. Surgical fix applied

- **Change:** In `app/api/waitlist/route.ts`, after the confirmation send try/catch, if `confirmationSent === false`, log: `[waitlist] signup_ok confirmation_not_sent to=<masked>`.
- **Reason:** Makes it easy to see in production logs when a signup succeeded but the confirmation email was skipped (missing keys or send failure) without changing API contract or client behavior.

---

## 6. Final report

### Files inspected

- `components/OriginTerminalIntake.jsx` (registry counter state, fetch, render, visibility).
- `app/api/waitlist/route.ts` (POST flow, Blob, dedupe, email call).
- `app/api/waitlist/count/route.ts` (GET count, seed, error fallback).
- `lib/waitlist-store.ts` (insert, dedupe, Blob paths).
- `lib/waitlist-list.ts` (getWaitlistCount, list implementation).
- `lib/email-waitlist-confirmation.ts` (Resend/SendGrid, env, logging).

### Files changed

- **app/api/waitlist/route.ts** — Added one log line when `confirmationSent === false`: `console.warn("[waitlist] signup_ok confirmation_not_sent to=" + maskEmail(email))`.

No other files modified. Registry counter logic and styling left as-is (already correct).

### Registry counter status

- **Working as intended.** Hidden during idle and handshake; visible afterward; uses `/api/waitlist/count`; footer-like; fallback 117 on error; no flicker or broken placeholder.

### Waitlist email status

- **Flow correct.** Blob write and dedupe in `waitlist-store`; email only for new signups after successful write; duplicates get 200 and no second email. Resend (and SendGrid) used correctly; failures and missing keys logged.

### Production confirmation emails

- **Yes.** With `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY` (or `SENDGRID_API_KEY`), and optionally `EMAIL_FROM` set in the deployment environment, confirmation emails will be sent for new signups. Missing keys or send errors are logged and do not change the 200 success response.

### Remaining risks

- **Count not refetched after signup:** Footer shows initial count until page reload. Acceptable; can add a refetch after successful POST if desired.
- **Resend/SendGrid limits:** Subject to provider rate limits and quotas; 429/5xx will be logged and `confirmationSent` will be false.
- **EMAIL_FROM unverified:** If using a custom domain/address, it must be verified in the provider dashboard; otherwise delivery may fail (logged as `confirmation_email_failed`).
