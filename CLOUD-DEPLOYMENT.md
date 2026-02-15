# Cloud deployment — locked state

This project is **cloud-clean**. Production does not depend on any local machine.

## Sources of truth

| Concern        | Source of truth |
|----------------|------------------|
| **Code**       | This repository (GitHub). |
| **Builds**     | Vercel (builds from the repo on push). |
| **Env vars**   | Vercel Project Settings → Environment Variables. |
| **Runtime**    | Vercel (serverless functions and edge). |

## What runs on Vercel

- All **App Router** routes (`app/**`).
- All **API routes** (`app/api/**`), including:
  - Stripe: `create-checkout-session`, `webhook`
  - Beauty: `[reportId]`, `create`, `demo`
  - Engine, E.V.E., report, email, analytics, generate-image
- **Config:** `next.config.ts`, `vercel.json` (no localhost or machine-specific options).
- **Env:** Read from Vercel at runtime (`process.env.*`). No `.env` or `.env.local` in the repo (gitignored).

## Local development

Optional. Scripts in `scripts/` and running `npm run dev` are for local use only; they are **not** used by Vercel build or production. The deployed app uses only the repo and Vercel env.

## Checklist

- [x] No references to a specific local machine, folder name, or localhost in app code or config.
- [x] Stripe handlers use `process.env.STRIPE_*` and `process.env.VERCEL_URL` for origin.
- [x] All API routes derive origin from `VERCEL_URL` or `request.url`.
- [x] `.env.example` documents required env; secrets live in Vercel (or your own env), not in the repo.

## Verification (cloud-only operation)

**App code** (`app/`, `lib/`, `components/`): Zero references to localhost, 127.0.0.1, .env.local, any machine-specific path, or local machine. Confirmed.

**Config** (`next.config.ts`, `vercel.json`, `.env.example`): No localhost or machine-specific options. Env is documented for Vercel only. Confirmed.

**Docs** (README, this file): Production is stated as Vercel-only; repo + Vercel are the only sources of truth. Optional local dev is clearly separated. Confirmed.

**Scripts** (`scripts/`): Marked "Local development only. Not used by Vercel." They are not executed by the build or runtime; production does not depend on them. Cloud operation is unchanged by their presence.
