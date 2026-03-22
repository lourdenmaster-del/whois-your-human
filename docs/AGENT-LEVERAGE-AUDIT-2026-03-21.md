# LIGS / WHOIS YOUR HUMAN — Highest-Leverage Agent Improvement

---

## 1. CURRENT STRENGTH

- **Canonical discovery:** llms.txt, for-agents, and inspect all point to inspect as the first machine call. Inspect declares itself as the canonical entrypoint (`first_machine_call`, `canonical_entrypoint`).
- **Machine-readable provenance:** Inspect explains reportId and wyh_ token provenance, and that agents must not probe WHOIS without both.
- **Clear next-step guidance:** `next_step_if_no_record` and `next_step_if_record_available` tell the agent what to do in each case.
- **Explicit stance values:** `stance.values` and `api_values_only` specify endorse/decline/abstain and that UI wording may differ.
- **Stable error codes:** MISSING_TOKEN, INVALID_STANCE, etc. are distinct and parseable.
- **Full URLs in inspect:** No base-URL guessing required.

---

## 2. BIGGEST FRICTION

**Agents that land on HTML first never discover the machine layer.** If an agent fetches the root (/) or /whois-your-human, it gets HTML. There is no machine-readable pointer to llms.txt or inspect. The agent must rely on the convention of trying /llms.txt, which is not universal. Agents that parse HTML for hints find nothing. The result: agents that start on the wrong page stall before they ever reach inspect.

---

## 3. BEST NEXT MOVE

Add one line to the HTML head in `app/layout.tsx`:

```html
<link rel="alternate" type="text/plain" href="/llms.txt" title="Agent instructions (llms.txt)" />
```

This makes llms.txt discoverable from every page on the site. Any agent that can fetch and parse HTML can find the machine layer without guessing.

---

## 4. WHY IT MATTERS

- **Standard practice:** Alternate links for machine-readable content (e.g. RSS, Atom, llms.txt) are a familiar pattern; agents and crawlers already look for them.
- **Bridges the wrong-entry gap:** Agents that land on the landing page or root can follow the link to llms.txt instead of stalling.
- **No behavior change:** No new endpoints, no schema changes, no UI impact. Single HTML link.

---

## 5. DO NOT BUILD

- OpenAPI / Swagger
- MCP server or tool definitions
- New discovery endpoints
- Stance value aliases (e.g. "useful" → "endorse")
- Alternate auth
- /api/agent/list or record enumeration
- Webhooks or push-style notifications
- Agent-specific rate limits beyond existing stance limits

---

## 6. FINAL RECOMMENDATION

Add a `<link rel="alternate" type="text/plain" href="/llms.txt">` in the root layout’s head. It makes the machine layer discoverable from any page an agent might land on, fixes the main remaining discovery blind spot, and aligns with how agents and crawlers expect to find alternate content. Implement that first.
