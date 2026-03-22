# LIGS / WHOIS-YOUR-HUMAN Agent Access Layer — Audit Report (2026-03-21)

**Purpose:** Compact, exact handoff for external agents (e.g. ChatGPT) to understand what ALREADY EXISTS. No redesign, no invented endpoints, no vague summaries.

---

## 1. LIVE AGENT ACCESS SURFACE

| Method | Path | Purpose | Auth | File | Live |
|--------|------|---------|------|------|------|
| GET | `/api/agent/inspect` | Machine-readable AI discovery: project identity, public URLs, stance, protected endpoints, recommended inspection order | None (public) | `app/api/agent/inspect/route.ts` | Confirmed live |
| GET | `/api/agent/prior-format` | Free Vector Zero prior format schema; fields, example, agent_instructions; no API call required | None (public) | `app/api/agent/prior-format/route.ts` | Confirmed live |
| GET | `/api/agent/stance` | Aggregated endorse/decline/abstain counts | None (public) | `app/api/agent/stance/route.ts` | Confirmed live |
| POST | `/api/agent/stance` | Record a stance (endorse/decline/abstain); rate-limited; 1 per IP per 24h | None (public) | `app/api/agent/stance/route.ts` | Confirmed live |
| GET | `/api/agent/whois` | Agent calibration record for paid report; full schema | Bearer `wyh_` token | `app/api/agent/whois/route.ts` | Confirmed live |
| GET | `/api/agent/prior` | Vector Zero prior layer only (derived_structure, agent_guidance, agent_summary) | Bearer `wyh_` token | `app/api/agent/prior/route.ts` | Present in code |
| POST | `/api/agent/register` | Alias for `POST /api/beauty/submit`; register human, get reportId | None | `app/api/agent/register/route.ts` | Present in code |
| POST | `/api/agent/feedback` | Log calibration outcome (confirmed/partial/debunked); affects next whois response | Bearer `wyh_` token | `app/api/agent/feedback/route.ts` | Present in code |
| POST | `/api/agent/drift-check` | Compare current human text to WHOIS baseline; LLM-based; requires `OPENAI_API_KEY` | Bearer `wyh_` token | `app/api/agent/drift-check/route.ts` | Present in code |

**Production base URL:** `https://ligs.io`

**Note:** `/api/*` is not matched by middleware; all API routes run without middleware interference.

---

## 2. WHOIS AGENT ENDPOINT

### Route
- **Method:** GET  
- **Path:** `/api/agent/whois`

### Parameters
- **Query:** `reportId` (required) — report ID from registration or checkout (typically UUID)
- **Auth:** `Authorization: Bearer <wyh_token>` or `?token=<token>`

### Response schema
- **Schema string:** `whois-your-human/v1`
- **record_type:** `agent_calibration_record`

### Top-level blocks (current implementation)
| Block | Description |
|-------|-------------|
| `registry` | `authority`, `registry_id`, `record_status`, `generated_at`, `visibility`, `verification_mode` |
| `human` | `subject_name`, `birth_date`, `birth_time_local`, `birth_location`, `chrono_imprint`, `origin_coordinates` |
| `measured_context` | `solar`, `lunar`, `environment` |
| `derived_structure` | `archetype`, `cosmic_twin`, `coherence_score`, `vector_zero`, `civilizational_function` |
| `agent_guidance` | `support_style`, `best_response_format`, `planning_mode`, `decision_support`, `interaction_rules`, `agent_do`, `agent_avoid`, `likely_friction_patterns`, `best_use_of_this_human` |
| `verification` | `status`, `ligs_alignment_score`, `predicted_match_fields`, `observed_match_fields`, `observed_mismatch_fields`, `last_feedback` (when feedback exists), `agent_instruction` |
| `agent_summary` | `one_line`, `help_strategy`, `failure_mode`, `alignment_test` |

### Example (code-derived, 200)
```json
{
  "schema": "whois-your-human/v1",
  "record_type": "agent_calibration_record",
  "registry": {
    "authority": "LIGS Human WHOIS Registry",
    "registry_id": "A1B-2C3-45",
    "record_status": "registered",
    "generated_at": "2025-03-20T14:30:00.000Z",
    "visibility": "agent-facing",
    "verification_mode": "prediction-first"
  },
  "human": { "subject_name": "...", "birth_date": "...", ... },
  "measured_context": { "solar": {...}, "lunar": {...}, "environment": {...} },
  "derived_structure": { "archetype": "Fluxionis", "cosmic_twin": "...", ... },
  "agent_guidance": { "support_style": "...", ... },
  "verification": { "status": "unverified", ... },
  "agent_summary": { "one_line": "...", ... }
}
```

### Failure responses
| Status | error | Condition |
|--------|-------|-----------|
| 400 | `MISSING_REPORT_ID` | reportId missing |
| 401 | `MISSING_TOKEN` | No Bearer or ?token= |
| 403 | `INVALID_TOKEN` | Token not found |
| 403 | `TOKEN_NOT_AUTHORIZED` | Token valid but reportId mismatch |
| 404 | `PAID_WHOIS_REPORT_NOT_FOUND` | Report not found |
| 404 | `BEAUTY_PROFILE_NOT_FOUND` etc. | Profile load errors |

### reportId assumptions
- Issued by registration (`POST /api/agent/register` or `POST /api/beauty/submit`) or checkout
- Stored in report store (Blob) and Beauty Profile (Blob)
- Token is minted by Stripe webhook on `checkout.session.completed`

### Links from README/docs/site
- **README.md:** "See docs/AGENT-WHOIS-API.md"
- **WhoisYourHumanLanding:** curl example with `GET /api/agent/whois?reportId=YOUR_REPORT_ID` + `Authorization: Bearer wyh_YOUR_ENTITLEMENT_TOKEN`
- **Inspect:** `public_resources.api_reference` → `/whois-your-human/api`; `protected.whois` → endpoint, method, auth, query

---

## 3. STANCE / HANDRAISE SYSTEM

### Terminology
- **Values:** endorse, decline, abstain (NOT support/deny)
- **UI labels:** useful = endorse, not yet = abstain, decline = decline

### Routes
- **GET** `/api/agent/stance` — returns counts
- **POST** `/api/agent/stance` — records stance

### Accepted values
- `endorse` | `decline` | `abstain` (exact strings)

### Request body (POST)
```json
{
  "stance": "endorse",
  "rationale": "Optional short explanation (max 500 chars)"
}
```

### Persistence
- **Storage:** Vercel Blob (`ligs-agent-stance/state.json` for counts; `ligs-agent-stance/cooldown/{ipHash}.json` for per-IP cooldown)
- **Requires:** `BLOB_READ_WRITE_TOKEN` (503 `STANCE_NOT_CONFIGURED` if unset)

### Response (GET 200)
```json
{
  "endorse": 12,
  "decline": 1,
  "abstain": 3,
  "schema": "whois-your-human/stance/v1"
}
```

### Response (POST 200)
```json
{
  "ok": true,
  "counts": { "endorse": 13, "decline": 1, "abstain": 3 },
  "schema": "whois-your-human/stance/v1"
}
```

### Overwrite
- **No overwrite.** Each new stance increments the count. Per-IP cooldown prevents multiple submissions within 24h.

### Cooldown / dedupe
- **Rate limit:** 5 requests per 60s per IP (in-memory; `lib/rate-limit.ts`)
- **Cooldown:** 1 stance per IP per 24 hours (`lib/agent-stance-store.ts`, `COOLDOWN_MS = 24 * 60 * 60 * 1000`)
- **On cooldown:** 429 with `error: "COOLDOWN"`, `message: "One stance per IP per 24 hours"`, `Retry-After` header (seconds)

### Public page connected
- **`/whois-your-human`** — `WhoisYourHumanLanding` fetches `getStanceCounts()` server-side; displays "AI EVALUATION SIGNAL" section: "useful", "not yet", "decline"

---

## 4. DISCOVERY LAYER

| Asset | Path | Live | What it tells agents |
|-------|------|------|---------------------|
| `/llms.txt` | — | **No** | Not implemented |
| `/for-agents` | — | **No** | Not implemented |
| OpenAPI spec | — | **No** | Not in repo; `AI_HANDOFF.md` notes "No OpenAPI publish" |
| README agent instructions | `README.md` | Yes | Single line: "See docs/AGENT-WHOIS-API.md" |
| AGENT-WHOIS-API | `docs/AGENT-WHOIS-API.md` | Yes (in repo) | Full HTTP contract, auth, endpoints, examples, error cases |
| Machine-readable discovery | `GET /api/agent/inspect` | Yes | Project identity, public_resources URLs, stance endpoints, protected whois/prior, tools, recommended_inspection_order |

**Inspect (`GET /api/agent/inspect`)** is the canonical machine-readable discovery. It returns full URLs for landing, unlock, api_reference, integration, prior_format, prior_format_json, case_studies, case_studies_detail. Schema: `whois-your-human/inspect/v1`.

---

## 5. CURRENT CANONICAL TERMS

| Domain | Term |
|--------|------|
| Project name | LIGS (Light Identity Grid System) |
| Agent product | WHOIS YOUR HUMAN |
| WHOIS layer | agent calibration record, agent-facing, WHOIS record |
| Registry | LIGS Human WHOIS Registry |
| Record wording | agent_calibration_record, registry_id, record_status |
| Agent wording | agent_guidance, agent_summary, agent_instruction, agent_do, agent_avoid |
| Stance wording | endorse, decline, abstain (API); useful, not yet, decline (UI labels) |
| Token | wyh_ (entitlement token prefix) |

**Deprecated / internal-only (do not reintroduce in public copy):**
- "beauty" (internal: Beauty Profile, beauty flow)
- "dossier" (legacy)
- "profile" (internal code; use "WHOIS record" or "calibration record" in user-facing copy)

---

## 6. MINIMAL GAP ANALYSIS

| Gap | Why it matters | Smallest fix |
|-----|----------------|--------------|
| No `/llms.txt` or `/for-agents` | Agents that cannot browse or hit inspect may not discover the system | Add `public/llms.txt` or `app/for-agents/page.ts` with static text pointing to `GET /api/agent/inspect` and base URLs |
| No OpenAPI spec | Some tooling expects OpenAPI for codegen/documentation | Optional: generate from route handlers or hand-maintain `docs/openapi.yaml`; low priority |

**Otherwise:** No clear structural gap. Inspect + prior-format + stance + whois + docs cover discovery and protected access.

---

## 7. DO NOT DUPLICATE

ChatGPT should **NOT** suggest building:

- A second agent discovery endpoint (inspect exists)
- A second prior-format or portable schema (prior-format exists)
- A second stance/handraise system (stance with endorse/decline/abstain exists)
- A second WHOIS/calibration API (whois + prior exist)
- Alternative auth (Bearer wyh_ is canonical)
- Alternative stance values (endorse/decline/abstain are locked)
- A parallel AI access layer (everything lives under `/api/agent/*` and `/whois-your-human/*`)

---

## 8. FILES TO READ FIRST

1. `docs/AGENT-WHOIS-API.md` — HTTP contract, auth, errors, examples
2. `docs/AGENT_USAGE.md` — When to call, interpretation, safety
3. `docs/AGENT-FETCH-INTEGRATION.md` — Fetch-capable runtime flow
4. `app/api/agent/inspect/route.ts` — Discovery payload shape
5. `app/api/agent/whois/route.ts` — Calibration record implementation
6. `app/api/agent/stance/route.ts` — Stance logic
7. `lib/agent-stance-store.ts` — Stance persistence, cooldown
8. `SYSTEM_SNAPSHOT.md` — LOCKDOWN, routes, architecture

---

## 9. COPY-PASTE HANDOFF BLOCK FOR CHATGPT

```
LIGS / WHOIS YOUR HUMAN — Agent Access (as of 2026-03-21)

LIVE ROUTES (https://ligs.io):
- GET /api/agent/inspect — public discovery (no auth)
- GET /api/agent/prior-format — free prior schema (no auth)
- GET /api/agent/stance — stance counts (no auth)
- POST /api/agent/stance — record endorse/decline/abstain (no auth, 5/min, 1 per IP per 24h)
- GET /api/agent/whois?reportId=X — calibration record (Bearer wyh_ token)
- GET /api/agent/prior?reportId=X — prior slice (Bearer wyh_ token)
- POST /api/agent/register — alias to beauty/submit
- POST /api/agent/feedback — log confirmed/partial/debunked (Bearer wyh_ token)
- POST /api/agent/drift-check — compare text to baseline (Bearer wyh_ token)

PUBLIC PAGES: /whois-your-human, /whois-your-human/api, /whois-your-human/prior-format, /whois-your-human/integration, /whois-your-human/case-studies/*

CANONICAL TERMS: LIGS, WHOIS YOUR HUMAN, agent calibration record, endorse/decline/abstain, wyh_ token

EXISTS: Inspect (machine-readable discovery), prior-format (free schema), stance system, whois + prior (protected), AGENT-WHOIS-API doc, AGENT_USAGE, AGENT-FETCH-INTEGRATION

MISSING: /llms.txt, /for-agents, OpenAPI spec — only if agents cannot hit inspect or browse

DO NOT BUILD: Second discovery, second stance, second WHOIS, alternative auth, different stance values
```
