# Architecture and codebase issues

Analysis of structural inconsistencies, redundancies, outdated patterns, unused files, duplicated logic, and drift from the intended system in SYSTEM_ARCHITECTURE.md. No files were modified.

---

## 1. API

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `app/api/engine/route.ts`, `app/api/engine/generate/route.ts` | Same required-field validation (fullName, birthDate, birthLocation, email) is implemented in both routes. | Duplicated logic; a change to required fields or error messages must be made in two places. Increases risk of drift. |
| `app/api/engine/route.ts` | Request body may include `notes` (sent by client via `buildEnginePayload`), but the engine never destructures or uses `notes` in the prompt or storage. | Contract suggests notes are supported; server ignores them. Users may believe notes affect the report. Either document as “reserved for future use” or remove from client. |
| `app/api/engine/route.ts` | E.V.E. accepts any JSON body and only uses fullName, birthDate, birthTime, birthLocation, email. Scripts and docs sometimes send `mode: "beauty"`; the route does not use this field. | Unused body field; no single source of truth for “allowed” request shape. Minor but adds noise. |
| `app/api/report/[reportId]/beauty/route.ts` | Implemented and working; no frontend or script calls it. SYSTEM_ARCHITECTURE.md describes it as “available for future” and “not currently used by UI”. | No drift, but a dead API surface until a “load Beauty by reportId” flow is added. Worth documenting in API docs or removing if not planned. |
| `app/api/engine/route.ts` | Engine returns `status`, `reportId`, `emotional_snippet`, `image_prompts`, and optionally `vector_zero`. It does not return `full_report`; that is only available via GET `/api/report/[reportId]`. | Response shape is consistent with doc; no issue. Noted for context. |
| `app/api/beauty/demo/route.ts` | Builds origin via `VERCEL_URL` when present, otherwise `request.url` origin. E.V.E. route uses `new URL(request.url).origin` only. | Inconsistent origin handling for internal `fetch`; demo is Vercel-aware, E.V.E. is not. Could matter in serverless edge or multi-region setups. |

---

## 2. Storage

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `lib/report-store.ts` | When `BLOB_READ_WRITE_TOKEN` is unset, `saveBeautyProfile` is a no-op and `getBeautyProfile` always returns undefined. GET `/api/report/[reportId]/beauty` therefore always 404 when Blob is not configured. | Behavior matches SYSTEM_ARCHITECTURE.md. No bug; worth documenting so callers know Beauty profile is only available when Blob is configured. |
| `lib/report-store.ts` | `getImageUrlFromBlob` tries extensions `png` and `jpg`; `saveImageToBlob` derives extension from contentType and only uses `png` or `jpg`. | Consistent. No issue. |
| `app/api/generate-image/route.ts` | When Blob is not configured, `saveImageToBlob` returns null and the route returns the temporary DALL-E URL. That URL expires (e.g. ~60 min per .env.example). | Documented in .env.example. No inconsistency. |

---

## 3. Frontend

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `app/beauty/page.jsx` | “Demo Beauty Signature” section uses `demoLoading`, `demoError`, and `demoData` state. `demoLoading` and `demoError` are never set to true/non-null; `demoData` is initialized to a static object (e.g. imageUrl: "/beauty-preview.png") and never updated from GET `/api/beauty/demo`. | The demo API exists and is documented but is never called from the Beauty page. UI is built for loading/error/data but only shows static placeholder. Misleading for users who expect “sample reading” to come from the API. |
| `components/LightIdentityForm.jsx` | `TEST_DEFAULTS` includes a real-looking email (`lourdenmaster@gmail.com`) and pre-filled name/location. Used as initial form state. | Test data lives in a shared component; if deployed to production as-is, forms are pre-filled with what looks like personal data. Should be empty or clearly test-only (e.g. env-driven). |
| `app/page.tsx` | Root page is TypeScript (`page.tsx`) and wraps `LandingPage.jsx`. Other pages are JSX (`beauty/page.jsx`, `report-storage-test/page.jsx`). | Mixed TS/JS for pages; no functional problem but inconsistent. |
| `app/beauty/layout.jsx` | Uses static image `src="/beauty-background.png"`. Does not use `StabilioraBackground.jsx` or `lib/beauty-background.js` (BEAUTY_BACKGROUND_DATA_URL). | Two alternative implementations for “beauty background” (component + data URL) exist elsewhere and are unused; only the PNG is used. Dead code and possible confusion. |
| SYSTEM_ARCHITECTURE.md | Describes GET `/api/report/[reportId]/beauty` as “Not currently used by UI”. | Accurate; no frontend calls it. |

---

## 4. Scripts

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `scripts/test-engine-wiring.mjs` | Manually loads `ligs-frontend/.env.local` and applies variables to `process.env`. | Script assumes it is run from repo root or with cwd such that `join(__dirname, "..")` is `ligs-frontend`; other scripts (e.g. e2e) do not load .env.local and rely on ambient env. Inconsistent env handling across scripts. |
| `scripts/e2e-eve-imagery.mjs` | Writes full E.V.E. response to `e2e-eve-response.json` in project root (parent of `scripts/`), i.e. `ligs-frontend/e2e-eve-response.json`. | Output is in app root; not in `scripts/` or a dedicated `output/`/`artifacts/` folder. Minor structure/cleanup concern. |
| `scripts/e2e-eve-imagery.mjs` | Documented in `scripts/README-E2E-EVE-IMAGERY.md`. `test-engine-wiring.mjs` has no README. | Inconsistent script documentation. |
| `scripts/test-engine-wiring.mjs` | Expects response shape `status === "ok"`, `reportId`, `emotional_snippet`, `image_prompts` (array length 2). Does not assert on `vector_zero`. | Tightly coupled to current engine response; if engine adds/removes fields, script may need updates. Not an error, but a maintenance point. |

---

## 5. Env

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `ligs-frontend/.env.example` | Documents only `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN`. Does not mention `DRY_RUN`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL`, `NODE_ENV`, or `PORT`. | SYSTEM_ARCHITECTURE.md lists all of these. New contributors may not set DRY_RUN for test-engine-wiring or NEXT_PUBLIC_SITE_URL for metadata. Incomplete reference. |
| `app/api/engine/route.ts`, `scripts/test-engine-wiring.mjs` | `DRY_RUN` is required for the wiring script and controls engine behavior; it is not in .env.example. | Script fails with a message to set DRY_RUN, but .env.example does not list it. |
| `app/layout.tsx` | Uses `process.env.NEXT_PUBLIC_SITE_URL ?? "https://ligs.io"`. | Default is correct; variable is optional. Only matters for .env.example completeness. |

---

## 6. Architecture drift and duplication

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `lib/engine-client.js` | Builds payload with `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email`, and optionally `notes`. Used by Landing and Beauty. | Single place for client→API payload; good. Engine ignores `notes` (see API section). |
| `app/api/engine/route.ts` | Uses types `EngineResponse`, `ReportResponse` from api-types; E.V.E. logic in one route. | Response shapes shared via api-types; single E.V.E. route. |
| SYSTEM_ARCHITECTURE.md | Intended system: Landing → engine → GET report; Beauty → dry run (engine) or full report (E.V.E. → generate-image × 3); report-storage-test → GET debug and GET report. | Implementation matches except: (1) Beauty demo section does not call GET /api/beauty/demo; (2) notes are sent but not used; (3) GET /api/report/[reportId]/beauty is unused by design. |

---

## 7. Unused files

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `lib/engine-version.ts` | Exports `ENGINE_VERSION` ("1.1") and `ENGINE_NAME` ("LIGS Engine"). Not imported anywhere. | Dead code. Version could be used for headers, debug, or logging; as-is it is redundant with comments/spec. |
| `lib/beauty-background.js` | Exports `BEAUTY_BACKGROUND_DATA_URL` (inline SVG as data URL). Not imported anywhere. | Dead code. Beauty layout uses `/beauty-background.png` instead. Either remove or wire for environments where the PNG is not available. |
| `components/StabilioraBackground.jsx` | React component rendering an SVG “Stabiliora” background. Not imported anywhere. | Dead code. Same visual role as the PNG used in beauty layout; duplicate implementation. |
| `scripts/dry-run-report-v1.txt` | Static text file: sample LIGS dry-run report. Not referenced by tests or scripts. | Reference artifact only. Could be useful for docs or manual comparison; currently unreferenced. Optional to keep or move to docs/tests. |

---

## 8. Other patterns

| File path | Description | Why it matters |
|-----------|-------------|----------------|
| `next.config.ts` | `reactStrictMode: false` with comment “avoids dev double-mount flicker”. | Intentional; documented in ARCHITECTURE_OVERVIEW. Not an issue. |
| `app/error.jsx` | Next.js error boundary; uses `error` and `reset` without TypeScript or PropTypes. | Valid; JSX convention. No change required. |
| `app/api/engine/route.ts` | On 503 (quota), returns extra detail when `NODE_ENV === "development"`. | Good practice; consistent with SYSTEM_ARCHITECTURE.md. |
| Root `vercel.json` vs `ligs-frontend/vercel.json` | Root defines buildCommand/installCommand pointing into ligs-frontend; ligs-frontend defines www→apex redirect. | Two configs for different deployment roots; can be confusing. Document which is used when (e.g. Vercel “Root Directory” empty vs `ligs-frontend`). |

---

## Recommended cleanup sequence

1. **Unused files**  
   - Remove or repurpose `lib/engine-version.ts`, `lib/beauty-background.js`, and `components/StabilioraBackground.jsx` if they are not needed; or wire them (e.g. use ENGINE_VERSION in a header/debug endpoint, or use data URL/component where the PNG is not desired).  
   - Decide whether `scripts/dry-run-report-v1.txt` stays as reference or moves to docs/tests.

2. **Frontend demo and test data**  
   - Either wire the Beauty page “Demo Beauty Signature” section to GET `/api/beauty/demo` (and use demoLoading/demoError/demoData from the response), or remove the unused state and document that the block is static.  
   - Replace or gate `LightIdentityForm` TEST_DEFAULTS (e.g. empty defaults in production, or env-driven test values).

3. **Notes contract**  
   - Either document `notes` as “optional, reserved for future use” in API/docs and keep sending from client, or remove `notes` from `buildEnginePayload` and form UI if there is no plan to use them.

4. **Env documentation**  
   - Extend `.env.example` with optional variables: `DRY_RUN`, `NEXT_PUBLIC_SITE_URL`, and short comments for `VERCEL_URL`, `NODE_ENV`, `PORT` (or point to SYSTEM_ARCHITECTURE.md).

5. **API validation and types**  
   - Extract shared “engine/E.V.E. request body” validation (required fields + error message) into a small helper and use it in both engine and E.V.E. routes.  
   - Optionally move `EveBody` / `EngineResponse` / `ReportResponse` (or equivalent) to a shared types module and import in the E.V.E. route.

6. **Scripts**  
   - Align env loading: either have e2e script load `.env.local` like test-engine-wiring, or document that both expect env to be set in the shell.  
   - Add a short README or comment block for `scripts/test-engine-wiring.mjs` (or reference SYSTEM_ARCHITECTURE.md).  
   - Optionally write e2e output to a dedicated folder (e.g. `scripts/artifacts/` or `output/`) and ignore it in .gitignore.

7. **Vercel config**  
   - Document in VERCEL_ENV_SETUP.md (or similar) when root `vercel.json` vs `ligs-frontend/vercel.json` is used (e.g. by Root Directory setting).

8. **GET /api/report/[reportId]/beauty**  
   - If a “load Beauty by reportId” flow is planned, add it to the frontend and docs; otherwise leave as-is and keep the “available for future” note in SYSTEM_ARCHITECTURE.md.

---

*Analysis only; no files were modified.*
