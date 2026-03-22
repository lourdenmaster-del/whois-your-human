# LIGS Single Identity Spine — Refactor Report

**Date:** 2026-03-21  
**Objective:** Unify system around canonical rule: record MUST be created at free registration; all payment attaches to existing record.

---

## 1. Files Modified

| File | Changes |
|------|---------|
| `components/OriginTerminalIntake.jsx` | Removed prepurchaseBeautyDraft, setBeautyDraft; create record before checkout when no existingReportId; handlePurchaseClick creates record from formData when no reportId, FAKE_PAY → /whois/view |
| `app/api/stripe/create-checkout-session/route.ts` | Removed prePurchase; requires reportId only |
| `app/whois/success/page.jsx` | Replaced "Create your WHOIS record" → /whois/start with "Return to Origin" for legacy prePurchase/!reportId |
| `app/beauty/BeautyLandingClient.jsx` | Removed prepurchaseBeautyDraft, setBeautyDraft; create record before checkout |
| `components/PayUnlockButton.tsx` | FAKE_PAY redirect to /whois/view?reportId=... instead of /whois/start |
| `SYSTEM_SNAPSHOT.md` | Verification log entry |

---

## 2. Exact Changes Made

### OriginTerminalIntake.jsx

- **Removed imports:** `prepurchaseBeautyDraft`, `setBeautyDraft`
- **handleRunWhoisClick:** When no existingReportId, replaced prePurchase branch with: `submitToBeautySubmit(payload)` → `saveLastFormData(reportId, payload)` → checkout with `{ reportId }`
- **handlePurchaseClick:** When no reportId, creates record from `formDataRef.current` via `submitToBeautySubmit`, then checkout with reportId. FAKE_PAY redirects to `/whois/view?reportId=...`

### create-checkout-session/route.ts

- **Removed:** prePurchase body handling, prePurchase metadata, conditional productData
- **Required:** reportId only; 400 if missing
- **Always:** validates Beauty profile exists before creating session

### whois/success/page.jsx

- **Replaced:** prePurchase || !reportId block that linked to /whois/start
- **New:** Same block shows "Payment received. Return to Origin to complete intake." with link to /origin (for legacy sessions only)

### BeautyLandingClient.jsx

- **Removed imports:** prepurchaseBeautyDraft, setBeautyDraft
- **handleCtaPrimary:** Replaced prePurchase checkout with: `submitToBeautySubmit(formData)` → `saveLastFormData(reportId, formData)` → checkout with `{ reportId }`

### PayUnlockButton.tsx

- **FAKE_PAY:** `window.location.href = "/whois/start"` → `window.location.href = \`/whois/view?reportId=${reportId}\``

---

## 3. Before → After Behavior

### Submission (handleRunWhoisClick)

| Before | After |
|--------|-------|
| No existingReportId → setBeautyDraft, prepurchaseBeautyDraft (404), checkout with prePurchase | No existingReportId → submitToBeautySubmit, saveLastFormData, checkout with reportId |

### Checkout (handlePurchaseClick, CTA)

| Before | After |
|--------|-------|
| No reportId → checkout with prePurchase | No reportId → submitToBeautySubmit (formDataRef), saveLastFormData, checkout with reportId |

### Success flow

| Before | After |
|--------|-------|
| prePurchase or !reportId → "Create your WHOIS record" → link to /whois/start (empty form) | prePurchase or !reportId → "Payment received. Return to Origin." → link to /origin (legacy only; canonical flow never hits this) |

### FAKE_PAY

| Before | After |
|--------|-------|
| Redirect to /whois/start | Redirect to /whois/view?reportId=... |

---

## 4. Confirmation

- **No flow exists without reportId:** Checkout is only possible when reportId is present. If not in storage, record is created first.
- **No re-entry after payment:** Success page with reportId shows token handoff or "View your WHOIS record" → /whois/view. Never links to /whois/start.
- **prePurchase path removed:** create-checkout-session rejects requests without reportId. No client sends prePurchase.

---

## 5. Preserved

- `buildFreeWhoisReport()` — unchanged
- Agent endpoints (/api/agent/whois, prior, inspect) — use reportId only; no prePurchase dependency
- Middleware — legacy redirects unchanged
- Webhook — still handles prePurchase metadata for backwards compatibility with in-flight sessions; no new prePurchase sessions created
- verify-session — still returns prePurchase when session has it (legacy)
