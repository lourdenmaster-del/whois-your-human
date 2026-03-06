# LIGS — Full System Overview for Collaborators

**Purpose:** Get a new collaborator aligned on what we're building, how it fits together, and where to find things.

**References:**
- **SYSTEM_SNAPSHOT.md** — Authoritative reference for routes, env vars, integrations. Update it when making structural changes.
- **docs/LIGS-VOICE-ENGINE-SPEC.md** — Canonical Voice Profile spec.
- **SYSTEM_OVERVIEW.md** — LIGS pipeline deep-dive (Voice, Image, Marketing).

---

## 1. What Is LIGS?

LIGS is a **light-identity / beauty profile** system. Users provide birth data (date, time, location). The system produces:

1. **Light Identity Report** — A structured report with archetype, deviations, corrective vectors, and aesthetic descriptions.
2. **Beauty Profile** — A curated experience with emotional snippet, imagery (Vector Zero, Light Signature, Final Beauty), and full report.
3. **Marketing assets** — Archetype-driven visuals (logo marks, backgrounds) and overlay copy for cards.

Everything is **archetype-driven**: 12 canonical archetypes (Stabiliora, Radiantis, Tenebris, Ignispectrum, etc.) determine voice, visuals, and marketing tone.

---

## 2. Architecture at a Glance

| Layer | Stack |
|-------|--------|
| **Frontend** | Next.js 16, React 19, App Router |
| **Backend** | Next.js API routes (serverless) |
| **AI** | OpenAI GPT-4o (reports, voice, E.V.E. filter), DALL·E 3 (images) |
| **Storage** | Vercel Blob (reports, beauty profiles, images) |
| **Payments** | Stripe Checkout + webhook |
| **Email** | Resend or SendGrid |

---

## 3. User-Facing Flows

### Main Landing (`/`)

- Form: name, birth date/time, location, email.
- Submit → `POST /api/engine/generate` or `POST /api/engine` (E.V.E.).
- Report stored in Blob; user gets `reportId`.
- Previews show report cards; "Pay to Unlock" → Stripe Checkout.

### Beauty Landing (`/beauty`)

- Same form; submit → `POST /api/beauty/submit` (runs `deriveFromBirthData` for astrology, Sun/Moon, On This Day context, then forwards to engine).
- Engine generates report → **Constraint Gate** (scans for forbidden terms; one repair pass if needed) → **E.V.E.** (OpenAI filter) → **Beauty Profile V1** saved to Blob.
- When `allowExternalWrites`: 3 images generated (Vector Zero, Light Signature, Final Beauty) and saved.
- Client uses in-line report data from submit response when available (dry-run, UNSAVED dev fallback); otherwise fetches `GET /api/report/[reportId]`.
- User sees previews → Stripe Checkout → success → email with link to `/beauty/view?reportId=…`.

### Beauty View (`/beauty/view?reportId=…`)

- Loads Beauty Profile from Blob.
- Renders: carousel (3 images), emotional snippet, ShareCard (archetype + tagline + hit points), full report accordion.
- Post-purchase email includes this link.

### DRY_RUN Mode (`?dryRun=1` or `DRY_RUN=1`)

- Skips OpenAI; uses mock data.
- Saves minimal Beauty Profile to Blob so previews and view work locally for **$0**.
- Essential for local dev and demos.

---

## 4. Internal Flows (Simplified)

```
Form Submit
    → POST /api/engine/generate (report only)
    → saveReportAndConfirm (Blob)
    → returns reportId

Beauty Flow
    → POST /api/beauty/submit (deriveFromBirthData, Sun/Moon, On This Day → forward)
    → POST /api/engine (E.V.E. pipeline)
    → POST /api/engine/generate (report → Constraint Gate if forbidden hits → image prompts, vector zero)
    → GET /api/report/{reportId}
    → OpenAI E.V.E. filter
    → saveBeautyProfileV1 (Blob)
    → (if allowExternalWrites) POST /api/generate-image × 3
    → images saved to Blob

Stripe Success
    → Webhook checkout.session.completed
    → loadBeautyProfileV1
    → POST /api/email/send-beauty-profile
```

---

## 5. Key Concepts

### Archetypes

- **Single source of truth:** `src/ligs/archetypes/contract.ts` — `ARCHETYPE_CONTRACT_MAP`
- 12 archetypes: Stabiliora, Radiantis, Tenebris, Ignispectrum, Duplicaris, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis.
- Each has: **voice** (tone, rhythm), **visual** (palette, lighting, flow_lines), **marketingDescriptor** (label, tagline, hit points, CTA), **marketingVisuals** (keywords, palette, motion).
- Unknown archetypes fall back to **NEUTRAL_FALLBACK** (premium, minimal, refined).
- Adapters in `src/ligs/archetypes/adapters.ts` expose data to legacy modules.
- **Legacy maps** (`archetype-visual-map.ts`, `archetypeAnchors.ts`, `archetype-copy-map.ts`) are thin re-exports — DO NOT EDIT; edit contract.ts only.

### Constraint Gate (`lib/engine/constraintGate.ts`)

- Post-generation scan for forbidden terms in `full_report` (chakra, kabbalah, sacred geometry, Schumann, etc.).
- If hits: one repair OpenAI call to rewrite without them; re-scan; if hits remain, redact in dev.
- Non-production responses include `meta.forbiddenHitsDetected` when repair was triggered.

### E.V.E. (Extract, Validate, Emit)

- OpenAI filter that turns a raw Light Identity Report into a structured **Beauty Profile**.
- Extracts subject name, emotional snippet, image prompts, vector zero.
- Runs in `POST /api/engine` after report generation.

### Runtime Mode (`lib/runtime-mode.ts`)

- **ALLOW_EXTERNAL_WRITES** — `"true"` = real OpenAI/Stripe/Blob; else DRY_RUN.
- **DRY_RUN** — Mock reports, no real LLM/image calls.
- **stripeTestModeRequired** — Non-prod rejects `sk_live_` keys.
- These are **server-side only**; never client-controlled.

### Marketing Layer

- **Descriptor** — Archetype → label, tagline, hit points, CTA (`lib/marketing/descriptor.ts`).
- **Visuals** — Logo mark + header background via `POST /api/marketing/visuals` (calls image/generate twice).
- **Glyph field** — `buildGlyphFieldPrompt()` for the canonical "(L)" glyph with archetype-driven field (`lib/marketing/glyphField.ts`).
- **MarketingHeader** — UI component; used in Beauty and LIGS Studio.
- See **docs/MARKETING-LAYER.md**.

### LIGS Studio (`/ligs-studio`)

- Internal tool for running image vertical slice: generate background, compose marketing card, generate marketing, compare runs.
- **Live Test (costs money):** fullName, birthDate, birthTime, birthLocation inputs → "Run LIVE ONCE" button → `POST /api/dev/live-once` (dev-only, 1 per server restart) → **Latest Run Output** panel with full report, snippet, vector zero, image prompts, savedToBlob status, "Verify saved to Blob" button (`POST /api/dev/verify-saved`). Set `DEBUG_PROMPT_AUDIT=1` to log prompt audit in terminal.
- Warning Lights show: Mode (LIVE/DRY_RUN), Provider, Logo status, Cache.
- Session-only state; no persistence.

---

## 6. Where Things Live

### Frontend

| Area | Path | Notes |
|------|------|--------|
| Root layout | `app/layout.tsx` | Fonts, metadata, `globals.css` |
| Main landing | `app/page.tsx`, `app/LandingPage.jsx` | Form → engine |
| Beauty landing | `app/beauty/page.jsx`, `app/beauty/BeautyLandingClient.jsx` | Form, results, PayUnlock |
| Beauty view | `app/beauty/view/BeautyViewClient.jsx` | Carousel, snippet, ShareCard, accordion |
| LIGS Studio | `app/ligs-studio/page.tsx`, `components/LigsStudio.tsx` | Internal dev tool |
| Voice builder | `app/voice/page.jsx`, `components/VoiceProfileBuilder.jsx` | 5-step wizard |

### API Routes

| Route | File | Purpose |
|-------|------|---------|
| `POST /api/engine/generate` | `app/api/engine/generate/route.ts` | Report only; saves to Blob |
| `POST /api/engine` | `app/api/engine/route.ts` | Full E.V.E. pipeline |
| `POST /api/beauty/submit` | `app/api/beauty/submit/route.ts` | Beauty flow entry; deriveFromBirthData → engine |
| `POST /api/beauty/dry-run` | `app/api/beauty/dry-run/route.ts` | Mock Beauty Profile, no OpenAI |
| `GET /api/beauty/[reportId]` | `app/api/beauty/[reportId]/route.ts` | Load Beauty Profile |
| `GET /api/report/[reportId]` | `app/api/report/[reportId]/route.ts` | Load Light Identity Report |
| `POST /api/stripe/create-checkout-session` | `app/api/stripe/...` | Stripe Checkout |
| `POST /api/stripe/webhook` | `app/api/stripe/...` | Post-purchase email |
| `POST /api/image/generate` | `app/api/image/generate/route.ts` | DALL·E 3; cache; DRY_RUN |
| `POST /api/image/compose` | `app/api/image/compose/route.ts` | 1:1 square card compositor |
| `POST /api/voice/generate` | `app/api/voice/generate/route.ts` | Voice copy generation |
| `POST /api/marketing/generate` | `app/api/marketing/generate/route.ts` | Descriptor + assets |
| `POST /api/marketing/visuals` | `app/api/marketing/visuals/route.ts` | Logo mark + background |
| `POST /api/dev/live-once` | `app/api/dev/live-once/route.ts` | Dev-only; 1 live report run per server; bypasses DRY_RUN |
| `POST /api/dev/verify-saved` | `app/api/dev/verify-saved/route.ts` | Dev-only; verifies report in Blob/memory; UNSAVED→unsaved, else getReport |

### Core Logic

| Module | Purpose |
|--------|---------|
| `src/ligs/archetypes/contract.ts` | Archetype data; `getArchetypeOrFallback()` |
| `src/ligs/archetypes/adapters.ts` | Adapters for voice, visual, marketing |
| `src/ligs/voice/schema.ts` | VoiceProfile Zod schema |
| `src/ligs/image/buildImagePromptSpec.ts` | Profile + archetype → ImagePromptSpec |
| `src/ligs/marketing/` | Overlay spec, templates, validation |
| `lib/marketing/` | Descriptor, visuals, glyph field prompts |
| `lib/engine-client.js` | `submitToBeautySubmit`, `submitToBeautyDryRun`, `submitToEngine` |
| `lib/report-store.ts` | Blob report read/write |
| `lib/beauty-profile-store.ts` | Blob Beauty Profile read/write |
| `lib/runtime-mode.ts` | `allowExternalWrites`, `isProd`, etc. |
| `lib/astrology/deriveFromBirthData.ts` | Birth data → lat/lon, timezone, sun/moon/rising, solar/lunar context |
| `lib/history/onThisDay.ts` | "On this day" events from Wikimedia; used in birthContext |
| `lib/astronomy/computeSunMoonContext.ts` | Sun/Moon altitude, azimuth, twilight, phase from astronomy-engine |
| `lib/engine/constraintGate.ts` | `scanForbidden`, `redactForbidden`; post-generation forbidden-term gate |

---

## 7. Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | GPT-4o, DALL·E 3 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (reports, beauty, images) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout + webhook |
| `RESEND_API_KEY` or `SENDGRID_API_KEY` | Post-purchase email |
| `ALLOW_EXTERNAL_WRITES` | `"true"` = live; else DRY_RUN |
| `DRY_RUN` | `"1"` = mock report, no OpenAI |
| `BRAND_LOGO_PATH` | Logo for compose (optional) |
| `ENABLE_PLACEHOLDER_LOGO` | `"true"` = "(L)" SVG when no brand logo |
| `DEBUG_PROMPT_AUDIT` | `"1"` = log prompt audit before OpenAI in engine/generate |
| `DEBUG_PERSISTENCE` | `"1"` = when Blob write fails, return 200 with UNSAVED reportId (dev fallback) |

See **SYSTEM_SNAPSHOT.md** §3 for full list and usage.

---

## 8. How to Run Locally

```bash
npm install
npm run dev
```

- **Beauty with DRY_RUN:** `http://localhost:3000/beauty?dryRun=1` — form saves mock profile; view works.
- **LIGS Studio:** `http://localhost:3000/ligs-studio` — test image generation, compose, marketing.
- **Tests:** `npm run test:run` — full suite.

**To test full flow (real OpenAI/Blob):**

- Set `BLOB_READ_WRITE_TOKEN`, `OPENAI_API_KEY`, `ALLOW_EXTERNAL_WRITES=true`.
- Use Stripe test keys for checkout.

---

## 9. Verification Checklist

- [ ] `/` loads landing; form submits.
- [ ] `/beauty` loads Beauty landing; form with `?dryRun=1` saves mock profile.
- [ ] `/beauty/view?reportId=…` shows carousel + report (if profile exists in Blob).
- [ ] `npm run test:run` — all tests pass.
- [ ] `GET /api/report/debug` — shows storage type.
- [ ] **Monitoring:** Alert on `REPORT_NOT_FOUND` / `report_blob_write_failed` (see **docs/REPORT-PERSISTENCE-ALERTING.md**).

---

## 10. Docs Index

| Doc | Use |
|-----|-----|
| **SYSTEM_SNAPSHOT.md** | Routes, env, integrations — update on structural changes |
| **docs/COLLABORATOR-SYSTEM-OVERVIEW.md** | This file — onboarding |
| **docs/LIGS-VOICE-ENGINE-SPEC.md** | Voice Profile spec |
| **docs/MARKETING-LAYER.md** | Marketing descriptor, visuals, MarketingHeader |
| **docs/PRE-PUSH-SANITY-CHECKLIST.md** | Pre-deploy verification |
| **docs/REPORT-PERSISTENCE-ALERTING.md** | Monitoring and alerting |
| **SYSTEM_OVERVIEW.md** | LIGS pipeline (Voice, Image, Marketing) |

---

## 11. Recent Changes (2026-02-24)

| Change | Impact |
|--------|--------|
| **Constraint Gate** | `full_report` scanned for forbidden terms; one repair pass if hits; redact or error in dev. Non-prod: `meta.forbiddenHitsDetected`. |
| **Live Test (LigsStudio)** | "Run LIVE ONCE" button → `POST /api/dev/live-once`; dev-only, 1 per server restart. `DEBUG_PROMPT_AUDIT=1` for prompt audit in terminal. |
| **UNSAVED reportId fix** | BeautyLandingClient uses in-line report data from submit response when available (dry-run, UNSAVED dev fallback); avoids 404 on `GET /api/report/UNSAVED:xxx`. |
| **Birth context** | `deriveFromBirthData` (astrology), `computeSunMoonContext` (astronomy-engine), `getOnThisDayContext` (Wikimedia) enrich report prompt via beauty/submit. |
| **DEBUG_PROMPT_AUDIT, DEBUG_PERSISTENCE** | Dev env vars for prompt audit and Blob-failure fallback. |
| **Full Output Viewer (LigsStudio)** | After Run LIVE ONCE: Latest Run Output panel (full report, snippet, vector zero, image prompts, savedToBlob). "Verify saved to Blob" button → `POST /api/dev/verify-saved`. |

---

*Last updated: 2026-02-24*
