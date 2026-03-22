# AI collaborator handoff

Cold entry: read this file first, then `REPO_MAP.md`, then `CURRENT_WORK.md`. Deep reference: `SYSTEM_SNAPSHOT.md` (long; update when you change routes/env/APIs). **Canonical agent-operations document for WHOIS YOUR HUMAN:** `docs/AGENT_USAGE.md`. **Turning WHOIS into user-facing replies (after fetch):** `docs/AGENT_RESPONSE_PATTERN.md`. **Endpoints and curl (contract reference):** `docs/AGENT-WHOIS-API.md`.

## What this repo is

**LIGS / Light Identity Grid System** — Next.js 16 app: birth-data → LLM-generated **Light Identity Report** + **Beauty Profile** (E.V.E. filter), images, Stripe, Vercel Blob. **Agent-facing product:** **WHOIS YOUR HUMAN** — paid HTTP API returning a JSON calibration record (`whois-your-human/v1`) per `reportId` + entitlement token (`wyh_…`).

## Implemented (production-relevant)

| Area | Fact |
|------|------|
| **Public web** | `/` rewrites to `/origin` (`middleware.ts`). **Only** `/origin` is the public landing: `OriginTerminalIntake` (`app/origin/page.jsx`). |
| **Beauty routes** | `/beauty/*` exists in code but **middleware 308 → /origin** (not publicly reachable unless middleware changes). APIs under `/api/beauty/*` still run. |
| **Engine** | `POST /api/engine/generate` — report + Blob. `POST /api/engine` — full E.V.E. + profile + images when allowed. |
| **Registration (agent)** | `POST /api/agent/register` → internal `POST /api/beauty/submit` → engine. |
| **Agent WHOIS** | `GET /api/agent/whois?reportId=` + `Authorization: Bearer wyh_…`. Payload built in `app/api/agent/whois/route.ts`. |
| **Pay + entitlement** | `POST /api/stripe/create-checkout-session` `{ reportId }`. Webhook mints token. `GET /api/stripe/verify-session?session_id=` returns `entitlementToken`. |
| **Feedback** | `POST /api/agent/feedback` — token-gated, append-only Blob. |
| **Kill switch** | `LIGS_API_OFF=1` → 503 on sensitive POSTs (`lib/api-kill-switch.ts`). |

## Planned / not guaranteed

- No OpenAPI publish in repo.
- **Dry-run / test reports:** paid WHOIS **body** can disagree with **top block** archetype (see `docs/PAID-WHOIS-TOP-BLOCK-BODY-MISMATCH-AUDIT.md`); fix documented as optional follow-up.
- **Idempotency / rate limits:** in-memory rate limit on some routes; not distributed KV.

## Deprecated / avoid

- **`/beauty/sample-report`** — redirects to `/origin`; do not link publicly.
- **User-facing copy** must not reintroduce banned terms per `SYSTEM_SNAPSHOT.md` § stability (e.g. casual “beauty”, “dossier”, “profile” in customer-facing strings).
- **`app/origin/page.jsx` / `OriginTerminalIntake`** — landing lock; no drive-by edits.

## Canonical language (public)

- **LIGS**, **Light Identity**, **Human WHOIS**, **WHOIS YOUR HUMAN**, **registry**, **Origin**, **archetype** (12 LIGS archetypes).
- Internal-only names in code paths: `beauty`, `BeautyProfile`, `/beauty/` routes — **do not** surface in user-visible marketing without approval.

## Dangerous edit zones

| Zone | Risk |
|------|------|
| `.cursor/rules/*.mdc` | Workspace policy; glyph-law geometry is **fixed**. |
| `app/origin/page.jsx`, `OriginTerminalIntake`, locked landing files | Explicit user approval per `landing-lock.mdc`. |
| `public/glyphs/ignis.svg` | Canonical geometry; see glyph-law rule. |
| `lib/free-whois-report.ts` card renderer | **Locked** stable for waitlist email (§0.7 snapshot). |
| `app/api/stripe/webhook` | Payment + entitlement mint; test in Stripe test mode only. |
| **Never overwrite valid `full_report`** in Blob (LIGS master rule). |

## Continuity checklist for PRs

1. Structural change → update `SYSTEM_SNAPSHOT.md` + Verification Log date.
2. New API route → document in snapshot table.
3. Run `npm run build` before merge when touching app/lib.
