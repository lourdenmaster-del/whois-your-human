# Risk Map — LIGS

## Architectural Fragility Points

### 1. Engine Route Overwrites Full Report (Critical Bug)

**Location:** `app/api/engine/route.ts` (lines 104–113)

**Behavior:** After `/api/engine/generate` saves the report via `saveReportAndConfirm`, the engine route calls `saveReport(reportId, { full_report: "", ... })`, overwriting the stored report with an empty `full_report`. The subsequent fetch of `GET /api/report/{reportId}` returns empty content, triggering `REPORT_MISSING_FULL_REPORT` and a 502.

**Impact:** The entire Beauty flow (`POST /api/engine`, `POST /api/beauty/submit`, `POST /api/beauty/create`) **always fails** for real generation. No Beauty Profile is ever successfully produced or saved. Demo flow works because it bypasses the engine route.

**Severity:** Critical — paid product path is non-functional.

---

### 2. No Payment Gate on Generation or Retrieval

**Location:** All generation and report/beauty GET endpoints

**Behavior:** Anyone can:
- Generate unlimited reports and Beauty Profiles
- Access any report or Beauty Profile with a `reportId` (UUID — guessable or obtained via brute force / enumeration if IDs are predictable)
- Generate DALL·E images via `/api/generate-image` with arbitrary prompts

**Impact:** Unbounded API cost (OpenAI, Blob storage). No revenue protection.

---

### 3. E.V.E. Output Shape Mismatch

**Location:** `app/api/engine/route.ts` vs `lib/eve-spec.ts`

**Behavior:** EVE_FILTER_SPEC describes a full BeautyProfile JSON with vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts. The route appends a strict override instructing the model to return only `{"image":"...","report":"..."}`. The route then:
- Puts `parsed.report` into `light_signature.raw_signal` only
- Leaves archetype, deviations, corrective_vector, imagery_prompts as empty
- Uses Vector Zero from engine if present, otherwise empty defaults

**Impact:** The Beauty Profile stored has minimal content. Most E.V.E. extraction logic is never used. The spec and implementation are deeply out of alignment.

---

### 4. In-Memory Rate Limiting

**Location:** `lib/rate-limit.ts`

**Behavior:** Rate limits use an in-memory `Map`. On Vercel serverless, each function instance has its own memory. Limits are not shared across instances or regions.

**Impact:** Rate limiting is ineffective at scale. A determined user can bypass by parallel requests or geographic distribution.

---

### 5. In-Memory Report Storage Fallback

**Location:** `lib/report-store.ts`

**Behavior:** When `BLOB_READ_WRITE_TOKEN` is unset, reports are stored in `memoryStore` (process memory). Data is lost on cold start or instance recycle.

**Impact:** Reports can vanish. Beauty Profiles require Blob and fail if token is missing — no fallback.

---

### 6. No Idempotency for Generation

**Location:** `app/api/engine/generate/route.ts`, `app/api/beauty/submit/route.ts`

**Behavior:** Same birth data submitted multiple times produces new reports each time. No deduplication, no idempotency keys.

**Impact:** Duplicate cost for retries or repeated submissions. No way to safely retry on transient failure without creating duplicates.

---

### 7. Stripe Webhook Email Failure Handling

**Location:** `app/api/stripe/webhook/route.ts`

**Behavior:** On `checkout.session.completed`, webhook POSTs to `/api/email/send-beauty-profile`. If email fails, webhook returns an error. Stripe will retry. There is no guard against duplicate email sends if Stripe retries.

**Impact:** User may receive multiple identical emails. No idempotency on email delivery per session.

---

### 8. Beauty Profile Missing subjectName / emotionalSnippet

**Location:** `app/api/engine/route.ts` payload construction

**Behavior:** The engine route builds `BeautyProfileV1` with `...beautyProfile` but does not set `subjectName` or `emotionalSnippet`. These are available (fullName, emotionalSnippet from report) but not passed.

**Impact:** Post-purchase emails and Beauty view show blank name and snippet. Poor UX.

---

### 9. Single-Point Failure: OpenAI

**Location:** All AI routes

**Behavior:** No fallback model or provider. All report generation, E.V.E. filtering, Vector Zero, and image generation depend on OpenAI.

**Impact:** Quota exhaustion, outage, or billing issues cause total system failure. DRY_RUN mitigates for testing but not production.

---

### 10. Blob as Single Storage Backend for Beauty

**Location:** `lib/beauty-profile-store.ts`

**Behavior:** `saveBeautyProfileV1` and `loadBeautyProfileV1` require Blob. No in-memory fallback.

**Impact:** Without `BLOB_READ_WRITE_TOKEN`, Beauty flow cannot persist or load profiles. Checkout and email delivery fail.

---

## AI Drift Risk

### 1. Model Updates

**Risk:** OpenAI may update gpt-4o or dall-e-3 behavior. Prompt adherence, JSON output shape, and quality can shift without code changes.

**Mitigation:** None. No model version pinning or output schema validation.

### 2. Long Prompts and Truncation

**Risk:** Report and Vector Zero prompts slice inputs (e.g., `fullReport.slice(0, 8000)`). Important content may be cut off. Model receives incomplete context.

**Mitigation:** None. Truncation is fixed and arbitrary.

### 3. E.V.E. Prompt vs Implementation Drift

**Risk:** EVE_FILTER_SPEC describes full BeautyProfile extraction. Route overrides with `{ image, report }` and ignores most of the spec. If someone later aligns the model output with the spec, route logic would break.

**Mitigation:** None. Documentation and code are divergent.

### 4. Temperature and Non-Determinism

**Risk:** Report (0.8), image prompts (0.7), Vector Zero (0.5), E.V.E. (0.5). Higher temperatures increase variability. Same input can produce very different reports.

**Mitigation:** None. No seed or deterministic mode.

### 5. No Output Validation

**Risk:** All AI responses are parsed with `JSON.parse` and ad hoc field checks. No Zod/JSON Schema. Malformed or hallucinated keys can propagate.

**Mitigation:** Minimal. String coercion and defaults only.

---

## Scaling Risks

### 1. Concurrent Writes to Same reportId

**Risk:** The engine route and generate route can theoretically write to the same key (engine overwrites report). Blob `put` is last-write-wins. Race conditions possible in theory; in practice the overwrite bug causes failure before concurrency matters.

### 2. Cold Starts and Timeouts

**Risk:** Report generation involves 4 sequential OpenAI calls (report, image prompts, Vector Zero) plus E.V.E. (1 more). Total latency can exceed Vercel function limits (e.g., 60s hobby, 300s Pro).

**Mitigation:** Client timeouts (120s engine, 180s E.V.E.) may fire before server completes.

### 3. Blob and OpenAI Rate Limits

**Risk:** Burst traffic can hit Vercel Blob limits or OpenAI rate limits. No queue or backpressure.

**Mitigation:** In-memory rate limits only; ineffective in serverless.

### 4. Cost Scaling

**Risk:** Each report ≈ 5 GPT-4o calls + optional 1–2 DALL·E calls. Cost grows linearly with usage. No usage caps or per-user limits.

---

## Security Risks

### 1. Unauthenticated Access to All Data

**Risk:** `reportId` is a UUID. Anyone with the ID can read the full report or Beauty Profile. No auth, no signed URLs, no proof of purchase.

**Impact:** Leaked or guessed IDs expose all user data (birth data in report, aesthetic profile).

### 2. No Input Sanitization for Image Prompts

**Location:** `app/api/generate-image/route.ts`

**Risk:** `body.prompt` is passed directly to DALL·E. No content filter. Users can request harmful or policy-violating imagery.

**Impact:** OpenAI may reject or flag; account risk. No application-level filtering.

### 3. Stripe Webhook Signature Verification

**Status:** Implemented. Webhook verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.

**Residual risk:** Secret rotation requires coordinated update. No replay protection beyond Stripe’s timestamp check.

### 4. Environment Variable Exposure

**Risk:** `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN` are server-side. Leakage via logging (e.g., `keyPrefix` in quota error) is minimal but possible.

**Mitigation:** Partial — dev-only debug in quota error. No key logging in normal flow.

### 5. ReportId Enumeration

**Risk:** UUIDv4 is random but not secret. If reportIds are ever exposed (e.g., in URLs, referrers, logs), enumeration is infeasible but not impossible. No access control means any valid ID grants full access.

---

## Summary: Highest-Priority Risks

| Priority | Risk | Impact |
|----------|------|--------|
| P0 | Engine route overwrites full report | Beauty flow never succeeds |
| P0 | No payment gate | Unbounded cost; no revenue |
| P1 | E.V.E. spec/implementation mismatch | Degraded Beauty Profile content |
| P1 | In-memory rate limiting | Ineffective at scale |
| P1 | Unauthenticated data access | Privacy exposure |
| P2 | No idempotency | Duplicate generation on retry |
| P2 | Missing subjectName/emotionalSnippet | Poor post-purchase UX |
| P2 | OpenAI single dependency | Total outage on provider failure |
