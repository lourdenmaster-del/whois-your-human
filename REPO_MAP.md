# Repository map

## Root (high signal)

| Path | Role |
|------|------|
| `middleware.ts` | Host canonicalization; `/` → `/origin`; `/beauty`, `/dossier`, `/voice` → `/origin`; `/ligs-studio` cookie gate. **API paths not matched.** |
| `SYSTEM_SNAPSHOT.md` | Authoritative stack reference (must update on structural changes). |
| `AI_HANDOFF.md` | Cold-start for AI collaborators. |
| `CURRENT_WORK.md` | Priorities and known gaps. |
| `docs/AGENT-WHOIS-API.md` | Agent register → pay → verify → whois + curl. |
| `docs/AGENT_USAGE.md` | How an AI agent should use WHOIS in practice (interpretation, safety, patterns). |
| `docs/AGENT_RESPONSE_PATTERN.md` | Procedural model: A–D response steps, signal weighting, language rules, examples. |
| `app/whois-your-human/` | Agent landing, unlock bridge → `/origin`, static API reference. |
| `.cursor/rules/` | Enforced policies (glyph law, landing lock, LIGS master, snapshot). |

## `app/`

| Path | Role |
|------|------|
| `app/origin/` | **Public landing:** `page.jsx` → `OriginTerminalIntake`. |
| `app/beauty/` | Full beauty flow (success, cancel, start, view, landing client); **redirected from web** by middleware. |
| `app/api/agent/` | `register/route.ts`, `whois/route.ts`, `feedback/route.ts`. |
| `app/api/stripe/` | `create-checkout-session`, `verify-session`, `webhook`. |
| `app/api/engine/` | `route.ts` (E.V.E.), `generate/route.ts` (report-only). |
| `app/api/beauty/` | `submit`, `dry-run`, `create`, `[reportId]`. |
| `app/api/dev/*` | Dev-only routes; many `403` in production. |
| `app/ligs-studio/` | Internal studio UI (gated). |

## `lib/` (selected)

| Path | Role |
|------|------|
| `lib/report-store.ts` | `getReport`, `saveReportAndConfirm`, Blob keys `ligs-reports/`. |
| `lib/beauty-profile-store.ts` | `loadBeautyProfileV1`, `saveBeautyProfileV1`, `ligs-beauty/`. |
| `lib/agent-entitlement-store.ts` | `wyh_` tokens, `ligs-agent-entitlements/`, feedback prefix. |
| `lib/free-whois-report.ts` | Paid/free WHOIS HTML/text; `buildPaidWhoisReport`, `resolveChronoImprintDisplay`. |
| `lib/api-kill-switch.ts` | `LIGS_API_OFF`. |
| `lib/engine-spec.ts`, `lib/engine/*` | Report generation, validators, prompts. |

## `components/`

| Path | Role |
|------|------|
| `OriginTerminalIntake.jsx` | Public WHOIS terminal intake. |
| `LigsStudio.tsx` | Internal generation/composer. |
| `LightIdentityForm.jsx` | Shared birth form. |

## `src/ligs/`

Domain logic: archetypes (`contract.ts`), astronomy, cosmology, voice (`civilizationalFunction.ts`), marketing identity (`identity-spec.ts` / LIR-ID).

## `docs/`

Audits, diagrams, agent API — many **read-only** historical; trust `SYSTEM_SNAPSHOT` + `AI_HANDOFF` for “what runs now.”
