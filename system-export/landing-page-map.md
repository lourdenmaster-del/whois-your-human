# Landing Page — Map, Flow, Expected Behavior, and Issues

## Page Structure (Visual Map)

```
┌─────────────────────────────────────────────────────────────────┐
│  HERO                                                            │
│  (L)igs · LIGS copy · "Begin your Light Identity Report →"      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  WHAT IS LIGS                                                    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  WHY IT MATTERS                                                  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  HOW IT WORKS                                                    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  BEGIN YOUR REPORT (section-5)                                   │
│  - Form: name, birthDate, birthTime, birthLocation, email       │
│  - Submit → generates report                                   │
│  - Output summary (reportId, snippet, vector_zero, image_prompts) │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  RESULTS (only when result exists)                              │
│  - Your Light Identity — Preview                                │
│  - Summary (emotional_snippet)                                  │
│  - Imagery Prompts (2 text cards)                               │
│  - Full report (View / expand)                                  │
│  - "Unlock your full report" + PayUnlockButton OR StaticButton  │
│  - Generate another report                                      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  FOOTER                                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Current Implementation)

### Flow A: User lands on `/` (no reportId)

```
1. Page loads → reportIdFromUrl = null
2. result = null → Results section hidden
3. User fills form → submits
4. handleFormSubmit(formData):
   - submitToEngine(formData) → POST /api/engine/generate
   - On success: setLastFormData(formData), fetchReportById(reportId)
   - URL updated to /?reportId=...
5. fetchReportById → GET /api/report/{reportId}
6. setResult({ reportId, emotional_snippet, image_prompts, vector_zero })
7. setFullReport(data.full_report)
8. Results section appears with:
   - PayUnlockButton (has lastFormData) → calls /api/beauty/dry-run on click
   - Preview modal → Proceed to /beauty/success?reportId=...
```

### Flow B: User lands on `/?reportId=xxx` (shared link / refresh)

```
1. Page loads → reportIdFromUrl = "xxx"
2. useEffect fetches GET /api/report/xxx
3. setResult(...), setFullReport(...)
4. lastFormData = null (never submitted this session)
5. Results section shows StaticButton (disabled)
6. "Generate another report" clears everything
```

---

## What It Should Do (Intended Behavior)

| Step | Expected behavior |
|------|-------------------|
| Form submit | Generate Light Identity Report via engine; show preview |
| Report display | Show emotional snippet, image prompts, full report (on demand) |
| Pay to Unlock | Option A (same session): dry-run preview → proceed to checkout/success |
| Pay to Unlock | Option B (arrived via URL): either create Beauty Profile first, or show disabled state |
| Checkout | Real Stripe session → pay $9.99 → email with Beauty Profile link |
| Email | User receives link to /beauty/view?reportId=... |

---

## What It Does Not Do (Issues)

### 1. PayUnlockButton → dry-run only, not real checkout

**What happens:** PayUnlockButton calls `/api/beauty/dry-run`, which runs `engine/generate` with `dryRun: true`. Returns mock data. "Proceed to Checkout" redirects to `/beauty/success?reportId=...` — **no Stripe**. User never pays.

**Why:** Dry-run was implemented for testing. No path wires PayUnlockButton to real Stripe checkout.

**Expected:** After preview, user should either (a) go to Stripe Checkout for $9.99, or (b) have a separate "Pay Now" that calls `create-checkout-session` with the same reportId (requires Beauty Profile to exist).

---

### 2. Beauty Profile never created for Landing reports

**What happens:** Landing uses `POST /api/engine/generate` only. That creates a **report** (ligs-reports/). It does **not** create a **Beauty Profile** (ligs-beauty/). Beauty Profiles are created by `/api/engine` (E.V.E. flow), which has the overwrite bug.

**Why:** The engine route overwrites `full_report` with `""` before E.V.E. runs → 502. So no Beauty Profile is ever saved. Even if we wired Stripe, `create-checkout-session` would 404 (BEAUTY_PROFILE_NOT_FOUND) because no profile exists for that reportId.

**Expected:** Either (a) fix the engine overwrite bug and run E.V.E. for Landing reports, or (b) have dry-run / Landing path create a Beauty Profile before checkout.

---

### 3. lastFormData lost on refresh / URL share

**What happens:** `lastFormData` is in React state. If user refreshes or shares `/?reportId=xxx`, state is lost. They see StaticButton (disabled) and cannot use PayUnlockButton.

**Why:** Form data is never persisted (no localStorage, no server session).

**Expected:** Either persist form data (e.g. localStorage keyed by reportId), or accept that shared links show StaticButton and require "Generate another report" to re-enable Pay.

---

### 4. StaticButton is dead-end

**What happens:** When `lastFormData` is null, user sees a disabled "Preview & Pay to Unlock" button. No way to pay or unlock from that state.

**Why:** No fallback to create Beauty Profile from existing reportId (would need to re-run E.V.E. with stored report — possible but not implemented).

**Expected:** Could add "Create Beauty Profile" that calls an API to build profile from existing report, then enables checkout. Or clearly say "Generate a report to unlock."

---

### 5. Dry-run preview shows placeholder images

**What happens:** `imageryPrompts` from dry-run are 3× the same 1×1 SVG placeholder. Carousel works but has no real imagery.

**Why:** DRY_RUN skips DALL·E. Placeholders used to satisfy UI.

**Expected:** For paid flow, would need real image generation. Dry-run is acceptable for testing.

---

### 6. Copy Report / Download JSON work, but Proceed goes nowhere real

**What happens:** Copy and Download work in the preview modal. "Proceed to Checkout" goes to `/beauty/success?reportId=...`. That page exists but no payment occurred.

**Why:** Flow is simulated.

**Expected:** Proceed could redirect to Stripe Checkout URL (from `create-checkout-session`) when Beauty Profile exists. Currently it cannot because no profile exists.

---

## Summary: Root Causes

| Issue | Root cause |
|-------|------------|
| No real payment path | PayUnlockButton uses dry-run only; no call to create-checkout-session |
| Checkout would fail anyway | No Beauty Profile for Landing reportIds (engine overwrite bug) |
| Shared links get StaticButton | lastFormData not persisted |
| StaticButton is dead | No "create profile from report" fallback |
| Preview images fake | DRY_RUN uses placeholders; no DALL·E in dry-run |

---

## Recommended Fix Order

1. **Fix engine overwrite bug** — Stop overwriting `full_report` in `/api/engine`. Enables Beauty Profile creation.
2. **Add real checkout path** — After preview, call `create-checkout-session` with reportId (requires Beauty Profile to exist first).
3. **Create Beauty Profile for Landing** — Either run E.V.E. after engine/generate for Landing, or have dry-run persist a profile before checkout.
4. **Persist lastFormData** (optional) — localStorage or similar so shared links can restore PayUnlockButton state.
