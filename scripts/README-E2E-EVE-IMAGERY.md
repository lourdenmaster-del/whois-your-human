# E2E: E.V.E. → LIGS → imagery pipeline

**Local development only.** This script is not used by Vercel build or production.

Script: **`e2e-eve-imagery.mjs`**

## What it does

1. **POST** `http://localhost:3000/api/engine` (or the base URL you pass) with static Marilyn Monroe payload:
   ```json
   {
     "fullName": "Marilyn Monroe",
     "birthDate": "1926-06-01",
     "birthTime": "09:30",
     "birthLocation": "Los Angeles, California, USA",
     "email": "marilyn@test.com",
     "mode": "beauty"
   }
   ```
2. Saves the **full JSON response** to **`e2e-eve-response.json`** in the project root and prints it.
3. Calls **POST /api/generate-image** three times with the returned `reportId` and slugs:
   - `vector_zero_beauty_field`
   - `light_signature_aesthetic_field`
   - `final_beauty_field`
4. Fetches **GET /api/report/{reportId}** and **GET /api/report/{reportId}/beauty**.
5. Prints:
   - API URLs for full LIGS report and beauty profile
   - Storage paths for all Blob artifacts
   - Snippet, imagery prompt texts, and generated image URLs

## Requirements

- Dev server: `npm run dev` (default port 3000).
- Env: `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN` (e.g. in `.env.local` when running locally).
- E.V.E. can take several minutes (engine + E.V.E. filter). If the request times out, use a longer Node/undici timeout (see below).

## Run

From the project (repo) root:

```bash
node scripts/e2e-eve-imagery.mjs
```

Optional base URL (if your app runs on another port):

```bash
node scripts/e2e-eve-imagery.mjs http://localhost:3002
```

If you see **Headers Timeout Error** after a few minutes:

```bash
UNDICI_HEADERS_TIMEOUT=600000 node scripts/e2e-eve-imagery.mjs
```

(10 minutes in ms.)

## Outputs you’ll see

- **Full JSON response** from `/api/engine` (saved to `e2e-eve-response.json` and printed).
- **Blob / API URLs:**
  - Full LIGS report: `<baseUrl>/api/report/{reportId}` → content; Blob path: `ligs-reports/{reportId}.json`.
  - Beauty profile: `<baseUrl>/api/report/{reportId}/beauty` → content; Blob path: `ligs-beauty/{reportId}.json`.
  - Summary/snippet: inside the report JSON as `emotional_snippet`.
  - Imagery prompts: in the beauty profile under `imagery_prompts` (and printed).
  - Generated images: Blob URLs returned by each `/api/generate-image` call (printed per slug).

- **Storage paths (when Blob is configured):**
  - `ligs-reports/{reportId}.json` — full LIGS report
  - `ligs-beauty/{reportId}.json` — E.V.E. Beauty Profile
  - `ligs-images/{reportId}/vector_zero_beauty_field.png`
  - `ligs-images/{reportId}/light_signature_aesthetic_field.png`
  - `ligs-images/{reportId}/final_beauty_field.png`

All of these are written by the API routes when `BLOB_READ_WRITE_TOKEN` is set; the script only triggers the pipeline and prints the URLs/paths.
