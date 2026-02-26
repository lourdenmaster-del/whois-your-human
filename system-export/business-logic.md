# Business Logic — LIGS

## How Payments Trigger Generation

**Current design:** Payments do **not** trigger generation. Generation happens **before** payment.

1. User submits birth data → `POST /api/beauty/submit` or `POST /api/beauty/create` or `POST /api/engine/generate`
2. Report and (for Beauty) Beauty Profile are generated and stored
3. User is expected to proceed to Stripe Checkout with the `reportId`
4. After payment, webhook `checkout.session.completed` triggers email delivery (link to view profile)

**Intended flow:** Generate → Store → Redirect to Checkout → Pay → Webhook → Email with view link.

---

## What Prevents Unpaid Generation

**Nothing.** There is no payment gate.

| Endpoint | Payment check? | Behavior |
|----------|----------------|----------|
| `POST /api/engine/generate` | No | Anyone can generate full reports |
| `POST /api/engine` (E.V.E.) | No | Anyone can generate Beauty Profiles |
| `POST /api/beauty/submit` | No | Anyone can generate Beauty Profiles |
| `POST /api/beauty/create` | No | Anyone can generate Beauty Profiles |
| `GET /api/report/[reportId]` | No | Anyone with `reportId` can read full report |
| `GET /api/beauty/[reportId]` | No | Anyone with `reportId` can read Beauty Profile |
| `POST /api/stripe/create-checkout-session` | No (only validates profile exists) | Creates session; no verification that caller paid |
| `POST /api/generate-image` | No | Anyone can generate DALL·E images |

**Conclusion:** All generation and retrieval is free and unauthenticated. Payment is optional and only affects whether the user receives an email with a view link; the profile is already accessible by URL.

---

## Edge Cases

### 1. Engine route overwrites full report (Data Bug)

When `/api/engine` (E.V.E. flow) runs:

1. It calls `POST /api/engine/generate`, which saves the report via `saveReportAndConfirm` (including `full_report`)
2. Engine route receives `engineData` (reportId, emotional_snippet, image_prompts, vector_zero — no full_report in response)
3. Engine route calls `saveReport(reportId, { full_report: "", emotional_snippet: ..., image_prompts: ..., vector_zero: ... })` — **overwriting** the stored report with `full_report: ""`
4. Engine route then fetches `GET /api/report/{reportId}` — gets empty `full_report`
5. `if (!fullReport)` → returns 502 `REPORT_MISSING_FULL_REPORT`

**Result:** The Beauty flow (`/api/engine`, `/api/beauty/submit`, `/api/beauty/create`) **always fails** after generation. No Beauty Profile is ever saved for real generation; only the report is overwritten and the E.V.E. filter never receives valid content.

### 2. Demo flow bypasses engine route

`GET /api/beauty/demo` calls `POST /api/engine/generate` directly, then DALL·E. It does **not** call `/api/engine`, so it avoids the overwrite bug and works.

### 3. Beauty Profile missing subjectName/emotionalSnippet

The engine route builds `BeautyProfileV1` without `subjectName` or `emotionalSnippet`. The schema allows them as optional, but the email template expects them. Post-purchase emails will show blank name and snippet.

### 4. Checkout session not invoked from UI

"Pay to Unlock Full Report" on LandingPage has no `onClick` or form action. The button is inert. No frontend calls `POST /api/stripe/create-checkout-session`.

### 5. Free report vs paid Beauty

- **Landing:** Uses `POST /api/engine/generate` → full report returned and stored. User sees emotional snippet, image prompts; "Pay to Unlock" does nothing.
- **Beauty:** Intended to use `POST /api/beauty/submit` → engine → E.V.E. → Beauty Profile → Checkout. In practice, the engine route fails before saving the profile.

### 6. Blob vs memory storage

- **Reports:** Stored in Blob (`ligs-reports/`) or in-memory when `BLOB_READ_WRITE_TOKEN` is unset
- **Beauty Profiles:** Require Blob. `saveBeautyProfileV1` throws if Blob not configured
- **In-memory reports:** Lost on server restart; not suitable for production

### 7. Duplicate generation

No idempotency. Same birth data submitted twice produces two reports with different `reportId`s. No deduplication or caching by birth data.

---

## Retry Logic

| Component | Retry? | Details |
|-----------|--------|---------|
| `saveReportAndConfirm` | Yes | 3 write retries on transient errors (network, timeout, 502/503/429); exponential backoff (500ms base). 3 read-after-write retries (200ms, 400ms, 600ms) |
| `saveReport` (engine route) | No | Single write; throws on failure |
| `saveBeautyProfileV1` | No | Single write; throws on failure |
| OpenAI API calls | No | No retries; 429/402 handled specially in generate route (returns 503 with quota message) |
| Stripe webhook | No | Stripe retries webhooks on failure; app returns 200 only on success |
| Email send | No | Single attempt; webhook returns error if email fails |

---

## Failure Handling

| Failure | Behavior |
|---------|----------|
| OpenAI quota exceeded (429/402) | Generate returns 503 with `QUOTA_EXCEEDED` and billing URL |
| OPENAI_API_KEY missing | 500 with env setup instructions |
| Engine JSON parse fails | 502 with raw response preview |
| Report storage fails (saveReportAndConfirm) | 503 "Report storage failed; report was not saved" — reportId not returned |
| Beauty profile not found (checkout) | 404 `BEAUTY_PROFILE_NOT_FOUND` |
| Stripe not configured | 500 `STRIPE_NOT_CONFIGURED` |
| Invalid Stripe webhook signature | 400 `INVALID_STRIPE_SIGNATURE` |
| Email send fails (webhook) | Webhook returns error; Stripe will retry |
| E.V.E. model call fails | 500, throws |
| E.V.E. invalid JSON/shape | Throws; 500 `E.V.E. invalid JSON output` |
| Rate limit exceeded | 429 `RATE_LIMIT_EXCEEDED` |
| Report not found (GET) | 404 with optional debug info |
| Beauty profile schema mismatch | 500 `BEAUTY_PROFILE_SCHEMA_MISMATCH` |

---

## Idempotency and Concurrency

- **No idempotency keys.** Repeated identical requests create new reports.
- **No distributed locking.** Concurrent writes to same `reportId` can race (Blob put is last-write-wins).
- **Webhook:** Stripe may deliver `checkout.session.completed` multiple times; app does not guard against duplicate email sends.
