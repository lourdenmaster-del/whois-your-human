# LIGS / WHOIS YOUR HUMAN — Monetization Readiness Audit (2026-03-21)

---

## 1. CURRENT MONETIZATION STATE

### Stripe integration

- **Create checkout:** `POST /api/stripe/create-checkout-session` — body `{ reportId? }` or `{ prePurchase: true }`. Creates Stripe Checkout session.
- **Webhook:** `POST /api/stripe/webhook` — handles `checkout.session.completed`. For reportId: loads Beauty Profile, mints wyh_ token via `saveAgentEntitlement`, calls `POST /api/email/send-beauty-profile`. For prePurchase: returns 200, no token minted.
- **Verify session:** `GET /api/stripe/verify-session?session_id=cs_xxx` — returns `{ paid, reportId?, prePurchase?, entitlementToken?, executionKey? }`. Sets `wyh_content_gate=1` cookie.

### Endpoints/processes

| Step              | Endpoint                                             | Behavior                                                              |
|-------------------|------------------------------------------------------|-----------------------------------------------------------------------|
| Checkout          | POST /api/stripe/create-checkout-session            | Creates session, validates reportId→Beauty Profile when not prePurchase |
| Payment           | Stripe Checkout (redirect)                           | User pays on Stripe                                                   |
| Webhook           | POST /api/stripe/webhook                             | Mint wyh_ token (reportId only); send email (reportId only)          |
| Token recovery    | GET /api/stripe/verify-session?session_id=...        | Returns entitlementToken, executionKey                                |

### Price

- **Current:** `unit_amount: 3999` → **$39.99** in `app/api/stripe/create-checkout-session/route.ts` (line 83).

### Post-payment flow

1. User completes Stripe Checkout → success_url: `/beauty/success?session_id={CHECKOUT_SESSION_ID}`.
2. Client calls `GET /api/stripe/verify-session?session_id=...` until `paid: true`, `entitlementToken`, `executionKey`.
3. `entitlementToken` (wyh_) stored for whois calls; `executionKey` (exg_) stored for engine/image.
4. Success page calls `setBeautyUnlocked()` and redirects to `/beauty/start` or shows "View Report".

---

## 2. PRIOR CREATION FLOW (REAL)

### Step-by-step

1. **Input:** Human submits birth data (name, birthDate, birthTime, birthLocation, email) via `OriginTerminalIntake` or `POST /api/beauty/submit` / `POST /api/agent/register`.
2. **Gate:** In production, `beauty/submit` needs a valid `executionKey` (from verify-session after payment). Dev/dryRun: gate off.
3. **Processing:** `beauty/submit` → `deriveFromBirthData`, `computeSunMoonContext`, optional `onThisDay` → `POST /api/engine` (or `/api/engine/generate`) → E.V.E. pipeline, image gen, report composition.
4. **Storage:** Report → Blob `ligs-reports/`; Beauty Profile → Blob `ligs-beauty/`; idempotency in `ligs-runs/`.
5. **Output:** Response `{ status: "ok", data: { reportId, intakeStatus: "CREATED", note: "..." } }`.

### Tokens

- **reportId:** Returned by engine; used for subsequent checkout and whois.
- **wyh_ token:** Minted only by webhook on `checkout.session.completed` with reportId. Not minted for prePurchase.

### Storage

- Report: `ligs-reports/{reportId}.json`
- Beauty Profile: `ligs-beauty/{reportId}.json`
- Entitlement: `ligs-agent-entitlements/by-token/{token}.json`, `by-report/{reportId}.json`

### Access later

- **whois:** `GET /api/agent/whois?reportId=X` with `Authorization: Bearer wyh_...`.
- **prior:** `GET /api/agent/prior?reportId=X` with same token.

---

## 3. AGENT USAGE (CURRENT)

### Endpoints

| Endpoint                         | Auth     | Agent can call |
|----------------------------------|----------|----------------|
| GET /api/agent/inspect           | None     | Yes            |
| GET /api/agent/prior-format      | None     | Yes            |
| GET /api/agent/stance            | None     | Yes            |
| POST /api/agent/stance           | None     | Yes (rate-limited) |
| GET /api/agent/whois?reportId=  | Bearer wyh_ | Yes (with token) |
| GET /api/agent/prior?reportId=   | Bearer wyh_ | Yes (with token) |
| POST /api/agent/register         | None     | Yes (forwards to beauty/submit; needs executionKey in prod) |
| POST /api/agent/feedback         | Bearer wyh_ | Yes         |
| POST /api/agent/drift-check      | Bearer wyh_ | Yes         |

### Public vs protected

- **Public:** inspect, prior-format, stance (GET/POST).
- **Protected (wyh_):** whois, prior, feedback, drift-check.

### What agents can do today

- Discover system via inspect.
- Read prior format for free.
- Read/post stance.
- Call whois/prior/feedback/drift-check with reportId + wyh_ token (after human paid).

### What agents cannot do

- Obtain reportId or wyh_ token themselves. They must receive both from human/integration.
- Create priors (that requires engine run; humans do that via origin/beauty).
- Pay on behalf of humans (no API billing).

---

## 4. BILLING CAPABILITY FOR AGENTS

### Per-call billing

- **No.** No endpoint tracks or bills per API call. whois/prior are all-or-nothing: token grants access; no usage metering.

### API key system

- **No generic API keys.** Only wyh_ entitlement tokens (per reportId). No agent-scoped keys.

### Usage tracking

- **No.** No per-call logging for billing. Logs exist for debugging but are not structured for usage-based billing.

### Repeated paid endpoint calls

- **Yes.** With a valid wyh_ token, agents can call whois and prior repeatedly. No per-call limits or charges.

---

## 5. GAPS TO TURN ON REVENUE (MINIMAL ONLY)

### Gap 1: Price at $5–$10

- **Missing:** Configurable or lower price (currently $39.99).
- **Location:** `app/api/stripe/create-checkout-session/route.ts`, `unit_amount`.
- **Smallest fix:** Change `unit_amount` to 500–1000 (cents) or add env var `STRIPE_UNIT_AMOUNT` with fallback 3999.

### Gap 2: Purchase flow reachable

- **Missing:** Success/cancel/start pages reachable for non-studio users. Middleware always redirects `/beauty/*` → `/origin`.
- **Location:** `middleware.ts`.
- **Smallest fix:** Only redirect `/beauty` and `/beauty/*` to `/origin` when `NEXT_PUBLIC_WAITLIST_ONLY !== "0"`. When WAITLIST_ONLY=0, allow `/beauty/success`, `/beauty/cancel`, `/beauty/start`, `/beauty/view` without studio cookie (per prior verification log).

### Gap 3: prePurchase → token mint

- **Missing:** prePurchase checkout does not mint wyh_ token. Webhook returns early. Human pays but never gets token.
- **Location:** `app/api/stripe/webhook/route.ts`. After prePurchase payment, report is created later via beauty/submit. No second webhook.
- **Smallest fix:** Add a “claim” endpoint: `POST /api/agent/claim-entitlement` with body `{ reportId, session_id }`. Verifies session is paid + prePurchase, checks report exists, mints token, returns it. Or: store prePurchase session_id, and when report is first created for that session, mint token (requires linking session→reportId at creation time).

### Gap 4: WAITLIST_ONLY default

- **Missing:** `NEXT_PUBLIC_WAITLIST_ONLY` defaults to waitlist-only; purchase flow hidden.
- **Location:** `OriginTerminalIntake.jsx`, `BeautyLandingClient.jsx`, env.
- **Smallest fix:** Set `NEXT_PUBLIC_WAITLIST_ONLY=0` in production env to show purchase flow (after Gap 2 is fixed).

### Gap 5: Agent-paid usage (optional)

- **Missing:** No way for an agent to pay for access on behalf of a user or to meter usage.
- **Location:** Would require new endpoint or integration.
- **Smallest fix:** Defer. Use human-paid model only for now. Agent gets token from human handoff.

---

## 6. WHAT NOT TO BUILD

- OpenAPI / Swagger
- MCP server
- Alternate auth (API keys for agents)
- Usage-based billing infrastructure
- Per-call metering
- Subscription model
- Refund/chargeback automation
- Agent-specific rate limits beyond stance
- Multi-tier pricing (premium/standard)
- Credits or prepaid balance system

---

## 7. FASTEST PATH TO LIVE REVENUE

1. **Update price** — Set `unit_amount` to 599 or 999 ($5.99 or $9.99) in create-checkout-session.
2. **Allow purchase paths** — In middleware, when `NEXT_PUBLIC_WAITLIST_ONLY=0`, stop redirecting `/beauty/success`, `/beauty/cancel`, `/beauty/start`, `/beauty/view` to `/origin`.
3. **Turn on purchase** — Set `NEXT_PUBLIC_WAITLIST_ONLY=0` in production.
4. **Wire Stripe live keys** — In Vercel: `STRIPE_SECRET_KEY` (sk_live_), `STRIPE_WEBHOOK_SECRET` for live webhook.
5. **Fix prePurchase flow** — Implement claim step: after prePurchase → engine run → reportId, either (a) add `POST /api/agent/claim-entitlement` that mints token when session_id + reportId valid, or (b) store prePurchase session and mint token when report is first created.
6. **Use reportId path first** — Rely on reportId checkout (not prePurchase) for V1: LigsStudio or dev creates report, user checks out with reportId, webhook mints token. Ensures token issuance works.
7. **Check webhook URL** — Ensure Stripe dashboard webhook points to `https://ligs.io/api/stripe/webhook` (or correct prod URL).
8. **Smoke test** — Create report (LigsStudio or with executionKey), checkout with reportId, confirm verify-session returns entitlementToken, confirm whois returns 200 with that token.
