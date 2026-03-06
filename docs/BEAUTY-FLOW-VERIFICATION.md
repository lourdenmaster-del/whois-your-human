# Beauty Flow Verification

Verify the `/beauty` landing page, form persistence, preview cards, PayUnlockButton, and Stripe integration using DRY_RUN or mock data.

---

## Quick Start

```bash
# Terminal 1: start dev server
PORT=3000 npm run dev

# Terminal 2: run automated API checks
node scripts/verify-beauty-flow.mjs
# Or with custom base URL:
node scripts/verify-beauty-flow.mjs http://localhost:3000
```

---

## 1. Dev Server & Layout

- **Command:** `PORT=3000 npm run dev`
- **Confirm:** Server starts on `http://localhost:3000` (or `http://127.0.0.1:3000`)
- **Verify:** Navigate to `/beauty` — full layout: Hero, form, Results, PayUnlockButton, Footer

---

## 2. Form Persistence

| Step | Expected |
|------|----------|
| Fill form (name, birth data, email) and submit | `lastFormData` stored in localStorage under `ligs_lastFormData` |
| Refresh with `?reportId=<stored-reportId>` | Form pre-fills from localStorage |
| Click "Generate another report" | Form resets, localStorage cleared, `formKey` increments |

**Check localStorage:** DevTools → Application → Local Storage → `ligs_lastFormData` → `{ reportId, formData }`.

---

## 3. Landing Preview Cards

- **API:** `GET /api/report/previews`
- **DRY_RUN:** When Blob is empty, returns 3 mock cards (`preview-1`, `preview-2`, `preview-3`)
- **Each card:** subjectName (or "Anonymous"), emotional snippet, carousel of 3 images
- **Click card:** Opens modal with carousel, snippet, and "Proceed to checkout" button
- **`preview-X` cards:** "Proceed to checkout" navigates to `#section-5` (form section)

---

## 4. PayUnlockButton Flow

**Two-step flow:**

1. **"Preview & Pay to Unlock"**  
   - Calls `POST /api/beauty/dry-run` with `{ birthData, dryRun: true }`  
   - Opens modal with Beauty Profile preview (snippet, carousel, copy/download)  
   - Requires `lastFormData` (from form submit or restored via `?reportId=`)

2. **"Proceed to Checkout" (in modal)**  
   - Calls `POST /api/stripe/create-checkout-session` with `{ reportId }`  
   - **Dry-run reportId:** No Beauty Profile exists → 404 `BEAUTY_PROFILE_NOT_FOUND` → friendly error in modal  
   - **Real Beauty Profile:** Success → redirects to Stripe test page  
   - Button disabled during request ("Redirecting…"); shows "Stripe test mode — no real charges"

**Note:** Dry-run creates a report via engine/generate but does NOT create a Beauty Profile. Stripe checkout will 404 for dry-run reportIds — this is expected. Use the full E.V.E. flow at `/beauty` (via engine route) to create Beauty Profiles.

---

## 5. StaticButton Behavior

- **When:** `lastFormData` is null (e.g. user arrived via URL with no matching stored report)
- **Renders:** Disabled "Preview & Pay to Unlock" button with `title="Generate a report first to unlock"`
- **Verify:** Navigate to `/beauty` with no stored form data, or `/beauty?reportId=unknown` → StaticButton shown

---

## 6. Visual & Layout

- **Chrome & Safari:** All sections visible; spacing, colors, responsive layout
- **Carousel:** Prev/next buttons; swipe on mobile (LandingPreviews)
- **Modals:** Appear over content with correct z-index

---

## 7. Logging

| Event | Log / Console |
|-------|---------------|
| Form submit (E.V.E. flow) | `report_fetch_before_eve` in backend logs |
| Stripe session created | `stripe_session_created` with `reportId`, `testMode` |
| Checkout attempt (no profile) | `checkout_attempt` with `BEAUTY_PROFILE_NOT_FOUND` |

---

## Safety

- Use DRY_RUN or mock data when Blob is empty
- No real Stripe charges (test mode only)
- Frontend-only verification; engine overwrite fix already applied

---

## Troubleshooting

| Issue | Check |
|-------|------|
| Safari can't connect | Use `http://127.0.0.1:3000` |
| PayUnlockButton shows StaticButton | Ensure form was submitted and `lastFormData` in state; check `?reportId=` matches stored |
| "Proceed to Checkout" shows error | Expected for dry-run — no Beauty Profile. Use full `/beauty` E.V.E. flow for real checkout |
| Preview cards empty | API falls back to mock when Blob empty; verify `GET /api/report/previews` returns `previewCards` |
