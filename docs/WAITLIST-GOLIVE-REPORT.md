# Waitlist go-live — production verification report

**Date:** 2026-03-10

---

## Commit and push

| Item | Value |
|------|--------|
| **Commit hash** | `2176383` |
| **Push status** | Pushed to `origin/main`: `914a55d..2176383 main -> main` |
| **Deployed commit on Vercel** | Confirm in Vercel Dashboard → Project → Deployments → latest production deployment. Expected: `2176383` (fix: waitlist counter and confirmation email for production). |

---

## Production tests (ligs.io)

| Test | Result |
|------|--------|
| **GET /api/waitlist/count** | `{"total":121}` — returns a number. |
| **Registry counter on /origin** | Open https://ligs.io/origin — "Registry nodes recorded: …" and annotation line should be visible. (Verified via count API; UI requires browser check.) |
| **POST /api/waitlist (test submission)** | `{"ok":true,"confirmationSent":true}` — API reports confirmation sent. |
| **Confirmation email actually sent** | Server response is `confirmationSent: true`, so Resend/SendGrid accepted the request. Check the test inbox for "Your identity query has been logged" to confirm delivery. |

---

## Vercel function logs

Check in Vercel Dashboard → Project → Logs (or Runtime Logs for the waitlist function):

- **waitlist entry received:** (masked email)
- **sending confirmation email**
- **email send result:** true
- If keys were missing you would see: `[waitlist] RESEND_API_KEY and SENDGRID_API_KEY not set — skipping confirmation email`

---

## Missing env vars

None identified from API behaviour. Production returned `confirmationSent: true`, so at least one of `RESEND_API_KEY` or `SENDGRID_API_KEY` is set, and `EMAIL_FROM` is set or defaulted.

If confirmation emails are not arriving, add or fix in Vercel → Settings → Environment Variables (Production):

| Exact name | Required | Purpose |
|------------|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Yes | Waitlist Blob storage and count. |
| `RESEND_API_KEY` **or** `SENDGRID_API_KEY` | Yes (one) | Sending confirmation email. |
| `EMAIL_FROM` | Recommended | From address (e.g. `LIGS <onboarding@resend.dev>` or your verified domain). |

---

## Summary

- **Commit:** `2176383` committed and pushed to `main`.
- **Count API:** Production returns `{"total":121}`.
- **Waitlist POST:** Production returns `ok: true`, `confirmationSent: true`.
- **Email:** Server reports send success; confirm delivery in inbox and in Vercel function logs.
- **Missing env vars:** None detected; if emails don’t arrive, verify the three names above in Vercel.
