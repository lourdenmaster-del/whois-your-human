# Repository map

**Production (ligs.io):** Vercel deploy from **`nextjs-boilerplate` `main`** — WHOIS YOUR HUMAN live at **`/whois-your-human`**, **`/whois-your-human/unlock`**, **`/whois-your-human/api`**; Origin intake + activation messaging in **`OriginTerminalIntake`**.

## Root (high signal)

| Path | Role |
|------|------|
| `middleware.ts` | Host canonicalization; `/` → `/origin`; `/beauty`, `/dossier`, `/voice` → `/origin`; `/whois-your-human` (+ unlock, api) public; `/ligs-studio` cookie gate. **API paths not matched.** |
| `SYSTEM_SNAPSHOT.md` | Authoritative stack reference (must update on structural changes). |
| `app/whois-your-human/` | Agent landing, unlock bridge → `/origin`, static API reference. |
| `.cursor/rules/` | Enforced policies (glyph law, landing lock, LIGS master, snapshot). |

## `app/`

| Path | Role |
|------|------|
| `app/origin/` | **Public landing:** `page.jsx` → `OriginTerminalIntake`. |
| `app/beauty/` | Full beauty flow (success, cancel, start, view, landing client); **redirected from web** by middleware. |
| `app/api/stripe/` | `create-checkout-session`, `verify-session`, `webhook`. |
| `app/api/engine/` | `route.ts` (E.V.E.), `generate/route.ts` (report-only). |
