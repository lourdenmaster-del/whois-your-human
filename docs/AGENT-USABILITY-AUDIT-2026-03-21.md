# LIGS / WHOIS YOUR HUMAN — Agent Usability Audit (2026-03-21)

**Purpose:** Identify friction for an AI agent using the system correctly on first contact. No redesign, no new major features, no alternate architectures.

---

## 1. FIRST CONTACT SIMULATION

### Most obvious first action
**Answer:** Call `GET /api/agent/inspect` — if the agent lands on `/llms.txt` or `/for-agents`, both say "First call: GET /api/agent/inspect" or "FIRST CALL: GET /api/agent/inspect". If the agent lands on the inspect response directly (e.g. from a shared URL), the structure is self-documenting but there is no explicit "start here" label.

### Ambiguity about where to start
**Yes.** If the agent lands on `/whois-your-human` (landing) first, there is no machine-readable "call inspect first" instruction. The landing is HTML; the agent would need to parse it or guess. The `recommended_inspection_order` in inspect says "1. Read landing and protocol overview" — which could be misinterpreted as "fetch the landing HTML before inspect" instead of "inspect first, then optionally read landing for context."

### Multiple competing entry points
**Yes.** An agent could discover LIGS via:
- `/llms.txt` (convention-based)
- `/for-agents` (if linked or crawled)
- `/whois-your-human` (landing HTML)
- `/api/agent/inspect` (if given directly)
- `/whois-your-human/api` (API reference HTML)
- `/whois-your-human/integration` (integration guide HTML)

Only llms.txt and for-agents explicitly say "inspect first." The inspect response itself does not say "you are at the start" or "call this first."

### Is "inspect first" clearly enforced or just implied?
**Implied.** llms.txt and for-agents state it. Inspect's `recommended_inspection_order` starts with "Read landing" (step 1), not "You have completed discovery; inspect is your first machine call." There is no `first_machine_call` or `agent_start_here` field in the inspect payload.

---

## 2. DISCOVERY FRICTION

### llms.txt
| Issue | Type |
|-------|------|
| No base URL | Missing — agent must infer host (e.g. from request URL) |
| "reportId=<id>" is vague | Unclear — agent may not know where reportId comes from |
| No mention of "no record exists" path | Missing — agent might not know how to handle "human has no paid record yet" |

### /for-agents
| Issue | Type |
|-------|------|
| Hardcoded `https://ligs.io` in examples | Unclear — non-production deployments would differ |
| "Determine if a human record exists" not addressed | Missing — no guidance on how agent learns whether reportId + token are available |
| Endpoint list does not include register, feedback, drift-check | Redundant/partial — those exist but are not in the minimal list (intentional; could confuse) |

### inspect response
| Issue | Type |
|-------|------|
| `recommended_inspection_order` step 1 is "Read landing" | Unclear — could imply fetch HTML before inspect |
| No `first_machine_call` or equivalent | Missing — machine-readable "start here" |
| `protected.whois.query` says `reportId=<UUID>` | Unclear — reportId format is flexible in code (UUID-like from registration), but "UUID" may be over-specific |
| `tools` block is rich but not labeled as "after inspect" | Unclear — relationship to inspect flow is implicit |

---

## 3. FLOW BREAKS

**Ideal flow:** inspect → (optional: prior-format, case studies, stance) → whois (when reportId + token exist) → (optional: stance POST)

### Where an agent might stall

| Stage | Friction |
|-------|----------|
| **Before inspect** | If agent lands on landing HTML, no machine instruction to call inspect. |
| **After inspect** | `recommended_inspection_order` suggests "Read landing" first; agent may fetch HTML and stall on prose. |
| **Before whois** | Agent needs reportId and wyh_ token. No inspect field explains *how* the agent receives these (human handoff, session, integration). Agent may try whois without them → 401/403. |
| **After 401/403** | Error bodies are clear (`MISSING_TOKEN`, `INVALID_TOKEN`, etc.), but no guidance on "obtain token via verify-session after human checkout." |
| **Stance POST** | Agent might use "useful" or "not yet" (from landing UI labels) instead of "endorse" or "abstain" (API values) → 400 INVALID_STANCE. |

### Required inputs unclear
- **reportId:** Inspect says `reportId=<UUID>`. Docs say "from registration or checkout." Not stated in inspect who provides it (human, integration, session store).
- **token:** Inspect says `Authorization: Bearer <wyh_token>`. Not stated how agent obtains it (verify-session after Stripe checkout).

### Auth confusion
- Bearer vs `?token=`: Both work; for-agents says "Header preferred." Minor.
- Token scope: Token is scoped to one reportId. Not stated in inspect; agent might assume token is global.

### Naming conflict
- **Landing UI:** "useful" = endorse, "not yet" = abstain, "decline" = decline
- **API:** endorse, decline, abstain
- Agent reading landing HTML could infer "useful" and POST `{"stance": "useful"}` → 400.

---

## 4. CHAOS POINTS

| Risk | Consequence |
|------|-------------|
| Agent invents `/api/agent/list` or `/api/agent/records` | 404; no such endpoint; agent may retry or give up |
| Agent uses "support" or "deny" for stance | 400 INVALID_STANCE |
| Agent uses "useful" or "not yet" (from landing) for stance | 400 INVALID_STANCE |
| Agent calls whois without token "to check if record exists" | 401; may misinterpret as "system down" |
| Agent assumes token is in inspect or prior-format | Neither returns tokens; agent stalls |
| Agent misreads `recommended_inspection_order` as "fetch HTML first" | Unnecessary HTTP; possible parse errors; delay |
| Agent fails silently on 503 STANCE_NOT_CONFIGURED | Might not surface to user; stance POST appears to "do nothing" |

---

## 5. MINIMAL FIXES ONLY

| Issue | Smallest fix |
|-------|--------------|
| Inspect doesn't say "start here" | Add to inspect: `first_machine_call: "GET /api/agent/inspect"` or `agent_start_here: true` (or equivalent). Single field. |
| recommended_inspection_order step 1 ambiguous | Change step 1 to "GET /api/agent/inspect (you are here)" or "You have completed machine discovery; optionally read landing for context." |
| llms.txt: no base URL | Add one line: `Base: https://ligs.io` (or derive from convention). |
| Landing UI stance labels vs API | Add to for-agents and/or landing: "API values: endorse (useful), abstain (not yet), decline." One sentence. |
| reportId/token provenance not in inspect | Add to inspect `protected.whois`: `note: "reportId and token from human handoff after registration + Stripe checkout; call GET /api/stripe/verify-session?session_id=... for token recovery."` or similar. One line. |

**Do not:** Add new endpoints, rename routes, duplicate systems.

---

## 6. AGENT LOVE SCORE

| Dimension | Score (1–10) | Notes |
|-----------|--------------|------|
| **Clarity** | 7 | Terms are consistent in API; inspect is well-structured. Landing/UI stance labels diverge. |
| **First-step obviousness** | 6 | llms.txt and for-agents say inspect first; landing does not. Inspect itself doesn't say "start here." |
| **Correctness without guessing** | 6 | reportId and token provenance require docs; agent may guess. Stance values must match exactly. |
| **Ease of use** | 7 | Once agent has reportId + token, whois is straightforward. Discovery and handoff are the gaps. |

**Overall:** ~6.5/10

### What would move it +1 point
- Inspect includes `first_machine_call` or equivalent so any agent hitting inspect knows "you started correctly."
- One sentence in inspect (or for-agents) explaining reportId + token source (human handoff, verify-session).

### What is already strong
- inspect returns full URLs; no base inference needed for links.
- stance `values` array is explicit (`["endorse", "decline", "abstain"]`).
- Error codes are specific (`MISSING_TOKEN`, `INVALID_STANCE`, etc.).
- llms.txt and for-agents both say inspect first.
- prior-format exists for agents that cannot call whois.

---

## 7. DO NOT OVERBUILD

**Do not build right now:**

- `/api/agent/list` or any endpoint to "discover" reportIds without auth
- OpenAPI/Swagger spec
- Alternate auth (API keys, etc.)
- Stance value aliases ("useful" → "endorse") — keep API strict; fix docs
- A separate "agent onboarding" endpoint
- MCP server or tool definitions
- Webhook for "record ready" notifications
- Agent-specific rate limits beyond existing stance limits
- A second discovery JSON route
- Rewriting the inspect schema (only add optional fields if needed)
