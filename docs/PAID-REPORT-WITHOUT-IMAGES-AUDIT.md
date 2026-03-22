# Generate Paid Report Without Images — Read-Only Audit

**Goal:** Confirm the dry-run / no-image testing path is still active and correctly wired. Trace from the studio button and verify cost safety.

---

## 1. STUDIO BUTTON

### 1.1 LigsStudio “Generate Report” (report-only, no images)

| Item | Detail |
|------|--------|
| **File** | `components/LigsStudio.tsx` |
| **Function** | `runReportOnly` (useCallback, ~line 1661) |
| **Trigger** | Button “Generate Report” (~line 2133), `onClick={runReportOnly}` |
| **Payload** | `JSON.stringify({ fullName: liveFullName, birthDate: liveBirthDate, birthTime: liveBirthTime, birthLocation: liveBirthLocation, email: "dev@example.com", dryRun: effectiveDryRun, idempotencyKey: effectiveDryRun ? undefined : crypto.randomUUID() })` |
| **dryRun** | `dryRun: effectiveDryRun` — `effectiveDryRun` is `forceDryRun` (checkbox state, default `PROOF_ONLY`). When the “DRY RUN” checkbox is on, `dryRun: true` is sent. |
| **Endpoint** | `POST ${getBaseUrl()}/api/engine/generate` (direct to engine/generate; **not** /api/engine, **not** /api/beauty/submit or /api/beauty/dry-run). |
| **Headers** | When not dry run: `X-Force-Live: "1"` so server can allow live OpenAI. |

**Important:** This path calls **only** `/api/engine/generate`. It never calls `/api/engine` or `/api/beauty/*`. So:

- A report blob is created (via `saveReportAndConfirm` inside engine/generate).
- **No** BeautyProfileV1 is created (that is created in `/api/engine` or in `/api/beauty/dry-run`).
- So **paid WHOIS cannot be built** for that `reportId` (e.g. from send-beauty-profile), because `loadBeautyProfileV1(reportId)` would fail.

So the “generate paid report without images” path that **does** support paid WHOIS is **not** the Studio “Generate Report” button; it is the **Beauty dry-run path** below.

### 1.2 Beauty flow: “paid report without images” with profile

| Item | Detail |
|------|--------|
| **Entry points** | `PayUnlockButton` (preview), `submitToBeautyDryRun()` from Beauty start / Origin when `dryRun` is true. |
| **PayUnlockButton file** | `components/PayUnlockButton.tsx` |
| **Function** | `handlePreview` (~line 42) |
| **Endpoint** | `POST /api/beauty/dry-run` |
| **Payload** | `{ birthData: { fullName, birthDate, birthTime, birthLocation, email }, dryRun: true }` |
| **dryRun** | Always `dryRun: true` for this simulation. |

**Engine client (used by Beauty start / Origin):**

| Item | Detail |
|------|--------|
| **File** | `lib/engine-client.js` |
| **Function** | `submitToBeautyDryRun(formData)` (~line 46) |
| **Endpoint** | `POST /api/beauty/dry-run` |
| **Payload** | `{ birthData: buildEnginePayload(formData), dryRun: true }` |
| **dryRun** | Always `dryRun: true`. |

---

## 2. REQUEST PATH

### 2.1 Path A: Studio “Generate Report”

```
Studio "Generate Report" (runReportOnly)
  → POST /api/engine/generate
  body: { fullName, birthDate, birthTime, birthLocation, email, dryRun: effectiveDryRun, idempotencyKey? }
```

- **Does not** go through `submitToBeautySubmit` or `submitToBeautyDryRun`.
- **Does not** hit `/api/beauty/submit` or `/api/beauty/dry-run`.
- **Does not** hit `/api/engine` (main E.V.E. route).
- When `effectiveDryRun` is true, body includes **`dryRun: true`**.

### 2.2 Path B: Beauty dry-run (PayUnlockButton / submitToBeautyDryRun)

```
submitToBeautyDryRun(formData) or PayUnlockButton handlePreview
  → POST /api/beauty/dry-run
  body: { birthData: { fullName, birthDate, birthTime, birthLocation, email }, dryRun: true }
```

Then:

```
POST /api/beauty/dry-run
  → POST /api/engine/generate  (internal fetch)
  body: { fullName, birthDate, birthTime, birthLocation, email, dryRun: true }
```

- **Does not** call `/api/engine` (only engine/generate).
- **Does not** call `/api/beauty/submit`.
- dry-run route builds a minimal profile with `buildDryRunBeautyProfileV1` and calls `saveBeautyProfileV1`. No image generation.

### 2.3 Path C: Beauty submit with dryRun (Origin / Beauty start, dryRun true)

```
submitToBeautySubmit(payload) with dryRun from URL/options
  → POST /api/beauty/submit
  body: buildEnginePayload(formData) + { dryRun: true } (when options.dryRun)
```

Then:

```
POST /api/beauty/submit
  → POST /api/engine
  body: { fullName, birthDate, birthTime, birthLocation, email, dryRun: true, birthContext?, idempotencyKey? }
```

Then inside `/api/engine`:

```
POST /api/engine
  → internal fetch POST /api/engine/generate
  body: { ... same fields ..., dryRun: true }   (when bodyDryRun === true)
```

- Request body at `/api/engine` includes **`dryRun: true`** when the client sent it (`bodyDryRun` from `validation.value`).
- So the “no image” path that goes through the **full** engine (report + E.V.E. + profile) is: **beauty/submit with dryRun: true → engine with bodyDryRun true → engine/generate with dryRun: true**. Engine then saves BeautyProfileV1 and skips the image block (see below).

---

## 3. ENGINE IMAGE GENERATION CHECK

**File:** `app/api/engine/route.ts`

**Block that generates images (3 signatures + marketing_background + logo_mark + share_card):**

- **Location:** Starts at ~line 380 with the comment:  
  `// Generate 3 images to ligs-images/{reportId}/{slug} when allowed (prod, not dryRun).`
- **Guard:**  
  `if (allowExternalWrites && !bodyDryRun) {`  
  (~line 381)

So:

- **`bodyDryRun`** comes from the validated request body:  
  `const { fullName, birthDate, birthTime, birthLocation, email, dryRun: bodyDryRun } = validation.value;` (line 76).
- When the client sends **`dryRun: true`** (e.g. from beauty/submit or from a direct POST to /api/engine with dryRun), **`bodyDryRun`** is true, so **`!bodyDryRun`** is false and the whole image block is **skipped**.
- **`allowExternalWrites`** is from runtime/config; when false, the block is also skipped.

**Slugs covered inside this block:**

- `vector_zero_beauty_field`, `light_signature_aesthetic_field`, `final_beauty_field` (loop over `IMAGE_SLUGS`, ~lines 407–446, calling `POST ${origin}/api/generate-image`).
- Later in the same “live” path: marketing_background, logo_mark, marketing card composition, share_card (when `isValidIdempotencyKey(idempotencyKey)` and live).

**Exact condition that protects the image step:**  
`if (allowExternalWrites && !bodyDryRun)` at line 381 in `app/api/engine/route.ts`. When **either** `allowExternalWrites` is false **or** `bodyDryRun` is true, no `/api/generate-image` calls and no DALL·E image generation are performed from this route.

**Note:** When using **Studio “Generate Report”**, `/api/engine` is **never** called, so this block is never reached at all (no profile is created either). When using **/api/beauty/dry-run**, only `/api/engine/generate` is called, so again `/api/engine` and this block are never run; the dry-run route builds and saves a minimal profile itself and does not generate images.

---

## 4. COST SAFETY CONFIRMATION

### 4.1 Dry-run via /api/beauty/dry-run (Path B)

| Check | Result |
|-------|--------|
| Skips all `/api/generate-image` calls | Yes — only engine/generate is called; /api/engine is not. No image code runs. |
| Skips DALL·E prompts | Yes — engine/generate with dryRun returns a fixture report; no OpenAI report generation. |
| Saves BeautyProfileV1 | Yes — dry-run route builds `buildDryRunBeautyProfileV1(...)` and calls `saveBeautyProfileV1(reportId, profile, requestId)`. |
| Allows paid WHOIS to be generated | Yes — `reportId` has a stored profile; `buildPaidWhoisReport({ reportId, requestId })` can load it and send the paid email. |

### 4.2 Dry-run via /api/beauty/submit with dryRun: true (Path C)

| Check | Result |
|-------|--------|
| Skips all `/api/generate-image` calls | Yes — engine receives bodyDryRun true; guard `allowExternalWrites && !bodyDryRun` is false; image block skipped. |
| Skips DALL·E prompts (report) | No — engine still calls engine/generate with dryRun: true, which returns a mock report (no OpenAI report call). So no report cost. |
| Skips E.V.E. / OpenAI filter | Depends on env: if `engineDryRun` (DRY_RUN env) is true, a fixture is used; otherwise E.V.E. runs. With bodyDryRun, engine/generate is already mock, so report is mock; E.V.E. in engine route still runs unless DRY_RUN=1. So with dryRun: true from client, report is free; E.V.E. may still run unless DRY_RUN=1. |
| Saves BeautyProfileV1 | Yes — engine route builds payload and calls `saveBeautyProfileV1(reportId, payload, requestId)` before the image block. |
| Allows paid WHOIS | Yes — profile exists for that reportId. |

### 4.3 Studio “Generate Report” with dryRun (Path A)

| Check | Result |
|-------|--------|
| Skips /api/generate-image | Yes — only engine/generate is called; no /api/engine, so no image code. |
| Skips DALL·E | Yes — engine/generate with dryRun returns fixture; no OpenAI report. |
| Saves BeautyProfileV1 | **No** — engine/generate only saves the report blob; it does not create or save a BeautyProfileV1. |
| Allows paid WHOIS | **No** — there is no profile for that reportId; send-beauty-profile / buildPaidWhoisReport would fail on loadBeautyProfileV1. |

---

## 5. FINAL VERDICT

### 5.1 Studio “Generate Report” button (LigsStudio)

- **Will** produce a report (mock when dryRun, or live when X-Force-Live and not dryRun) and save it via engine/generate.
- **Will not** call image generation (engine/generate does not generate images; /api/engine is never called).
- **Will not** incur OpenAI **image** costs.
- **Will not** create a BeautyProfileV1, so it **will not** support generating the full “paid” WHOIS report (email with buildPaidWhoisReport) for that reportId. For that, the reportId must come from a path that saves a profile (beauty/dry-run or beauty/submit → engine).

So: the Studio button is **correctly wired** for “report without images” and **no image cost**, but it is **not** the path that gives you a “paid report” in the sense of a WHOIS email backed by a saved profile.

### 5.2 “Generate paid report without images” path that is fully correct

- **Trigger:** Use **PayUnlockButton** (preview) or **submitToBeautyDryRun** (Beauty start / Origin with dryRun), which call **POST /api/beauty/dry-run** with **`dryRun: true`**.
- **Result:** Report from engine/generate (mock), minimal BeautyProfileV1 saved by dry-run route, **no** calls to /api/engine and **no** image generation, **no** image cost. That reportId **can** be used later to generate the paid WHOIS (e.g. send-beauty-profile with buildPaidWhoisReport).
- **Alternative:** **POST /api/beauty/submit** with **`dryRun: true`** → **POST /api/engine** with **`dryRun: true`** → engine/generate with dryRun; engine saves BeautyProfileV1 and skips the image block because of **`if (allowExternalWrites && !bodyDryRun)`** in `app/api/engine/route.ts` (line 381). So again: full paid report (with profile), no image calls, no image cost.

### 5.3 Protection condition (for reference)

- **File:** `app/api/engine/route.ts`  
- **Line:** ~381  
- **Condition:** `if (allowExternalWrites && !bodyDryRun)`  
- **Effect:** When `bodyDryRun` is true (client sent `dryRun: true`), the entire block that calls `/api/generate-image` and the rest of the live image pipeline is skipped, so the “generate paid report without images” path that goes through the engine is cost-safe for images.

---

**No code was modified; this is a read-only audit.**
