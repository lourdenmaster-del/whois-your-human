# LIGS Full-Stack System Snapshot

**Authoritative reference for the current stack.** This file is the single source of truth for front-end routes, back-end API routes, environment variables, Vercel config, build pipeline, and integration points. Any structural change to the app (new routes, new API handlers, new env vars, new integrations, or changes to existing structure) **must** be reflected here—update this document in the same change set.

First-time system map for **ligs-frontend** (Next.js 16, React 19). Use this to verify the full stack is wired correctly.

---

## 1. Front-end architecture

### 1.1 App structure (App Router)

| Path | Type | Purpose |
|------|------|--------|
| `app/layout.tsx` | Root layout | Space Grotesk font, `globals.css`, metadata (title, OG, Twitter), `NEXT_PUBLIC_SITE_URL` for canonical/OG |
| `app/page.tsx` | Client | Wraps `LandingPage` in `Suspense` with loading fallback |
| `app/LandingPage.jsx` | Client | Main landing: form (engine or E.V.E.), report display, demo link; uses `LightIdentityForm`, `LigsFooter`, `submitToEngine` / `submitToEve`, `unwrapResponse` |
| `app/error.jsx` | Client | Error boundary: message + “Try again” reset |
| `app/globals.css` | Global styles | Tailwind + app CSS |

**Beauty section** (nested under `app/beauty/`):

| Path | Type | Purpose |
|------|------|--------|
| `app/beauty/layout.jsx` | Layout | Cormorant Garamond, `beauty-theme`, full-viewport background image `/beauty-background.png` |
| `app/beauty/page.jsx` | Client | Beauty intake form; submits to E.V.E., then shows profile / purchase flow |
| `app/beauty/view/page.jsx` | Client | View beauty profile by `?reportId=`; uses `BeautyViewClient`, `getBaseUrl()` from `NEXT_PUBLIC_VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` |
| `app/beauty/view/BeautyViewClient.jsx` | Client | Fetches `/api/beauty/[reportId]`, renders profile |
| `app/beauty/success/page.jsx` | Page | Post-Stripe success (with `reportId`) |
| `app/beauty/cancel/page.jsx` | Page | Stripe checkout cancelled |

**Other:**

| Path | Type | Purpose |
|------|------|--------|
| `app/report-storage-test/page.jsx` | Test | Report storage debugging |

### 1.2 Components

| Component | Location | Purpose |
|-----------|----------|--------|
| `LightIdentityForm` | `components/LightIdentityForm.jsx` | Shared form: name, birth date/time, location, email; optional dev defaults when `NODE_ENV === "development"` |
| `LigsFooter` | `components/LigsFooter.jsx` | Footer for landing |

### 1.3 Client utilities

| Module | Purpose |
|--------|--------|
| `lib/engine-client.js` | `buildEnginePayload(formData)`, `submitToEngine(formData, { dryRun })` → POST `/api/engine/generate`; `submitToEve(formData)` → POST `/api/engine` |
| `lib/unwrap-response.ts` | Unwrap API JSON; throw with `error` / `code` on non-OK |
| `lib/analytics.js` | `track(event, reportId?)` → POST `/api/analytics/event` |

### 1.4 Styling & assets

- **Tailwind** (PostCSS) + `app/globals.css`
- **Fonts:** Space Grotesk (root), Cormorant Garamond (beauty)
- **Public:** `public/` (e.g. `beauty-background.png`, `beauty-hero.png`, `favicon.ico`, etc.)

---

## 2. Back-end routes (API)

All under `app/api/`. Route handlers use `@/lib` helpers and shared validation where applicable.

### 2.1 Core engine & E.V.E.

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/engine/generate` | Report-only. Validates body (`validateEngineBody`). If `DRY_RUN=1` or `body.dryRun`, returns mock report + saves to store. Else: OpenAI (ENGINE_SPEC, IMAGE_PROMPT_SPEC, VECTOR_ZERO_SPEC) → full report, emotional snippet, image prompts, vector zero → `saveReport(reportId, …)`. Returns `reportId`, `emotional_snippet`, `image_prompts`, `vector_zero`. Uses `OPENAI_API_KEY`. |
| POST | `/api/engine` | E.V.E. pipeline. Validates body → internal fetch to `POST /api/engine/generate` → fetch `GET /api/report/{reportId}` → OpenAI E.V.E. filter (EVE_FILTER_SPEC) → `saveBeautyProfileV1` → returns full Beauty Profile. Uses `OPENAI_API_KEY`, `VERCEL_URL` for origin. |

### 2.2 Beauty API

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/beauty/create` | Rate limit 5/60s. Validates engine body → POST to `/api/engine` → returns `reportId`. Uses `VERCEL_URL`. |
| GET | `/api/beauty/[reportId]` | Rate limit 20/60s. Loads Beauty Profile V1 from Blob via `loadBeautyProfileV1`; 404 if not found. |
| GET | `/api/beauty/demo` | Demo with fixed subject (Leonardo da Vinci). Calls `/api/engine`, then DALL·E 3 for one image; returns report excerpt, full report, image URL, snippet. Uses `OPENAI_API_KEY`, `VERCEL_URL`. |

### 2.3 Report storage API

| Method | Route | Handler summary |
|--------|--------|------------------|
| GET | `/api/report/[reportId]` | `getReport(reportId)` → returns `full_report`, `emotional_snippet`, `image_prompts`, `vector_zero`. 404 with optional `?debug=1` / dev debug payload. |
| GET | `/api/report/[reportId]/beauty` | Legacy beauty profile from `getBeautyProfile(reportId)` (report-store). 404 if missing. |
| GET | `/api/report/debug` | `getStorageInfo()`, optional `listBlobReportPathnames` / `getMemoryReportIds`; test pattern description. |

### 2.4 Stripe

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/stripe/create-checkout-session` | Body `reportId` → validate profile exists (`loadBeautyProfileV1`) → Stripe Checkout Session ($9.99), metadata `reportId`, success/cancel URLs → returns `url`. Uses `STRIPE_SECRET_KEY`, `VERCEL_URL`. |
| POST | `/api/stripe/webhook` | Stripe signature verification with `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: read `reportId` + email from session → `loadBeautyProfileV1` → POST `/api/email/send-beauty-profile` (internal) → 200. Uses `STRIPE_SECRET_KEY`, `VERCEL_URL`. |

### 2.5 Email & analytics

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/email/send-beauty-profile` | Body `reportId`, `email` → load Beauty Profile V1 → build HTML → send via **Resend** or **SendGrid** (one of `RESEND_API_KEY` or `SENDGRID_API_KEY`). Uses `EMAIL_FROM`, `VERCEL_URL` for view link. |
| POST | `/api/analytics/event` | Body `event` (required), optional `reportId` → log only → 200. |

### 2.6 Image generation

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/generate-image` | Body `prompt`, optional `reportId`, `slug`. If `reportId` + slug and existing Blob image URL → return it. Else DALL·E 3 → optional save to Blob (`saveImageToBlob`) → return URL. Uses `OPENAI_API_KEY`. |

---

## 3. Environment variables

| Variable | Where used | Purpose |
|----------|------------|--------|
| `NEXT_PUBLIC_SITE_URL` | `app/layout.tsx`, beauty view | Canonical/OG base URL (default `https://ligs.io`) |
| `NEXT_PUBLIC_VERCEL_URL` | `app/beauty/view/page.jsx`, `BeautyViewClient.jsx` | Base URL when deployed on Vercel |
| `VERCEL_URL` | API routes (origin for internal fetch / redirects) | Server-side base host (no protocol); code uses `https://${VERCEL_URL}` |
| `OPENAI_API_KEY` | `/api/engine`, `/api/engine/generate`, `/api/beauty/demo`, `/api/generate-image` | GPT-4o and DALL·E 3 |
| `DRY_RUN` | `/api/engine` (and script) | `"1"` = mock report, no OpenAI |
| `BLOB_READ_WRITE_TOKEN` | `lib/report-store.ts`, `lib/beauty-profile-store.ts` | Vercel Blob for reports, beauty profiles, images; if unset, reports in-memory, beauty profiles unavailable (E.V.E. still needs Blob for production) |
| `STRIPE_SECRET_KEY` | `/api/stripe/create-checkout-session`, `/api/stripe/webhook` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Webhook signature verification |
| `RESEND_API_KEY` | `/api/email/send-beauty-profile` | Resend (preferred if set) |
| `SENDGRID_API_KEY` | `/api/email/send-beauty-profile` | SendGrid fallback |
| `EMAIL_FROM` | `/api/email/send-beauty-profile` | From address (default `Beauty <onboarding@resend.dev>`) |
| `NODE_ENV` | Report 404 debug, engine quota detail, form dev defaults | Development vs production behavior |

**Required for full production:**

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN` (required for Beauty flow and persisted reports)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (for paid Beauty)
- One of `RESEND_API_KEY` or `SENDGRID_API_KEY` (for post-purchase email)

---

## 4. Vercel configuration

| File | Content |
|------|--------|
| `vercel.json` | `{ "framework": "nextjs" }` |
| `.vercel/` | Vercel project metadata (generated by CLI/linking) |

**Docs:** `VERCEL_ENV_SETUP.md` — Root Directory (empty or `ligs-frontend`), DNS for www, adding `BLOB_READ_WRITE_TOKEN` in Vercel env vars.

---

## 5. Build pipeline

| Script | Command | Purpose |
|--------|--------|---------|
| `dev` | `next dev --webpack` | Local dev |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server |
| `lint` | `eslint` | Lint |
| `test` | `vitest` | Watch mode tests |
| `test:run` | `vitest run` | Single run tests |

**Config:**

- `next.config.ts`: `reactStrictMode: false` (avoids dev double-mount flicker).
- `tsconfig.json`: `@/*` → project root; JS allowed.
- `eslint.config.mjs`, `postcss.config.mjs`: ESLint and Tailwind/PostCSS.

---

## 6. Integration points

### 6.1 Internal flow (server-side)

```
Landing (engine)     → POST /api/engine/generate → saveReport → GET /api/report/[reportId]
Landing (E.V.E.)     → POST /api/engine → POST /api/engine/generate → GET /api/report/[reportId] → OpenAI E.V.E. → saveBeautyProfileV1
Beauty form          → POST /api/beauty/create → POST /api/engine (same chain)
Stripe success       → Webhook POST /api/stripe/webhook → loadBeautyProfileV1 → POST /api/email/send-beauty-profile
```

### 6.2 External services

| Service | Use |
|---------|-----|
| **OpenAI** | GPT-4o (report, image prompts, vector zero, E.V.E. filter), DALL·E 3 (images) |
| **Vercel Blob** | Reports `ligs-reports/{reportId}.json`, Beauty V1 `ligs-beauty/{reportId}.json`, images `ligs-images/{reportId}/{slug}.png|jpg` |
| **Stripe** | Checkout Session, webhook `checkout.session.completed` |
| **Resend or SendGrid** | Post-purchase email with view link and optional image |

### 6.3 Storage summary

| Data | Storage | Condition |
|------|---------|-----------|
| Light Identity Report | Blob or in-memory | Blob if `BLOB_READ_WRITE_TOKEN` set |
| Beauty Profile V1 | Blob only | Fails if token not set (E.V.E. and Stripe flow need Blob in prod) |
| Generated images | Blob | Same token; optional in generate-image (falls back to temp URL) |

### 6.4 Rate limiting

- In-memory, per-IP: `lib/rate-limit.ts`.
- **beauty/create:** 5 req / 60s.
- **beauty/[reportId]:** 20 req / 60s.
- Doc notes: replace with Upstash/Vercel KV for production.

---

## 7. Quick verification checklist

- [ ] **Env:** `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN` set in Vercel (and locally if testing full flow).
- [ ] **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook URL points to `/api/stripe/webhook`.
- [ ] **Email:** One of `RESEND_API_KEY` or `SENDGRID_API_KEY`; `EMAIL_FROM` if custom.
- [ ] **Root directory:** Vercel project root = repo root (or `ligs-frontend` per `VERCEL_ENV_SETUP.md`).
- [ ] **Landing:** `/` loads landing; form can submit to engine or E.V.E.
- [ ] **Beauty:** `/beauty` → create profile → checkout → success → email with link to `/beauty/view?reportId=…`.
- [ ] **Reports:** `GET /api/report/debug` shows storage type and test pattern; `GET /api/report/{reportId}` returns report after engine run.
- [ ] **Dry run:** `DRY_RUN=1` skips OpenAI and returns mock report from `/api/engine`.

This snapshot reflects the codebase as of the first-time scan. Update it when you add routes, env vars, or integrations.

---

## Verification Log – 2026‑02‑15

SYSTEM_SNAPSHOT.md was checked against the repo. All sections match; one doc fix was applied (unwrap-response extension).

| Section | Status | Notes |
|--------|--------|--------|
| **1. Front-end routes** | ✅ | All paths present: `layout.tsx`, `page.tsx`, `LandingPage.jsx`, `error.jsx`, `globals.css`; `beauty/layout`, `beauty/page`, `beauty/view/page`, `BeautyViewClient.jsx`, `beauty/success`, `beauty/cancel`; `report-storage-test/page.jsx`. |
| **1.2 Components** | ✅ | `components/LightIdentityForm.jsx`, `components/LigsFooter.jsx` exist and are used. |
| **1.3 Client utilities** | ✅ | `lib/engine-client.js` (buildEnginePayload, submitToEngine, submitToEve); `lib/unwrap-response.ts`; `lib/analytics.js` (track → POST `/api/analytics/event`). |
| **1.4 Styling & assets** | ✅ | `app/globals.css`, Tailwind/PostCSS, fonts in layouts, `public/` assets. |
| **2. Back-end API routes** | ✅ | engine (E.V.E. at POST /api/engine), engine/generate (report-only), beauty/create, beauty/[reportId], beauty/demo, report/*, stripe/*, email/send-beauty-profile, analytics/event, generate-image. E.V.E. lives at POST /api/engine only. |
| **3. Environment variables** | ✅ | All listed vars appear in code at the locations stated; no extra env vars documented that are missing from repo. |
| **4. Vercel config** | ✅ | `vercel.json` is `{ "framework": "nextjs" }`; `.vercel/` exists; `VERCEL_ENV_SETUP.md` exists. |
| **5. Build pipeline** | ✅ | `package.json` scripts: dev, build, start, lint, test, test:run match. `next.config.ts` has `reactStrictMode: false`; `tsconfig.json` has `@/*` and allowJs; `eslint.config.mjs`, `postcss.config.mjs` present. |
| **6. Integration points** | ✅ | Internal flows (engine → report, engine → report → beauty, stripe webhook → email) and external services (OpenAI, Blob, Stripe, Resend/SendGrid) match code. Blob prefixes `ligs-reports/`, `ligs-beauty/`, `ligs-images/` in `lib/report-store.ts`. Rate limits: beauty/create 5/60s, beauty/[reportId] 20/60s in `lib/rate-limit.ts`. |
| **7. Verification checklist** | ✅ | All checklist items are valid and testable from the current codebase. |

**Doc fix applied:** Snapshot listed `lib/unwrap-response.js`; actual file is `lib/unwrap-response.ts`. Section 1.3 updated accordingly.

**2026-02-15 (route move):** E.V.E. handler lives at `app/api/engine/route.ts`. Report-only engine at `app/api/engine/generate/route.ts`. Frontend and beauty/create hit `/api/engine` for E.V.E.; `submitToEngine` hits `/api/engine/generate`. Single engine route at POST /api/engine only.
