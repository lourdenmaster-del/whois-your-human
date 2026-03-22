# Current work (rolling)

**Last oriented for:** engineering continuity — not a roadmap deck.

## Active priorities

1. **Agent WHOIS API (first sales)** — Flow: `POST /api/agent/register` → Stripe report-bound checkout → `verify-session` → `GET /api/agent/whois`. Doc: `docs/AGENT-WHOIS-API.md`. Public repo packaging may live under `whois-your-human` GitHub remote; full app remains this monorepo.
2. **Production access reliability** — Webhook must run before `entitlementToken` appears; success page polls `verify-session`. Blob required for entitlements in prod.
3. **Public surface lock** — Only `/origin` + APIs; `/beauty` UI not public via middleware.

## Unfinished / tech debt

- **Paid WHOIS HTML/text:** dry-run profiles can show **mismatched** archetype in body vs top block (`docs/PAID-WHOIS-TOP-BLOCK-BODY-MISMATCH-AUDIT.md`); recommendation B (skip parsed bodies for `[DRY RUN]` reports) not necessarily applied.
- **SYSTEM_SNAPSHOT drift:** table rows occasionally lag code (e.g. origin landing component name); cross-check `app/origin/page.jsx` when in doubt.
- **Internal fetch in `POST /api/agent/register`:** depends on same-origin `fetch` to `/api/beauty/submit` — works on Vercel; edge cases if base URL wrong in exotic deploys.

## Known failure modes

| Symptom | Likely cause |
|---------|----------------|
| Paid, no `entitlementToken` | Webhook delay, wrong `STRIPE_WEBHOOK_SECRET`, or webhook 404 (`BEAUTY_PROFILE_NOT_FOUND`). |
| `whois` 404 profile | Missing Beauty Profile for `reportId`. |
| `whois` 404 report | Missing stored report in Blob/memory. |
| Entitlement lost after deploy | Blob token unset → in-memory only. |

## Not in scope here

- Human-facing beauty marketing redesign.
- New archetypes without contract updates in `src/ligs/archetypes/contract.ts`.
