# LIGS / WHOIS YOUR HUMAN — Implementation Matrix vs Vision

**Audit date:** 2025-03-20  
**Vision:** WHOIS YOUR HUMAN as core brand; human-facing registration + artifact; agent-facing baseline + drift + recalibration; paid upgrades; safety/failsafe layer.

---

## 1. EXECUTIVE SUMMARY

**Already real:**
- Human intake (OriginTerminalIntake), report generation (engine/generate, E.V.E.), stored report + Beauty Profile in Blob, registry/artifact framing (WHOIS card, LIR-ID), paid Stripe checkout, agent WHOIS endpoint with Bearer auth, entitlement token mint on webhook, execution key for live runs, coherence_score in VectorZero, agent feedback (confirmed/partial/debunked), rate limits on select routes, dev docs (AGENT_USAGE, AGENT_RESPONSE_PATTERN).

**Partially real:**
- Post-purchase fulfillment: entitlement mints; email route exists but webhook does not call it. Minting/LIR-ID: deterministic ID generation, no formal "issuance" protocol. Registry framing: present in copy and UI, not a formal registry API. Versioning: schemaVersion/engineVersion stored; no update/regen path.

**Only conceptual:**
- Free baseline agent access, drift detection, state classification, recalibration/response guidance, "Doesn't Fit" protocol, state-first mode, low-confidence/mismatch handling, human override/sovereignty, multi-agent access, paid API quotas/premium tiers, pricing-ready boundaries, feature separation human vs agent plans.

**Fastest path to usable v1:**
1. Wire webhook → POST /api/email/send-beauty-profile (one file change).
2. Expose agent product: docs exist; endpoint works; no free tier—paid-only is already the model.
3. Add minimal "Doesn't Fit" handling: agent feedback `state: "debunked"` is stored; surface a human override or downgrade path in docs/runtime.
4. Defer: drift detection, recalibration engine, multi-agent, free tier—all require new implementation.

---

## 2. IMPLEMENTATION MATRIX

### A. CORE HUMAN WHOIS PRODUCT

| # | Capability | Status | Confidence | Files | Functions/Routes | Evidence | Missing |
|---|------------|--------|------------|-------|------------------|----------|---------|
| 1 | Human intake flow | IMPLEMENTED | high | `components/OriginTerminalIntake.jsx`, `app/origin/page.jsx` | Intake: name, birthDate, birthTime, birthPlace, email; `advanceToProcessing`, `completeAwaitingEnterRedirect` | Full terminal-style intake with validation, solar resolution, waitlist or checkout path | None |
| 2 | Report generation | IMPLEMENTED | high | `app/api/engine/generate/route.ts`, `lib/engine-spec.ts`, `lib/eve-spec.ts` | `buildReportGenerationPrompt`, OpenAI, `saveReportAndConfirm`, E.V.E. filter, `buildBeautyProfile` | ENGINE_SPEC → full report; E.V.E. → Beauty Profile; stored to Blob | None |
| 3 | Stored report/profile | IMPLEMENTED | high | `lib/report-store.ts`, `lib/beauty-profile-store.ts` | `saveReport`, `getReport`, `saveBeautyProfileV1`, `loadBeautyProfileV1` | Blob `ligs-reports/`, `ligs-beauty/`; StoredReport, BeautyProfileV1 schemas | None |
| 4 | Registry / artifact framing | IMPLEMENTED | high | `lib/free-whois-report.ts`, `components/OriginTerminalIntake.jsx` | `buildFreeWhoisReport`, `renderFreeWhoisCard`, "LIGS Human WHOIS Registry", "Human WHOIS protocol" | Registry copy, LIR-ID, WHOIS card structure | No formal registry API; framing is copy/UI only |
| 5 | Minting or identity artifact issuance | PARTIAL | medium | `src/ligs/marketing/identity-spec.ts`, `lib/free-whois-report.ts`, `lib/agent-entitlement-store.ts` | `generateLirId`, `mintAgentEntitlementToken`, `saveAgentEntitlement` | LIR-ID deterministic from seed; wyh_ token mint on webhook | No formal issuance protocol; no human-facing "minted" artifact flow |
| 6 | Paid checkout flow | IMPLEMENTED | high | `app/api/stripe/create-checkout-session/route.ts`, `app/api/stripe/verify-session/route.ts` | Session create, verify-session, success_url `/beauty/success?session_id=...` | Stripe $39.99; reportId or prePurchase metadata | None |
| 7 | Post-purchase fulfillment | PARTIAL | high | `app/api/stripe/webhook/route.ts`, `app/beauty/success/page.jsx` | Webhook: loadBeautyProfileV1, mint entitlement; success: verify-session, executionKey, entitlementToken | Entitlement mints; executionKey stored; success page shows token | Webhook does NOT call send-beauty-profile; no email sent |
| 8 | Email delivery | PARTIAL | high | `app/api/email/send-beauty-profile/route.ts`, `lib/email-waitlist-confirmation.ts` | `sendWaitlistConfirmation` (waitlist); POST /api/email/send-beauty-profile (post-purchase) | Waitlist email works; post-purchase route exists, never invoked | Webhook does not invoke send-beauty-profile |
| 9 | Versioning / update path for records | SCAFFOLDED | medium | `lib/beauty-profile-schema.ts` | `schemaVersion`, `engineVersion` in BeautyProfileV1 | Stored on save; ev-{sha} or ev-dev | No endpoint to update or regenerate; no version history |

### B. AGENT ACCESS LAYER

| # | Capability | Status | Confidence | Files | Functions/Routes | Evidence | Missing |
|---|------------|--------|------------|-------|------------------|----------|---------|
| 10 | Agent-readable WHOIS endpoint | IMPLEMENTED | high | `app/api/agent/whois/route.ts` | GET /api/agent/whois?reportId=, Bearer token | Returns schema whois-your-human/v1, agent_calibration_record | None |
| 11 | Agent authentication / entitlement | IMPLEMENTED | high | `lib/agent-entitlement-store.ts`, `app/api/agent/whois/route.ts` | `getAgentEntitlementByToken`, Bearer required | Token wyh_; status active; reportId match | None |
| 12 | Machine-readable identity signature | IMPLEMENTED | high | `app/api/agent/whois/route.ts`, `lib/vector-zero.ts` | Response: derived_structure, agent_guidance, vector_zero, civilizational_function | JSON with archetype, cosmic_twin, coherence_score, axes, agent_do/agent_avoid | None |
| 13 | Free tier agent access | MISSING | high | — | — | WHOIS requires Bearer token; token only from paid webhook | No free baseline; no unauthenticated or limited agent path |
| 14 | Paid agent access / quotas / premium access | PARTIAL | medium | `lib/engine-execution-grant.ts`, `lib/agent-entitlement-store.ts` | Execution key for engine; entitlement for WHOIS | Paid path gates engine; WHOIS requires entitlement | No per-token quota; no premium vs standard tier; single paid tier |
| 15 | Multi-agent access model | MISSING | high | — | — | One entitlement per reportId; single token | No multi-token, no agent-scoped access |
| 16 | Execution key / token / access grants | IMPLEMENTED | high | `lib/engine-execution-grant.ts`, `app/api/stripe/verify-session/route.ts` | `createEngineExecutionGrant`, `consumeEngineExecutionGrant`, X-LIGS-Execution-Key | exg_ token, 24h TTL, single-use; mint on verify-session | None |

### C. COHERENCE ENGINE

| # | Capability | Status | Confidence | Files | Functions/Routes | Evidence | Missing |
|---|------------|--------|------------|-------|------------------|----------|---------|
| 17 | Style Engine or equivalent structured voice/profile layer | PARTIAL | medium | `src/ligs/archetypes/contract.ts`, `lib/eve-spec.ts`, `lib/engine/buildReportGenerationPrompt.ts` | ArchetypeVoice, buildArchetypeVoiceBlock, buildArchetypePhraseBankBlock | Voice params (emotional_temperature, rhythm, etc.); E.V.E. injects archetype voice | No standalone "Style Engine"; voice is prompt injection |
| 18 | Drift detection | MISSING | high | — | — | "drift" in docs, shadowDrift in phrase bank, REGIME_MISMATCH in validators | No runtime comparison of observed vs stored; no drift signal |
| 19 | State classification | SCAFFOLDED | low | `app/api/agent/feedback/route.ts` | state: "confirmed" \| "partial" \| "debunked" | Feedback stores state; not used for classification or routing | No state machine; no state-first mode |
| 20 | Recalibration / response guidance | PARTIAL | medium | `app/api/agent/whois/route.ts`, `docs/AGENT_RESPONSE_PATTERN.md` | agent_guidance, agent_summary, help_strategy, failure_mode | Static guidance in WHOIS response; docs describe how to apply | No dynamic recalibration; no update of profile from feedback |
| 21 | Coherence scoring | IMPLEMENTED | high | `lib/vector-zero.ts`, `app/api/agent/whois/route.ts` | coherence_score 0–1 in VectorZero; returned in derived_structure | Extracted from report; stored; exposed to agent | No drift-based coherence; no evolution scoring |
| 22 | Distortion vs evolution handling | MISSING | high | — | — | — | No logic to distinguish distortion from evolution |
| 23 | Signature update/evolution flow | MISSING | high | — | — | — | No endpoint to regenerate or evolve signature |

### D. SAFETY / FAILSAFE LAYER

| # | Capability | Status | Confidence | Files | Functions/Routes | Evidence | Missing |
|---|------------|--------|------------|-------|------------------|----------|---------|
| 24 | "Doesn't Fit" handling | SCAFFOLDED | medium | `app/api/agent/feedback/route.ts` | state: "debunked" | Agent can POST feedback with state debunked | No protocol; no human-facing flow; no downgrade of trust |
| 25 | State-first mode | MISSING | high | — | — | — | No mode that prioritizes user state over WHOIS |
| 26 | Low-confidence / mismatch handling | SCAFFOLDED | low | `app/api/agent/whois/route.ts` | verification.status: "unverified", observed_mismatch_fields: [] | Fields exist; always unverified, empty | No population of mismatch; no low-confidence path |
| 27 | Human override / sovereignty protections | PARTIAL | medium | `docs/AGENT_RESPONSE_PATTERN.md` | "User input directly contradicts WHOIS → User wins" | Doc rule only; not enforced in code | No runtime enforcement; agent must follow docs |
| 28 | Non-coercive safeguards in prompts or runtime logic | PARTIAL | low | `lib/engine-spec.ts`, `docs/AGENT_RESPONSE_PATTERN.md` | ENGINE_SPEC tone; doc: "calibration layer, not conclusion" | Prompt and doc guidance; no hard runtime guard | No runtime guard against overclaiming |

### E. BUSINESS / PLATFORM LAYER

| # | Capability | Status | Confidence | Files | Functions/Routes | Evidence | Missing |
|---|------------|--------|------------|-------|------------------|----------|---------|
| 29 | Free tier surface area | PARTIAL | high | `app/api/waitlist/route.ts`, `components/OriginTerminalIntake.jsx` | Waitlist signup, free WHOIS card in email | Human: waitlist free; agent: no free tier | Agent has no free path |
| 30 | Paid API surfaces | IMPLEMENTED | high | `app/api/agent/whois/route.ts`, `app/api/engine/route.ts`, `app/api/beauty/submit/route.ts` | WHOIS (token); engine (executionKey); beauty/submit (executionKey) | Gated by entitlement or execution key | None |
| 31 | Rate limits / metering / quotas | PARTIAL | high | `lib/rate-limit.ts`, `lib/waitlist-rate-limit.ts` | beauty/create 5/60s, beauty/[reportId] 20/60s, waitlist 5/60s | In-memory; per-IP/UA | No distributed rate limit; no agent-specific quota |
| 32 | Pricing-ready boundaries in code | SCAFFOLDED | low | `app/api/stripe/create-checkout-session/route.ts` | unit_amount: 3999 | Single price; no tier logic | No premium/standard split; no usage-based pricing |
| 33 | Dev-facing docs / integration docs | IMPLEMENTED | high | `docs/AGENT_USAGE.md`, `docs/AGENT_RESPONSE_PATTERN.md` | When to call, how to interpret, conflict resolution | Full agent integration guidance | No formal API reference (OpenAPI); AGENT-WHOIS-API referenced but not in repo |
| 34 | Feature separation between human plans vs agent plans | MISSING | high | — | — | Single checkout; single entitlement | No plan type; no human vs agent feature flags |

---

## 3. MACHINE-READABLE DATA AUDIT

**1. Is there a structured object that could serve as a machine-readable identity signature?**

Yes. The agent WHOIS response (`GET /api/agent/whois`) and the stored `VectorZero` + `BeautyProfile` structures.

**2. Exact shape and where created/stored:**

**Agent WHOIS response (machine-readable identity signature):**
```json
{
  "schema": "whois-your-human/v1",
  "record_type": "agent_calibration_record",
  "derived_structure": {
    "archetype": "string",
    "cosmic_twin": "string",
    "coherence_score": number,
    "vector_zero": {
      "primary_wavelength_nm": string,
      "secondary_wavelength_nm": string,
      "axes": { "lateral": number, "vertical": number, "depth": number }
    },
    "civilizational_function": {
      "structural_function": string,
      "civilizational_role": string,
      "contribution_environments": string[],
      "friction_environments": string[]
    }
  },
  "agent_guidance": { "support_style", "agent_do", "agent_avoid", ... },
  "verification": { "status": "unverified", "observed_match_fields": [], "observed_mismatch_fields": [] }
}
```

**VectorZero (stored in report + profile):**
```ts
// lib/vector-zero.ts
{
  coherence_score: number;
  primary_wavelength: string;
  secondary_wavelength: string;
  symmetry_profile: { lateral, vertical, depth };
  beauty_baseline: { color_family, texture_bias, shape_bias, motion_bias };
  three_voice: { raw_signal, custodian, oracle };
}
```

Created: `app/api/engine/generate/route.ts` (OpenAI extracts VectorZero); stored in `ligs-reports/{reportId}.json` and `ligs-beauty/{reportId}.json`. Agent WHOIS builds response from stored report + profile in `app/api/agent/whois/route.ts`.

**3. Closest existing objects if no dedicated signature:** The agent WHOIS `derived_structure` + `agent_guidance` is the machine-readable signature. VectorZero is the stored baseline.

**4. Output mix:** Mixed. Full report is narrative text. Beauty Profile has structured three-voice (raw_signal, custodian, oracle) per section. Agent WHOIS is structured JSON. VectorZero is structured.

**5. Minimum fields for baseline, drift, recalibration:**

| Need | Existing fields | Missing |
|------|-----------------|---------|
| Baseline access | archetype, cosmic_twin, coherence_score, vector_zero, agent_guidance, agent_do, agent_avoid | — |
| Drift detection | observed_match_fields, observed_mismatch_fields (always empty) | No logic to populate; no comparison of observed vs predicted |
| Recalibration guidance | agent_guidance, help_strategy, failure_mode (static) | No dynamic update from feedback; no recalibration endpoint |

---

## 4. AGENT PRODUCT READINESS AUDIT

**1. What can an external AI agent do today?**

- Register: `POST /api/agent/register` (alias for beauty/submit) → get `reportId`.
- Pay: Human completes Stripe checkout with that reportId (or prePurchase).
- Fetch WHOIS: `GET /api/agent/whois?reportId=X` with `Authorization: Bearer <wyh_token>` → full calibration record.
- Submit feedback: `POST /api/agent/feedback` with state confirmed/partial/debunked.

**2. What can it not do yet?**

- Access WHOIS without payment (no free tier).
- Get drift signal or recalibration (feedback stored but not used).
- Multi-agent or per-agent quotas.
- Update or evolve the signature.

**3. Credible free tier for agents?**

No. WHOIS requires Bearer token. Token is minted only after Stripe webhook on paid checkout. No unauthenticated or limited agent path.

**4. Credible paid tier for agents?**

Yes. Paid checkout → webhook mints entitlement → agent uses token for WHOIS. No quota per token; unlimited WHOIS calls per token.

**5. Minimum code change set for real v1 agent product:**

- Wire webhook → send-beauty-profile (one file).
- Publish agent docs (AGENT_USAGE, AGENT_RESPONSE_PATTERN) as official integration guide.
- Optional: Add free tier (e.g. limited WHOIS without token, or token from waitlist)—requires new flow.

---

## 5. PAYMENT / ACCESS / UPGRADE AUDIT

| Surface | Exists in code | Docs/naming imply | Truth |
|---------|----------------|-------------------|-------|
| Human purchase | Yes | Stripe checkout $39.99 | Implemented |
| Report unlock | Yes | executionKey from verify-session; gates engine/beauty | Implemented |
| Entitlement/token mint | Yes | Webhook mints wyh_ on checkout.session.completed | Implemented |
| Email delivery | Route exists | Webhook calls send-beauty-profile | Webhook does NOT call it |
| Premium route | No | — | Single tier; no premium data access |
| Premium data access | No | — | WHOIS returns same shape for all paid users |

---

## 6. FILE MAP FOR THIS VISION

| Path | Purpose | Load-bearing | Extend for |
|------|---------|--------------|------------|
| `app/origin/page.jsx` | Human landing | Yes | Human product |
| `components/OriginTerminalIntake.jsx` | Intake, waitlist, checkout | Yes | Human product |
| `app/api/beauty/submit/route.ts` | Report creation entry | Yes | Human, agent |
| `app/api/engine/route.ts` | E.V.E. pipeline | Yes | Human, coherence |
| `app/api/engine/generate/route.ts` | Report generation | Yes | Human, coherence |
| `app/api/agent/whois/route.ts` | Agent calibration record | Yes | Agent product |
| `app/api/agent/register/route.ts` | Agent alias for submit | Yes | Agent product |
| `app/api/agent/feedback/route.ts` | Calibration feedback | Yes | Safety, coherence |
| `app/api/stripe/webhook/route.ts` | Post-purchase | Yes | Fulfillment, email |
| `app/api/email/send-beauty-profile/route.ts` | Post-purchase email | No (not called) | Fulfillment |
| `lib/agent-entitlement-store.ts` | Token mint/lookup | Yes | Agent, multi-agent |
| `lib/engine-execution-grant.ts` | Execution key | Yes | Paid access |
| `lib/free-whois-report.ts` | WHOIS build/render | Yes | Human, agent |
| `lib/vector-zero.ts` | VectorZero schema | Yes | Coherence |
| `lib/beauty-profile-schema.ts` | BeautyProfileV1 | Yes | Versioning |
| `lib/eve-spec.ts` | E.V.E. filter | Yes | Coherence |
| `src/ligs/archetypes/contract.ts` | Archetype voice/visual | Yes | Style, coherence |
| `src/ligs/voice/civilizationalFunction.ts` | Civilizational function | Yes | Agent guidance |
| `docs/AGENT_USAGE.md` | Agent integration | Yes | Agent product |
| `docs/AGENT_RESPONSE_PATTERN.md` | Response shaping | Yes | Safety, coherence |

---

## 7. GAP MAP

### READY NOW

- Agent WHOIS endpoint: works with paid token; docs exist.
- Human intake + report generation: full flow.
- Paid checkout + entitlement mint: works.
- Agent feedback: stores confirmed/partial/debunked.
- Coherence score: in VectorZero, exposed to agent.

### NEAR TERM

- Post-purchase email: add webhook → fetch send-beauty-profile.
- "Doesn't Fit" protocol: use debunked feedback; add doc/runtime downgrade.
- Free tier for agents: new path (e.g. waitlist → limited token or public baseline).
- observed_match_fields / observed_mismatch_fields: populate from feedback (modest extension).

### MISSING CORE

- Drift detection: compare observed behavior to stored profile.
- Recalibration engine: update guidance from feedback.
- State-first mode: prioritize user state over WHOIS.
- Multi-agent access: multiple tokens or agent-scoped access.
- Signature update/evolution: regenerate or evolve endpoint.
- Distortion vs evolution: classification logic.
- Pricing tiers: premium vs standard; usage-based.
- Human vs agent plan separation: feature flags.

---

## 8. SOURCE EXCERPTS

### Agent endpoint

```ts
// app/api/agent/whois/route.ts (excerpt)
export async function GET(request: Request) {
  const reportId = url.searchParams.get("reportId")?.trim();
  const token = bearerToken || url.searchParams.get("token")?.trim() || "";
  if (!reportId) return NextResponse.json({ error: "MISSING_REPORT_ID", ... }, { status: 400 });
  if (!token) return NextResponse.json({ error: "MISSING_TOKEN", ... }, { status: 401 });
  const entitlement = await getAgentEntitlementByToken(token);
  if (!entitlement) return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 403 });
  if (entitlement.status !== "active" || entitlement.reportId !== reportId)
    return NextResponse.json({ error: "TOKEN_NOT_AUTHORIZED" }, { status: 403 });
  // ... load report, profile, build response
  return NextResponse.json({
    schema: "whois-your-human/v1",
    record_type: "agent_calibration_record",
    derived_structure: { archetype, cosmic_twin, coherence_score, vector_zero, civilizational_function },
    agent_guidance: { support_style, agent_do, agent_avoid, ... },
    verification: { status: "unverified", observed_match_fields: [], observed_mismatch_fields: [], agent_instruction: "..." },
    ...
  });
}
```

### Entitlement creation

```ts
// lib/agent-entitlement-store.ts
export function mintAgentEntitlementToken(): string {
  return `wyh_${randomBytes(24).toString("base64url")}`;
}
export async function saveAgentEntitlement(entitlement: AgentEntitlement): Promise<void> {
  // Blob: ligs-agent-entitlements/by-token/{token}.json, by-report/{reportId}.json
}

// app/api/stripe/webhook/route.ts (excerpt)
const existingEntitlement = await getAgentEntitlementByReportId(reportId);
if (!existingEntitlement) {
  const token = mintAgentEntitlementToken();
  await saveAgentEntitlement({ token, reportId, status: "active", createdAt: Date.now(), stripeSessionId: session.id, ...(email ? { purchaserRef: email } : {}) });
}
return successResponse(200, { received: true }, requestId);
// NO call to send-beauty-profile
```

### Stored report/profile schema

```ts
// lib/report-store.ts — StoredReport
{ full_report, emotional_snippet, image_prompts, vector_zero?, field_conditions_context?, originCoordinatesDisplay?, magneticFieldIndexDisplay?, climateSignatureDisplay?, sensoryFieldConditionsDisplay?, createdAt }

// lib/vector-zero.ts — VectorZero
{ coherence_score, primary_wavelength, secondary_wavelength, symmetry_profile: { lateral, vertical, depth }, beauty_baseline: { color_family, texture_bias, shape_bias, motion_bias }, three_voice: { raw_signal, custodian, oracle } }

// lib/beauty-profile-schema.ts — BeautyProfileV1
{ version: "1.0", reportId, subjectName, dominantArchetype, emotionalSnippet, imageUrls, fullReport, vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts, timings, schemaVersion?, engineVersion?, solarSeasonProfile?, birthDate?, birthTime?, birthLocation?, ... }
```

### Payment/webhook

```ts
// app/api/stripe/webhook/route.ts
if (event.type !== "checkout.session.completed") return successResponse(200, { received: true });
const session = event.data.object;
const reportId = session.metadata?.reportId;
const prePurchase = session.metadata?.prePurchase === "1";
if (prePurchase) return successResponse(200, { received: true });
await loadBeautyProfileV1(reportId, requestId);
const existingEntitlement = await getAgentEntitlementByReportId(reportId);
if (!existingEntitlement) {
  const token = mintAgentEntitlementToken();
  await saveAgentEntitlement({ token, reportId, status: "active", ... });
}
return successResponse(200, { received: true });
// No fetch to /api/email/send-beauty-profile
```

### Style/coherence-related generation

```ts
// lib/eve-spec.ts — buildArchetypeVoiceBlock
return `
ARCHETYPE VOICE — Align phrasing to these parameters:
- emotional_temperature: ${v.emotional_temperature}
- rhythm: ${v.rhythm}
- lexicon_bias: ${v.lexicon_bias.join(", ")}
...
`;

// lib/vector-zero.ts — coherence_score
coherence_score: number;  // 0–1, from report
```

### Agent access docs

```md
// docs/AGENT_USAGE.md
**Call WHOIS:** GET /api/agent/whois?reportId=<reportId>, Authorization: Bearer <entitlementToken>
Token prefix wyh_. No free tier; token from paid checkout + webhook.
```

---

## 9. FINAL VERDICT

**What we already have:**
- Human intake, report generation, stored report + Beauty Profile, WHOIS framing, paid Stripe checkout, agent WHOIS endpoint with token auth, entitlement mint on webhook, execution key for live runs, coherence_score, agent feedback storage, rate limits, agent integration docs.

**What we pretend to have but do not:**
- Post-purchase email (route exists; webhook does not call it).
- Free baseline agent access (docs mention calibration; no free path).
- Drift detection (observed_mismatch_fields exist; never populated).
- "Doesn't Fit" protocol (debunked state stored; no protocol or human flow).
- Recalibration (static guidance only; no dynamic update).

**Most realistic v1 from current system:**
- Paid-only agent product: register → pay → get token → call WHOIS. Works today.
- Add webhook → send-beauty-profile (one change) for post-purchase email.
- Document agent product; no free tier unless we add a new flow.
- Treat feedback as future input for drift/recalibration; do not promise those features in v1.
