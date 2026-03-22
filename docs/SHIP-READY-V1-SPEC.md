# SHIP-READY V1 SPEC — Paid WHOIS-for-Agents Product

**Purpose:** Define the product that can be launched NOW with minimal changes, based only on what is implemented or very close.

**Date:** 2025-03-20

---

## 1. V1 PRODUCT DEFINITION

**What a human buys:**
- One-time $39.99 purchase ("WHOIS Agent Access")
- Either: (a) report checkout — human has already generated a report (reportId exists); or (b) pre-purchase — human pays first, then generates report
- Product name in Stripe: "WHOIS Agent Access" — "Generates your WHOIS record and provides a token for agent-readable calibration via API. Not a subscription."

**What an agent gets:**
- A Bearer token (prefix `wyh_`) that authorizes `GET /api/agent/whois?reportId=X`
- Unlimited WHOIS fetches for that reportId while token is valid (no per-call quota)
- A JSON agent calibration record (schema `whois-your-human/v1`, `record_type: agent_calibration_record`)

**What data is returned:**
- `registry`: authority, registry_id, generated_at, visibility, verification_mode
- `human`: subject_name, birth_date, birth_time_local, birth_location, chrono_imprint, origin_coordinates
- `measured_context`: solar (longitude, segment, anchor, declination, polarity, sun/moon coords), lunar (phase, illumination), environment (magnetic, climate, sensory)
- `derived_structure`: archetype, cosmic_twin, coherence_score, vector_zero (wavelengths, axes), civilizational_function (structural_function, civilizational_role, contribution_environments, friction_environments)
- `agent_guidance`: support_style, best_response_format, planning_mode, decision_support, interaction_rules, agent_do, agent_avoid, likely_friction_patterns, best_use_of_this_human
- `verification`: status "unverified", predicted_match_fields, observed_match_fields (empty), observed_mismatch_fields (empty), agent_instruction
- `agent_summary`: one_line, help_strategy, failure_mode, alignment_test

**What access is granted:**
- WHOIS endpoint: Bearer token + reportId
- Optional: `POST /api/agent/feedback` with same token to log calibration outcome (confirmed/partial/debunked)
- Execution key (for pre-purchase or report checkout): allows live report generation; minted by verify-session; stored in sessionStorage by success page

**What is NOT included yet:**
- Post-purchase email: route exists but webhook does not call it; human does not receive WHOIS report by email
- Free tier for agents
- Per-token rate limits or quotas
- Drift detection or recalibration
- Multi-agent or per-agent access
- Signature update/evolution

---

## 2. CURRENT API SURFACE

| Method | Path | Auth | Request | Response | Status |
|--------|------|------|---------|----------|--------|
| POST | `/api/agent/register` | None (kill-switch only) | `{ fullName, birthDate, birthTime, birthLocation, email }` | `{ status, requestId, data: { reportId, intakeStatus, note } }` | Production-ready |
| POST | `/api/beauty/submit` | executionKey when gate enforced | Same as register | Same | Production-ready |
| POST | `/api/stripe/create-checkout-session` | None (kill-switch) | `{ reportId? }` or `{ prePurchase: true }` | `{ url }` (Stripe Checkout URL) | Production-ready |
| GET | `/api/stripe/verify-session` | None | Query `session_id` | `{ paid, reportId?, prePurchase?, entitlementToken?, executionKey? }` | Production-ready |
| POST | `/api/stripe/webhook` | Stripe signature | Stripe event body | `{ received: true }` | Production-ready (internal) |
| GET | `/api/agent/whois` | Bearer token or `?token=` | Query `reportId` | Full agent calibration record JSON | Production-ready |
| POST | `/api/agent/feedback` | Bearer token | `{ reportId, state, metrics, notes? }` | `{ ok: true }` | Production-ready |
| GET | `/api/beauty/[reportId]` | None | — | Beauty Profile JSON | Production-ready (human view) |
| POST | `/api/email/send-beauty-profile` | None (kill-switch) | `{ reportId, email }` | `{ delivered: true }` | Partial — exists, never invoked by webhook |

---

## 3. MACHINE-READABLE SIGNATURE TRUTH

**Exact structured fields presented as agent-readable signature:**

**File paths:**
- Built: `app/api/agent/whois/route.ts` (lines 203–346)
- Source data: `lib/report-store.ts` (StoredReport), `lib/beauty-profile-store.ts` (BeautyProfileV1), `lib/vector-zero.ts` (VectorZero)

**Schema / object shape (returned to agents):**

```ts
{
  schema: "whois-your-human/v1",
  record_type: "agent_calibration_record",
  registry: {
    authority: "LIGS Human WHOIS Registry",
    registry_id: string,      // generateLirId(paid-{reportId}-{generatedAtIso})
    record_status: "registered",
    generated_at: string,     // ISO
    visibility: "agent-facing",
    verification_mode: "prediction-first",
  },
  human: {
    subject_name: string | null,
    birth_date: string | null,
    birth_time_local: string | null,
    birth_location: string | null,
    chrono_imprint: { local: string | null, utc: string | null },
    origin_coordinates: { label, latitude, longitude },
  },
  measured_context: {
    solar: { solar_longitude_deg, solar_segment, anchor_type, declination_deg, polarity, sun_altitude_deg, sun_azimuth_deg, sunrise_local, sunset_local, day_length_minutes },
    lunar: { phase, illumination_pct, moon_altitude_deg, moon_azimuth_deg },
    environment: { magnetic_field_index, climate_signature, sensory_field_conditions },
  },
  derived_structure: {
    archetype: string | null,
    cosmic_twin: string | null,
    coherence_score: number | null,
    vector_zero: { primary_wavelength_nm, secondary_wavelength_nm, axes: { lateral, vertical, depth } },
    civilizational_function: { structural_function, civilizational_role, contribution_environments, friction_environments },
  },
  agent_guidance: {
    support_style, best_response_format, planning_mode, decision_support,
    interaction_rules, agent_do, agent_avoid, likely_friction_patterns, best_use_of_this_human,
  },
  verification: {
    status: "unverified",
    ligs_alignment_score: null,
    predicted_match_fields: string[],
    observed_match_fields: [],
    observed_mismatch_fields: [],
    agent_instruction: string,
  },
  agent_summary: { one_line, help_strategy, failure_mode, alignment_test },
}
```

**Where created:** `app/api/agent/whois/route.ts` — assembled from `getReport(reportId)`, `loadBeautyProfileV1(reportId)`, `getCosmicAnalogue`, `getCivilizationalFunction`, `generateLirId`.

**Where stored:** `ligs-reports/{reportId}.json` (StoredReport with vector_zero), `ligs-beauty/{reportId}.json` (BeautyProfileV1).

**Where returned to agents:** `GET /api/agent/whois?reportId=X` with `Authorization: Bearer <token>`.

---

## 4. ACCESS MODEL

**Checkout:**
- `POST /api/stripe/create-checkout-session` with `{ reportId }` (report checkout) or `{ prePurchase: true }` (pay-first)
- Session $39.99, metadata: `reportId` or `prePurchase: "1"`
- success_url: `/beauty/success?session_id={CHECKOUT_SESSION_ID}`

**Webhook:**
- Stripe sends `checkout.session.completed` to `POST /api/stripe/webhook`
- Verifies `STRIPE_WEBHOOK_SECRET`
- If prePurchase: return 200, no entitlement
- If reportId: `loadBeautyProfileV1(reportId)`; if not found → 404
- `getAgentEntitlementByReportId(reportId)`; if none → `mintAgentEntitlementToken()` → `saveAgentEntitlement({ token, reportId, status: "active", stripeSessionId, purchaserRef: email })`
- Return 200

**Entitlement/token mint:** Webhook only. Token prefix `wyh_`. Stored at `ligs-agent-entitlements/by-token/{token}.json` and `ligs-agent-entitlements/by-report/{reportId}.json`.

**Verify-session flow:**
- Human lands on `/beauty/success?session_id=cs_xxx`
- Client fetches `GET /api/stripe/verify-session?session_id=cs_xxx`
- Server: `stripe.checkout.sessions.retrieve(sessionId)`; if `payment_status !== "paid"` → `{ paid: false }`
- If paid: `getAgentEntitlementByReportId(reportId)` → `entitlementToken` (if webhook ran)
- `createEngineExecutionGrant({ stripeSessionId, reportId?, prePurchase })` → `executionKey` (exg_ token, 24h TTL)
- Response: `{ paid: true, reportId, prePurchase, entitlementToken?, executionKey? }`
- Sets cookie `wyh_content_gate=1`
- Client stores executionKey in sessionStorage; displays entitlementToken when available
- Success page polls verify-session up to 3× (2s apart) if entitlementToken not yet present (webhook async)

**Execution key:** Minted by verify-session on paid path. Required for live `POST /api/beauty/submit`, `POST /api/engine`, etc. when `isEngineExecutionGateEnforced()` (production, gate not disabled). Single-use, consumed on successful E.V.E. pipeline completion.

---

## 5. FULFILLMENT GAP

**What must change:** Webhook must call `POST /api/email/send-beauty-profile` after entitlement is minted.

**File:** `app/api/stripe/webhook/route.ts`

**Function:** The `POST` handler, inside the `try` block, after the entitlement block (after line 118, before `log("info", "webhook_checkout_stage", ...)` or before the final `return`).

**Insertion point:** After:
```ts
    log("info", "webhook_checkout_stage", {
      requestId,
      trace_marker: "after_entitlement",
      ...
    });
  } catch (e) {
```
and before:
```ts
  log("info", "purchase_complete", { requestId, reportId });
  return successResponse(200, { received: true }, requestId);
```

**Payload needed:** `{ reportId, email }`. `reportId` is already in scope. `email` is `session.customer_details?.email` (already read at line 51–54).

**Exact change:** Add internal fetch:
```ts
if (email) {
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  try {
    await fetch(`${origin}/api/email/send-beauty-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, email }),
    });
  } catch (e) {
    log("error", "webhook_email_send_failed", { requestId, reportId, message: e instanceof Error ? e.message : String(e) });
    // Do not throw — entitlement already minted; Stripe would retry entire webhook
  }
}
```

**Note:** If email fails, webhook still returns 200 (entitlement succeeded). Stripe will not retry. Consider: log failure for ops; optionally queue retry. For v1, best-effort send is acceptable.

---

## 6. RATE LIMIT / METERING TRUTH

**What exists now:**
- `lib/rate-limit.ts`: In-memory Map, key `${key}:${ip}`, sliding window. Used by:
  - `beauty/create`: 5 req / 60s per IP
  - `beauty/[reportId]`: 20 req / 60s per IP
- `lib/waitlist-rate-limit.ts`: In-memory Map, key `ip|ua`. Used by:
  - `waitlist`: 5 req / 60s per key

**Agent routes:** `GET /api/agent/whois`, `POST /api/agent/register`, `POST /api/agent/feedback` — **no rate limit**.

**Persistence:** In-memory only. Resets on cold start (serverless), on deploy, on restart. Not shared across Vercel function instances.

**Enough for v1?** For low traffic, yes. A single abusive client could bypass by using many IPs or hitting different instances. For honest early adopters, acceptable.

**Cheapest acceptable v1 policy:** Add `rateLimit(request, "agent_whois", 60, 60_000)` (60 req/min per IP) to `GET /api/agent/whois` if desired. Not strictly required for launch; can add post-launch if abuse appears.

---

## 7. DOCS READINESS

**Human-facing docs:**
- `app/whois-your-human/api/page.jsx` — Static HTTP reference for agent flow (requires wyh_content_gate cookie)
- `app/whois-your-human/unlock/page.jsx` — Unlock bridge copy
- `components/WhoisYourHumanLanding.jsx` — Landing copy
- No dedicated human-facing "what you bought" doc

**Developer-facing docs:**
- `docs/AGENT_USAGE.md` — When to call, how to interpret, conflict resolution, good/bad usage
- `docs/AGENT_RESPONSE_PATTERN.md` — Response shaping, calibration strength, conflict resolution
- `docs/AGENT-WHOIS-API.md` — Referenced in AGENT_USAGE; not present in repo (curl, flow, recovery)
- `AI_HANDOFF.md` — Repo context for AI collaborators

**Internal-only docs:**
- `SYSTEM_SNAPSHOT.md` — Authoritative stack reference
- `REPO_MAP.md` — Repository map
- `docs/IMPLEMENTATION-MATRIX-VISION-AUDIT.md` — Implementation audit
- `docs/LIGS-SYSTEM-AUDIT-FOR-AGENT.md` — System breakdown for agents
- Various `docs/*.md` audits (PAID-WHOIS-*, WHOIS-*, etc.)

---

## 8. MINIMUM CHANGESET TO SHIP

1. **Webhook → send-beauty-profile** (required)
   - File: `app/api/stripe/webhook/route.ts`
   - Add internal fetch to `POST /api/email/send-beauty-profile` with `{ reportId, email }` after entitlement mint, when `email` is non-empty.
   - Do not throw on email failure; log and return 200.

2. **Create `docs/AGENT-WHOIS-API.md`** (recommended)
   - AGENT_USAGE references it for "curl, flow, recovery". Add minimal HTTP contract: routes, auth, example curl, recovery (verify-session for token).

3. **Optional: Rate limit agent/whois**
   - Add `rateLimit(request, "agent_whois", 60, 60_000)` to `GET /api/agent/whois` if abuse is a concern. Can defer.

---

## 9. HONEST LAUNCH COPY BASIS

- Pay once ($39.99) to unlock your WHOIS record for AI systems.
- After purchase, you receive a secret token that authorizes AI tools to fetch your calibration record.
- The record is a structured JSON profile: archetype, support style, friction/contribution environments, and interaction guidance.
- AI systems use it to adapt how they respond to you—structure, options, framing—without replacing your judgment.
- The record is an operating hypothesis, not a validated psychometric score.
- You can log feedback (confirmed, partial, debunked) so we can improve the system over time.
- Post-purchase, you receive your full WHOIS report by email (once webhook is wired).
- No subscription; one-time unlock per report.
- Token is secret; store it securely. Anyone with it can access your calibration record for that report.

---

## 10. SOURCE EXCERPTS

### Agent endpoint

```ts
// app/api/agent/whois/route.ts (lines 66-93, 203-210)
export async function GET(request: Request) {
  const reportId = url.searchParams.get("reportId")?.trim();
  const token = bearerToken || url.searchParams.get("token")?.trim() || "";
  if (!reportId) return NextResponse.json({ error: "MISSING_REPORT_ID", ... }, { status: 400 });
  if (!token) return NextResponse.json({ error: "MISSING_TOKEN", ... }, { status: 401 });
  const entitlement = await getAgentEntitlementByToken(token);
  if (!entitlement) return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 403 });
  if (entitlement.status !== "active" || entitlement.reportId !== reportId)
    return NextResponse.json({ error: "TOKEN_NOT_AUTHORIZED" }, { status: 403 });
  const storedReport = await getReport(reportId);
  if (!storedReport) return NextResponse.json({ error: "PAID_WHOIS_REPORT_NOT_FOUND", reportId }, { status: 404 });
  const profile = await loadBeautyProfileV1(reportId, requestId);
  // ... build response
  return NextResponse.json({
    schema: "whois-your-human/v1",
    record_type: "agent_calibration_record",
    registry: { authority: "LIGS Human WHOIS Registry", registry_id, ... },
    human: { subject_name, birth_date, ... },
    measured_context: { solar, lunar, environment },
    derived_structure: { archetype, cosmic_twin, coherence_score, vector_zero, civilizational_function },
    agent_guidance: { support_style, agent_do, agent_avoid, ... },
    verification: { status: "unverified", observed_match_fields: [], observed_mismatch_fields: [], agent_instruction: "..." },
    agent_summary: { one_line, help_strategy, failure_mode, alignment_test },
  });
}
```

### Signature/object schema (VectorZero)

```ts
// lib/vector-zero.ts
export type VectorZero = {
  coherence_score: number;
  primary_wavelength: string;
  secondary_wavelength: string;
  symmetry_profile: { lateral: number; vertical: number; depth: number };
  beauty_baseline: { color_family: string; texture_bias: string; shape_bias: string; motion_bias: string };
  three_voice: { raw_signal: string; custodian: string; oracle: string };
};
```

### Entitlement mint

```ts
// lib/agent-entitlement-store.ts
export function mintAgentEntitlementToken(): string {
  return `wyh_${randomBytes(24).toString("base64url")}`;
}
export async function saveAgentEntitlement(entitlement: AgentEntitlement): Promise<void> {
  await put(entitlementTokenPath(entitlement.token), JSON.stringify(entitlement), ...);
  await put(entitlementReportPath(entitlement.reportId), JSON.stringify(entitlement), ...);
}

// app/api/stripe/webhook/route.ts (lines 94-110)
const existingEntitlement = await getAgentEntitlementByReportId(reportId);
if (!existingEntitlement) {
  const token = mintAgentEntitlementToken();
  await saveAgentEntitlement({
    token,
    reportId,
    status: "active",
    createdAt: Date.now(),
    stripeSessionId: session.id,
    ...(email ? { purchaserRef: email } : {}),
  });
}
```

### Webhook

```ts
// app/api/stripe/webhook/route.ts (lines 38-135)
if (event.type !== "checkout.session.completed") {
  return successResponse(200, { received: true }, requestId);
}
const session = event.data.object;
const reportId = session.metadata?.reportId?.trim() ?? "";
const prePurchase = session.metadata?.prePurchase === "1";
if (prePurchase) return successResponse(200, { received: true });
const email = session.customer_details?.email?.trim() ?? "";
if (!reportId) return errorResponse(400, "MISSING_REPORT_ID");
await loadBeautyProfileV1(reportId, requestId);
const existingEntitlement = await getAgentEntitlementByReportId(reportId);
if (!existingEntitlement) {
  const token = mintAgentEntitlementToken();
  await saveAgentEntitlement({ token, reportId, status: "active", ... });
}
return successResponse(200, { received: true });
// NO call to send-beauty-profile
```

### Verify-session

```ts
// app/api/stripe/verify-session/route.ts (lines 36-76)
const session = await stripe.checkout.sessions.retrieve(sessionId);
if (session.payment_status !== "paid") return successResponse(200, { paid: false });
const reportId = session.metadata?.reportId?.trim() ?? "";
const prePurchase = session.metadata?.prePurchase === "1";
let entitlementToken;
if (reportId) {
  const entitlement = await getAgentEntitlementByReportId(reportId);
  if (entitlement?.status === "active") entitlementToken = entitlement.token;
}
let executionKey;
try {
  executionKey = await createEngineExecutionGrant({ stripeSessionId: sessionId, reportId, prePurchase });
} catch (e) { ... }
const res = successResponse(200, { paid: true, reportId, prePurchase, entitlementToken, executionKey });
res.cookies.set(WYH_CONTENT_GATE_COOKIE, "1", wyhContentGateCookieOptions());
return res;
```

### Rate-limit logic

```ts
// lib/rate-limit.ts
const store = new Map<string, number[]>();
export async function rateLimit(request: Request, key: string, limit: number, windowMs: number): Promise<void> {
  const ip = getIp(request);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  let timestamps = store.get(bucketKey) ?? [];
  timestamps = timestamps.filter((t) => t >= now - windowMs);
  timestamps.push(now);
  if (timestamps.length > limit) throw new Error("RATE_LIMIT_EXCEEDED");
  store.set(bucketKey, timestamps);
}
// Used: beauty/create 5/60s, beauty/[reportId] 20/60s. Agent routes: NOT rate limited.
```

### Docs describing agent access

```md
// docs/AGENT_USAGE.md
**WHOIS YOUR HUMAN** is an **agent-facing identity lookup layer**: after a human is registered in LIGS and access is paid for that `reportId`, you fetch a single JSON **agent calibration record** (`record_type`: `agent_calibration_record`, schema **`whois-your-human/v1`**) over HTTP.
You need `reportId` + valid **`wyh_` entitlement token** and then **`GET /api/agent/whois`**.
1. **Register** — `POST /api/agent/register` with validated birth payload. Read `data.reportId`.
2. **Payment / entitlement** — `POST /api/stripe/create-checkout-session` with `{ "reportId": "<reportId>" }`; human completes Checkout; then `GET /api/stripe/verify-session?session_id=<cs_…>` until `data.entitlementToken` appears.
3. **WHOIS** — `GET /api/agent/whois?reportId=<reportId>`, Header: `Authorization: Bearer <entitlementToken>`.
```
