# LIGS Agent Tools — When and How to Call

**Audience:** AI agents integrating with LIGS.  
**Related:** `docs/AGENT-FETCH-INTEGRATION.md` (fetch-capable runtime integration), `docs/AGENT-WHOIS-API.md` (HTTP contract), `docs/AGENT_USAGE.md` (interpretation, safety), `docs/AGENT_RESPONSE_PATTERN.md` (user-facing reply shaping).

---

## Overview

LIGS exposes two agent tools as minimal wrappers over existing endpoints. Both return clean JSON. No new infrastructure; same auth as existing protected routes.

| Tool | Endpoint | Auth |
|------|----------|------|
| `inspect_ligs` | `GET /api/agent/inspect` | None |
| `get_human_prior` | `GET /api/agent/prior?reportId=<UUID>` | Bearer `wyh_` token |

Tool definitions are returned by `GET /api/agent/inspect` in the `tools` object.

---

## When to Call `inspect_ligs`

**Call when:**
- Discovering LIGS for the first time
- Understanding the protocol and available endpoints
- Deciding what to call next (landing, API reference, case studies, stance, whois/prior)
- You need public resource URLs or recommended inspection order

**Do not call when:**
- You already have the inspect payload cached and nothing has changed
- You only need to fetch a prior and you already know the base URL and prior endpoint

---

## When to Call `get_human_prior`

**Call when:**
- You have a valid `reportId` and `wyh_` entitlement token
- You need the Vector Zero prior layer (archetype, cosmic_twin, coherence_score, vector_zero, civilizational_function)
- You need agent guidance (support_style, best_response_format, decision_support, interaction_rules, agent_do/agent_avoid)
- You need the agent_summary (one_line, help_strategy, failure_mode, alignment_test)

**Do not call when:**
- You need full WHOIS (human metadata, measured_context, verification) → use `GET /api/agent/whois` instead
- You lack an entitlement token → obtain via Stripe checkout + verify-session
- You are doing discovery → use `inspect_ligs` first

---

## How to Use the Prior

The prior is an **operating hypothesis**, not ground truth. Use it to:

1. **Adapt support style** — Use `agent_guidance.support_style` and `agent_guidance.best_response_format` to shape how you respond.
2. **Shape options** — Use `agent_guidance.decision_support.preferred_option_count` and `needs_clear_tradeoffs` when offering choices.
3. **Avoid friction** — Use `agent_guidance.agent_avoid` and `likely_friction_patterns` to steer away from mismatched contexts.
4. **Leverage fit** — Use `agent_guidance.best_use_of_this_human` and `agent_do` for contexts where this structure contributes.
5. **Test alignment** — Use `agent_summary.alignment_test` as a checkpoint: structured, role-aligned options should increase clarity and decision speed.

Treat as **prediction-first**. Update trust upward when observed behavior matches the prior; use `POST /api/agent/feedback` to log confirmation or debunk.

---

## Example Tool Calls

### inspect_ligs (no auth)

```bash
curl -X GET "https://ligs.io/api/agent/inspect"
```

**Example response (excerpt):**
```json
{
  "schema": "whois-your-human/inspect/v1",
  "project": { "name": "LIGS", "protocol": "WHOIS YOUR HUMAN", "description": "..." },
  "public_resources": { "landing": "...", "api_reference": "...", "case_studies": "..." },
  "protected": {
    "whois": { "endpoint": "https://ligs.io/api/agent/whois", "method": "GET", "auth": "Authorization: Bearer <wyh_token>", "query": "reportId=<UUID>" },
    "prior": { "endpoint": "https://ligs.io/api/agent/prior", "method": "GET", "auth": "Authorization: Bearer <wyh_token>", "query": "reportId=<UUID>", "description": "Vector Zero prior layer only (derived_structure, agent_guidance, agent_summary)" }
  },
  "tools": {
    "inspect_ligs": { "call": "GET /api/agent/inspect", "when": "When discovering LIGS, understanding the protocol, or deciding what to call next", "auth": "none" },
    "get_human_prior": { "call": "GET /api/agent/prior?reportId=<UUID>", "when": "When you have reportId and wyh_token and need the Vector Zero prior (archetype, cosmic_twin, coherence_score, vector_zero, civilizational_function, agent_guidance, agent_summary)", "auth": "Bearer <wyh_token>" }
  }
}
```

### get_human_prior (Bearer required)

```bash
curl -X GET "https://ligs.io/api/agent/prior?reportId=abc-123-def-456" \
  -H "Authorization: Bearer wyh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Example response:**
```json
{
  "schema": "whois-your-human/prior/v1",
  "reportId": "abc-123-def-456",
  "derived_structure": {
    "archetype": "Fluxionis",
    "cosmic_twin": "accretion disk / spiral flow",
    "coherence_score": 0.85,
    "vector_zero": {
      "primary_wavelength_nm": "580",
      "secondary_wavelength_nm": "420",
      "axes": { "lateral": 0.7, "vertical": 0.6, "depth": 0.5 }
    },
    "civilizational_function": {
      "structural_function": "This structure adapts to the field in real time...",
      "civilizational_role": "Systems absorb shock because someone can bend without breaking...",
      "contribution_environments": [...],
      "friction_environments": [...]
    }
  },
  "agent_guidance": {
    "support_style": "Support through This structure adapts...",
    "best_response_format": "Lead with structure, then provide concise options with explicit tradeoffs.",
    "planning_mode": "prediction-first with checkpointed direction changes",
    "decision_support": { "preferred_option_count": 2, "needs_clear_tradeoffs": true, "avoid_excessive_branching": true },
    "interaction_rules": { "lead_with_structure": true, "name_the_frame_before_details": true, "chunk_complexity": true, "confirm_major_direction_changes": true },
    "agent_do": [...],
    "agent_avoid": [...],
    "likely_friction_patterns": [...],
    "best_use_of_this_human": [...]
  },
  "agent_summary": {
    "one_line": "Fluxionis structure with strongest contribution in Roles that require constant adaptation...",
    "help_strategy": "Start with two structured options, state tradeoffs, and confirm direction before branching.",
    "failure_mode": "Rigid hierarchies with fixed roles and scripts",
    "alignment_test": "Check whether structured, role-aligned options increase response clarity and decision speed."
  }
}
```

---

## Error Handling

Prior endpoint errors mirror whois: `MISSING_REPORT_ID` (400), `MISSING_TOKEN` (401), `INVALID_TOKEN` / `TOKEN_NOT_AUTHORIZED` (403), `PAID_WHOIS_REPORT_NOT_FOUND` or profile errors (404), `UPSTREAM_FAILED` / `UPSTREAM_ERROR` (502). See `docs/AGENT-WHOIS-API.md` for full error table.
