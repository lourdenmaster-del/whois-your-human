# LIGS System Audit — Complete Structured Breakdown

**Purpose:** Dense, technical reference for another AI agent to fully understand, audit, and extend the system without repo access.

**Generated:** 2025-03-20

---

## 1. SYSTEM OVERVIEW

- **Functional purpose:** LIGS (Light Identity Grid System) generates **Light Identity Reports** from birth data (name, date, time, place, email). Reports describe how the "identity field" resolves at birth using solar physics, lunar illumination, and archetypal structure. Outputs include human-facing narrative reports and agent-facing calibration records.
- **Core concept:** **WHOIS Human** — registry model analogous to domain WHOIS. Humans register; paid reports produce agent-readable calibration records (how to work with that human) plus full WHOIS-style documents.
- **Key flows:**
  1. **Entry:** User lands at `/origin` (or `/` → rewrite) → `OriginTerminalIntake` collects name, birth date/time/place, email.
  2. **Report creation:** Form submit → `POST /api/beauty/submit` → `deriveFromBirthData` + sun/moon context → `POST /api/engine` (E.V.E. pipeline) → report + Beauty Profile stored.
  3. **Storage:** Reports in `ligs-reports/{reportId}.json`; Beauty Profiles in `ligs-beauty/{reportId}.json`; images in `ligs-images/{reportId}/{slug}.png`; agent entitlements in `ligs-agent-entitlements/`.
  4. **Agent access:** After Stripe payment → webhook mints `wyh_` entitlement token → `GET /api/agent/whois?reportId=X` with `Authorization: Bearer <token>` returns agent calibration record.

---

## 2. ARCHITECTURE

- **Framework:** Next.js 16.1.6, React 19.2.3, App Router. `next.config.ts`: `reactStrictMode: false`.
- **Frontend structure:**
  - **`/origin`** — Canonical landing. `OriginTerminalIntake`: WHOIS-style terminal (idle → intake → waitlist or checkout). Resolves archetype from birth date immediately.
  - **`/whois-your-human`** — Agent product landing. CTAs → `/whois-your-human/unlock` → `/origin`.
  - **`/whois-your-human/unlock`** — Bridge; "Begin" → `/origin`.
  - **`/whois-your-human/api`** — Static HTTP reference for agent flow. Requires `wyh_content_gate=1` cookie (set by verify-session when paid).
  - **`/whois-your-human/case-studies`** — Case study index + `wyh-001`, `wyh-001-b`, `wyh-004`. Same cookie gate.
  - **`/beauty`** — Redirected to `/origin` by middleware (public-surface lockdown).
  - **`/beauty/start`** — Birth form (`LightIdentityForm`). Submit → `/api/beauty/submit`.
  - **`/beauty/view`** — View report by `?reportId=`. Uses `BeautyViewClient`, `PreviewRevealSequence`, `InteractiveReportSequence`.
  - **`/beauty/success`** — Post-Stripe success. Calls verify-session, stores `executionKey` in sessionStorage, polls for `entitlementToken`.
  - **`/ligs-studio`** — Internal studio (image gen, compose). Requires `LIGS_STUDIO_TOKEN` + cookie.
- **Backend/API routes (all under `app/api/`):**

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/engine/generate` | Report-only. OpenAI → full report, vector zero, image prompts. Saves via `saveReportAndConfirm`. Production live requires `executionKey`. |
| POST | `/api/engine` | E.V.E. pipeline. Calls engine/generate → GET report → OpenAI E.V.E. filter → `buildBeautyProfile` → save profile → image gen (3 signatures, marketing bg, logo, compose) → share card. Consumes execution grant on success. |
| POST | `/api/beauty/create` | Forwards to `/api/engine`. Returns `reportId`. |
| POST | `/api/beauty/submit` | Entry for Beauty flow. `deriveFromBirthData` + enrichments → POST `/api/engine`. Returns `{ reportId, intakeStatus }` only. |
| POST | `/api/beauty/dry-run` | Simulates flow. Mock report + BeautyProfileV1 saved to Blob. No Stripe. |
| GET | `/api/beauty/[reportId]` | Load Beauty Profile V1, enrich image URLs from Blob. Supports `exemplar-{archetype}` for exemplar preview. |
| GET | `/api/report/[reportId]` | Raw report (full_report, emotional_snippet, image_prompts, vector_zero). |
| POST | `/api/agent/register` | Alias for `POST /api/beauty/submit`. Same body, same persistence. |
| GET | `/api/agent/whois` | Agent calibration record. Requires `reportId` + Bearer token. |
| POST | `/api/agent/feedback` | Log calibration outcome (state: confirmed/partial/debunked). Same token. |
| POST | `/api/stripe/create-checkout-session` | Body `reportId` or `prePurchase: true`. Session $39.99. |
| GET | `/api/stripe/verify-session` | Query `session_id`. Returns `paid`, `reportId`, `entitlementToken`, `executionKey`. Sets `wyh_content_gate=1` cookie. |
| POST | `/api/stripe/webhook` | Stripe signature verification. On `checkout.session.completed`: mints agent entitlement (report checkout only; prePurchase returns 200). **Does NOT call send-beauty-profile** (docs/snapshot say it does; current code does not). |
| POST | `/api/email/send-beauty-profile` | Body `reportId`, `email`. Builds paid WHOIS report, sends via Resend or SendGrid. **Not invoked by webhook in current code.** |
| POST | `/api/waitlist` | Email capture. Blob at `ligs-waitlist/entries/`. Sends WHOIS Registration Card via `sendWaitlistConfirmation`. |
| GET | `/api/waitlist/count` | Public. Returns `{ total }`. |
| POST | `/api/image/generate` | Image gen (DALL·E 3 or glyph-conditioned). Requires execution grant when enforced. |
| POST | `/api/image/compose` | 1:1 marketing card compositor. |
| POST | `/api/voice/generate` | Voice profile generation. |
| GET | `/api/status` | Kill-switch: `{ disabled }` when `LIGS_API_OFF=1`. |
| GET | `/api/studio/pipeline-status` | Env-derived pipeline signals (stripe, email, blob, etc.). |
| POST | `/api/studio-auth` | Token form → sets `ligs_studio` cookie. |

- **Data flow:** Frontend → `POST /api/beauty/submit` → `deriveFromBirthData` (geocode, tz-lookup, Luxon) → `computeSunMoonContext` → optional `getOnThisDayContext` → `POST /api/engine` → internal `POST /api/engine/generate` → OpenAI → `saveReportAndConfirm` → `saveBeautyProfileV1` → image gen → Blob. Client receives `reportId` only.

---

## 3. REPORT GENERATION PIPELINE

- **Entry point:** `POST /api/beauty/submit` (or `/api/agent/register`) or `POST /api/beauty/create`.
- **Key files:**
  - `lib/astrology/deriveFromBirthData.ts` — Geocode + tz-lookup → local/UTC timestamps, lat/lon, timezone.
  - `lib/astronomy/computeSunMoonContext.ts` — Sun/Moon horizontal coords, twilight phase, sunrise/sunset, day length, moon phase.
  - `lib/engine/computeBirthContextForReport.ts` — Assembles birth context for engine.
  - `lib/engine/buildReportGenerationPrompt.ts` — Builds prompt from ENGINE_SPEC + birth context.
  - `lib/engine-spec.ts` — ENGINE_SPEC (field-resolution, section flow, three-voice).
  - `lib/vector-zero.ts` — VECTOR_ZERO_SPEC.
  - `lib/eve-spec.ts` — EVE_FILTER_SPEC, `buildBeautyProfile`, `extractArchetypeFromReport`.
  - `lib/report-store.ts` — `saveReportAndConfirm`, `getReport`.
  - `lib/beauty-profile-store.ts` — `saveBeautyProfileV1`, `loadBeautyProfileV1`.
  - `lib/free-whois-report.ts` — `buildFreeWhoisReport`, `buildPaidWhoisReport`, `renderFreeWhoisReport`, `renderFreeWhoisCard`.
  - `lib/report-composition.ts` — `composeArchetypeSummary`, `composeLightExpression`, `composeCosmicTwin`, `composeReturnToCoherence`.

- **Pipeline steps:**
  1. Validate body (`validateEngineBody`: fullName, birthDate, birthTime, birthLocation, email).
  2. `deriveFromBirthData` → birth context (lat, lon, timezone, local/UTC timestamps).
  3. `computeSunMoonContext` → sun altitude/azimuth, sunrise/sunset, moon phase.
  4. Optional: `getOnThisDayContext` (Wikimedia API) for birth context.
  5. `POST /api/engine/generate` (internal):
     - `computeBirthContextForReport` → build prompt block.
     - `buildReportGenerationPrompt` (ENGINE_SPEC).
     - OpenAI GPT-4o → full report.
     - Constraint gate (`scanForbidden`, `redactForbidden`).
     - Deterministic blocks injection (`injectDeterministicBlocksIntoReport`).
     - Initiation anchor (`injectBirthAnchoringSentence`).
     - Three-voice validation + repair.
     - Report validators (`validateReport`, `buildReportRepairPrompt`).
     - Extract image prompts, vector zero.
     - `saveReportAndConfirm`. Consume execution grant on success.
  6. `POST /api/engine` (E.V.E.):
     - `GET /api/report/{reportId}`.
     - OpenAI E.V.E. filter → `buildBeautyProfile`.
     - `saveBeautyProfileV1`.
     - Image gen (3 signatures, marketing bg, logo, compose, share card).
     - Persist marketingBackgroundUrl, logoMarkUrl, marketingCardUrl, shareCardUrl.

- **Fallback / dry-run:**
  - `DRY_RUN=1` → mock report, no OpenAI. `buildDryRunReportFromContext`.
  - `POST /api/beauty/dry-run` → calls engine/generate with `dryRun: true`, saves BeautyProfileV1 with placeholder images.
  - `NEXT_PUBLIC_DRY_RUN=1` → client never sends live requests.
  - `NEXT_PUBLIC_FAKE_PAY=1` → CTA bypasses Stripe; sets unlock, redirects to /beauty/start.

- **Free vs paid report:**
  - **Free:** `buildFreeWhoisReport` from waitlist data (email, birthDate, etc.). Solar segment + archetype from `approximateSunLongitudeFromDate` + `getPrimaryArchetypeFromSolarLongitude`. Rendered as WHOIS Registration Card (`renderFreeWhoisCard`) for waitlist confirmation.
  - **Paid:** `buildPaidWhoisReport` loads stored report + Beauty profile. Extracts sections from `full_report` (parseSectionBody), adds Identity Architecture, Field Conditions, Cosmic Twin, Archetype Expression, Civilizational Function, Interpretive Notes, Integration Note, Vector Zero addendum. Uses `composeCivilizationalFunctionSection`, `composeCosmicTwin`, etc. when sections missing.

---

## 4. DATA MODEL / STORAGE

- **Storage:** Vercel Blob when `BLOB_READ_WRITE_TOKEN` set; otherwise in-memory (dev).
- **Blob paths:**
  - `ligs-reports/{reportId}.json` — StoredReport
  - `ligs-beauty/{reportId}.json` — BeautyProfileV1
  - `ligs-images/{reportId}/{slug}.png` — images (vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field, marketing_background, logo_mark, marketing_card, share_card)
  - `ligs-waitlist/entries/{sha256(email).slice(0,32)}.json` — waitlist entry
  - `ligs-agent-entitlements/by-token/{token}.json` — AgentEntitlement
  - `ligs-agent-entitlements/by-report/{reportId}.json` — AgentEntitlement
  - `ligs-agent-feedback/{reportId}/{timestamp}-{id}.json` — AgentFeedbackRecord
  - `ligs-engine-grants/{token}.json` — EngineExecutionGrant
  - `ligs-runs/engine-generate/{idempotencyKey}.json` — idempotency cache
  - `ligs-runs/engine/{idempotencyKey}.json` — idempotency cache
  - `ligs-exemplars/{archetype}/{version}/` — exemplar manifests

- **StoredReport schema:**
```json
{
  "full_report": "string",
  "emotional_snippet": "string",
  "image_prompts": ["string"],
  "vector_zero": {
    "coherence_score": number,
    "primary_wavelength": "string",
    "secondary_wavelength": "string",
    "symmetry_profile": { "lateral": number, "vertical": number, "depth": number },
    "beauty_baseline": { "color_family": "string", "texture_bias": "string", "shape_bias": "string", "motion_bias": "string" },
    "three_voice": { "raw_signal": "string", "custodian": "string", "oracle": "string" }
  },
  "field_conditions_context": { "sunAltitudeDeg", "sunAzimuthDeg", "sunriseLocal", "sunsetLocal", "dayLengthMinutes", "moonPhaseName", "moonIlluminationFrac", "sunLonDeg", "anchorType", ... },
  "originCoordinatesDisplay": "string",
  "magneticFieldIndexDisplay": "string",
  "climateSignatureDisplay": "string",
  "sensoryFieldConditionsDisplay": "string",
  "createdAt": number
}
```

- **BeautyProfileV1 schema (extended):**
```json
{
  "version": "1.0",
  "reportId": "string",
  "subjectName": "string",
  "dominantArchetype": "string",
  "emotionalSnippet": "string",
  "imageUrls": ["string"],
  "fullReport": "string",
  "vector_zero": { ... },
  "light_signature": { "raw_signal", "custodian", "oracle" },
  "archetype": { ... },
  "deviations": { ... },
  "corrective_vector": { ... },
  "imagery_prompts": { ... },
  "timings": { "totalMs", "engineMs", "reportFetchMs", "beautyFilterMs" },
  "birthDate": "string",
  "birthTime": "string",
  "birthLocation": "string",
  "originCoordinatesDisplay": "string",
  "solarSeasonProfile": { "seasonIndex", "archetype", "lonCenterDeg", ... },
  "marketingBackgroundUrl": "string",
  "logoMarkUrl": "string",
  "marketingCardUrl": "string",
  "shareCardUrl": "string",
  "schemaVersion": "beautyProfileV2",
  "engineVersion": "ev-{sha}"
}
```

- **AgentEntitlement:** `{ token, reportId, status, createdAt, stripeSessionId?, purchaserRef? }`. Token prefix `wyh_`.

---

## 5. IDENTITY / ARCHETYPE SYSTEM

- **Archetype determination:** `getPrimaryArchetypeFromSolarLongitude(sunLonDeg)` → 12 equal 30° segments, 0° = vernal equinox. Index = `floor(normalized / 30)`, cap 11. Maps to `LIGS_ARCHETYPES[index]`.
- **12 archetypes (order):** Ignispectrum, Stabiliora, Duplicaris, Tenebris, Radiantis, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis.
- **Solar segment logic:** `src/ligs/astronomy/solarSeason.ts` — `SOLAR_SEASONS` (12 entries per 30°), `getSolarSeasonIndexFromLongitude`, `getSolarSeasonProfile` (sunLonDeg, latitude, date → seasonIndex, archetype, lonCenterDeg, solarDeclinationDeg, seasonalPolarity, twilightClass, etc.).
- **Segment names:** March Equinox, Early-Spring, Mid-Spring, June Solstice, Early-Summer, Mid-Summer, September Equinox, Early-Autumn, Mid-Autumn, December Solstice, Early-Winter, Late-Winter.
- **Vector Zero:** Derived from report via VECTOR_ZERO_SPEC. Contains coherence_score, primary/secondary wavelength, symmetry_profile, beauty_baseline, three_voice. Used for image prompts and WHOIS addendum.
- **Glyph system:** `public/glyphs/ignis.svg` — canonical Ignis glyph. ViewBox 0 0 1000 1000, ring r=205, center dot r=85, triangle points. Used for `archetype_background_from_glyph` purpose (DALL·E 2 edits).
- **Cosmic analogue:** `getCosmicAnalogue(archetype)` from `src/ligs/cosmology/cosmicAnalogues.ts` — `phenomenon`, `lightBehaviorKeywords`.
- **Civilizational function:** `getCivilizationalFunction(archetype)` from `src/ligs/voice/civilizationalFunction.ts` — structuralFunction, civilizationalRole, contributionEnvironments, frictionEnvironments, integrationInsight.
- **Scoring:** `vector_zero.coherence_score` (0–1). No psychometric validation; `verification.status: "unverified"` in agent record.

---

## 6. AGENT INTERFACE (CRITICAL)

- **API routes:**
  - `GET /api/agent/whois?reportId={reportId}` — Agent calibration record.
  - `POST /api/agent/register` — Alias for `POST /api/beauty/submit`.
  - `POST /api/agent/feedback` — Log calibration outcome.

- **Authentication:** Bearer token (`Authorization: Bearer <token>`) or query `?token=`. Token must be valid `AgentEntitlement` with `status === "active"` and `entitlement.reportId === reportId`.

- **Request:**
```http
GET /api/agent/whois?reportId=abc-123-def
Authorization: Bearer wyh_xxxxxxxxxxxxxxxxxxxxxxxx
```

- **Response (200) — full JSON example:**
```json
{
  "schema": "whois-your-human/v1",
  "record_type": "agent_calibration_record",
  "registry": {
    "authority": "LIGS Human WHOIS Registry",
    "registry_id": "LIR-xxxx",
    "record_status": "registered",
    "generated_at": "2025-03-20T12:00:00.000Z",
    "visibility": "agent-facing",
    "verification_mode": "prediction-first"
  },
  "human": {
    "subject_name": "Jane Doe",
    "birth_date": "1990-03-15",
    "birth_time_local": "14:30",
    "birth_location": "New York, NY",
    "chrono_imprint": { "local": "14:30", "utc": "19:30" },
    "origin_coordinates": { "label": "New York, 40.7128°N, 74.0060°W", "latitude": 40.7128, "longitude": -74.006 }
  },
  "measured_context": {
    "solar": {
      "solar_longitude_deg": 354.2,
      "solar_segment": "Late-Winter",
      "anchor_type": "none",
      "declination_deg": -2.1,
      "polarity": "waning",
      "sun_altitude_deg": 45,
      "sun_azimuth_deg": 210,
      "sunrise_local": "06:45",
      "sunset_local": "18:30",
      "day_length_minutes": 705
    },
    "lunar": {
      "phase": "Waning Gibbous",
      "illumination_pct": 80,
      "moon_altitude_deg": 30,
      "moon_azimuth_deg": 120
    },
    "environment": {
      "magnetic_field_index": null,
      "climate_signature": null,
      "sensory_field_conditions": []
    }
  },
  "derived_structure": {
    "archetype": "Fluxionis",
    "cosmic_twin": "Collimated outflow",
    "coherence_score": 0.85,
    "vector_zero": {
      "primary_wavelength_nm": "580",
      "secondary_wavelength_nm": "420",
      "axes": { "lateral": 0.7, "vertical": 0.6, "depth": 0.5 }
    },
    "civilizational_function": {
      "structural_function": "Flow and transition management",
      "civilizational_role": "Adaptive connector",
      "contribution_environments": ["change management", "cross-functional teams", "improvisation"],
      "friction_environments": ["rigid hierarchies", "fixed schedules", "high-stakes precision"]
    }
  },
  "agent_guidance": {
    "support_style": "Support through clear structure, concise options, and explicit tradeoffs.",
    "best_response_format": "Lead with structure, then provide concise options with explicit tradeoffs.",
    "planning_mode": "prediction-first with checkpointed direction changes",
    "decision_support": {
      "preferred_option_count": 2,
      "needs_clear_tradeoffs": true,
      "avoid_excessive_branching": true
    },
    "interaction_rules": {
      "lead_with_structure": true,
      "name_the_frame_before_details": true,
      "chunk_complexity": true,
      "confirm_major_direction_changes": true
    },
    "agent_do": ["change management", "cross-functional teams", "improvisation", "rapid iteration"],
    "agent_avoid": ["rigid hierarchies", "fixed schedules", "high-stakes precision", "solo deep-focus"],
    "likely_friction_patterns": ["rigid hierarchies", "fixed schedules", "high-stakes precision", "solo deep-focus"],
    "best_use_of_this_human": ["change management", "cross-functional teams", "improvisation", "rapid iteration"]
  },
  "verification": {
    "status": "unverified",
    "ligs_alignment_score": null,
    "predicted_match_fields": ["support_style", "decision_support", "likely_friction_patterns", "best_use_of_this_human"],
    "observed_match_fields": [],
    "observed_mismatch_fields": [],
    "agent_instruction": "Use this profile as an initial operating hypothesis. Update trust upward when observed behavior repeatedly matches the predicted pattern."
  },
  "agent_summary": {
    "one_line": "Fluxionis structure with strongest contribution in change management.",
    "help_strategy": "Start with two structured options, state tradeoffs, and confirm direction before branching.",
    "failure_mode": "Excessive branching and unframed detail can reduce response coherence.",
    "alignment_test": "Check whether structured, role-aligned options increase response clarity and decision speed."
  }
}
```

- **Error responses:**
  - 400: `MISSING_REPORT_ID`, `MISSING_TOKEN`
  - 401: `MISSING_TOKEN`
  - 403: `INVALID_TOKEN`, `TOKEN_NOT_AUTHORIZED`
  - 404: `PAID_WHOIS_REPORT_NOT_FOUND`, `BEAUTY_PROFILE_NOT_FOUND`, etc.

- **Feedback endpoint:**
```http
POST /api/agent/feedback
Authorization: Bearer wyh_xxx
Content-Type: application/json
{"reportId": "abc-123", "state": "confirmed"|"partial"|"debunked", "metrics": {}, "notes": "optional"}
```

---

## 7. PAYMENT + ACCESS CONTROL

- **Stripe integration:**
  - `POST /api/stripe/create-checkout-session` — Body `reportId` (report checkout) or `prePurchase: true` (pay-first). Session $39.99, success_url `/beauty/success?session_id={CHECKOUT_SESSION_ID}`.
  - `GET /api/stripe/verify-session?session_id=cs_xxx` — Retrieves session. When `payment_status === "paid"`: returns `paid: true`, `reportId`, `prePurchase`, `entitlementToken` (if webhook ran), `executionKey`. Sets HttpOnly cookie `wyh_content_gate=1`.
  - `POST /api/stripe/webhook` — Verifies `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: prePurchase → 200; report checkout → `loadBeautyProfileV1`, mint agent entitlement if none, 200. **Does NOT call send-beauty-profile** (documentation says it does; current code does not).

- **Paid report unlock:** `executionKey` minted by verify-session on paid path. Client stores in sessionStorage. Live API calls (engine, engine/generate, beauty/submit, image/generate, etc.) require `X-LIGS-Execution-Key` or body `executionKey` when `isEngineExecutionGateEnforced()` (production, gate not disabled). Grant consumed on successful E.V.E. pipeline completion.

- **Engine execution gate:** `lib/engine-execution-grant.ts`. `LIGS_ENGINE_GATE=0` or `false` disables. `NEXT_PUBLIC_FAKE_PAY=1` or `NODE_ENV !== "production"` bypasses. Grant TTL 24h, single-use.

- **Failure modes:** 500 on Stripe/Blob/OpenAI errors. Webhook returns 200 on success; Stripe retries on non-2xx. No guard against duplicate email sends if send-beauty-profile were wired (it is not).

---

## 8. EMAIL / DELIVERY SYSTEM

- **Provider:** Resend (preferred) or SendGrid. `RESEND_API_KEY` or `SENDGRID_API_KEY`. `EMAIL_FROM` (default `LIGS <onboarding@resend.dev>`).
- **Trigger points:**
  - **Waitlist:** `POST /api/waitlist` → `sendWaitlistConfirmation` (lib/email-waitlist-confirmation.ts). Sends WHOIS Human Registration Card (`renderFreeWhoisCard`). Duplicate path: resend allowed after 10 min cooldown.
  - **Post-purchase:** `POST /api/email/send-beauty-profile` — body `reportId`, `email`. Builds paid WHOIS via `buildPaidWhoisReport`, renders HTML + text via `renderFreeWhoisReport`/`renderFreeWhoisReportText`. **Not invoked by webhook in current codebase.**
- **Email content source:** `lib/free-whois-report.ts` — `renderFreeWhoisCard`, `renderFreeWhoisCardText` (waitlist); `renderFreeWhoisReport`, `renderFreeWhoisReportText` (paid). `lib/email-waitlist-confirmation.ts` — `sendWaitlistConfirmation`, `getRegistryArtifactImageUrl`.

---

## 9. ENVIRONMENT + DEPLOYMENT

- **Vercel:** `vercel.json` — `{ "framework": "nextjs" }`. Deploy from `main` to ligs.io.
- **Required env vars:**
  - `OPENAI_API_KEY` — GPT-4o, DALL·E 3
  - `BLOB_READ_WRITE_TOKEN` — Vercel Blob
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - One of `RESEND_API_KEY` or `SENDGRID_API_KEY`
  - `NEXT_PUBLIC_SITE_URL` (default https://ligs.io)
  - `VERCEL_URL` (server-side origin)

- **Optional / gates:**
  - `LIGS_API_OFF=1` — Kill-switch; 503 on sensitive routes
  - `LIGS_ENGINE_GATE=0` — Disable execution key requirement
  - `NEXT_PUBLIC_DRY_RUN=1` — Client never sends live
  - `NEXT_PUBLIC_FAKE_PAY=1` — Bypass Stripe
  - `NEXT_PUBLIC_WAITLIST_ONLY` — Unset or `"0"` to enable purchase (middleware redirects /beauty → /origin regardless in current config)
  - `LIGS_STUDIO_TOKEN` — Studio cookie auth
  - `DRY_RUN=1` — Server mock, no OpenAI
  - `ALLOW_EXTERNAL_WRITES` — Real LLM/image in dev
  - `ALLOW_FORCE_LIVE=true` — Honor `X-Force-Live: 1`

- **Known deployment notes:** Middleware redirects `/beauty` and `/beauty/*` to `/origin` (308). `/whois-your-human/api` and case-studies require `wyh_content_gate` cookie. www → apex (308).

---

## 10. CURRENT SYSTEM LIMITATIONS / KNOWN ISSUES

- **Webhook does not send post-purchase email:** SYSTEM_SNAPSHOT and docs state webhook calls `POST /api/email/send-beauty-profile`; current webhook code only mints entitlement. Post-purchase email not triggered automatically.
- **/beauty routes redirected:** All `/beauty` and `/beauty/*` redirect to `/origin`. Success page and view are reachable only via direct URL after redirect (e.g. from Stripe success_url). Flow may be broken for users who land on /beauty.
- **Pre-purchase flow:** `prePurchase: true` checkout does not create reportId; success page shows "Generate your WHOIS record" → `/beauty/start`. No agent entitlement until report exists and is paid for report checkout.
- **Entitlement token polling:** Success page polls verify-session for `entitlementToken` (webhook runs async). Up to 3 polls, 2s apart. If webhook delayed, user may see "token not available yet."
- **In-memory fallback:** No Blob token → reports, beauty profiles, entitlements in memory. Lost on restart.
- **Idempotency:** Required for live E.V.E. when `allowExternalWrites`. Missing key → 400.
- **Constraint gate:** Forbidden terms (chakra, kabbalah, etc.) trigger repair; if hits remain, redacted in dev.
- **Technical debt:** Multiple docs reference send-beauty-profile from webhook; code does not match. Some archetype/legacy maps derive from contract; "DO NOT EDIT" headers.

---

## 11. FILE MAP (IMPORTANT)

| File | Description |
|------|--------------|
| `middleware.ts` | Host canonicalization; / → /origin; /beauty, /dossier, /voice → /origin; wyh content gate; studio cookie gate |
| `app/origin/page.jsx` | Canonical landing; renders OriginTerminalIntake |
| `components/OriginTerminalIntake.jsx` | WHOIS terminal intake; waitlist/checkout flow |
| `app/beauty/success/page.jsx` | Post-Stripe success; verify-session; executionKey + entitlementToken |
| `app/beauty/view/BeautyViewClient.jsx` | Report view; PreviewRevealSequence, InteractiveReportSequence |
| `app/api/beauty/submit/route.ts` | Beauty flow entry; deriveFromBirthData → POST /api/engine |
| `app/api/engine/route.ts` | E.V.E. pipeline; engine/generate → report fetch → E.V.E. filter → save profile → images |
| `app/api/engine/generate/route.ts` | Report-only; OpenAI, saveReportAndConfirm |
| `app/api/agent/whois/route.ts` | Agent calibration record endpoint |
| `app/api/agent/register/route.ts` | Alias for beauty/submit |
| `app/api/stripe/create-checkout-session/route.ts` | Stripe session creation |
| `app/api/stripe/verify-session/route.ts` | Payment verification; mint executionKey; set wyh_content_gate cookie |
| `app/api/stripe/webhook/route.ts` | Mint agent entitlement on checkout.session.completed |
| `lib/report-store.ts` | saveReport, getReport, saveReportAndConfirm; Blob ligs-reports/ |
| `lib/beauty-profile-store.ts` | saveBeautyProfileV1, loadBeautyProfileV1; Blob ligs-beauty/ |
| `lib/agent-entitlement-store.ts` | mintAgentEntitlementToken, saveAgentEntitlement, getAgentEntitlementByToken |
| `lib/engine-execution-grant.ts` | createEngineExecutionGrant, consumeEngineExecutionGrant, isEngineExecutionGateEnforced |
| `lib/free-whois-report.ts` | buildFreeWhoisReport, buildPaidWhoisReport, renderFreeWhoisReport, renderFreeWhoisCard |
| `lib/report-composition.ts` | composeArchetypeSummary, composeLightExpression, composeCosmicTwin |
| `lib/engine-spec.ts` | ENGINE_SPEC for report generation |
| `lib/eve-spec.ts` | EVE_FILTER_SPEC, buildBeautyProfile, extractArchetypeFromReport |
| `lib/vector-zero.ts` | VECTOR_ZERO_SPEC, VectorZero type |
| `lib/validate-engine-body.ts` | validateEngineBody (fullName, birthDate, birthTime, birthLocation, email) |
| `lib/astrology/deriveFromBirthData.ts` | Geocode, tz-lookup, local/UTC timestamps |
| `lib/astronomy/computeSunMoonContext.ts` | Sun/Moon coords, twilight, sunrise/sunset |
| `src/ligs/astronomy/solarSeason.ts` | SOLAR_SEASONS, getSolarSeasonIndexFromLongitude, getSolarSeasonProfile |
| `src/ligs/image/triangulatePrompt.ts` | getPrimaryArchetypeFromSolarLongitude, resolveSecondaryArchetype, buildTriangulatedImagePrompt |
| `src/ligs/archetypes/contract.ts` | LIGS_ARCHETYPES, ARCHETYPE_CONTRACT_MAP, getArchetypeOrFallback |
| `src/ligs/cosmology/cosmicAnalogues.ts` | getCosmicAnalogue |
| `src/ligs/voice/civilizationalFunction.ts` | getCivilizationalFunction, hasCivilizationalFunction |
| `lib/email-waitlist-confirmation.ts` | sendWaitlistConfirmation, getRegistryArtifactImageUrl |
| `lib/wyh-content-gate.ts` | WYH_CONTENT_GATE_COOKIE, wyhContentGateCookieOptions |
| `SYSTEM_SNAPSHOT.md` | Authoritative stack reference (update on structural changes) |

---

## 12. RECENT CHANGES / STATE

- **Recent commits:** WHOIS agent evaluations (WYH-001), case study components, handoff block, trust language, live lock, WHOIS landing port, report-bound checkout realignment, agent entitlement mint on webhook, verify-session returns token, dry-run whois pipeline repair.
- **Current state:** Production at ligs.io. `/beauty` and subpaths redirect to `/origin`. WHOIS product at `/whois-your-human`. Agent API at `GET /api/agent/whois`. Stripe test mode enforced in non-prod. Webhook mints entitlement but does not trigger post-purchase email. Waitlist-only default (`NEXT_PUBLIC_WAITLIST_ONLY` unset).
