# Generation Flow Diagnosis

## 1. Endpoint Chain (from observed failures)

**Client:** `POST /api/beauty/submit` (Einstein birth data)

**Server call chain:**
1. **POST /api/beauty/submit** → validates body, runs `deriveFromBirthData`, then internal fetch to `/api/engine`
2. **POST /api/engine** (E.V.E.) → internal fetch to `/api/engine/generate`
3. **POST /api/engine/generate** → OpenAI (report) → `saveReportAndConfirm` (Blob write + verify)
4. **GET /api/report/[reportId]** ← engine fetches this
5. **If full_report empty** → engine returns **503** with `error: "REPORT_MISSING_FULL_REPORT"`
6. *(If step 5 passes)* → OpenAI E.V.E. filter → `saveBeautyProfileV1` → *(if allowExternalWrites)* `POST /api/generate-image` × 3

**Observed failure:**
- **Route:** `POST /api/engine` (propagated to client as 503 from beauty/submit)
- **HTTP status:** 503
- **Error message:** `REPORT_MISSING_FULL_REPORT`
- **Source:** `app/api/engine/route.ts` line 150 — `fullReport` from `GET /api/report/[reportId]` is empty

**Not hit when failing:**
- `/api/image/generate` (LIGS Studio)
- `/api/image/compose` (LIGS Studio)
- `/api/generate-image` (Beauty engine — only after E.V.E. succeeds)
- Blob save/read for Beauty Profile (never reaches saveBeautyProfileV1)

---

## 2. Why "retries" occur

**In code:**
- **lib/report-store.ts:** `SAVE_MAX_RETRIES = 3` (Blob write), `VERIFY_READ_MAX_RETRIES = 3` (read-after-write). These apply *within* a single `saveReportAndConfirm` call — not user-facing retries.
- **No explicit retry loop** in the Beauty flow; form submits once per click.
- **No polling loop** for generation status.
- **No auto-resubmit** on error — user would need to click Generate again.

**External retries:** Previous E2E script runs (manual re-invocation), not app logic.

---

## 3. Root cause of REPORT_MISSING_FULL_REPORT

The report stored by engine/generate has empty or missing `full_report`. Possible causes:
- LLM returned JSON without `full_report` or with empty string
- `VERCEL_URL` used as origin when running locally → engine hit production instead of localhost; production may have different behavior
- Blob write/read inconsistency (mitigated by localhost-origin fix in beauty/submit)

---

## 4. Safety brake (temporary)

- `SAVE_MAX_RETRIES = 1`, `VERIFY_READ_MAX_RETRIES = 1` in report-store
- UI error: "Generation failed: &lt;reason&gt;. Not retrying."
- Generate button already disabled when `loading` is true
