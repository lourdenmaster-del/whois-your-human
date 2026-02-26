# System architecture summary

Structured overview of apps, API routes, jobs, external services, and environment variables for this repo. No code was changed.

---

## 1. Apps

- **Next.js app (ligs-frontend)**  
  - Single Next.js 16 app in `ligs-frontend/`.  
  - Scripts: `dev` → `next dev --webpack`, `build` → `next build`, `start` → `next start`, `lint`, `test` / `test:run` (Vitest).  
  - Entry: `app/page.tsx` (wraps `LandingPage.jsx` in Suspense), `app/beauty/page.jsx`, `app/report-storage-test/page.jsx`; root layout in `app/layout.tsx`.

- **Repo root (nextjs-boilerplate)**  
  - Thin wrapper: `package.json` delegates `dev` / `build` / `start` to `cd ligs-frontend && npm run …`.  
  - Used when deploying from repo root (e.g. Vercel with root directory empty); otherwise run from `ligs-frontend` directly.

- **Scripts (no long-running servers)**  
  - `ligs-frontend/scripts/test-engine-wiring.mjs` — hits `/api/engine` and `/api/report` with dry-run payloads; expects `DRY_RUN=1` and dev server on port.  
  - `ligs-frontend/scripts/e2e-eve-imagery.mjs` — E2E: POST `/api/engine`, then POST `/api/generate-image` for three slugs; writes response to `e2e-eve-response.json` (optional).

- **Workers / background jobs**  
  - None. No cron, no queue workers, no scheduled or background jobs in the repo.

---

## 2. API routes and how they’re triggered

| Route | Method | Trigger | Purpose |
|-------|--------|--------|---------|
| `/api/engine/generate` | POST | Landing form submit; Beauty “Dry run”; E.V.E. (internal); Beauty demo (internal); direct curl/script | LIGS engine: birth data → full report, snippet, 2 image prompts, Vector Zero. Writes report (and optional vector_zero) to storage. Supports `dryRun: true`. |
| `/api/engine` (E.V.E.) | POST | Beauty “Get full report”; direct curl/script | E.V.E. pipeline: calls `/api/engine/generate`, fetches full report, E.V.E. filter LLM → Beauty Profile, saves to Blob, returns profile + reportId. |
| `/api/report/[reportId]` | GET | Landing (load report by `?reportId=` or “View full report”); E.V.E. route (internal); report-storage-test page links | Returns stored LIGS report (full_report, emotional_snippet, image_prompts, vector_zero) from Blob or memory. |
| `/api/report/[reportId]/beauty` | GET | Not currently used by UI; available for “load Beauty by reportId” | Returns stored E.V.E. Beauty Profile by reportId from Blob. |
| `/api/generate-image` | POST | Beauty page after E.V.E. response (one request per imagery prompt × 3 slugs) | DALL-E 3 from prompt; if reportId+slug given, checks Blob first; uploads to Blob, returns URL. |
| `/api/beauty/demo` | GET | Optional (demo flow); not wired to main Beauty form | Fixed subject (Leonardo da Vinci): calls engine, one DALL-E image; returns excerpt, fullReport, temp imageUrl; no E.V.E., no Blob persistence. |
| `/api/report/debug` | GET | Report-storage-test page (`/report-storage-test`); manual/debug | Returns storage type, blob pathnames or in-memory IDs, and test pattern. |

**Frontend → API summary**

- **Landing (`/`):** Form → `submitToEngine(formData)` → POST `/api/engine/generate`. Then GET `/api/report/{reportId}` for snippet/full report/vector_zero/image_prompts.  
- **Beauty (`/beauty`):** “Dry run” → `submitToEngine(formData, { dryRun: true })` → POST `/api/engine/generate`. “Get full report” → `submitToEve(formData)` → POST `/api/engine`; then for each of 3 imagery keys, POST `/api/generate-image` with `{ prompt, reportId, slug }`.  
- **Report storage test (`/report-storage-test`):** On load, GET `/api/report/debug`; page also links to GET `/api/report/{id}`.

---

## 3. Background / long‑running jobs

- **None.**  
- All work is request-scoped: API route handles the request (engine, E.V.E., generate-image, etc.) and returns. No cron, no job queues, no serverless background functions defined in this repo.

---

## 4. External services

- **Vercel (hosting + config)**  
  - Deployment and (optionally) root directory / build commands via `vercel.json` (root and/or `ligs-frontend`).  
  - `ligs-frontend/vercel.json`: redirect `www.ligs.io` → `ligs.io`.  
  - `VERCEL_URL` used in Beauty demo route to build origin for internal `fetch` to `/api/engine`.

- **Vercel Blob (storage)**  
  - Used when `BLOB_READ_WRITE_TOKEN` is set.  
  - `@vercel/blob`: `put`, `head`, `list` in `lib/report-store.ts`.  
  - Paths: `ligs-reports/{reportId}.json`, `ligs-beauty/{reportId}.json`, `ligs-images/{reportId}/{slug}.png`.  
  - Without token: reports/beauty in-memory; generate-image can still return temporary DALL-E URL (no persist).

- **OpenAI (LLM + images)**  
  - **Chat:** Engine (report + snippet, image prompts, Vector Zero) and E.V.E. filter use `openai.chat.completions.create` (e.g. gpt-4o).  
  - **Images:** `openai.images.generate` (DALL-E 3) in `/api/generate-image` and `/api/beauty/demo`.  
  - No other LLM or image provider in this repo.

- **Static / public assets**  
  - Landing background image: hardcoded URL `https://dka9ns5uuh3ltho4.public.blob.vercel-storage.com/form%20background.png`.  
  - Local assets: e.g. `/signatures/beauty-background.png`, `/signatures/beauty-hero.png`, `/exemplars/*.png`, etc., served by Next.js.

- **Database / queues / other pipelines**  
  - No database. No queues. No separate “image pipeline” service beyond DALL-E + Blob in the generate-image route.

---

## 5. Environment variables

| Variable | Where used | Purpose |
|----------|------------|---------|
| `OPENAI_API_KEY` | `app/api/engine/route.ts`, `app/api/engine/generate/route.ts`, `app/api/generate-image/route.ts`, `app/api/beauty/demo/route.ts` | OpenAI API for report generation, E.V.E. filter, DALL-E 3, and demo. Required for non–dry-run engine, E.V.E., generate-image, and demo. |
| `BLOB_READ_WRITE_TOKEN` | `lib/report-store.ts` | When set, use Vercel Blob for reports, Beauty profiles, and generated images. When unset, in-memory store for reports/beauty; images not persisted. |
| `DRY_RUN` | `app/api/engine/route.ts`, `scripts/test-engine-wiring.mjs` | Engine: `DRY_RUN=1` (or body `dryRun: true`) → mock report, no OpenAI. Script: expects `DRY_RUN=1` to run wiring tests. |
| `NEXT_PUBLIC_SITE_URL` | `app/layout.tsx` | Metadata base URL (default `https://ligs.io`). |
| `VERCEL_URL` | `app/api/beauty/demo/route.ts` | Build origin for internal `fetch` to `/api/engine` when running on Vercel. |
| `NODE_ENV` | `app/api/engine/route.ts`, `app/api/report/[reportId]/route.ts` | Engine: include extra error detail in 503 when development. Report: enable debug hint in 404 when development. |
| `PORT` | `scripts/test-engine-wiring.mjs` | Port for base URL (default 3000); overridable by script arg or `PORT`. |

**Env files (reference only; do not commit secrets)**  
- `ligs-frontend/.env.example` documents `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN`.  
- `ligs-frontend/.env.local` and root `.env.local` may exist for local runs; not read by this scan.

---

## 6. Optional one-page diagram

```
User → Landing form → POST /api/engine → OpenAI (report + prompts + Vector Zero) → saveReport → Blob/memory
                    → GET /api/report/{id} → show report/snippet

User → Beauty form (full) → POST /api/engine → POST /api/engine/generate → GET /api/report/{id} → OpenAI (E.V.E. filter)
                          → saveBeautyProfile → Blob
                          → response to client
     → client then → POST /api/generate-image × 3 (prompt + reportId + slug) → DALL-E 3 → saveImageToBlob → Blob
```

---

*Generated from repo scan. No files were modified.*
