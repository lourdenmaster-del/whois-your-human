# Pre-Push Sanity Checklist – LIGS

> Final verification checklist before pushing to main or deploying ligs.io.
> Prevents accidental Stripe charges, OpenAI calls, Blob corruption, or broken previews.

**Tags:** deployment, safety, stripe, openai, blob, checklist

---

## PURPOSE

Run this checklist before:

- Pushing to main
- Deploying to Vercel
- Tagging production release
- Connecting ligs.io to production build

This prevents accidental live charges, broken previews, or runtime crashes.

---

## 1. Git Diff Safety

Run:

```bash
git status
git diff --name-only
```

Confirm:

- Only intended frontend files changed
- No backend routes modified unintentionally
- No Stripe webhook changes
- No Blob write logic changed
- No OpenAI logic changed
- No new dependencies added to package.json

If unexpected files appear → **STOP and review.**

---

## 2. DRY_RUN Verification (Local)

Start local dev server.

Test: `/beauty?dryRun=1`

Confirm:

- Preview cards render mock data
- Placeholder images render
- Stripe does NOT redirect
- Console shows DRY_RUN logs
- No network calls to OpenAI
- No Blob writes occur

Then test: `/beauty/view?reportId=test&dryRun=1`

Confirm:

- Placeholder Beauty Profile renders
- Carousel works
- No crashes

---

## 3. Production Simulation (Local With Real Env Vars)

Temporarily disable dry run:

Ensure:

- OPENAI_API_KEY present
- BLOB_READ_WRITE_TOKEN present
- STRIPE_SECRET_KEY is **TEST** key (not live)

Test:

- Generate report
- Confirm Blob write occurs
- Preview cards show real Blob data
- Stripe session created (test mode only)

Confirm: Stripe dashboard shows test-mode session only.

---

## 4. Stripe Safety Check

Verify:

- No hardcoded Stripe live key
- No Stripe SDK embedded in frontend
- All checkout goes through: `POST /api/stripe/create-checkout-session`

If deploying to production:

- Confirm STRIPE_SECRET_KEY is LIVE key
- Confirm STRIPE_WEBHOOK_SECRET matches live endpoint

**Never mix test and live keys.**

---

## 5. Blob Safety Check

Confirm:

- All Blob reads go through API routes
- No client-side Blob token exposure
- No direct Blob writes in frontend
- saveReportAndConfirm unchanged
- saveBeautyProfileV1 unchanged

Test: Delete one image from Blob → verify UI fallback does not crash.

---

## 6. OpenAI Safety Check

Search project:

```
"openai"
"fetch("
"axios"
```

Confirm:

- No accidental calls in preview components
- No calls inside modal
- Only engine routes call OpenAI

If OpenAI key missing → server should not crash in dev.

---

## 7. Environment Variable Validation

In production environment, confirm required vars exist:

- OPENAI_API_KEY
- BLOB_READ_WRITE_TOKEN
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- RESEND_API_KEY or SENDGRID_API_KEY

If missing → deployment must fail early.

---

## 8. UI Verification (Manual)

Check on desktop + mobile: `/beauty`

Confirm:

- Preview cards render
- Modal opens smoothly
- Carousel swipe works
- Stripe button loads properly
- Test Mode badge visible in dev
- Layout matches /beauty/view

Then check: `/beauty/view?reportId=<real-id>`

Confirm:

- Subject name
- Emotional snippet
- 3 images load
- Accordion expands correctly
- Share link works

---

## 9. Console + Network Tab Check

Open browser dev tools.

Confirm:

- No 500 errors
- No unhandled promise rejections
- No CORS errors
- No Stripe errors
- No OpenAI calls during preview load

---

## 10. Final Production Readiness Check

Before pushing to main, ask:

- Does DRY_RUN still work?
- Does production still generate reports?
- Does Stripe test mode behave correctly?
- Are previews loading from Blob?
- Is anything accidentally calling OpenAI from UI?
- Is any backend file modified unintentionally?

If uncertain → **do not push.**

---

## GREEN LIGHT CONDITIONS

You may push when:

- All checklist items pass
- Only intended files modified
- No backend logic changed unintentionally
- No external calls happen in DRY_RUN
- Stripe test mode verified
- Preview parity confirmed

---

## RED FLAGS (DO NOT PUSH IF)

- Stripe live key appears in dev
- Preview components import OpenAI
- Blob token exposed client-side
- Checkout works in DRY_RUN
- Diff exceeds expected scope
- Unrelated refactors present

---

## END STATE

After this checklist passes:

- ligs.io can deploy safely
- No accidental charges
- No accidental OpenAI usage
- No Blob corruption
- Beauty landing + view parity confirmed
- Production environment validated

**Deployment risk minimized.**
