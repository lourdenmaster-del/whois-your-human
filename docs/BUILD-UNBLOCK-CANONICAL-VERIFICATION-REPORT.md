# Build Unblock + Canonical Verification Report

**Date:** 2026-03-20  
**Task:** Fix build blocker, re-run build, verify free/paid prior paths.

---

## 1. Build blocker analysis

| Item | Value |
|------|-------|
| **File** | `app/api/engine/generate/route.ts` |
| **Line** | 864 |
| **Error** | `Type error: Property 'repairPath' does not exist on type 'InjectResult'.` |

**Actual `InjectResult` type** (from `lib/engine/initiation-anchor.ts`):

```ts
export type InjectResult =
  | { ok: true; report: string; repairPath: "section_aware" }
  | { ok: false; report: string; reason: string; initiationFound: boolean; insertionPointFound: boolean };
```

**Why `repairPath` fails:** When `injectResult.ok` is `false`, the branch is `{ ok: false; ... }`, which has no `repairPath` property. The log at line 864 ran in both branches; when `ok` is false, `injectResult.repairPath` is undefined and TypeScript rejects it.

**Minimal safe fix applied:**

```ts
...(injectResult.ok && { repairPath: injectResult.repairPath })
```

Only spread `repairPath` when `injectResult.ok` is true (where it exists).

---

## 2. Files changed (this task)

- `app/api/engine/generate/route.ts` — repairPath guard at line 864
- `lib/whois-alignment.ts` — PACE_ORDER indexOf type cast (separate build fix)
- `lib/whois-agent-prior.ts` — shared prior builder (prior task)
- `app/api/agent/whois/route.ts` — use `buildAgentPriorLayer` (prior task)
- `app/api/beauty/submit/route.ts` — free path `agentPriorLayer` (prior task)

---

## 3. Build result

- **Status:** PASS
- **Command:** `npm run build`
- **Exit code:** 0

---

## 4. Free path verification

| Item | Value |
|------|-------|
| **Route tested** | `POST /api/beauty/submit` |
| **Payload** | `{ fullName, birthDate, birthTime, birthLocation, email, dryRun: true }` |
| **Response shape** | `{ status: "ok", data: { reportId, protocol, intakeStatus, freeWhoisReport, agentPriorLayer } }` |

**Observed:**
- `reportId`: present (e.g. `fc76320c-8b5e-4267-a471-1c042ae3e972`)
- `protocol`: present
- `freeWhoisReport`: present
- `data.agentPriorLayer`: PRESENT — includes `derived_structure`, `agent_directives`, `agent_summary`; `coherence_score` and `vector_zero.*` null (free tier as expected)

---

## 5. Paid path verification

| Item | Value |
|------|-------|
| **Flow** | `POST /api/beauty/dry-run` → `POST /api/dev/mint-agent-token` → `GET /api/agent/whois?reportId=` |
| **Auth** | `Authorization: Bearer <token>` |
| **Response shape** | Top-level `derived_structure`, `agent_directives`, `agent_summary` (no `agent_prior_layer` wrapper) |

**Observed enriched prior:**
- `coherence_score`: 0.85 (from storedReport.vector_zero)
- `vector_zero.axes`: `{ lateral: 0.7, vertical: 0.75, depth: 0.7 }`
- `archetype`: Fluxionis (from solar profile)
- `derived_structure`, `agent_directives`, `agent_summary`: all present

---

## 6. Untouched guarantees

- Routes (no add/remove)
- Branding
- Pricing
- Stripe
- Unlock/token flow
- Free vs paid policy

---

## 7. Push report

- **Commit hash:** (see git log after commit)
- **Push result:** (see push output)
- **Summary:** Build unblock (repairPath type guard) + prior builder verification. Free path returns `agentPriorLayer`; paid whois returns enriched prior (coherence_score, vector_zero axes) via `buildAgentPriorLayer`.
