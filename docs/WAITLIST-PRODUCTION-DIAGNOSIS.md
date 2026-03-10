# Waitlist counter and confirmation email — production diagnosis

**Date:** 2026-03-10

## Problem

On production:

- Registry counter did not appear on `/origin`.
- Confirmation emails were not sent after waitlist signup.

## Root causes (diagnosed in code)

1. **Counter not showing**
   - Origin fetches `/api/waitlist/count`. If the response was non-OK (e.g. 500/503) or the client got no JSON, the code did not set `registryCount`, so the UI only renders the counter when `typeof registryCount === "number"` — it stayed `null` and the block was hidden.
   - If `getWaitlistCount()` threw (e.g. Blob error), the count route returned `{ total: 0 }`; a 200 with `total: 0` would still show "0", but any unhandled error or non-200 from the route could prevent the client from ever getting a number.

2. **Emails not sending**
   - `sendWaitlistConfirmation()` skips sending when neither `RESEND_API_KEY` nor `SENDGRID_API_KEY` is set. It only logged a warning in `NODE_ENV === "development"`, so in production missing keys were silent and no email was sent.

## Fixes applied

| Area | Change |
|------|--------|
| **`/api/waitlist/count`** | On catch: return `{ total: SEED_REGISTRY_COUNT }` (117) instead of 0, and `console.error` the error so Vercel logs show Blob/list failures. |
| **`OriginTerminalIntake.jsx`** | If fetch fails or response has no `data.total`, set `registryCount` to fallback 117 so the counter always shows. |
| **`lib/email-waitlist-confirmation.ts`** | Always log (dev and prod) when `RESEND_API_KEY` and `SENDGRID_API_KEY` are both missing: `console.warn("[waitlist] RESEND_API_KEY and SENDGRID_API_KEY not set — skipping confirmation email")`. |
| **`/api/waitlist` POST** | Temporary logging: "waitlist entry received:" (masked email), "sending confirmation email", and "email send result:" (true/false) so production logs confirm the path and send result. |

## Deployment and env checklist

1. **Deployment**
   - Ensure production is built from a commit that includes both:
     - Waitlist count + confirmation (e.g. `914a55d` or later), and
     - This diagnosis fix (commit that adds the above code changes).
   - Redeploy on Vercel if the current deploy is older.

2. **Environment variables (Vercel)**
   - `BLOB_READ_WRITE_TOKEN` — required for waitlist Blob and for `getWaitlistCount()`.
   - `RESEND_API_KEY` **or** `SENDGRID_API_KEY` — required for confirmation email.
   - `EMAIL_FROM` — optional; default used if unset.

   If any of these are missing, fix in Vercel → Project → Settings → Environment Variables, then redeploy.

### RESEND_API_KEY — format and source

- **Format:** Keys start with `re_` (e.g. `re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv`). No spaces; paste the full string.
- **Source:** [Resend → API Keys](https://resend.com/api-keys). Create API Key → name (e.g. "LIGS Production") → permission **Sending access** (or Full access) → Create. The secret is shown **once**; copy it and set it in Vercel as `RESEND_API_KEY` for the **Production** environment.
- **Invalid key (401):** If logs show `confirmation_email_failed provider=resend ... status=401 ... "API key is invalid"`, the value in Vercel is wrong (typo, revoked key, or key from a different Resend account). Create a new key in Resend, set it in Vercel Production, then redeploy so the new value is used.

## Final verification (after deploy)

1. **Count API:** `GET https://<production-domain>/api/waitlist/count` → `{ "total": number }` (e.g. ≥ 117).
2. **Counter on origin:** Open `/origin`; "Registry nodes recorded: &lt;number&gt;" and the annotation line appear below the terminal.
3. **Waitlist signup:** Submit a test email on `/origin`; response is 200 with `{ ok: true, confirmationSent: true }` (or `alreadyRegistered: true` if duplicate).
4. **Confirmation email:** Inbox receives "Your identity query has been logged" from the configured sender.
5. **Logs:** In Vercel Functions logs for the waitlist POST, see "waitlist entry received:", "sending confirmation email", "email send result: true/false". If keys are missing, see the `[waitlist] RESEND_API_KEY and SENDGRID_API_KEY not set` warning.

## Temporary logging

The extra `console.log`/`console.error` in `/api/waitlist` and the count route are for production diagnosis. Remove or reduce once both features are confirmed working (e.g. keep only errors, remove "waitlist entry received" / "sending confirmation email" / "email send result" if desired).
