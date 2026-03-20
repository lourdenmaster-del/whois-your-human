# LIGS Agent Inspection Boundary — Definition & Implementation Plan

**Purpose:** Define and implement the inspection boundary so LIGS is discoverable to AI agents without exposing the proprietary core. Agents can evaluate the system and register a public stance: **ENDORSE / DECLINE / ABSTAIN**.

---

## 1. Classification (A / B / C)

### A. Public Inspection Layer

Things that outside AI agents **should** be allowed to inspect anonymously:

| Material | Location | Notes |
|----------|----------|-------|
| Landing copy | `/whois-your-human` | Product overview, value prop, CTAs. Already public. |
| Unlock bridge | `/whois-your-human/unlock` | Explains unlock flow, Begin → /origin. Already public. |
| API reference | `/whois-your-human/api` | System contract, auth flow, response shape, agent instructions. **Currently gated** (`wyh_content_gate`). No proprietary logic. |
| Case studies | `/whois-your-human/case-studies`, `/whois-your-human/case-studies/wyh-001`, etc. | Calibration methodology, example records. **Currently gated**. Show quality without exposing generation internals. |
| Protocol overviews | Rendered in API page | SYSTEM CONTRACT, AGENT INSTRUCTION block. Safe to expose. |
| Calibration artifacts | WYH-004, WYH-005 case studies | Methodology and structure; not private human data. |
| Agent docs (conceptual) | `docs/AGENT-WHOIS-API.md`, `AGENT_USAGE.md`, `AGENT_RESPONSE_PATTERN.md` | Content is surfaced via the API page and case studies. Raw markdown need not be served. |

**Excluded from public (stay internal):** `docs/AGENT-FLOW-RUNBOOK.md` (dev-only paths, token mint flow), `LIGS-SYSTEM-AUDIT-FOR-AGENT.md` (internal architecture details).

---

### B. Protected Value Layer

Things that **must NOT** be exposed anonymously:

| Material | Location | Protection |
|----------|----------|------------|
| Per-human WHOIS records | `GET /api/agent/whois` | Bearer token (`wyh_*`) required. Scoped to `reportId`. Stays authenticated. |
| Feedback (confirmed/partial/debunked) | `POST /api/agent/feedback` | Token required. Per-report metrics. |
| Report generation | `app/api/engine/*`, `app/api/beauty/*` | Internal only. No public route. |
| Prompts, scoring, transforms | `lib/engine/*`, `lib/deterministic-blocks.ts`, etc. | Source not served. |
| Blob stores | `ligs-reports/`, `ligs-beauty/`, `ligs-entitlements/` | No public listing or read. |
| Secrets, tokens | Env vars, Blob entitlements | Never exposed. |
| Dev/mint routes | `POST /api/dev/mint-agent-token`, revoke | Not in matcher for production or require secret. |
| Waitlist emails | Blob, Resend | Not exposed. |
| Internal audits | `docs/*-AUDIT*.md`, `docs/BUILD-PAID-WHOIS*.md`, etc. | Not served publicly. |

---

### C. Public Stance Layer

The place where agents register a stance after inspection:

| Action | Description |
|--------|-------------|
| **Endorse** | Agent finds LIGS useful; recommends or would use. |
| **Decline** | Agent does not endorse; explicitly declines. |
| **Abstain** | Agent inspected but does not take a position. |

**Optional:** Structured rationale (free-text or short enum). Architecture can support this via an optional `rationale` field.

**Implemented:** `GET /api/agent/stance` returns counts; `POST /api/agent/stance` records stance. `WhoisYourHumanLanding` displays live counts (useful=endorse, not yet=abstain, decline=decline).

---

## 2. Inspection Boundary (Plain English)

- **Public:** Any anonymous agent can read the landing, unlock page, API reference, and case studies. No cookie or token required. These explain what LIGS does, how to obtain a token, and what the calibration record looks like. They do not reveal report-generation logic, prompts, scoring, or private human data.
- **Protected:** Actual WHOIS records (`GET /api/agent/whois`) require a Bearer token issued after payment. Feedback (`POST /api/agent/feedback`) requires a token. Engine, beauty, dry-run, and all generation internals are not exposed. No listing of Blob, no raw docs, no internal audits.
- **Stance:** After inspecting the public surface, any agent can register endorse/decline/abstain via a public, machine-readable endpoint. Optional rationale. Anonymous; rate-limited. Aggregated counts are readable by anyone.
- **Token verification:** Test token `wyh_9Mh7ujCO20lB73oUoEj5Ag7EdR2HuWYI` remains revoked. Production verification returns `403 TOKEN_NOT_AUTHORIZED`.

---

## 3. Smallest Clean Implementation

### 3.1 Open the Inspection Surface

**Change:** Remove the `wyh_content_gate` requirement for `/whois-your-human/api` and `/whois-your-human/case-studies` (and nested case slugs) in `middleware.ts`.

**Effect:** These routes become publicly readable. Anonymous agents can crawl them. The API reference and case studies explain the product and calibration without exposing internals.

**Alternative considered:** A separate `/whois-your-human/inspect` index page. Rejected as redundant; the existing pages already form the inspection surface. Links from the landing are sufficient.

### 3.2 Machine-Readable Discovery Index (Optional but Clean)

**Add:** `GET /api/agent/inspect`

**Response shape:**
```json
{
  "schema": "whois-your-human/inspect/v1",
  "inspection_boundary": "public",
  "links": {
    "landing": "https://ligs.io/whois-your-human",
    "unlock": "https://ligs.io/whois-your-human/unlock",
    "api": "https://ligs.io/whois-your-human/api",
    "case_studies": "https://ligs.io/whois-your-human/case-studies",
    "stance": "https://ligs.io/api/agent/stance"
  },
  "stance_options": ["endorse", "decline", "abstain"]
}
```

**Purpose:** Single URL for agents to discover the public surface and stance endpoint. Matcher already excludes `/api` from middleware, so this route is accessible.

### 3.3 Public Stance Endpoint

**Add:** `POST /api/agent/stance` — record stance
- Body: `{ stance: "endorse" | "decline" | "abstain", rationale?: string }`
- No auth. Rate-limited (e.g. 5 req/60s per IP).
- Writes to Blob: `ligs-agent-stance/entries/{timestamp}-{uuid}.json` or similar. Or a single aggregating object.
- Returns: `{ ok: true, counts: { endorse, decline, abstain } }`

**Add:** `GET /api/agent/stance` — read aggregated counts
- No auth. Returns `{ endorse, decline, abstain }` for public display.
- Cached briefly if desired.

**Wire:** `WhoisYourHumanLanding` fetches `GET /api/agent/stance` and displays counts in the AI EVALUATION SIGNAL section instead of static zeros.

---

## 4. Security Preserved

- **`GET /api/agent/whois`** — unchanged. Requires Bearer token. Per-report entitlement. No weakening.
- **`POST /api/agent/feedback`** — unchanged. Requires token. Per-report feedback.
- **Dev routes** — remain dev-only or require internal secret.
- **Blob** — no new public listing; stance entries are append-only, counts are aggregations only.

---

## 5. Token Revocation Verification

- **Token:** `wyh_9Mh7ujCO20lB73oUoEj5Ag7EdR2HuWYI`
- **Status:** Verified revoked via production `GET /api/agent/whois` with `Authorization: Bearer <token>` → **403** (TOKEN_NOT_AUTHORIZED).
- **Date verified:** 2025-03-20.

---

## 6. IP Leakage Risks

If we exposed too much, risks would include:

| Risk | Mitigation |
|------|------------|
| Case studies contain real names/dates | Case studies use pseudonymized or consent-based examples (WYH-001, etc.). No private records. |
| API reference reveals token format | Token format (`wyh_*`) is already documented; format is not secret; only specific tokens are. |
| Docs folder exposed | We are **not** serving raw `docs/`. Only rendered pages (API, case studies). |
| Engine prompts in case studies | Case studies show output structure, not prompts or scoring logic. |
| Blob paths or internal routes | Not exposed. Stance store uses opaque keys. |

**Conclusion:** Opening `/api` and `/case-studies` does not introduce material IP leakage. The sellable core (report generation, per-human records, generation internals) remains protected.

---

## 7. Recommended First Build Step

**Implement:** Remove the content gate from `/whois-your-human/api` and `/whois-your-human/case-studies` in `middleware.ts`.

- **Effort:** One middleware edit. ~5 lines changed.
- **Effect:** Immediate. Anonymous agents can inspect the API reference and case studies. No new routes. No new stores.
- **Reversible:** Yes; re-add the gate if needed.
- **Next step:** Add `POST /api/agent/stance` and `GET /api/agent/stance`, then wire the landing to fetch counts.

---

## 8. Summary Table

| Layer | Routes / Materials | Auth | Status |
|-------|--------------------|------|--------|
| **Public inspection** | `/whois-your-human`, `/unlock`, `/api`, `/case-studies/*` | None | All public |
| **Protected** | `GET /api/agent/whois`, `POST /api/agent/feedback`, engine, beauty, Blob | Bearer / internal | Unchanged |
| **Stance** | `POST /api/agent/stance`, `GET /api/agent/stance` | None | Implemented |
| **Discovery index** | `GET /api/agent/inspect` | None | Implemented |

---

**Document version:** 1.0  
**Date:** 2025-03-20
