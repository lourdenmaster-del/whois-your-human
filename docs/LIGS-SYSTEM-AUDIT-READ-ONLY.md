# LIGS / WHOIS System Audit — Read-Only Ground Truth

**Date:** 2026-03-20  
**Scope:** Full system map — user flow, state, APIs, payment, unlock, agent surfaces  
**Method:** Code tracing only; no modifications or suggestions.

---

## SECTION 1 — ENTRY FLOW

### What happens when a user lands on the site

1. **Root `/`**  
   - `middleware.ts`: pathname `/` → rewrite to `/origin` (URL stays `/`)
   - `app/page.tsx`: root fallback redirects to `/origin` if middleware bypassed

2. **Legacy `/beauty` and `/beauty/*`**  
   - `middleware.ts` (lines 62–74, 82–84): `/beauty/start`, `/beauty/success`, `/beauty/cancel`, `/beauty/view` → 308 to `/whois/*` equivalents; remaining `/beauty` → 308 to `/origin`

3. **Actual landing page**  
   - `app/origin/page.jsx` renders `OriginTerminalIntake`
   - `components/OriginTerminalIntake.jsx` is the single intake component

### What happens when a user enters birth data

- **Fields (in order):** `name`, `birthDate`, `birthPlace`, `birthTime`, `email` (`INTAKE_FIELDS`, line 42)
- **Validation:**  
  - `parseDate()` (line 329) for birthDate  
  - `parseTime()` (line 352) for birthTime  
  - `isValidEmail()` (line 369) for email
- **State:** React `formData` (lines 259–264), `resolvedArchetypeFromDate` (from `resolveArchetypeFromDate(formData.birthDate)`)
- **Storage during flow:** No API call until submit; no localStorage write until `beginRegistryReveal()` or `saveLastFormData()`

### What happens when a user submits the form

- **Phase:** `phase === "executing"` → `executeSubmitRef.current?.()` (line 454)
- **Handler:** `handleRunWhoisClick` (lines 384–448)

**Branch logic (exact order):**

1. **WAITLIST_ONLY** (`NEXT_PUBLIC_WAITLIST_ONLY !== "0"`):  
   - POST `/api/waitlist` with `{ email, source, birthDate, name, birthPlace, birthTime, preview_archetype }`  
   - On success: `beginRegistryReveal()`  
   - No report generation, no Stripe

2. **unlocked || dryRun || TEST_MODE:**  
   - `submitToBeautyDryRun(payload)` or `submitToBeautySubmit(payload)`  
   - `saveLastFormData(reportId, payload)`  
   - `beginRegistryReveal()`

3. **FAKE_PAY:**  
   - `setBeautyUnlocked()`  
   - `submitToBeautySubmit(payload)`  
   - `saveLastFormData(reportId, payload)`  
   - `beginRegistryReveal()`

4. **existingReportId** (from `loadLastFormData()?.reportId`):  
   - POST `/api/stripe/create-checkout-session` with `{ reportId }`  
   - Redirect to Stripe

5. **No existingReportId:**  
   - `setBeautyDraft(payload)` (localStorage)  
   - `prepurchaseBeautyDraft(payload)` → POST `/api/beauty/prepurchase` (route does not exist; call fails, `draftId` remains null)  
   - POST `/api/stripe/create-checkout-session` with `{ prePurchase: true, ...(draftId && { draftId }) }`  
   - Redirect to Stripe

### Components and files

| Step | Component / File | Action |
|------|------------------|--------|
| Landing | `OriginTerminalIntake` | Intake UI |
| Submit | `handleRunWhoisClick` | Branch logic |
| API calls | `lib/engine-client.js` | `submitToBeautySubmit`, `submitToBeautyDryRun`, `prepurchaseBeautyDraft` |
| State | `lib/landing-storage.js` | `saveLastFormData`, `loadLastFormData`, `setBeautyDraft` |

### Data passed between layers

- **Form payload:** `{ name, birthDate, birthTime, birthLocation, email }` (mapped to `fullName`, `birthTime`, `birthLocation` in `buildEnginePayload`)
- **Storage keys:** `ligs_lastFormData`, `ligs_beauty_draft`, `ligs_beauty_unlocked`, `ligs_origin_intake`

---

## SECTION 2 — ARTIFACT GENERATION

### Free WHOIS / prior / report artifact

| Artifact | Where generated | Deterministic? | Cached? | Regenerated? |
|----------|-----------------|----------------|----------|--------------|
| **Free WHOIS (waitlist)** | `lib/free-whois-report.ts` → `buildFreeWhoisReport()` | Yes (birthDate → solar segment → archetype) | No | Per waitlist POST |
| **Paid WHOIS report** | `app/api/engine` or `app/api/engine/generate` | No (LLM) | Yes (Blob report-store, Beauty profile-store) | Only on create |
| **Dry-run report** | `app/api/beauty/dry-run` → `/api/engine/generate` with `dryRun: true` | Partially (no DALL·E) | Yes (BeautyProfileV1 to Blob when configured) | Per dry-run call |

### Functions and flow

- **Waitlist report:** `app/api/waitlist/route.ts` → `buildFreeWhoisReport()` → `enrichReportChrono()` → returned in JSON; no `reportId`
- **Paid report:** `app/api/beauty/submit/route.ts` → `deriveFromBirthData()` → `fetch(engineUrl)` → engine returns `reportId`; engine writes to report-store and Beauty profile-store
- **Dry-run:** `app/api/beauty/dry-run/route.ts` → `fetch(engineUrl)` with `dryRun: true` → `saveBeautyProfileV1()` when Blob configured

### reportId creation

- **reportId** is created inside the engine (`app/api/engine/route.ts` or `app/api/engine/generate/route.ts`) when a report is generated
- Returned via `engineData.data.reportId` or `engineData.reportId`
- Stored in `ligs_lastFormData` by `saveLastFormData(reportId, formData)` when client receives it

---

## SECTION 3 — IDENTITY RECORD

### Canonical identity record

- **Report record:** Stored report + Beauty profile, keyed by `reportId`
- **Free record:** `FreeWhoisReport` from `buildFreeWhoisReport()` — `registryId` = `generateLirId(seed)` where `seed = wl-{created_at}-{email}`

### Identifiers in use

| Identifier | Purpose | Where set | Where checked |
|------------|---------|-----------|---------------|
| `reportId` | Report + Beauty profile key | Engine on generation | Stripe metadata, verify-session, webhook, agent endpoints |
| `prePurchase` | Pay-first (no report yet) | Stripe metadata `prePurchase: "1"` | verify-session, success page, webhook |
| `ligs_lastFormData` | `{ reportId, formData }` | `saveLastFormData()` | `loadLastFormData()` |
| `ligs_beauty_draft` | Pre-payment form data | `setBeautyDraft()` | `getBeautyDraft()` (not used by `/whois/start`) |
| `ligs_beauty_unlocked` | Post-payment unlock flag | `setBeautyUnlocked()` | `isBeautyUnlocked()` |
| `ligs_execution_key` | Post-checkout grant | verify-session, sessionStorage | engine-execution-grant |

### Closest equivalent when no report

- **Waitlist:** `FreeWhoisReport` (in-memory + email); no server-side `reportId`
- **PrePurchase:** Draft in localStorage only; `/api/beauty/prepurchase` route does not exist

---

## SECTION 4 — STATE MODEL (CURRENT)

### States

| State | Where set | How checked | Trigger |
|-------|-----------|-------------|---------|
| **idle** | Initial | `phase === "idle"` | Page load |
| **intake** | After name Enter | `phase === "intake"` | Field advance |
| **processing** | `advanceToProcessing()` | `phase === "processing"` | Email entered |
| **executing** | Processing effect | `phase === "executing"` | Processing complete, !WAITLIST_ONLY |
| **registryReveal** | `beginRegistryReveal()` | `phase === "registryReveal"` | Waitlist success, submit success, FAKE_PAY success |
| **completeAwaitingEnterRedirect** | `goToErrorAndComplete()` | `phase === "completeAwaitingEnterRedirect"` | Error |
| **unlocked** | `setBeautyUnlocked()` | `isBeautyUnlocked()` | Success page after paid |
| **reportId in storage** | `saveLastFormData(reportId, formData)` | `loadLastFormData()?.reportId` | Submit success |
| **draft in storage** | `setBeautyDraft(payload)` | `getBeautyDraft()` | Pre-checkout, prePurchase path |

### Transitions

- **idle → intake:** Enter on name
- **intake:** Advance through birthDate → birthPlace → birthTime → email
- **email Enter → processing:** `advanceToProcessing()`
- **processing → executing:** `processingIndex >= PROCESSING_MESSAGES.length`, !WAITLIST_ONLY
- **executing → registryReveal:** `handleRunWhoisClick` success (submit or waitlist)
- **executing → completeAwaitingEnterRedirect:** `handleRunWhoisClick` error
- **executing → Stripe redirect:** Checkout session URL returned

---

## SECTION 5 — PAYMENT FLOW

### Checkout creation

- **Route:** `app/api/stripe/create-checkout-session/route.ts`
- **Input:** `{ reportId?: string, prePurchase?: boolean }`
- **Logic:**  
  - `prePurchase = body?.prePurchase === true || (!reportId && body?.reportId === undefined)`  
  - If `!prePurchase && reportId`: validate Beauty profile exists  
  - `success_url`: `${origin}/whois/success?session_id={CHECKOUT_SESSION_ID}`  
  - `cancel_url`: `${origin}/whois/cancel`  
  - `metadata`: `{ prePurchase: "1" }` or `{ reportId }`

### On success

- **Redirect:** Stripe → `/whois/success?session_id=cs_xxx`
- **Success page:** `app/whois/success/page.jsx`  
  - GET `/api/stripe/verify-session?session_id=...`  
  - If `paid`: `setBeautyUnlocked()`, set `reportId`, `prePurchase`, `entitlementToken`, `executionKey` (sessionStorage)  
  - If `prePurchase || !reportId`: show "Create your WHOIS record" → link to `/whois/start`  
  - If `reportId` and `entitlementToken`: show token handoff + link to `/whois/view`  
  - If `reportId` but no token: poll verify-session up to 3× every 2s

### On failure

- **Cancel:** Stripe → `/whois/cancel` (`app/whois/cancel/page.jsx`)

### Webhook

- **Route:** `app/api/stripe/webhook/route.ts`
- **Event:** `checkout.session.completed`
- **If prePurchase:** return 200, no token mint, no email
- **If reportId:** load Beauty profile, mint entitlement if missing, POST `/api/email/send-beauty-profile` with `{ reportId, email }`

### Payment behavior

- **Unlock:** Payment unlocks an **existing** report (reportId checkout). Does not create a new report.
- **PrePurchase:** Payment does not create a report. User must create report via `/whois/start` after payment.
- **Re-entry:** PrePurchase success sends user to `/whois/start`. That page uses `loadLastFormData()` for pre-fill; `loadLastFormData()` returns `null` when there is no `reportId`. Draft is in `getBeautyDraft()` but `/whois/start` never calls it. PrePurchase users see an empty form.

---

## SECTION 6 — UNLOCK LOGIC

### What "unlock" does

1. **localStorage:** `ligs_beauty_unlocked` = `"1"` via `setBeautyUnlocked()`
2. **Cookie:** `WYH_CONTENT_GATE_COOKIE` set by verify-session
3. **Entitlement token:** Minted by webhook for reportId checkout; stored server-side; returned by verify-session
4. **Execution key:** Created by `createEngineExecutionGrant()` in verify-session; stored in sessionStorage as `ligs_execution_key`

### Locked vs unlocked

| Check | Location | Condition |
|-------|----------|-----------|
| `isBeautyUnlocked()` | `lib/landing-storage.js` | `localStorage.getItem(BEAUTY_UNLOCK_KEY) === "1"` |
| `/whois/start` access | `app/whois/start/page.jsx` | `isBeautyUnlocked() || dryRun || TEST_MODE || testModeFromUrl`; else redirect to `/origin` |
| Agent WHOIS | `app/api/agent/whois/route.ts` | `getAgentEntitlementByToken(token)` and `entitlement.reportId === reportId` |

### Files

- `lib/landing-storage.js`: `setBeautyUnlocked`, `isBeautyUnlocked`
- `lib/wyh-content-gate.ts`: cookie
- `lib/agent-entitlement-store.ts`: token mint/validate
- `lib/engine-execution-grant.ts`: execution key

---

## SECTION 7 — AGENT SURFACES

### GET /api/agent/inspect

- **File:** `app/api/agent/inspect/route.ts`
- **Auth:** None
- **Output:** JSON with `schema`, `canonical_entrypoint`, `public_resources`, `protected`, `tools`, `recommended_inspection_order`
- **Data source:** Static config
- **Payment:** No dependence

### GET /api/agent/prior

- **File:** `app/api/agent/prior/route.ts`
- **Input:** `reportId` (query), `Authorization: Bearer <token>` or `token` (query)
- **Logic:** Fetches `/api/agent/whois?reportId=...` with token; returns subset: `derived_structure`, `agent_guidance`, `agent_summary`
- **Data source:** `/api/agent/whois`
- **Payment:** Requires valid entitlement token (post-checkout)

### GET /api/agent/whois

- **File:** `app/api/agent/whois/route.ts`
- **Input:** `reportId` (query), `Authorization: Bearer <token>` or `token` (query)
- **Auth:** `getAgentEntitlementByToken(token)`; token must match `reportId`
- **Output:** Full agent calibration record (registry, human, measured_context, derived_structure, agent_guidance, verification, agent_summary)
- **Data source:** `getReport(reportId)`, `loadBeautyProfileV1(reportId)`, `getLatestFeedbackForReport(reportId)`
- **Payment:** Requires active entitlement (webhook mints after reportId checkout)

### Other agent routes

- `app/api/agent/feedback/route.ts`
- `app/api/agent/stance/route.ts` (GET/POST)
- `app/api/agent/register/route.ts`
- `app/api/agent/prior-format/route.ts`
- `app/api/agent/drift-check/route.ts`

---

## SECTION 8 — DATA FLOW MAP

```
User Input (OriginTerminalIntake)
  → parseDate, parseTime, isValidEmail (client)
  → formData state
  → handleRunWhoisClick
  → [WAITLIST] POST /api/waitlist
      → buildFreeWhoisReport(), enrichReportChrono()
      → insertWaitlistEntry, sendWaitlistConfirmation
      → beginRegistryReveal()
  → [SUBMIT] submitToBeautySubmit / submitToBeautyDryRun (engine-client)
      → POST /api/beauty/submit or /api/beauty/dry-run
      → deriveFromBirthData (beauty/submit)
      → fetch /api/engine (beauty/submit) or /api/engine/generate (dry-run)
  → [CHECKOUT reportId] POST /api/stripe/create-checkout-session { reportId }
  → [CHECKOUT prePurchase] setBeautyDraft, prepurchaseBeautyDraft (404), POST create-checkout-session { prePurchase: true }

Storage
  → saveLastFormData(reportId, formData) — after submit success
  → setBeautyDraft(payload) — before prePurchase checkout

Payment (Stripe)
  → success_url: /whois/success?session_id={CHECKOUT_SESSION_ID}
  → Webhook: checkout.session.completed
      → prePurchase: 200 only
      → reportId: loadBeautyProfileV1, mintAgentEntitlementToken, POST send-beauty-profile

Unlock
  → setBeautyUnlocked() — success page
  → WYH_CONTENT_GATE_COOKIE — verify-session
  → entitlementToken — webhook (reportId only)
  → executionKey — verify-session, sessionStorage

Retrieval
  → /whois/view?reportId=... — BeautyViewClient fetches /api/beauty/[reportId]
  → GET /api/agent/whois?reportId=... — Bearer token
  → GET /api/agent/prior?reportId=... — Bearer token
```

---

## SECTION 9 — DUPLICATION / CONFLICT POINTS

1. **Two IDs for same user journey:**  
   - `reportId` (report-first) vs `prePurchase` (pay-first). Different checkout bodies, different success behavior, different webhook behavior.

2. **Draft storage vs pre-fill:**  
   - `setBeautyDraft(payload)` before prePurchase checkout. `/whois/start` uses `loadLastFormData()` for `initialFormData`; `loadLastFormData()` needs `reportId`. PrePurchase users have no `reportId` yet. `getBeautyDraft()` is never used by `/whois/start`.

3. **Missing route:**  
   - `prepurchaseBeautyDraft` calls `POST /api/beauty/prepurchase`. No `app/api/beauty/prepurchase/route.ts` exists. Call fails; `draftId` stays null; flow continues with localStorage draft only.

4. **Legacy vs canonical routes:**  
   - `/beauty/*` pages exist; middleware 308s to `/whois/*`. Both sets of pages remain.

5. **handlePurchaseClick fallback:**  
   - `handlePurchaseClick` (OriginTerminalIntake, line 448) uses `existingReportId || loadLastFormData()?.reportId`. If neither exists, sends `{ prePurchase: true }`. User may pay and land on success with "Create your WHOIS record" despite having completed intake (e.g. refresh, new tab).

6. **WAITLIST_ONLY default:**  
   - `NEXT_PUBLIC_WAITLIST_ONLY !== "0"` → waitlist-only. Purchase flow hidden unless env set. Middleware always redirects `/beauty` → `/origin` regardless of WAITLIST_ONLY.

7. **Two checkout entry points for reportId:**  
   - `handleRunWhoisClick` (when `existingReportId`) and `handlePurchaseClick` both create checkout with `{ reportId }` when reportId exists. Consistent.

8. **Dry-run checkout URL:**  
   - Dry-run returns `checkout.url` = `/whois/success?reportId=...` (client-side redirect, no Stripe). Different path from real checkout.

---

## SECTION 10 — SUMMARY (FACTUAL)

### What the system does today

- **Entry:** `/` rewrites to `/origin`. `OriginTerminalIntake` collects name, birthDate, birthPlace, birthTime, email.
- **Submit branches:** WAITLIST_ONLY → waitlist; otherwise unlocked/dryRun/TEST_MODE → submit; FAKE_PAY → submit + unlock; existingReportId → reportId checkout; else → prePurchase checkout.
- **Report generation:** Engine creates report and Beauty profile. reportId returned and saved in `ligs_lastFormData`.
- **Payment:** Stripe checkout with metadata `reportId` or `prePurchase`. Success → verify-session → setBeautyUnlocked, WYH cookie, executionKey. Webhook mints entitlement for reportId only.
- **Post-payment:** reportId+token → handoff + view link. prePurchase or !reportId → "Create your WHOIS record" → `/whois/start`. `/whois/start` requires unlock; pre-fills only from `loadLastFormData()` (needs reportId). PrePurchase users see empty form.
- **Agent:** inspect (public), whois and prior (token required, reportId + entitlement).

### Where the flow is clean

- Single intake component and engine entry point.
- Clear Stripe metadata and verify-session branching.
- Agent inspect/prior/whois separation.
- Free WHOIS from `buildFreeWhoisReport` with deterministic solar logic.

### Where the flow is fragmented

- PrePurchase → success → `/whois/start` does not pre-fill from draft.
- `/api/beauty/prepurchase` is called but does not exist.
- Legacy `/beauty/*` pages still present behind redirects.
- Two purchase modes (reportId vs prePurchase) with different success and webhook behavior.
- `handlePurchaseClick` can send users to prePurchase when `lastReportId` and `loadLastFormData()?.reportId` are both empty.
