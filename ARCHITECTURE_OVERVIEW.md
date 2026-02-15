# System architecture overview

High-level view of API routes, Blob usage, engine/E.V.E. behavior, implementation status, and gaps for the full E.V.E. → LIGS → imagery pipeline.

---

## 1. API routes and what they do

| Route | Method | Purpose |
|-------|--------|---------|
| **`/api/engine`** | POST | LIGS engine: accepts birth data, generates full 14-section Light Identity Report + emotional snippet + 2 image prompts + Vector Zero. Writes report (and optional vector_zero) to storage. Returns `reportId`, `emotional_snippet`, `image_prompts`, `vector_zero`. Supports `dryRun: true` for mock output without OpenAI. |
| **`/api/eve`** | POST | E.V.E. pipeline: same body as engine. Internally calls `/api/engine`, then `GET /api/report/{reportId}` for full report, runs E.V.E. filter LLM to produce Beauty Profile, saves profile to Blob, returns `reportId` + full Beauty Profile (vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts). |
| **`/api/report/[reportId]`** | GET | Returns stored LIGS report: `full_report`, `emotional_snippet`, `image_prompts`, `vector_zero` (if present). Reads from Blob or in-memory store. |
| **`/api/report/[reportId]/beauty`** | GET | Returns stored E.V.E. Beauty Profile by `reportId`. Reads from Blob only; 404 if not found or Blob not configured. |
| **`/api/generate-image`** | POST | Body: `{ prompt, reportId?, slug? }`. Calls DALL-E 3; if `reportId` + `slug` given, checks Blob for existing image first and returns that URL if present. Otherwise fetches generated image and uploads to Blob at `ligs-images/{reportId}/{slug}.png`, returns public URL. |
| **`/api/beauty/demo`** | GET | Demo: fixed subject (Leonardo da Vinci). Calls `/api/engine` (real), fetches report, generates one DALL-E image from first image prompt. Returns `reportExcerpt`, `fullReport`, `imageUrl` (temporary DALL-E URL), `emotionalSnippet`, `subjectName`. Does **not** use E.V.E., does **not** save to Blob. |
| **`/api/report/debug`** | GET | Debug: returns storage type (blob vs memory), blob pathnames or in-memory report IDs, and a short test pattern (how to POST engine and GET report). |

---

## 2. What writes to Blob and what the frontend uses

**Blob usage (when `BLOB_READ_WRITE_TOKEN` is set):**

| What | Blob path | Written by | Read by |
|------|-----------|------------|---------|
| LIGS report | `ligs-reports/{reportId}.json` | `POST /api/engine` (via `saveReport`) | `GET /api/report/[reportId]` |
| E.V.E. Beauty Profile | `ligs-beauty/{reportId}.json` | `POST /api/eve` (via `saveBeautyProfile`) | `GET /api/report/[reportId]/beauty` |
| Generated imagery | `ligs-images/{reportId}/{slug}.png` | `POST /api/generate-image` (via `saveImageToBlob`) | `POST /api/generate-image` (getImageUrlFromBlob before generating), and frontend displays returned URL |

**Frontend wiring:**

- **Landing (home):** `submitToEngine` → `POST /api/engine`. Then `GET /api/report/{reportId}` to show full report / snippet / vector zero / image prompts. Does **not** call `/api/eve` or `/api/generate-image`.
- **Beauty page:**  
  - Dry run: `submitToEngine(formData, { dryRun: true })` → `POST /api/engine` with `dryRun`; shows mock summary and imagery text (no E.V.E., no Blob imagery).  
  - Full report: `submitToEve(formData)` → `POST /api/eve`; receives full Beauty Profile in response, stores in `lastBeautyProfile`. Then for each of the 3 imagery prompt keys, `POST /api/generate-image` with `{ prompt, reportId, slug }`; displays returned image URLs (and persists them in Blob for that reportId/slug).
- **Landing** does not call `GET /api/report/[reportId]/beauty`; **Beauty page** does not call it either (it uses the inline E.V.E. response). The beauty GET route is available for future “load saved Beauty Profile by reportId” flows.
- **Beauty demo** (`GET /api/beauty/demo`): not currently wired from the Beauty page UI as a live “Load demo” call in the same way the form is; it runs engine + one image, returns temp URL, no Blob, no E.V.E.

---

## 3. What the engine returns

**`POST /api/engine` response (and stored report shape):**

- **reportId** (string, UUID)
- **emotional_snippet** (string)
- **image_prompts** (string[], length 2 from real run; dry run also returns 2)
- **vector_zero** (optional), when not dry run and Vector Zero derivation succeeds:
  - `coherence_score`, `primary_wavelength`, `secondary_wavelength`
  - `symmetry_profile`: `{ lateral, vertical, depth }` (0–1)
  - `beauty_baseline`: `{ color_family, texture_bias, shape_bias, motion_bias }`
  - `three_voice`: `{ raw_signal, custodian, oracle }`

Stored report (`GET /api/report/[reportId]`) also includes **full_report** (full 14-section text). Dry run returns mock data and still writes to storage (Blob or memory).

**E.V.E. / Beauty Profile shape (returned by `POST /api/eve` and stored in Blob):**

- **reportId**
- **vector_zero**: `{ three_voice, beauty_baseline }` (three_voice and beauty_baseline as above)
- **light_signature**, **archetype**, **deviations**, **corrective_vector**: each `{ raw_signal, custodian, oracle }`
- **imagery_prompts**: `{ vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field }` (three strings)

---

## 4. Fully implemented vs stubbed

**Fully implemented:**

- **Engine:** Full LIGS report generation (14 sections, Cosmology Marbling), emotional snippet, 2 image prompts, Vector Zero derivation, storage (Blob or memory). Dry run path returns mock data and still persists.
- **E.V.E.:** Calls engine, fetches full report, runs E.V.E. filter LLM, builds Beauty Profile, saves to Blob, returns full profile.
- **Report storage:** Save/get report; save/get Beauty Profile; save/get generated images by reportId + slug. In-memory fallback when no Blob token.
- **Generate image:** DALL-E 3 call, optional reportId+slug, Blob lookup before generate, upload to Blob, return URL.
- **Landing:** Form → engine → show result; optional `?reportId=` load from GET report; view full report.
- **Beauty page:** Form → dry run (engine mock) or full report (E.V.E.); display all Beauty Profile fields; trigger generate-image for all three imagery prompts; show loading overlay and images (or errors).

**Partially implemented / not wired:**

- **`GET /api/report/[reportId]/beauty`:** Implemented and works; no frontend currently calls it (Beauty page uses the E.V.E. POST response only).
- **Beauty demo (`GET /api/beauty/demo`):** Implemented (engine + one DALL-E image, excerpt), but the image URL is temporary (not saved to Blob); no E.V.E. step; demo UI on Beauty page may use static or different data.
- **Landing page imagery:** Engine returns 2 `image_prompts` and they can be shown; Landing does **not** call `/api/generate-image` to render or persist images for those prompts.

**Stubbed / conditional:**

- **Blob:** If `BLOB_READ_WRITE_TOKEN` is missing, reports and Beauty Profiles use in-memory store; images are not persisted (generate-image can still return the temporary DALL-E URL).

---

## 5. Missing pieces for a full E.V.E. → LIGS → imagery pipeline

- **Landing → imagery:** To show generated images on the main LIGS landing after a report is created, the frontend would need to call `POST /api/generate-image` for each of the engine’s `image_prompts` (with a chosen slug scheme, e.g. `prompt_0`, `prompt_1`), and optionally pass `reportId` so images are stored in Blob under that report.
- **Unified reportId usage:** Engine and E.V.E. both use the same `reportId`; imagery is keyed by `reportId` + `slug`. For a single “report” that includes both LIGS and Beauty, the same `reportId` is already used; no change needed for that.
- **Reload Beauty by reportId:** To support “view my Beauty Profile again” without re-running E.V.E., the Beauty page (or a dedicated view) could call `GET /api/report/[reportId]/beauty` when the user has a reportId (e.g. from URL or history).
- **Beauty demo persistence (optional):** If the demo should show a stable image URL and align with production behavior, the demo route could save the generated image to Blob (e.g. under a fixed “demo” reportId) and return that URL; currently it returns the temporary DALL-E URL only.
- **Error handling / retries:** E.V.E. and generate-image have no automatic retry; partial failures (e.g. one of three images fails) are surfaced to the user but not retried by the app.
- **Rate limits / cost:** No server-side rate limiting or cost controls; all DALL-E and OpenAI calls are per request.

---

## Summary table: routes → Blob → frontend

| Route | Writes to Blob? | Read by frontend? |
|-------|-----------------|--------------------|
| POST /api/engine | Yes (reports: `ligs-reports/{id}.json`) | Landing (form submit); Beauty (dry run); E.V.E. (internal) |
| POST /api/eve | Yes (Beauty: `ligs-beauty/{id}.json`) | Beauty (full report) |
| GET /api/report/[reportId] | No | Landing (load report); E.V.E. (internal) |
| GET /api/report/[reportId]/beauty | No | Not currently used |
| POST /api/generate-image | Yes (images: `ligs-images/{id}/{slug}.png`) when reportId+slug provided | Beauty (3 prompts after E.V.E. result) |
| GET /api/beauty/demo | No | Optional / demo only; image URL not persisted |
| GET /api/report/debug | No | Report-storage-test page, debugging |
