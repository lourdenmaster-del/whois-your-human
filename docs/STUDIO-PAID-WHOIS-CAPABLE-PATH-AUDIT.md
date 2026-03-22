# Studio vs Beauty: Which Control Produces Full Paid WHOIS–Capable Report (No Images)

**Read-only audit.** No code was modified.

---

## 1. Which current UI control/path creates all three

- A saved **BeautyProfileV1**
- A **reportId** usable by **buildPaidWhoisReport(...)**
- **No image generation / no DALL·E cost**

### Path A: PayUnlockButton (Beauty flow, not in Studio)

| Item | Detail |
|------|--------|
| **File** | `components/PayUnlockButton.tsx` |
| **Handler** | `handlePreview` |
| **Endpoint** | `POST /api/beauty/dry-run` |
| **dryRun sent** | Yes — `dryRun: true` in body |
| **BeautyProfileV1 saved** | Yes — dry-run route calls `buildDryRunBeautyProfileV1(...)` then `saveBeautyProfileV1(reportId, profile, requestId)` |
| **buildPaidWhoisReport(reportId) works** | Yes — profile exists in Blob |
| **Image generation** | Skipped — only `engine/generate` is called (mock report); `/api/engine` is never called |
| **OpenAI image cost** | No |

**Where used:** Beauty landing/flow (e.g. when `lastFormData` exists). **Not** rendered inside LigsStudio.

---

### Path B: submitToBeautyDryRun (Beauty start / Origin when dryRun)

| Item | Detail |
|------|--------|
| **File** | `lib/engine-client.js` — `submitToBeautyDryRun(formData)`; callers: `app/beauty/start/page.jsx`, `components/OriginTerminalIntake.jsx` |
| **Handler** | Caller’s submit handler (e.g. on form submit when `dryRun` is true) |
| **Endpoint** | `POST /api/beauty/dry-run` with `{ birthData: buildEnginePayload(formData), dryRun: true }` |
| **dryRun sent** | Yes — `dryRun: true` |
| **BeautyProfileV1 saved** | Yes — same dry-run route as Path A |
| **buildPaidWhoisReport(reportId) works** | Yes |
| **Image generation** | Skipped |
| **OpenAI image cost** | No |

**Where used:** `/beauty/start` and `/origin` when URL or state has `dryRun` (e.g. `?dryRun=1`). **Not** in LigsStudio.

---

### Path C: submitToBeautySubmit with dryRun → /api/engine

| Item | Detail |
|------|--------|
| **File** | `lib/engine-client.js` — `submitToBeautySubmit(formData, { dryRun: true })`; callers: Beauty start / Origin when dryRun is true and they choose submit path |
| **Handler** | Caller’s submit handler |
| **Endpoint** | `POST /api/beauty/submit` with `dryRun: true` → forwards to `POST /api/engine` with `dryRun: true` |
| **dryRun sent** | Yes — in body to submit and engine |
| **BeautyProfileV1 saved** | Yes — `/api/engine` builds payload and calls `saveBeautyProfileV1` before the image block |
| **buildPaidWhoisReport(reportId) works** | Yes |
| **Image generation** | Skipped — guarded by `if (allowExternalWrites && !bodyDryRun)` in `app/api/engine/route.ts` (~line 381) |
| **OpenAI image cost** | No (when bodyDryRun is true) |

**Where used:** Same entry points as Path B when they call submit with `dryRun: true`. **Not** in LigsStudio.

---

### Path D: LigsStudio “Generate Report” button

| Item | Detail |
|------|--------|
| **File** | `components/LigsStudio.tsx` |
| **Handler** | `runReportOnly` |
| **Endpoint** | `POST /api/engine/generate` only (no `/api/beauty/*`, no `/api/engine`) |
| **dryRun sent** | Yes when “DRY RUN” is on — `dryRun: effectiveDryRun` |
| **BeautyProfileV1 saved** | **No** — `engine/generate` only runs `saveReportAndConfirm` (report blob); it does not create or save a BeautyProfileV1 |
| **buildPaidWhoisReport(reportId) works** | **No** — `loadBeautyProfileV1(reportId)` would fail (BEAUTY_PROFILE_NOT_FOUND) |
| **Image generation** | Skipped — `engine/generate` has no image step; `/api/engine` is never called |
| **OpenAI image cost** | No when dryRun is true (mock report) |

So the Studio “Generate Report” button **does not** produce a full paid WHOIS–capable report: it produces a **report-only** result (report blob, no profile).

---

## 2. How to classify the Studio “Generate Report” button

- **Report-only test path:** Generates a report (mock or live) and stores it via `engine/generate`; no profile; reportId is **not** usable for buildPaidWhoisReport or send-beauty-profile.  
  **Matches current behavior.**

- **Full paid-report dry-run path:** Would generate a report **and** a saved BeautyProfileV1 so that reportId is usable for buildPaidWhoisReport/send-beauty-profile, with no image generation and no DALL·E cost.  
  **Does not match:** Studio “Generate Report” does not save a profile.

**Conclusion:** The existing “Generate Report” button in `components/LigsStudio.tsx` should be considered a **report-only test path**, not the full paid-report dry-run path. It is **incomplete** for “generate paid report without images” in the sense of “reportId usable for paid WHOIS.”

---

## 3. Per–button/path summary table

| Button / path | File / handler | Endpoint | dryRun: true? | BeautyProfileV1 saved? | buildPaidWhoisReport works? | Image gen skipped? | OpenAI image cost? |
|---------------|----------------|----------|---------------|------------------------|-----------------------------|--------------------|---------------------|
| PayUnlockButton “preview” | PayUnlockButton.tsx / handlePreview | POST /api/beauty/dry-run | Yes | Yes | Yes | Yes | No |
| submitToBeautyDryRun (start/origin) | engine-client.js / caller | POST /api/beauty/dry-run | Yes | Yes | Yes | Yes | No |
| submitToBeautySubmit w/ dryRun | engine-client.js / caller | POST /api/beauty/submit → /api/engine | Yes | Yes | Yes | Yes | No |
| **LigsStudio “Generate Report”** | **LigsStudio.tsx / runReportOnly** | **POST /api/engine/generate** | **Yes (when DRY RUN on)** | **No** | **No** | **Yes** | **No** |

---

## 4. API roles (for reference)

| Route | Saves report blob? | Saves BeautyProfileV1? | Generates images? |
|-------|--------------------|------------------------|-------------------|
| POST /api/engine/generate | Yes (`saveReportAndConfirm`) | No | No |
| POST /api/engine | No (fetches report) | Yes | Yes when `allowExternalWrites && !bodyDryRun` |
| POST /api/beauty/dry-run | Via engine/generate | Yes (`buildDryRunBeautyProfileV1` + `saveBeautyProfileV1`) | No |
| POST /api/beauty/submit | No (delegates to engine) | Via /api/engine | Only if engine runs and bodyDryRun false |

---

## 5. Final verdict

### 5.1 Which button/path is the real “generate paid report without images” path?

- **PayUnlockButton** (handlePreview → POST /api/beauty/dry-run), and  
- **submitToBeautyDryRun** from Beauty start / Origin (same endpoint), and  
- **submitToBeautySubmit** with **dryRun: true** (POST /api/beauty/submit → /api/engine with dryRun)

are the paths that produce a **full paid WHOIS–capable report without images**: they save a BeautyProfileV1, return a reportId that works with buildPaidWhoisReport, and do not run image generation or incur DALL·E cost.

**None of these are in LigsStudio.** They live on the Beauty landing, /beauty/start, and /origin.

### 5.2 Is the current Studio button misnamed or incomplete?

- **Misnamed:** Only if the label or docs imply “full paid report” or “WHOIS-capable.” The confirm text says “Generate report only (no images)?” which is accurate: it is report-only.
- **Incomplete for “paid report without images”:** Yes. It does **not** create a BeautyProfileV1, so the returned reportId **cannot** be used for buildPaidWhoisReport or send-beauty-profile. For that goal it is incomplete.

### 5.3 Is a small wiring change needed so the Studio button hits the correct dry-run paid-report path?

**Yes**, if the goal is for the Studio to have a single control that produces a **full paid WHOIS–capable report without images**.

**Minimal wiring change (conceptual):**

- **Current:** “Generate Report” → `runReportOnly` → `POST /api/engine/generate` with birth data + `dryRun: effectiveDryRun`.
- **Desired (for paid-report dry-run):** When the user intends “full paid report dry run,” call **POST /api/beauty/dry-run** instead of **POST /api/engine/generate**, with the same birth data and `dryRun: true`, so that:
  - `engine/generate` is still invoked with dryRun (mock report),
  - The dry-run route builds and saves a BeautyProfileV1,
  - The returned reportId is usable by buildPaidWhoisReport,
  - No image generation and no DALL·E cost.

Options:

- **Option A:** Add a second Studio button (e.g. “Generate paid report (dry run)”) that calls `POST /api/beauty/dry-run` with the Studio birth fields and `dryRun: true`, and keep “Generate Report” as the report-only path.
- **Option B:** When “DRY RUN” is on, make “Generate Report” call `POST /api/beauty/dry-run` instead of `POST /api/engine/generate`, so the same button produces a WHOIS-capable report in dry-run mode (and remains report-only when DRY RUN is off if it continues to call engine/generate).

Either way, the **correct dry-run paid-report path** is **POST /api/beauty/dry-run** (or submit → engine with dryRun), not **POST /api/engine/generate** alone.

---

**End of audit. No code was modified.**
