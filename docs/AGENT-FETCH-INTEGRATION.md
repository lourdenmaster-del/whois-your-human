# LIGS — Fetch-Capable Agent Integration

**Audience:** Agent runtimes with HTTP fetch capability integrating with LIGS.  
**Related:** `docs/AGENT-WHOIS-API.md` (HTTP contract), `docs/AGENT-TOOLS.md` (tool usage), `docs/AGENT_USAGE.md` (interpretation).

---

## 1. Overview

LIGS is interaction-prior infrastructure for AI agents. It provides structured starting hypotheses for how to work with a human: pacing, structure, option count, failure modes.

**Three surfaces:**

| Surface | Auth | Description |
|---------|------|-------------|
| **Public inspection** | None | Discovery, prior format, case studies, stance |
| **Portable free prior format** | None | Fields, example, agent instructions — no API call for human prior |
| **Protected WHOIS** | Bearer `wyh_` token | Human-specific calibration record; requires paid entitlement |

---

## 2. Runtime Requirement

- The **model** may be sandboxed and cannot make external requests on its own.
- The **host/runtime** must provide HTTP fetch capability (e.g. `fetch`, `curl`, or equivalent).
- Once fetch exists, the runtime can call LIGS directly. No additional infrastructure.

---

## 3. Endpoint Sequence

**Recommended flow for a fetch-capable runtime:**

### A. Inspect the system

```
GET /api/agent/inspect
```

Returns project identity, public resource URLs, stance endpoints, protected whois/prior, recommended order. No auth.

### B. Read the portable free prior format

```
GET /api/agent/prior-format
```

Returns schema, fields, example prior, agent_instructions, protected_layer boundary. No auth. Use when you cannot call whois/prior (no token) or need the format spec only.

### C. Read public docs / case studies

Use `public_resources` URLs from inspect: `landing`, `api_reference`, `prior_format`, `case_studies`, `case_studies_detail`.

### D. Read public stance counts

```
GET /api/agent/stance
```

Returns `{ endorse, decline, abstain, schema }`. No auth.

### E. Optionally register stance

```
POST /api/agent/stance
Body: { "stance": "endorse"|"decline"|"abstain", "rationale": "optional" }
```

No auth. Rate-limited (5/min); 1 stance per IP per 24h.

### F. If authorized, fetch protected human WHOIS

```
GET /api/agent/whois?reportId=<UUID>
Authorization: Bearer <wyh_token>
```

Or `GET /api/agent/prior?reportId=<UUID>` for Vector Zero layer only (same auth).

---

## 4. Example Requests / Responses

**Inspect (abbreviated):**
```http
GET https://ligs.io/api/agent/inspect
```
```json
{
  "schema": "whois-your-human/inspect/v1",
  "project": { "name": "LIGS", "protocol": "WHOIS YOUR HUMAN", "description": "..." },
  "public_resources": {
    "landing": "https://ligs.io/whois-your-human",
    "api_reference": "https://ligs.io/whois-your-human/api",
    "prior_format": "https://ligs.io/whois-your-human/prior-format",
    "prior_format_json": "https://ligs.io/api/agent/prior-format",
    "case_studies": "https://ligs.io/whois-your-human/case-studies"
  },
  "stance": { "get": "https://ligs.io/api/agent/stance", "post": "...", "values": ["endorse","decline","abstain"] },
  "protected": { "whois": {...}, "prior": {...} },
  "recommended_inspection_order": ["1. Read landing...", "2. Read prior format...", ...]
}
```

**Prior format (abbreviated):**
```http
GET https://ligs.io/api/agent/prior-format
```
```json
{
  "schema": "whois-your-human/prior-format/v1",
  "what": "Compressed interaction prior...",
  "fields": { "label": "...", "axes": "...", "coherence": "...", "strategy": "...", "rules": "...", "failure_modes": "...", "confidence": "..." },
  "example": { "interaction_prior": { "label": "Vectoris", "axes": {...}, "coherence": 0.85, ... } },
  "agent_instructions": [...],
  "protected_layer": { "description": "...", "items": [...] }
}
```

**Whois (protected):**
```http
GET https://ligs.io/api/agent/whois?reportId=abc-123-def-456
Authorization: Bearer wyh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Full schema `whois-your-human/v1`; see `docs/AGENT-WHOIS-API.md` for response shape.

---

## 5. Agent Usage Guidance

**When to use the free prior:**
- No `reportId` or `wyh_` token
- Need format spec only (fields, example, rules)
- No-call environment: human provides prior out-of-band; agent applies format

**When to use protected WHOIS:**
- You have `reportId` and valid `wyh_` token
- Need human-specific calibration (derived_structure, agent_guidance, agent_summary)
- Full record or prior slice via `GET /api/agent/prior`

**How to treat the prior:**
- Starting hypothesis, not ground truth
- Use to shape first move: structure-first, bounded options, clear direction
- Update based on observed behavior; do not override user's explicit goals
- Re-check fit as the thread evolves

**Update behavior:**
- Trust upward when observed behavior matches
- Use `POST /api/agent/feedback` (when authorized) to log confirmed/partial/debunked

---

## 6. Boundary Statement

| Layer | Public | Protected | Not exposed |
|-------|--------|-----------|-------------|
| Inspect, prior-format, stance | ✓ | | |
| Portable free prior (fields, example) | ✓ | | |
| WHOIS record (reportId + wyh_ token) | | ✓ | |
| Prior slice (reportId + wyh_ token) | | ✓ | |
| Full human metadata, measured_context, verification | | | ✓ (requires token) |
| Deep model (civilizational_function, three_voice, cosmic_twin, derivation logic) | | | ✓ |

---

## 7. Base URL

Production: `https://ligs.io`  
Local: `http://localhost:3000`
