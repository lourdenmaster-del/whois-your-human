# Full report test checklist (Beauty page)

Use this before clicking **Get full report (API)** on the Beauty page.

## 1. Environment (`.env.local`)

- [ ] **OPENAI_API_KEY** is set (required for engine + E.V.E. filter + DALL-E images).
- [ ] **DRY_RUN=0** (or remove DRY_RUN) so the engine runs for real.
- [ ] **BLOB_READ_WRITE_TOKEN** is set so reports, beauty profile, and images are stored in Blob.

## 2. Dev server

- [ ] Run `npm run dev` from `ligs-frontend` and wait for "Ready".
- [ ] Open the Beauty page (e.g. `http://localhost:3001/beauty`).

## 3. What happens when you click "Get full report (API)"

1. **E.V.E. is called** (`POST /api/engine`) with your form data.
2. **Engine runs** (`POST /api/engine` internally): full LIGS report + vector_zero; stored in Blob at `ligs-reports/{reportId}.json`.
3. **E.V.E. filter** runs on the report → Beauty Profile; stored in Blob at `ligs-beauty/{reportId}.json`.
4. **Response** returns to the Beauty page with `reportId` and full Beauty Profile (vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts).
5. **Full report section** appears on the page with all 3-voice sections and the 3 imagery prompt texts.
6. **Image generation** runs for each of the 3 prompts (`POST /api/generate-image` with `reportId` + `slug`): DALL-E generates, image is uploaded to Blob at `ligs-images/{reportId}/{slug}.png`, and the Blob URL is shown.
7. **Rendered images** appear under each prompt in the Full Report and in the Tester block.

## 4. Expected duration

- **Report + E.V.E.:** ~1–3 minutes (button shows "Generating...").
- **Images:** ~1–2 minutes after the report appears (each image may show "Generating image…" then the image).

## 5. If something fails

- **"OPENAI_API_KEY not set"** → Add key to `.env.local`, restart dev server.
- **"LIGS engine request failed"** → Check engine logs; often quota or invalid key.
- **"E.V.E. filter did not return output"** → Check E.V.E. route logs.
- **Image errors** in red under a prompt → Check `/api/generate-image` logs; DALL-E content policy or timeout.
- **Empty or missing sections** → Check that the report and E.V.E. responses are valid in the Network tab.

---

**You’re ready when:** `.env.local` has the three vars above, DRY_RUN is off, dev server is running, and you’re on the Beauty page. Then click **Get full report (API)**.
