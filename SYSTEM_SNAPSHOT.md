# LIGS Full-Stack System Snapshot

**Authoritative reference for the current stack.** This file is the single source of truth for front-end routes, back-end API routes, environment variables, Vercel config, build pipeline, and integration points. Any structural change to the app (new routes, new API handlers, new env vars, new integrations, or changes to existing structure) **must** be reflected here—update this document in the same change set.

First-time system map for **ligs-frontend** (Next.js 16, React 19). Use this to verify the full stack is wired correctly.

---

## 1. Front-end architecture

### 1.1 App structure (App Router)

| Path | Type | Purpose |
|------|------|--------|
| `app/layout.tsx` | Root layout | Space Grotesk font, `globals.css`, metadata (title, OG, Twitter), `NEXT_PUBLIC_SITE_URL` for canonical/OG |
| `app/page.tsx` | Server | Redirects to `/beauty` (single entrypoint) |
| `app/error.jsx` | Client | Error boundary: message + “Try again” reset |
| `app/globals.css` | Global styles | Tailwind + app CSS |

**Beauty section** (nested under `app/beauty/`):

| Path | Type | Purpose |
|------|------|--------|
| `app/beauty/layout.jsx` | Layout | System serif (Georgia), `beauty-theme`, full-viewport background `/stabiliora-background.svg` |
| `app/beauty/page.jsx` | Server | Renders `BeautyLandingClient` only. Single Beauty landing. |
| `app/beauty/BeautyLandingClient.jsx` | Client | **Pay-first flow:** `unlocked` = `isBeautyUnlocked()` or `dryRun`. When !unlocked: CTA block ($39.99) visible; CTA → TEST_MODE/FAKE_PAY bypass or Stripe pre-purchase; redirect to `/beauty/start` on bypass. When unlocked: "Unlocked" badge + link to `/beauty/start`. Dev section only when NODE_ENV=development AND `?dev=1`. |
| `app/beauty/start/page.jsx` | Client | Birth form (LightIdentityForm). Requires unlocked; redirects to `/beauty` if not. Submit → `submitToBeautySubmit`/`submitToBeautyDryRun`; on success → `/beauty/view?reportId=...`. |
| `app/beauty/view/page.jsx` | Client | View beauty profile by `?reportId=`; uses `BeautyViewClient`, `getBaseUrl()` from `NEXT_PUBLIC_VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` |
| `app/beauty/view/BeautyViewClient.jsx` | Client | Fetches `/api/beauty/[reportId]`; uses ArchetypeArtifactCard (hero + info panel), PreviewCarousel, EmotionalSnippet, FullReportAccordion, ShareCard. When `profile.marketingCardUrl` exists, renders Marketing Card section. DRY_RUN (`?dryRun=1`) shows placeholder when Blob empty. "No report selected" / "Report not found" errors; Paid/View Only notice; Back button. Tracks report_fetch, images_loaded, errors. |
| `app/beauty/success/page.jsx` | Page | Post-Stripe success (with `reportId`) |
| `app/beauty/cancel/page.jsx` | Page | Stripe checkout cancelled |

**Other:**

| Path | Type | Purpose |
|------|------|--------|
| `app/ligs-studio/page.tsx` | Page | Renders `LigsStudio` — internal UI to run full image vertical slice (generate background, compose marketing card); inputs persisted in localStorage |
| `app/voice/page.jsx` | Page | Renders `VoiceProfileBuilder` — build voice profiles (local state only) |

### 1.2 Components

| Component | Location | Purpose |
|-----------|----------|--------|
| `LightIdentityForm` | `components/LightIdentityForm.jsx` | Shared form: name, birth date/time, location, email; optional dev defaults; `initialFormData` prop for restored/saved values; `hideSubmitButton` to hide built-in button (parent controls CTA); `onFormDataChange` for form state sync |
| `PayUnlockButton` | `components/PayUnlockButton.tsx` | POST `/api/stripe/create-checkout-session` with `{ reportId }`; on success redirects to Stripe Checkout (`session.url`); on 404/BEAUTY_PROFILE_NOT_FOUND shows friendly error. Disables button while pending; shows "Stripe test mode". Used when reportId exists (form submit or restored via landing-storage). |
| `StaticButton` | `components/StaticButton.jsx` | Disabled placeholder button when `lastFormData` is missing (e.g. user arrived via URL). Label "Preview & Pay to Unlock"; tooltip "Generate a report first to unlock". |
| `LandingPreviews` | `components/LandingPreviews.jsx` | Renders **Examples** first (always, EXEMPLAR_CARDS, id="examples"); then **Previous Light Identity Reports** only when blob previews non-empty. Uses `fetchBlobPreviews`. Same card layout for both. Props: `maxCards`, `maxPreviews`, `useBlob`, `clearSelectionTrigger`, `initialCards`. |
| `PreviewCardModal` | `components/PreviewCardModal.jsx` | Modal with image carousel (Vector Zero, Light Signature, Final Beauty), emotional snippet, Stripe checkout button. Touch swipe support. |
| `PreviewCarousel` | `app/beauty/view/PreviewCarousel.jsx` | Carousel for Beauty Profile images: prev/next, swipe, labels (Vector Zero, Light Signature, Final Beauty). Placeholder when images missing. |
| `ArchetypeArtifactCard` | `components/ArchetypeArtifactCard.jsx` | Premium collectible layout: hero image, center archetype overlay, left vertical info panel. `showDevFields?: boolean` passed to ArtifactInfoPanel. Used on /beauty/view and LigsStudio. |
| `ArchetypeNameOverlay` | `components/ArchetypeNameOverlay.jsx` | Center band overlay with subtle scrim and blur for artifact hero. |
| `ArtifactInfoPanel` | `components/ArtifactInfoPanel.jsx` | Left gallery-placard panel with archetype, variationKey, date/location, solar, etc. `showDevFields?: boolean` (default false) hides schemaVersion, engineVersion, and reportId row; reportId visible only when showDevFields=true. |
| `ArtifactCompare` | `components/ArtifactCompare.jsx` | Two-column Compare Runs wrapper for LigsStudio (previous vs current). |
| `ShareCard` | `app/beauty/view/ShareCard.jsx` | Compact share card: archetype label, tagline, 3 hit points (getMarketingDescriptor), signature image, (L) brand mark. Copy share link + Download image. Used on /beauty/view. |
| `EmotionalSnippet` | `app/beauty/view/EmotionalSnippet.jsx` | Renders subject name and emotional snippet quote. |
| `FullReportAccordion` | `app/beauty/view/FullReportAccordion.jsx` | Collapsible full report section (accordion). |
| `TestModeLogger` | `components/TestModeLogger.tsx` | Client component; logs "TEST MODE" to console when `NEXT_PUBLIC_TEST_MODE=1` |
| `LigsFooter` | `components/LigsFooter.jsx` | Footer for landing |
| `VoiceProfileBuilder` | `components/VoiceProfileBuilder.jsx` | 5-step wizard: archetype, descriptors, banned words, claims policy, channel adapters; builds + validates VoiceProfile; stores in local state |
| `LigsStudio` | `components/LigsStudio.tsx` | Internal studio: VoiceProfile JSON, purpose, variationKey, size, background source (string only); Generate Background, Compose, Full Pipeline, 6 Variations, Generate Marketing; previews, spec/validation JSON, copy payload/response. **LIVE Results panel:** composed image (if compose ran), background image (if generate ran), overlaySpec JSON (collapsible), Open Viewer link; no DRY placeholders. **DRY mode:** placeholder labeled "Layout preview only"; short note instead of nag. **DRY_RUN** (`NEXT_PUBLIC_DRY_RUN=1` or `allowExternalWrites=false`): Dry Run Preview panel, banner "DRY RUN: No request was sent" — no network. Compare mode: ArtifactCompare with ArchetypeArtifactCard; **Live Test:** fullName, birthDate, birthTime, birthLocation, "Run LIVE ONCE" → POST `/api/dev/live-once` → Latest Run Output. Marketing: Generate Marketing → MarketingHeader; Show Marketing Layer toggle. |
| `MarketingHeader` | `components/MarketingHeader.tsx` | Displays archetype label, tagline, hit points, CTA; optional logo mark + marketing background. Uses descriptor + assets from /api/marketing/generate. Graceful degradation when assets missing. |

### 1.3 Client utilities

| Module | Purpose |
|--------|--------|
| `lib/engine-client.js` | `buildEnginePayload`, `submitToEngine`, `submitToBeautyDryRun(formData)` → POST `/api/beauty/dry-run`; `submitToEve`, `submitToBeautySubmit` |
| `lib/unwrap-response.ts` | Unwrap API JSON; throw with `error` / `code` on non-OK |
| `lib/analytics.js` | `track(event, reportId?)` → POST `/api/analytics/event` |
| `lib/landing-storage.js` | `saveLastFormData`, `loadLastFormData`, `clearLastFormData` — localStorage for form state. `setBeautyUnlocked()`, `isBeautyUnlocked()` — pay-first unlock (set from success page after Stripe checkout). |
| `lib/api-client.js` | `fetchBlobPreviews({ maxCards, maxPreviews, useBlob })` — GET `/api/report/previews` wrapper |
| `lib/exemplar-cards.ts` | `EXEMPLAR_CARDS` — deterministic exemplar cards for landing Examples gallery; `{ reportId, subjectName, emotionalSnippet, dominantArchetype, imageUrls }`; used when blob previews empty or fail |
| `lib/runtime-mode.ts` | `isProd`, `isDryRun`, `isTestMode`, `allowExternalWrites`, `allowBlobWrites`, `stripeTestModeRequired` — unified env guard; when `TEST_MODE=1`: dry image gen, deterministic overlay; Blob writes ON unless `DISABLE_BLOB_WRITES=1` |
| `lib/dry-run-config.ts` | Client-side `DRY_RUN`, `FAKE_PAY`, `TEST_MODE` from `NEXT_PUBLIC_*` env vars |
| `lib/preflight.ts` | `runPreflight()` — server-only checks OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, DRY_RUN unset, allowExternalWrites. Returns `{ ok, checks, checklist }`. Used by `/api/dev/preflight` and `/api/dev/beauty-live-once`. |
| `lib/ligs-studio-utils.ts` | `pickBackgroundSource(imageResult)` — extracts `{ url }` or `{ b64 }` from image/generate response (images[0], image.url, image.b64); `backgroundToInputString(bg)` — converts to URL or data URL string for Background input |
| `lib/marketing/` | Marketing Descriptor (archetype→label, tagline, hitPoints, CTA), buildMarketingImagePrompts (logo mark + background), buildLogoMarkPrompt + buildMarketingBackgroundPrompt (visuals.ts), archetypeStyle mapping. Glyph field: buildGlyphFieldPrompt (glyphField.ts) for "(L)" glyph with archetype-driven field (color, material, lighting, flow; Deviation Budget HIGH/LOW). POST /api/marketing/generate, POST /api/marketing/visuals. See docs/MARKETING-LAYER.md. |
| `lib/history/onThisDay.ts` | `getOnThisDayContext(month, day, lang)` — fetches "on this day" from Wikimedia/Wikipedia API; 24h in-memory cache; curation (events, births, holidays, max 6 items). Used by beauty/submit to enrich birthContext. |
| `lib/astronomy/computeSunMoonContext.ts` | `computeSunMoonContext(lat, lon, utcTimestamp, timezoneId)` — Sun/Moon horizontal coords, twilight phase, sunrise/sunset, day length, moon phase/illumination. Uses astronomy-engine only (no external APIs). beauty/submit attaches sun + moon to birthContext; engine buildBirthContextBlock injects concise Sun/Moon section. |
| `lib/engine/constraintGate.ts` | `scanForbidden(text)` — scans full_report for forbidden terms (chakra, kabbalah, sacred geometry, etc.); `redactForbidden(text, keys)` — replaces matches with [removed]. Engine/generate runs one repair OpenAI pass when hits > 0; re-scan; if hits remain, redacts in dev. |

### 1.5 Voice Profile (LIGS)

| Module | Purpose |
|--------|--------|
| `src/ligs/voice/schema.ts` | Zod schema for `VoiceProfile`; `parseVoiceProfile()`, `safeParseVoiceProfile()` |
| `src/ligs/voice/errors.ts` | `VoiceEngineError` (discriminated union); `zodToVoiceEngineError()`, `toVoiceEngineError()` |
| `src/ligs/voice/normalize.ts` | `normalizeVoiceProfile()` – validate via Zod, light trim + lexicon dedupe, returns VoiceProfile or null |
| `src/ligs/voice/index.ts` | Barrel exports |
| `src/ligs/voice/prompt/buildPromptPack.ts` | `buildPromptPack()`, `toSystemPrompt()` — LLM prompt pack from VoiceProfile |
| `src/ligs/voice/prompt/archetypeAnchors.ts` | `ARCHETYPE_ANCHORS`, `getArchetypeAnchor()` — 12 LIGS archetype definitions |
| `src/ligs/archetypes/contract.ts` | Single source of truth: `LIGS_ARCHETYPES`, `ArchetypeContract`, `ArchetypeContractMap`, `ARCHETYPE_CONTRACT_MAP`, `NEUTRAL_FALLBACK`, `getArchetypeContract`, `getArchetypeOrFallback`. Canonical 12 archetypes with voice, visual, marketingDescriptor, marketingVisuals, copyPhrases. |
| `src/ligs/archetypes/adapters.ts` | Compatibility adapters: `getArchetypeVisualMapShape`, `getArchetypeVoiceAnchorShape`, `getMarketingDescriptor`, `getOverlayCopyBank`, `getMarketingVisuals`, `getVisualMapRecord`, `getVoiceAnchorRecord`, `getOverlayCopyRecord`, `getVisualParamsOrFallback`. Legacy `archetype-visual-map.ts`, `archetypeAnchors.ts`, `archetype-copy-map.ts` now derive from these adapters (thin re-exports); DO NOT EDIT headers point to contract. |
| `src/ligs/voice/prompt/selfCheck.ts` | `buildSelfCheckRubric()`, `formatSelfCheckBlock()` — pre-final checklist |
| `src/ligs/voice/validate/` | Post-generation validation: `validateVoiceOutput()`, banned words, claims, cadence, formatting, lexicon, channel structure |
| `src/ligs/image/schema.ts` | `ImagePromptSpec` Zod schema: purpose, style (palette/materials arrays, texture_level/contrast_level enums), composition (symmetry/negative_space/flow_lines enums), constraints (no_text, no_logos, no_faces, no_figures, no_symbols, no_astrology, avoid_busy_textures, safety_notes?), output (aspectRatio, size "1024"|"1536", count 1–4), prompt, variation (variationId, motifs, randomnessLevel) |
| `src/ligs/image/buildImagePromptSpec.ts` | `buildImagePromptSpec(profile, { purpose, aspectRatio?, size?, count?, archetype?, variationKey? })` — maps VoiceProfile + archetype to ImagePromptSpec; deterministic motifs from hash(profile.id + purpose + variationKey); strict exclusions in negative prompt |
| `src/ligs/image/validateImagePromptSpec.ts` | Validates spec (required constraints true, negative contains exclusions, positive has no disallowed tokens); pass/score/issues; score 100 − 25×errors − 5×warnings |
| `src/ligs/voice/api/generate-request-schema.ts` | Zod schema for POST /api/voice/generate body; `parseGenerateVoiceRequest()`, `GenerateVoiceRequest` |
| `src/ligs/marketing/schema.ts` | `MarketingOverlaySpec` Zod schema: id, version, created_at, ligs, purpose, output, templateId, copy (headline/subhead/cta/disclaimer), placement (safeArea, logo, textBlock), styleTokens (incl. optional logoStyle: text, weight, tracking, opacity, blur, glow, radius, fill, stroke, circleFill, circleStroke), constraints. `getLogoStyleWithDefaults()`, `LogoStyle` type. |
| `src/ligs/marketing/templates.ts` | ONE template `square_card_v1` for 1:1; `getTemplate(templateId, aspectRatio)` |
| `src/ligs/marketing/buildOverlayPromptPack.ts` | `buildOverlayPromptPack()` — prompt pack for overlay copy generation in archetype voice |
| `src/ligs/marketing/generateOverlaySpec.ts` | `generateOverlaySpec()` — LLM copy when allowed, else deterministic; static placements from templates; archetype→logoStyle mapping. `buildOverlaySpecWithCopy(profile, options, copy)` — sync spec builder with custom copy for LIGS Studio DRY compose; sets logoStyle from archetype. |
| `src/ligs/marketing/validateOverlaySpec.ts` | `validateOverlaySpec()` — copy lengths, banned words, medical claims, guarantees, placement bounds; pass/score/issues |

See **docs/LIGS-VOICE-ENGINE-SPEC.md** for the full spec.

### 1.6 Styling & assets

- **Tailwind** (PostCSS) + `app/globals.css`
- **Fonts:** system sans stack (root), system serif (beauty); no Google Fonts (build-safe offline/sandbox)
- **Public:** `public/` (e.g. `beauty-background.png`, `beauty-hero.png`, `favicon.ico`, etc.)

---

## 2. Back-end routes (API)

All under `app/api/`. Route handlers use `@/lib` helpers and shared validation where applicable.

### 2.1 Core engine & E.V.E.

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/engine/generate` | Report-only. Validates body. If dry run: mock report → `saveReportAndConfirm` (retry + verify). Else: OpenAI → full report, snippet → **Constraint Gate** (`scanForbidden`; if hits: one repair OpenAI call, else redact) → image prompts, vector zero → **saveReportAndConfirm** (retry on transient errors, verify by read-back). Returns `status: "ok"` only when write is confirmed; on storage failure returns 503 and does not return `reportId`. Non-production: `meta.forbiddenHitsDetected` when repair was triggered. Header `X-Force-Live: 1` bypasses `DRY_RUN` for dev live-once. Uses `OPENAI_API_KEY`. |
| POST | `/api/engine` | E.V.E. pipeline. Validates body → internal fetch to `POST /api/engine/generate` (saves report) → fetch `GET /api/report/{reportId}` → OpenAI E.V.E. filter (full structured JSON: vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts) → `buildBeautyProfile` → `buildCondensedFullReport` for user-facing `fullReport` → `saveBeautyProfileV1`. Payload `imageUrls: []`; GET `/api/beauty/[reportId]` enriches from Blob. If `allowExternalWrites` and not `dryRun`: uses `imagery_prompts` from Beauty Profile, calls `POST /api/generate-image` × 3 for slugs → images saved to `ligs-images/{reportId}/{slug}.png`. Uses `OPENAI_API_KEY`, `VERCEL_URL`. |

### 2.2 Beauty API

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/beauty/create` | Rate limit 5/60s. Validates engine body → POST to `/api/engine` → returns `reportId`. Uses `VERCEL_URL`. |
| POST | `/api/beauty/dry-run` | Simulates Beauty flow. Body `birthData`, `dryRun`. Calls `POST /api/engine/generate` with `dryRun: true`; saves BeautyProfileV1 to Blob via `saveBeautyProfileV1` (when `BLOB_READ_WRITE_TOKEN` set) so previews and `/beauty/view` work locally for $0. Returns `{ reportId, beautyProfile, checkout }`. No Stripe call. |
| GET | `/api/beauty/[reportId]` | Rate limit 20/60s. Loads Beauty Profile V1 from Blob via `loadBeautyProfileV1`; 404 if not found. |

### 2.3 Report storage API

| Method | Route | Handler summary |
|--------|--------|------------------|
| GET | `/api/report/[reportId]` | Reads from same storage/key as engine: Blob `ligs-reports/{reportId}.json` or memory. `getReport(reportId)` → returns `full_report`, `emotional_snippet`, `image_prompts`, `vector_zero`. 404 logs `REPORT_NOT_FOUND` (monitor for persistence gaps); response includes `code: "REPORT_NOT_FOUND"`. |
| GET | `/api/report/previews` | Fetches from Beauty Profiles in Blob (`ligs-beauty/`). Lists profiles (most recent first), extracts `subjectName` (subjectName/fullName), `emotionalSnippet`, image URLs from `ligs-images/{reportId}/{slug}`. Query: `useBlob`, `maxPreviews`/`maxCards` (default 3). Read-only. Mock cards when Blob empty (DRY_RUN). |
| GET | `/api/report/debug` | `getStorageInfo()`, optional `listBlobReportPathnames` / `getMemoryReportIds`; test pattern description. |

### 2.4 Stripe

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/stripe/create-checkout-session` | Body `reportId` (report checkout) or `prePurchase: true` (pay-first). Session $39.99, success_url `/beauty/success?session_id={CHECKOUT_SESSION_ID}`. Uses `STRIPE_SECRET_KEY`, `VERCEL_URL`. |
| GET | `/api/stripe/verify-session` | Query `session_id`. Stripe retrieve session; returns `{ paid: true, reportId?, prePurchase? }` only if `payment_status === "paid"`. Uses `STRIPE_SECRET_KEY`. |
| POST | `/api/stripe/webhook` | Stripe signature verification with `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: read `reportId` + email from session → `loadBeautyProfileV1` → POST `/api/email/send-beauty-profile` (internal) → 200. Uses `STRIPE_SECRET_KEY`, `VERCEL_URL`. |

### 2.5 Email & analytics

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/email/send-beauty-profile` | Body `reportId`, `email` → load Beauty Profile V1 → build HTML → send via **Resend** or **SendGrid** (one of `RESEND_API_KEY` or `SENDGRID_API_KEY`). Uses `EMAIL_FROM`, `VERCEL_URL` for view link. |
| POST | `/api/analytics/event` | Body `event` (required), optional `reportId` → log only → 200. |

### 2.6 Voice generation

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/voice/generate` | Zod schema (strict, no allowExternalWrites). `ALLOW_EXTERNAL_WRITES=true` for real LLM; else dry-run. Prompt injection defenses (delimiter, system rule). Temp 0.2, max_tokens, word cap. Returns `{ requestId, text, validation, didRewrite, chosen, dryRun, modelUsed }` + validationBefore/After when rewrite. Logs requestId, profileId, channel, score, didRewrite. |

### 2.7 Image generation

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/image/generate` | Body: `profile` (VoiceProfile), `purpose` (3–100 chars), `image` (aspectRatio, size "1024"|"1536", count 1–4), `variationKey?` (max 200), `archetype?`. Zod strict. 400 IMAGE_REQUEST_INVALID for invalid body; 400 VOICE_PROFILE_INVALID for invalid profile. buildImagePromptSpec → validateImagePromptSpec; 400 IMAGE_SPEC_INVALID if fail. Deterministic LRU cache (max 200) via sha256(profile.id+version+purpose+aspectRatio+size+count+archetype+variationKey). ALLOW_EXTERNAL_WRITES server-only: when false, DRY_RUN (images [], providerUsed null). Denylist pass on prompts. Returns `{ requestId, images, spec, validation, dryRun, providerUsed, cacheHit }`. Logs requestId, profileId, archetype, purpose, size, count, score, pass, dryRun, providerUsed, cacheHit. |
| POST | `/api/image/compose` | 1:1 Square Marketing Card compositor. Body: `profile`, `background` (url or b64), `purpose`, `templateId?` (default square_card_v1), `output?` (size 1024|1536), `variationKey?`, `overlaySpec?`. If `overlaySpec` provided: validate and use directly (no regeneration). Else: generateOverlaySpec → validateOverlaySpec; 400 OVERLAY_SPEC_INVALID if fail. ALLOW_EXTERNAL_WRITES: when false, DRY_RUN (overlaySpec, overlayValidation, no image). When true: sharp compose (background + logo + text overlay + CTA chip) → PNG. Logo: BRAND_LOGO_PATH if readable; else spec-driven monogram "(L)" SVG (createMonogramLogoSvg from overlaySpec.styleTokens.logoStyle) when ENABLE_PLACEHOLDER_LOGO=true; else 400 BRAND_LOGO_REQUIRED. LigsStudio LIVE sends overlaySpec (from DRY preview or buildOverlaySpecWithCopy) so output matches DRY. Returns `{ requestId, dryRun, logoUsed?, overlaySpec, overlayValidation, image? }`. |
| POST | `/api/generate-image` | Body `prompt`, optional `reportId`, `slug`. If `reportId` + slug and existing Blob image URL → return it. Else DALL·E 3 → optional save to Blob (`saveImageToBlob`) → return URL. Uses `OPENAI_API_KEY`. |

### 2.8 LIGS Studio

| Method | Route | Handler summary |
|--------|--------|------------------|
| GET | `/api/ligs/status` | Returns `{ allowExternalWrites, provider, logoConfigured, logoFallbackAvailable }` for LIGS Studio Warning Lights. No auth. |

### 2.9 Dev (non-production only)

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/dev/live-once` | Dev-only. 403 when `NODE_ENV=production`. Rate limit: 1 request per server process (429 "LIVE_ONCE already used; restart dev server"). Body: `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email?` (default `dev@example.com`). Forwards to `POST /api/engine/generate` with `X-Force-Live: 1` (bypasses `DRY_RUN`). Returns engine JSON. Used by LigsStudio "Live Test" button. Set `DEBUG_PROMPT_AUDIT=1` to log prompt audit in terminal. |
| POST | `/api/dev/verify-saved` | Dev-only. 403 in production. Body: `{ reportId }`. UNSAVED: returns `ok:false, reason:unsaved`. Else calls `getReport`; returns `ok:true` with `reportFound`, `keys`, `full_report_length`, `blobKey` when found, else `ok:false, reason:not_found`. Used by LigsStudio "Verify saved to Blob" button. |
| GET | `/api/dev/preflight` | Dev-only. 403 in production. Runs `runPreflight()` — checks OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, DRY_RUN unset, allowExternalWrites. Returns `{ ok, checks, checklist }`. Used before live Beauty run. |
| POST | `/api/dev/beauty-live-once` | Dev-only. 403 in production. Rate limit: 1 per server process. Runs preflight; if pass, POST `/api/beauty/submit` with `dryRun: false`. Full pipeline (report + E.V.E. + images) → Blob. Returns `{ reportId, subjectName, dominantArchetype, viewUrl }`. Studio "LIVE TEST RUN (save to blob)" button. |
| GET | `/api/dev/verify-report` | Dev-only. 403 in production. Query `?reportId=X`. Verifies Beauty Profile in Blob, image URLs, schemaVersion, prompts, archetype. When DRY_RUN=1, also requires marketingCardUrl (profile or ligs-images/{reportId}/marketing_card). Returns `{ ok, checks, imageUrls, marketingCardUrl?, summary }`. |
| GET | `/api/dev/verify-marketing-card` | Dev-only. 403 in production. Query `?reportId=X`. Verifies marketing_card blob exists. Returns `{ ok, marketingCardUrl?, summary }`. |

### 2.10 Marketing

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/marketing/generate` | Body: `primary_archetype` (required), `variationKey?`, `contrastDelta?` (0–1). Returns `{ descriptor, assets, requestId, dryRun }`. Deterministic descriptor from archetype; when ALLOW_EXTERNAL_WRITES, generates logo mark + marketing background via image provider. Reuses pickBackgroundSource. DRY_RUN returns descriptor + empty assets. |
| POST | `/api/marketing/visuals` | Body: `primary_archetype` (string), `variationKey?`, `contrastDelta?` (default 0.15). Wrapper: calls POST /api/image/generate twice (purpose marketing_logo_mark, marketing_background). Returns `{ logoMark?, marketingBackground?, warnings? }`. Normalizes via pickBackgroundSource. Partial success; warnings describe failures. |

---

## 3. Environment variables

| Variable | Where used | Purpose |
|----------|------------|--------|
| `NEXT_PUBLIC_DRY_RUN` | `lib/dry-run-config.ts`, LigsStudio | `"1"` or `"true"` = client never sends generate/verify requests; shows Dry Run Preview and banner |
| `NEXT_PUBLIC_FAKE_PAY` | `lib/dry-run-config.ts`, BeautyLandingClient, PayUnlockButton, PreviewCardModal | `"1"` or `"true"` = CTA bypasses Stripe; sets unlock, redirects to /beauty/start (marketing testing) |
| `NEXT_PUBLIC_TEST_MODE` | `lib/runtime-mode.ts`, `lib/dry-run-config.ts`, compose, generate-image, TestModeLogger | `"1"` or `"true"` = dry image gen, deterministic overlay; Blob writes ON unless `DISABLE_BLOB_WRITES=1`; logs "TEST MODE" in console |
| `DISABLE_BLOB_WRITES` | `lib/runtime-mode.ts` | `"1"` or `"true"` = disable Blob writes (optional hard off; even in TEST_MODE) |
| `NEXT_PUBLIC_SITE_URL` | `app/layout.tsx`, beauty view | Canonical/OG base URL (default `https://ligs.io`) |
| `NEXT_PUBLIC_VERCEL_URL` | `app/beauty/view/page.jsx`, `BeautyViewClient.jsx` | Base URL when deployed on Vercel |
| `VERCEL_URL` | API routes (origin for internal fetch / redirects) | Server-side base host (no protocol); code uses `https://${VERCEL_URL}` |
| `OPENAI_API_KEY` | `/api/engine`, `/api/engine/generate`, `/api/beauty/demo`, `/api/generate-image`, `/api/voice/generate`, `/api/image/generate` | GPT-4o and DALL·E 3 |
| `DRY_RUN` | `/api/engine` (and script) | `"1"` = mock report, no OpenAI |
| `ALLOW_EXTERNAL_WRITES_IN_DEV` | `lib/runtime-mode.ts` | `"1"` = allow Blob/OpenAI writes in dev (test image generation locally) |
| `ALLOW_EXTERNAL_WRITES` | `/api/voice/generate`, `/api/image/generate`, `/api/image/compose` | `"true"` = real LLM/image calls; otherwise dry-run. Server-side only; never client-controlled. |
| `BRAND_LOGO_PATH` | `/api/image/compose`, `/api/ligs/status` | Path to brand logo image for compositing. Required for live compose unless `ENABLE_PLACEHOLDER_LOGO=true`. |
| `ENABLE_PLACEHOLDER_LOGO` | `/api/image/compose`, `/api/ligs/status` | `"true"` = use "(L)" SVG placeholder when BRAND_LOGO_PATH missing. Default false. Demo-safe. |
| `BLOB_READ_WRITE_TOKEN` | `lib/report-store.ts`, `lib/beauty-profile-store.ts` | Vercel Blob for reports, beauty profiles, images; if unset, reports in-memory, beauty profiles unavailable (E.V.E. still needs Blob for production) |
| `STRIPE_SECRET_KEY` | `/api/stripe/create-checkout-session`, `/api/stripe/webhook` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Webhook signature verification |
| `RESEND_API_KEY` | `/api/email/send-beauty-profile` | Resend (preferred if set) |
| `SENDGRID_API_KEY` | `/api/email/send-beauty-profile` | SendGrid fallback |
| `EMAIL_FROM` | `/api/email/send-beauty-profile` | From address (default `Beauty <onboarding@resend.dev>`) |
| `NODE_ENV` | Report 404 debug, engine quota detail, form dev defaults, `/api/dev/live-once` 403 guard | Development vs production behavior |
| `DEBUG_PROMPT_AUDIT` | `/api/engine/generate` | `"1"` = log PROMPT_AUDIT (hasHardConstraints, hasForbiddenList, hasBirthContext, head) before OpenAI call |
| `DEBUG_PERSISTENCE` | `/api/engine/generate` | `"1"` = when Blob write fails, return 200 with UNSAVED reportId and full_report (dev fallback) |

**Required for full production:**

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN` (required for Beauty flow and persisted reports)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (for paid Beauty)
- One of `RESEND_API_KEY` or `SENDGRID_API_KEY` (for post-purchase email)

---

## 4. Vercel configuration

| File | Content |
|------|--------|
| `vercel.json` | `{ "framework": "nextjs" }` |
| `.vercel/` | Vercel project metadata (generated by CLI/linking) |

**Docs:** `VERCEL_ENV_SETUP.md` — Root Directory (empty or `ligs-frontend`), DNS for www, adding `BLOB_READ_WRITE_TOKEN` in Vercel env vars.

---

## 5. Build pipeline

| Script | Command | Purpose |
|--------|--------|---------|
| `dev` | `next dev --webpack` | Local dev |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server |
| `lint` | `eslint` | Lint |
| `test` | `vitest` | Watch mode tests |
| `test:run` | `vitest run` | Single run tests |
| `simulate:landing` | `node scripts/simulate-landing-dry-run.mjs` | Offline mock of engine + beauty dry-run (no HTTP) |
| `simulate:beauty` | `node scripts/simulate-beauty-landing.mjs` | HTML snapshot of /beauty in DRY_RUN (no server, no network) |

**Config:**

- `next.config.ts`: `reactStrictMode: false` (avoids dev double-mount flicker).
- `tsconfig.json`: `@/*` → project root; JS allowed.
- `eslint.config.mjs`, `postcss.config.mjs`: ESLint and Tailwind/PostCSS.

---

## 6. Integration points

### 6.1 Internal flow (server-side)

```
Landing (engine)     → POST /api/engine/generate → saveReportAndConfirm → GET /api/report/[reportId]
Landing (E.V.E.)     → POST /api/engine → POST /api/engine/generate → GET /api/report/[reportId] → OpenAI E.V.E. → saveBeautyProfileV1
Beauty form          → POST /api/beauty/create → POST /api/engine (same chain)
Stripe success       → Webhook POST /api/stripe/webhook → loadBeautyProfileV1 → POST /api/email/send-beauty-profile
```

### 6.2 External services

| Service | Use |
|---------|-----|
| **OpenAI** | GPT-4o (report, image prompts, vector zero, E.V.E. filter), DALL·E 3 (images) |
| **Wikimedia/Wikipedia** | On-this-day API (api.wikimedia.org, fallback en.wikipedia.org REST) — factual world history context for report prompts; free, no API key; 24h cache |
| **Vercel Blob** | Reports `ligs-reports/{reportId}.json`, Beauty V1 `ligs-beauty/{reportId}.json`, images `ligs-images/{reportId}/{slug}.png|jpg` |
| **Stripe** | Checkout Session, webhook `checkout.session.completed` |
| **Resend or SendGrid** | Post-purchase email with view link and optional image |

### 6.3 Storage summary

| Data | Storage | Condition |
|------|---------|-----------|
| Light Identity Report | Blob or in-memory | Blob if `BLOB_READ_WRITE_TOKEN` set |
| Beauty Profile V1 | Blob only | Fails if token not set (E.V.E. and Stripe flow need Blob in prod) |
| Generated images | Blob | Same token; optional in generate-image (falls back to temp URL) |

### 6.4 Rate limiting

- In-memory, per-IP: `lib/rate-limit.ts`.
- **beauty/create:** 5 req / 60s.
- **beauty/[reportId]:** 20 req / 60s.
- Doc notes: replace with Upstash/Vercel KV for production.

---

## 7. Quick verification checklist

- [ ] **Env:** `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN` set in Vercel (and locally if testing full flow).
- [ ] **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook URL points to `/api/stripe/webhook`.
- [ ] **Email:** One of `RESEND_API_KEY` or `SENDGRID_API_KEY`; `EMAIL_FROM` if custom.
- [ ] **Root directory:** Vercel project root = repo root (or `ligs-frontend` per `VERCEL_ENV_SETUP.md`).
- [ ] **Landing:** `/` loads landing; form can submit to engine or E.V.E.
- [ ] **Beauty:** `/beauty` → create profile → checkout → success → email with link to `/beauty/view?reportId=…`.
- [ ] **Reports:** `GET /api/report/debug` shows storage type and test pattern; `GET /api/report/{reportId}` returns report after engine run. **Monitoring:** Alert on log message `REPORT_NOT_FOUND` (or response `code: "REPORT_NOT_FOUND"`) to catch persistence gaps. See **docs/REPORT-PERSISTENCE-ALERTING.md** for verification steps and how to enable alerting.
- [ ] **Dry run:** `DRY_RUN=1` skips OpenAI and returns mock report from `/api/engine`.

This snapshot reflects the codebase as of the first-time scan. Update it when you add routes, env vars, or integrations.

---

## Verification Log – 2026‑02‑20 (Previews response shape)

**Previews API:** GET `/api/report/previews` returns `{ previewCards, status, requestId }` at top level for spec compliance. Client (`fetchBlobPreviews`) reads `json?.data?.previewCards ?? json?.previewCards`.

## Verification Log – 2026‑02‑25 (Hard cutover: single Beauty landing)

**Single entrypoints:** `/` redirects to `/beauty`. `/beauty` renders only `BeautyLandingClient`. Removed `app/LandingPage.jsx`, `app/report-storage-test/page.jsx`, `app/api/beauty/demo/route.ts`. Dev section in BeautyLandingClient never renders in production (`NODE_ENV !== "production"` guard). `LightIdentityForm` supports `hideSubmitButton`, `onFormDataChange` for parent-controlled CTA. Previews: single source `GET /api/report/previews` returns `{ previewCards }`; BeautyLandingClient uses `fetchBlobPreviews`; 6 exemplar samples + blob previews.

---

## Verification Log – 2026‑02‑20 (Task 14: Birth form routing)

**Birth form moved to /beauty/start:** /beauty is now sales-only (Hero, What is LIGS, Why it matters, How it works, Examples, $39.99 CTA). Form removed. New route /beauty/start: requires unlocked; redirects to /beauty if not. Submit → engine; on success → /beauty/view?reportId=…. TEST_MODE/FAKE_PAY bypass redirects to /beauty/start. PayUnlockButton, PreviewCardModal, success page (pre-purchase link) updated to /beauty/start.

---

## Verification Log – 2026‑02‑25 (Logo Path A – archetype monogram)

**Typographic "(L)" monogram driven by archetype logo tokens:** Extended `MarketingOverlaySpec` styleTokens with optional `logoStyle` (text, weight, tracking, opacity, blur, glow, radius, fill, stroke, circleFill, circleStroke). `getLogoStyleForArchetype()` maps archetype→logo tokens (Stabiliora subtle, Ignispectrum bold+glow, Radiantis luminous, Tenebris heavy, Precisura stroke, default balanced). `buildOverlaySpecWithCopy` and `generateOverlaySpec` set logoStyle. DRY: `renderDryComposeFromSpec` applies logo tokens (circleFill/circleStroke, weight, opacity, glow, fill, stroke) to the "(L)" in the logo placement box. LIVE: `createMonogramLogoSvg(overlaySpec)` builds spec-driven SVG instead of fixed placeholder; same placement. `getLogoStyleWithDefaults()` for backward compatibility. No image generation; no /api/marketing/visuals.

## Verification Log – 2026‑02‑20 (Task 10: Deterministic marketing card in TEST_MODE)

**Zero-paid-calls marketing card:** When TEST_MODE, allowExternalWrites=false, or bodyDryRun: engine route (and beauty/dry-run) create `marketing_card.png` using local composition only. `buildMinimalVoiceProfile` → `buildOverlaySpecWithCopy` → `createArchetypeGradientSvgBuffer` → `composeMarketingCardToBuffer` → save to Blob. New: `lib/marketing/minimal-profile.ts`, `lib/marketing/gradient-background.ts`, `lib/marketing/compose-card.ts`. verify-report requires hasMarketingCard when TEST_MODE.

---

## Verification Log – 2026‑02‑25 (DRY compose style-engine layout)

**LIGS Studio DRY compose uses style engine:** `buildOverlaySpecWithCopy(profile, options, copy)` in `src/ligs/marketing/generateOverlaySpec.ts` builds MarketingOverlaySpec synchronously with custom copy (no LLM), including archetype-derived logoStyle (weight, opacity, glow, circleFill, circleStroke, etc.). LigsStudio DRY: Simulate Compose and Re-render Compose use this spec + `renderDryComposeFromSpec()` (canvas) to render background + textBlock (headline/subhead) + ctaChip + logo "(L)" with logo tokens applied. Overlay Spec collapsible panel shows spec JSON + Copy. No network, no /api/image/compose, no paid calls.

**Unified DRY and LIVE compose:** POST `/api/image/compose` accepts optional `overlaySpec`. If provided, validate and use directly (no regeneration). LigsStudio LIVE Compose and Full Pipeline send overlaySpec (dryOverlaySpec from DRY or buildOverlaySpecWithCopy from overlay draft) so LIVE output matches DRY preview layout exactly.

----

## Verification Log – 2026‑02‑20 (Task 5: Pay-first flow)

**Pay-first enforcement:** `lib/landing-storage`: `setBeautyUnlocked()`, `isBeautyUnlocked()`. BeautyLandingClient: when !unlocked → CTA block, form hidden; when unlocked → form visible. dryRun bypasses paywall.

---

## Verification Log – 2026‑02‑20 (Task 6b + Task 8: TEST_MODE UX)

**NEXT_PUBLIC_TEST_MODE=1:** When set: forces dryRun for image generation (generate-image returns placeholder SVG, no DALL·E); forces deterministic overlay copy (compose uses getDefaultOverlayCopy, not LLM); Blob writes ON by default so /beauty/view works end-to-end. **DISABLE_BLOB_WRITES=1:** Optional hard off for Blob writes. `allowBlobWrites` = false only when DISABLE_BLOB_WRITES=1.

---

## Verification Log – 2026‑02‑20 (Task 6: Fake Pay mode)

**NEXT_PUBLIC_FAKE_PAY=1:** When set, clicking $39.99 CTA (or PayUnlockButton / PreviewCardModal Proceed) does NOT call Stripe. Instead: setBeautyUnlocked(), redirect to /beauty/start, console.log("FAKE PAY MODE – no charge made"). FAKE_PAY in `lib/dry-run-config.ts`.

---

## Verification Log – 2026‑02‑20 (Task 5.2: Verify before unlock)

**Minimum viable paywall:** create-checkout-session success_url now uses `/beauty/success?session_id={CHECKOUT_SESSION_ID}`. New GET `/api/stripe/verify-session?session_id=…`: retrieves Stripe session, returns `{ paid: true, reportId?, prePurchase? }` only when `payment_status === "paid"`. Success page: reads session_id, calls verify-session; if paid → setBeautyUnlocked(), shows Unlocked (pre-purchase) or View Report (report checkout); if not paid/missing → error + link back to /beauty. Removed ?unlocked=1 URL bypass. No other behavior unlocks the form.

---

## Verification Log – 2026‑02‑20 (Task 4: Get your Light Signature CTA)

**Get your Light Signature block:** CTA section on /beauty (id="get-signature"). Title "Get your Light Signature"; 3 bullets; price $39.99; primary button "Generate my Light Signature" → Stripe pre-purchase (or TEST_MODE/FAKE_PAY bypass → /beauty/start). Secondary link "See examples" → #examples.

---

## Verification Log – 2026‑02‑20 (Task 3: Examples gallery)

**Landing Examples gallery:** Added 6 exemplar PNGs in `public/exemplars/` (stabiliora, ignispectrum, radiantis, tenebris, precisura, fluxionis). `lib/exemplar-cards.ts` exports `EXEMPLAR_CARDS` array (preview-card shape). Script `scripts/generate-exemplar-placeholders.mjs` regenerates PNGs. **Task 3b:** Examples section always shown first (id="examples"); Previous Light Identity Reports only when blob previews non-empty.

---

## Verification Log – 2026‑02‑20 (Task 2: Customer-facing cleanup)

**ArtifactInfoPanel:** `showDevFields?: boolean` (default false). When false: hide schemaVersion, engineVersion, and reportId row entirely. ArchetypeArtifactCard accepts and forwards showDevFields.

**LigsStudio LIVE Results panel:** Composed image (if compose ran), background image (if generate ran), overlaySpec JSON (collapsible), Open Viewer link. "No results yet" only when no lastReportId, imageResult, or composeResult.

**LigsStudio DRY mode:** Placeholder preview labeled "Layout preview only"; replaced "Use LIVE mode…" nag with short note "LIVE mode shows actual generated images and composed output."

---

## Verification Log – 2026‑02‑20 (Live E2E test pipeline)

**Live Beauty E2E test:** Added `lib/preflight.ts` (runPreflight). Dev routes: GET `/api/dev/preflight`, POST `/api/dev/beauty-live-once`, GET `/api/dev/verify-report?reportId=`. BeautyLandingClient: dev-only "LIVE TEST RUN (save to blob)" button; preflight → beauty-live-once → verify-report → navigate to `/beauty/view`. Single run per server process. Checklist: DRY_RUN unset, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, ALLOW_EXTERNAL_WRITES_IN_DEV=1 (dev).

---

## Verification Log – 2026‑02‑20 (Archetype Artifact + DRY_RUN)

**Archetype Artifact presentation layer:** Added `ArchetypeArtifactCard` (hero image + center overlay + left info panel), `ArchetypeNameOverlay`, `ArtifactInfoPanel`, `ArtifactCompare`. Uses beauty-theme tokens (artifact-scrim, overlay-blur, panel-bg). Data from profile: archetype, variationKey, dateTime, location, solarAzimuth, lightSeasonSegment, colorFamily, textureBias; missing fields render as "—". Integrated: BeautyViewClient (Archetype Artifact section before carousel), LigsStudio (Compare Runs, Composed Card, Background). **DRY_RUN client guard:** `lib/dry-run-config.ts` (NEXT_PUBLIC_DRY_RUN); LigsStudio guards all generate/verify fetches; when effectiveDryRun: build payload, show Dry Run Preview panel (collapsed), banner "DRY RUN: No request was sent.", exit without sending. Skip status fetch when DRY_RUN env set. `.env.example` documents NEXT_PUBLIC_DRY_RUN.

**View Artifact UI without generation:**
- Beauty: `/beauty/view?reportId=dry-run-view&dryRun=1` (404 + dryRun → placeholder profile with artifact layout).
- LigsStudio: `/ligs-studio` with `NEXT_PUBLIC_DRY_RUN=1`; Generate 6 Variations in LIVE mode once to populate Compare Runs, then artifact cards appear.

---

## Verification Log – 2026‑02‑20

**Marketing Visuals slice:** POST `/api/marketing/visuals` wrapper calls image/generate twice (marketing_logo_mark, marketing_background). `lib/marketing/visuals.ts`: buildLogoMarkPrompt, buildMarketingBackgroundPrompt, archetypeStyle mapping, unknown fallback. buildImagePromptSpec extended for marketing purposes; variationKey encodes contrastDelta (cd0.15) and raw archetype (raw_X) for unknowns. Normalizes via pickBackgroundSource. Returns logoMark?, marketingBackground?, warnings[]. Unit + route tests.

**Marketing Composer layer:** Added archetype-driven marketing: `lib/marketing/types.ts` (MarketingDescriptor, MarketingAssets), `descriptor.ts` (deterministic archetype→label, tagline, hitPoints, CTA), `prompts.ts` (buildMarketingImagePrompts for logo mark + header background), `minimal-profile.ts` (for future use). POST `/api/marketing/generate` accepts `primary_archetype`, returns `{ descriptor, assets }`; calls image provider when ALLOW_EXTERNAL_WRITES; DRY_RUN returns descriptor only. `MarketingHeader` component; LigsStudio: Generate Marketing + Show Marketing Layer toggle. contrastDelta (0–1) for marketing-surface clarity lift. docs/MARKETING-LAYER.md. Unit + route tests.

**LigsStudio comparison mode:** Generate 6 Variations pushes result set to `variationHistory` (max 2 entries). Compare Runs section: two columns—left (previous run), right (current run); each labeled with primary_archetype and variationKey. Session-only, no persistence. UI only.

**LigsStudio Full Pipeline compose payload fix:** After image/generate returns `images[0]` as `{ url }` object, the compose payload was sending `background.url` as the whole object instead of the string. Added `lib/ligs-studio-utils.ts` with `pickBackgroundSource(imageResult)` (handles images[0].url, images[0].b64, images[0] string, image.url, image.b64) and `backgroundToInputString(bg)`. LigsStudio now normalizes generate response into string-only values; compose body uses `background: { url }` or `background: { b64 }` with strings. On no background from generate, shows "No background returned from image/generate" and does not call compose. Background input field stores strings only. Status panel already shows compose dryRun and overlayValidation. Unit tests in `lib/__tests__/ligs-studio-utils.test.ts`.

**LIGS Studio:** Added internal `/ligs-studio` page and `LigsStudio` component. Two-column layout (inputs left, previews right); VoiceProfile JSON (Stabiliora prefill), purpose, variationKey, size 1024|1536, background paste. Actions: Generate Background (POST /api/image/generate), Compose Marketing Card (POST /api/image/compose), Run Full Pipeline, Generate 6 Variations. Output: background/composed previews, imageSpec/overlaySpec JSON panels, status box (requestId, dryRun, score, pass, cacheHit). localStorage persistence, Copy payload/response. Profile validation via safeParseVoiceProfile.

---

## Verification Log – 2026‑02‑20 (Sun/Moon birth context)

**Sun/Moon birth context:** Added `lib/astronomy/computeSunMoonContext.ts` with `computeSunMoonContext(lat, lon, utcTimestamp, timezoneId)` — computes Sun altitude/azimuth, twilight phase (day/civil/nautical/astronomical/night), sunrise/sunset (local), day length; Moon altitude/azimuth, phase name, illumination. Uses astronomy-engine (Equator, Horizon, Illumination, MoonPhase, SearchRiseSet) and luxon for timezone conversion. No external APIs. `POST /api/beauty/submit` calls it after deriveFromBirthData, attaches sun + moon to birthContext; on failure logs warning and continues without sun/moon. Engine `buildBirthContextBlock` includes concise Sun and Moon sections when present. Tests: computeSunMoonContext (twilightPhase, illuminationFrac, altitudes, sunrise/sunset); buildReportGenerationPrompt (Sun/Moon sections when present).

---

## Verification Log – 2026‑02‑20 (On This Day context)

**On this date in world history:** Added `lib/history/onThisDay.ts` with `getOnThisDayContext(month, day, lang)` — fetches from Wikimedia/Wikipedia on-this-day API (primary: api.wikimedia.org, fallback: wikipedia.org REST). Curation: up to 4 events, then 1–2 from births or holidays; max 6 items; truncate text to ~140 chars; deduplicate by year+text. In-memory cache keyed by `lang-MM-DD`, 24h TTL. `POST /api/beauty/submit` parses month/day from birthDate, calls `getOnThisDayContext`, attaches `birthContext.onThisDay` when non-null; skips in DRY_RUN. Engine `buildBirthContextBlock` appends "On this date (world history context):" bullets when `onThisDay` exists. Types: `OnThisDayItem`, `OnThisDayContext`, `BirthContextPayload` in validate-engine-body. Fetch failures omit block silently. Tests: `lib/history/__tests__/onThisDay.test.ts` (≤6 items, truncation, fallback, caching, null on failure); `buildReportGenerationPrompt.test.ts` (includes block only when onThisDay present).

---

## Verification Log – 2026‑02‑20 (Archetype contract)

**Single source of truth archetype contract:** Added `src/ligs/archetypes/contract.ts` with canonical `ArchetypeContract` (voice, visual, marketingDescriptor, marketingVisuals, copyPhrases), `ArchetypeContractMap`, `ARCHETYPE_CONTRACT_MAP` for all 12 archetypes, `NEUTRAL_FALLBACK` (neutral/premium/minimal), `getArchetypeContract`, `getArchetypeOrFallback`. Added `src/ligs/archetypes/adapters.ts` with per-archetype adapters: `getArchetypeVisualMapShape`, `getArchetypeVoiceAnchorShape`, `getMarketingDescriptor`, `getOverlayCopyBank`, `getMarketingVisuals`, `getVisualMapRecord`, `getVisualParamsOrFallback`. Migrated `lib/marketing/descriptor.ts` and `lib/marketing/visuals.ts` to read from adapters; external exports unchanged. **Unified unknown-archetype fallback behavior for image prompts to NEUTRAL_FALLBACK:** `buildImagePromptSpec` now uses `getVisualParamsOrFallback()` instead of `ARCHETYPE_VISUAL_MAP.Stabiliora`; unknown archetypes (e.g. `raw_UnknownArchetype` in variationKey) receive NEUTRAL_FALLBACK.visual. Tests: 6 contract, 14 adapter (incl. getVisualParamsOrFallback, getVisualMapRecord), imagePromptSpec marketing fallback. No runtime behavior change for known archetypes.

**Legacy archetype maps now derive from canonical contract to prevent drift:** `archetype-visual-map.ts`, `archetypeAnchors.ts`, `archetype-copy-map.ts` are thin re-exports from adapters (`getVisualMapRecord`, `getVoiceAnchorRecord`, `getOverlayCopyRecord`). DO NOT EDIT headers on each file point to contract.ts. Added legacy-derivation.test.ts (6 tests) asserting deep equality for all 12 archetypes and Stabiliora. Exported shapes unchanged.

---

## Verification Log – 2026‑02‑24 (Birth Context + Forwarding)

**Birth context now influences LLM report:** `lib/astrology/deriveFromBirthData.ts` extended with geo-tz (IANA timezone from lat/lon) and luxon (local→UTC conversion). Returns timezoneId, utcTimestamp, localTimestamp, placeName, lat, lon; solar (altitude, azimuth, aboveHorizon, twilightPhase, sunrise/sunset); lunar (phaseName, illuminationFrac, aboveHorizon); sun_sign, moon_sign, rising_sign. `POST /api/beauty/submit` passes birthContext to engine; engine route forwards birthContext to engine/generate; engine/generate injects "Birth Context" factual block into prompt when present. No new providers (NOAA etc.). Tests: deriveFromBirthData (integration), engine route forwarding, buildReportGenerationPrompt Birth Context block.

---

## Verification Log – 2026‑02‑24 (Full Output Viewer)

**LigsStudio Full Output Viewer:** Added `StudioRunResult` type and `LatestRunOutputPanel` with: summary row (mode, reportId, savedToBlob, warnings), accordions for Full Report (with Copy), Snippet + Vector Zero, Image Prompts, Images, Meta, Persistence Verification. "Verify saved to Blob" button → POST `/api/dev/verify-saved` with reportId. Added `app/api/dev/verify-saved/route.ts` (dev-only, 403 in production): UNSAVED returns ok:false/reason:unsaved; else getReport; returns ok:true with keys/full_report_length when found. Run LIVE ONCE now populates studioRunResult and displays full output. Unit tests for verify-saved (403, UNSAVED, found, not_found).

----

## Verification Log – 2026‑02‑24 (Constraint Gate)

**Post-generation Constraint Gate for full_report:** Added `lib/engine/constraintGate.ts` with `FORBIDDEN_PATTERNS` (chakra, sushumna, anahata, ajna, kabbalah, sefirot, tree of life, sacred geometry, phi, golden ratio, axis mundi, alchemy, hermetic, as above so below, schumann, venusian, saturnine, jupiterian, piscean, fibonacci, ancient traditions, legends hold, esoteric anatomy), `scanForbidden(text)`, `redactForbidden(text, keys)`. Engine/generate: after report parse, scans full_report; if hits > 0: dev console.warn FORBIDDEN_HITS, runs one repair OpenAI call (same structure, remove concepts, factual tone), replaces full_report; re-scans; if hits remain, redacts in dev. Non-production response includes `meta.forbiddenHitsDetected` when repair triggered. Unit tests: scanForbidden, redactForbidden. Route test: mock first output with "chakra", repair returns clean report, final output has no "chakra" and meta.forbiddenHitsDetected.

----

## Verification Log – 2026‑02‑24 (Live Test / LIVE ONCE)

**LigsStudio Live Test (costs money):** Added POST `/api/dev/live-once` (dev-only, 403 in production). Rate limit: 1 request per server process (429 on second call). Body: fullName, birthDate, birthTime, birthLocation, email?. Forwards to engine/generate with `X-Force-Live: 1` header (bypasses DRY_RUN). Engine/generate respects `X-Force-Live: 1` to force live run. LigsStudio: "Live Test" section with inputs, confirm dialog, "Run LIVE ONCE" button, renders JSON in \<pre\>. Set `DEBUG_PROMPT_AUDIT=1` to log PROMPT_AUDIT in terminal. Unit tests: 403 when NODE_ENV=production, 429 on second call.

----

## Verification Log – 2026‑02‑24 (UNSAVED reportId inline fix)

**BeautyLandingClient uses inline report data when available:** When submit response contains `beautyProfile` (dry-run) or `full_report`/`emotional_snippet` (submit fallback), the client now populates `result` and `fullReport` from the response and skips `GET /api/report/[reportId]`. Fixes 404 when Blob write fails and engine/generate returns `reportId: "UNSAVED:xxx"` with `full_report` in body. `handleViewFullReport` skips fetch for `UNSAVED:` reportIds when `fullReport` is already in state. SYSTEM_SNAPSHOT BeautyLandingClient description updated.

----

## Verification Log – 2026‑02‑24 (Birth Context Inventory)

**docs/BIRTH-CONTEXT-INVENTORY.md:** Read-only inventory of birth-data derivation. Entry points (Beauty submit, engine, engine/generate); derived fields (lat/lon via Nominatim, sun/moon/rising via astronomy-engine in deriveFromBirthData); external calls (Nominatim only for birth context; no weather/space-weather); caches (Blob, image LRU—no geo/astrology cache); output shape (sun/moon/rising computed but not forwarded to engine/generate); gaps vs BirthContext schema (timezone, solar/lunar context, weather, space weather, elevation). Only POST /api/beauty/submit runs deriveFromBirthData.

---

## Verification Log – 2026‑02‑24

**Legacy archetype maps now derive from canonical contract to prevent drift:** `archetype-visual-map.ts`, `archetypeAnchors.ts`, `archetype-copy-map.ts` are thin re-exports from adapters (`getVisualMapRecord`, `getVoiceAnchorRecord`, `getOverlayCopyRecord`). DO NOT EDIT headers on each file state ARCHETYPE_CONTRACT_MAP is canonical; edit contract.ts only. `legacy-derivation.test.ts` (6 tests) asserts deep equality for Stabiliora and all 12 archetypes. Exported shapes unchanged.

**Archetype Voice Block in engine report:** Added `buildReportGenerationPrompt(birthData, archetype?)` in `app/api/engine/generate/route.ts`. Imports `getArchetypeOrFallback` from contract; appends Archetype Voice Block (emotional_temperature, rhythm, lexicon_bias, metaphor_density, assertiveness, structure_preference, notes) to the report user prompt. Instructs LLM to shape emotional_snippet and ORACLE phrasing by these parameters. Optional `archetype` in EngineBody (validate-engine-body); defaults to Stabiliora when absent. Output schema unchanged. Unit test: `buildReportGenerationPrompt.test.ts` asserts voice block present for Stabiliora.

---

## Verification Log – 2026‑02‑23

**Glyph Field Renderer prompt builder:** Added `lib/marketing/glyphField.ts` with `buildGlyphFieldPrompt(archetype, contrastDelta?)` for the canonical "(L)" glyph. SECTION 1 (fixed glyph, topology, legibility); SECTION 2 (archetype field distortion from contract: palette, mood, materials, lighting, flow_lines, marketingVisuals). Deviation Budget: HIGH for expressive archetypes (emotional_temperature high or flow_lines present), LOW for stable. Hard constraints: no extra text, no zodiac, no corporate badge, no creatures. `getGlyphFieldNegative()` for negative prompt. Unit tests in `lib/marketing/__tests__/glyphField.test.ts`. No API changes.

**LIGS Studio Warning Lights:** Added GET `/api/ligs/status` returning `{ allowExternalWrites, provider, logoConfigured, logoFallbackAvailable }`. LigsStudio fetches on mount and displays Warning Lights: Mode (LIVE/DRY_RUN), Provider, Logo (brand/placeholder (L)/missing), Cache, Request, Error.

**Placeholder logo for compose:** When BRAND_LOGO_PATH missing and ENABLE_PLACEHOLDER_LOGO=true, compose uses "(L)" SVG (system sans, bold, centered circle). Same placement (br, paddingPct, maxWidthPct). Response includes logoUsed: "brand"|"placeholder". Without placeholder: 400 BRAND_LOGO_REQUIRED. 3 new compose tests.

**Fixed TS error in beauty report route:** Cast `BeautyProfileV1` via `unknown` when passing to `enrichProfileImages(Record<string, unknown>)` to satisfy TS2352 (index signature overlap). No runtime change.

**Fixed beauty dry-run route; build/typecheck green:** Cast `birthData` to `Record<string, unknown>` for validateEngineBody input; extended engine-response type with top-level `reportId`, `full_report`, `emotional_snippet` for API shape variants. No runtime change.

**Fixed image generate route TS/build; build green:** Align `ParseResult.image` type with Zod `ImageSchema` inferred types (`aspectRatio`, `size` as literal unions) in `generate-request-schema.ts`; satisfies `buildImagePromptSpec` options. No runtime change.

**Fixed voice generate route TS/build; voice route typecheck green:** Cast `parsed.data.profile` to `VoiceProfile` (schema transform output not narrowly inferred); add explicit response type with optional `validationBefore`/`validationAfter`. No runtime change. Overall build still blocked by other routes (LigsStudio, etc.).

**Fixed LigsStudio build issue; overall build green:** Typed fetch responses with assertions for `image.b64`, `variationImages`, `validation`/`overlayValidation`; replaced `parseProfile` setState-during-render loop with `useMemo`-derived `{ profile, profileError }`; fixed PayUnlockButton response type (`url` at top level); image schema `ImageInfer` manual type (z.infer not available in Zod v4); voice schema profile validation moved to parse function; marketing regex `s` flag replaced with `[\s\S]`; voice index `export type` for isolatedModules.

**1:1 Square Marketing Card compositor:** Vertical slice with `square_card_v1` template. templates.ts: ONE template (safeArea, logo br, textBlock, ctaChip). schema.ts: MarketingOverlaySpec (copy headline/subhead/cta, placement, styleTokens, constraints). generateOverlaySpec: LLM copy when allowExternalWrites, else deterministic from archetype phrases. validateOverlaySpec: banned words, medical claims, guarantees, lengths. POST `/api/image/compose`: Zod request (profile, background url|b64, purpose, templateId, output.size); server gating; sharp compose (background + logo + SVG text + CTA chip); PNG output. BRAND_LOGO_PATH env. 7 route tests, 8 overlay tests.

**Marketing Overlay Engine:** Added `src/ligs/marketing/` with `MarketingOverlaySpec` schema (copy, placement, styleTokens, constraints), static templates per templateId + aspectRatio, `buildOverlayPromptPack()`, `generateOverlaySpec()` (deterministic copy from archetype phrase banks, placements from templates), `validateOverlaySpec()`. 8 tests.

**image/generate production hardening:** ALLOW_EXTERNAL_WRITES server-only (DRY_RUN when false, providerUsed: null). Request validation: profile via safeParseVoiceProfile (VOICE_PROFILE_INVALID), purpose 3–100, image (aspectRatio, size "1024"|"1536", count 1–4), variationKey? max 200, archetype?. Deterministic LRU cache (cache.ts, max 200) keyed by sha256. Denylist (denylist.ts) for prompts. Provider (provider.ts) with documented size mapping. Response includes cacheHit. Logs extended. 10 route tests.

**Image Prompt Spec module (v2):** Rewrote `src/ligs/image/` schema and builders. Schema now includes: `purpose`, `style.palette` (string[]), `style.materials` (string[]), `style.texture_level`/`contrast_level` enums; `composition.symmetry`/`negative_space`/`flow_lines` enums; `constraints` with `no_figures`, `no_astrology`, `safety_notes?`; `output.count` (1–4), `output.size` "1024"|"1536"; `variation` (variationId, motifs, randomnessLevel). `buildImagePromptSpec(profile, { purpose, aspectRatio?, size?, count?, archetype?, variationKey? })` generates deterministic motifs from hash(profile.id + purpose + variationKey). `validateImagePromptSpec` fails on missing/false constraints and disallowed tokens in positive prompt; score = 100 − 25×errors − 5×warnings. API request schema `image.size` restricted to "1024"|"1536". Tests: `src/ligs/image/__tests__/imagePromptSpec.test.ts` (13 tests). Route test updated for size "1536".

---

## Verification Log – 2026‑02‑20 (marketing card DRY_RUN)

**Marketing card DRY_RUN simulation:** Added no-cost test path for the Beauty marketing card pipeline. When `bodyDryRun`, `!allowExternalWrites`, or `DRY_RUN=1`: engine route and beauty/dry-run create a 1024×1024 placeholder PNG (sharp) with "MARKETING CARD (DRY RUN)", archetype, reportId; save to `ligs-images/{reportId}/marketing_card.png`; set `payload.marketingCardUrl` and re-save profile. `lib/marketing-card-placeholder.ts` provides `createMarketingCardPlaceholderPng`. Logs: `marketing_card_dryrun_created`, `marketing_card_saved`. `/beauty/view` renders marketing card section when `profile.marketingCardUrl` exists. `GET /api/beauty/[reportId]` enriches with `marketingCardUrl` from Blob when missing from profile. `verify-report` adds `hasMarketingCard` check; required when DRY_RUN=1. New `GET /api/dev/verify-marketing-card?reportId=X` checks blob exists. No paid API calls.

---

## Verification Log – 2026‑02‑21

**POST /api/image/generate (production hardening):** Server-only ALLOW_EXTERNAL_WRITES (no client control). Request schema: profile (validated via safeParseVoiceProfile), purpose (3–100), image (aspectRatio, size "1024"|"1536", count 1–4), variationKey? (max 200), archetype?. 400 IMAGE_REQUEST_INVALID for invalid body; 400 VOICE_PROFILE_INVALID for invalid profile; 400 IMAGE_SPEC_INVALID on spec validation fail. Deterministic LRU cache (src/ligs/image/cache.ts, max 200 entries) keyed by sha256(profile.id+version+purpose+aspectRatio+size+count+archetype+variationKey). Denylist pass (no brand/trademark in prompts). Provider in src/ligs/image/provider.ts; DALL-E 3 size mapping documented. Response includes cacheHit. DRY_RUN returns providerUsed: null. Logs: requestId, profileId, archetype, purpose, size, count, score, pass, dryRun, providerUsed, cacheHit. 10 route tests (invalid body/profile, DRY_RUN, cache hit, spec invalid).

**Image Prompt Spec module:** Added `src/ligs/image/` with `ImagePromptSpec` schema (style, composition, constraints, output, prompt), `buildImagePromptSpec(profile, options)` driven by VoiceProfile + archetype visual map, `validateImagePromptSpec(spec)` with pass/score/issues. Strict exclusions: no faces, text, logos, watermarks, astrology icons, trademarks. 9 tests.

**Voice Profile Builder UI:** Added `components/VoiceProfileBuilder.jsx` (5-step wizard: archetype, descriptors, banned words, claims policy, channel adapters) and `app/voice/page.jsx`. Builds VoiceProfile, validates with `safeParseVoiceProfile`, shows `zodToVoiceEngineError` inline; stores result in local state only.

**Voice generate production hardening:** Schema .strict() rejects allowExternalWrites. `ALLOW_EXTERNAL_WRITES === "true"` for real LLM. Prompt: task delimiter block, anti-injection system rule, rewrite ends "No commentary." Observability: requestId, log(profileId, version, channel, score, didRewrite, modelUsed, dryRun). Deterministic: temp 0.2, max_tokens, enforceWordCap. Response: requestId, dryRun, modelUsed, didRewrite. Route integration tests: invalid body/profile/channel, rewrite, chosen logic. vitest.config.ts for @/ alias.

**Voice generate request schema:** Added `src/ligs/voice/api/generate-request-schema.ts` — Zod schema for POST body (profile, task, channel, constraints, minScore); `parseGenerateVoiceRequest()`; route returns 400 `VOICE_REQUEST_INVALID` on failure. Request does not control `allowExternalWrites`.

**Voice generate API:** Added `POST /api/voice/generate` — takes `profile`, `task`, optional `channel`, `constraints`, `minScore`; builds prompt pack, LLM draft, validates, optionally rewrites once; returns `{ text, validation, didRewrite }`. Uses OpenAI when `allowExternalWrites`; DRY_RUN returns placeholder.

**Voice output validation:** Added `src/ligs/voice/validate/` with `validateVoiceOutput()`, `bannedWords`, `claims`, `cadence`, `formatting`, `lexicon`, `channelStructure`. Validates generated text against VoiceProfile; returns `{ pass, score, issues }`. 8 validation tests added.

**Voice prompt pack:** Added `src/ligs/voice/prompt/` with `buildPromptPack.ts` (system voice block, channel adapter, hard constraints, self-check), `archetypeAnchors.ts` (12 LIGS archetype definitions), `selfCheck.ts` (pre-final rubric). `buildPromptPack(profile, { channel? })` returns `PromptPack`; `toSystemPrompt(pack)` combines blocks. 8 prompt tests added.

**Voice Profile schema + validation:** Added `src/ligs/voice/` with Zod schema (`VoiceProfileSchema`, `parseVoiceProfile`, `safeParseVoiceProfile`), `errors.ts` (normalized `VoiceProfileError`, `fromZodError`, `toVoiceProfileError`), `normalize.ts` (non-throwing defaults + cleanup), `index.ts` barrel exports, and `__tests__/schema.test.ts` (golden sample + fail cases). New dependency: `zod`. All 20 tests pass.

**LIGS Voice Creation Engine spec:** Added `docs/LIGS-VOICE-ENGINE-SPEC.md` — canonical reference for the future brand voice profile (VProfile) system. Covers: VProfile JSON schema, pipeline (data collection UI → normalize & extract → archetype mapping → compose profile → LLM prompt pack → validation → versioning), `voice_profile.json` structure, safety/constraint rules, channel adapters. Not yet implemented; use for planning and implementation.

**Landing previews from Blob:** `/api/report/previews` now fetches from Beauty Profiles (`ligs-beauty/`) instead of reports. Lists `listBlobBeautyPathnames`, loads each profile for `subjectName`, `emotionalSnippet`, image URLs from `getImageUrlFromBlob` (vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field). Read-only; no new images or OpenAI. Mock cards when empty.

**Simulate Beauty landing (DRY_RUN):** `scripts/simulate-beauty-landing.mjs` renders an HTML snapshot of /beauty with mock preview reports, form, Results, PayUnlockButton, and 3 preview cards. No dev server, no network, no OpenAI, no Stripe. Output: JSON `{ renderedPage, previewCards, simulatedEvents, layoutSections }`. `npm run simulate:beauty`; optional `--write-html` writes to `/tmp/beauty-dry-run.html`.

**Wire PayUnlockButton + LandingPreviews to Stripe:** Both "Proceed to Checkout" buttons now POST to `/api/stripe/create-checkout-session` with `{ reportId }`. Success → redirect to Stripe test page; 404/BEAUTY_PROFILE_NOT_FOUND → show friendly error in modal. PayUnlockButton and LandingPreviews modal: disable button while pending ("Redirecting…"); show checkoutError in modal; show "Stripe test mode — no real charges". LandingPreviews: `preview-X` IDs still navigate to `#section-5`. Backend: logs `reportId` and `testMode` on session creation; logs checkout attempts (BEAUTY_PROFILE_NOT_FOUND / BEAUTY_PROFILE_READ_FAILED) for traceability. DRY_RUN reports have no Beauty Profile → checkout returns 404 and user sees friendly message.

**fix-engine-overwrite:** Removed `saveReport` call in `/api/engine` that overwrote `full_report` with `""`. Engine/generate already saves via `saveReportAndConfirm`; engine route now fetches report without overwriting. E.V.E. receives valid `full_report` and Beauty Profile creation succeeds. Added `subjectName` (fullName) and `emotionalSnippet` to Beauty Profile payload for post-purchase emails. Log `report_fetch_before_eve` for traceability.

**Landing page previews (full):** API returns `previewCards` with `subjectName`, `emotionalSnippet`, `imageUrls` (3 in order: vector_zero, light_signature, final_beauty). Cards show carousel with labeled slides; click opens modal with carousel + Proceed to checkout. Mock placeholders when Blob empty. Touch swipe on mobile. "Generate another report" clears modal via `clearSelectionTrigger`.

**Persist landing form state:** `lib/landing-storage.js` provides `saveLastFormData`, `loadLastFormData`, `clearLastFormData`. On form submit, lastFormData saved to localStorage; on load with `?reportId=` matching stored reportId, lastFormData restored so PayUnlockButton and preview modal remain visible. LightIdentityForm accepts `initialFormData` for pre-filled fields. "Generate another report" clears localStorage and resets form. Applied to both LandingPage (/) and BeautyLandingClient (/beauty). Frontend-only.

**fix-landing-page-beauty task executed (dryRun=true):** Replaced /beauty stub with full landing experience. `app/beauty/BeautyLandingClient.jsx` provides Hero, What is LIGS, Why it matters, How it works, Form, Output summary, Results section, PayUnlockButton, Footer. Form submit updates lastFormData; PayUnlockButton shown when lastFormData exists. `?dryRun=1` pre-populates placeholder result for layout verification. beauty-theme styling from layout + globals.css. No API changes (frontend only).

**Report persistence (report-store PR):** `saveReportAndConfirm` confirms Blob writes via read-after-write retries; logs `report_blob_written` on success, `report_blob_write_failed` on failure. Unit tests for `reportBlobPathname` and integration test for in-memory `saveReportAndConfirm` in `tests/report-store.test.ts`. E2E verify script `scripts/verify-report-persistence.mjs` added to CI (`.github/workflows/smoke.yml`). Alerts and metrics documented in `docs/REPORT-PERSISTENCE-ALERTING.md` (Alert 1: report_blob_write_failed; Alert 2: REPORT_NOT_FOUND without report_blob_written in 60s; Metric: reports.persistence.success_rate).

**Pay to Unlock button wired:** LandingPage "Pay to Unlock Full Report" button now has `onClick={handlePayUnlock}`. Handler calls `POST /api/stripe/create-checkout-session` with `{ reportId }`; on success redirects to Stripe Checkout URL; on 404 `BEAUTY_PROFILE_NOT_FOUND` shows user-friendly message (Landing reports come from engine/generate and do not have Beauty Profiles — user must create via /beauty flow). Button shows "Redirecting…" while loading.

**PayUnlockButton + dry-run flow:** When user has just submitted the form (`lastFormData` in state), LandingPage renders `PayUnlockButton` with birthData. PayUnlockButton calls `POST /api/beauty/dry-run` with `{ birthData, dryRun: true }`. Dry-run calls `engine/generate` with `dryRun` (no real OpenAI); returns `{ reportId, beautyProfile, checkout: { url } }`; client redirects to `/beauty/success?reportId=…`. No Blob write, no Stripe. When user landed via URL (no form data), fallback remains `handlePayUnlock` → checkout session (requires Beauty Profile).

---

## Verification Log – 2026‑02‑20

**E.V.E. archetype phrase bank:** Added `src/ligs/voice/archetypePhraseBank.ts` with deterministic phrase banks for all 12 archetypes (sensoryMetaphors 5, behavioralTells 5, relationalTells 5, shadowDrift 3, resetMoves 3). Injected into E.V.E. prompt via `buildPhraseBankBlock`. Updated voice rules: RAW SIGNAL 8–14 words, no "you", no archetype names; CUSTODIAN must include "In practice…" and "You tend to…"; ORACLE 1–2 sentences with concrete moment image. Tests: phrase bank coverage, RAW SIGNAL no "you", CUSTODIAN phrases, ORACLE sentence count. Example outputs: `docs/EVE-EXAMPLE-OUTPUTS.md`.

**E.V.E. voice rules and archetype injection:** Updated EVE_FILTER_SPEC with explicit voice rules: RAW SIGNAL (1 sentence, concrete+sensory, no biology jargon, no raw wavelengths); CUSTODIAN (2–4 sentences, second-person "you", practical and grounded); ORACLE (1–3 sentences, second-person "you", poetic but concrete). Forbidden phrases: organism, retinal, vestibular, axial centers, encodes this flux, biological expression follows. Archetype voice injection: `extractArchetypeFromReport` parses "Dominant: X" from report; `buildArchetypeVoiceBlock` injects ArchetypeContract.voice params into E.V.E. user prompt. Engine route wires archetype block into E.V.E. call. Fixture updated to user-facing language; tests assert emotionalSnippet/custodian/oracle contain "you", fullReport lacks forbidden words, voices distinct.

**E.V.E. full structured output:** Removed override forcing `{ image, report }` only. E.V.E. now emits full EVE_FILTER_SPEC shape: vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts. Engine route parses and validates these keys, passes parsed output to `buildBeautyProfile`, uses `buildCondensedFullReport(beautyProfile)` for user-facing `fullReport`. `imageUrls: []` in payload; GET `/api/beauty/[reportId]` enriches from Blob. Image generation uses `beautyProfile.imagery_prompts` instead of report `image_prompts`. Tests: eve.test.ts asserts all five three-voice sections populated, imagery_prompts non-empty, archetype/deviations/corrective_vector not empty, buildCondensedFullReport formats four sections.

**DRY_RUN Beauty Profile save:** When `/beauty?dryRun=1` form is submitted or `POST /api/beauty/dry-run` is called, a minimal `BeautyProfileV1` is saved to Blob via `saveBeautyProfileV1` (when `BLOB_READ_WRITE_TOKEN` set). Enables previews and `/beauty/view?reportId=…` locally for $0. Form uses `submitToBeautyDryRun` when dryRun.

**E.V.E. image generation:** After `saveBeautyProfileV1`, when `allowExternalWrites` and not `dryRun`, the engine uses `imagery_prompts` from the Beauty Profile (from E.V.E. output) and calls `POST /api/generate-image` × 3 for slugs `vector_zero_beauty_field`, `light_signature_aesthetic_field`, `final_beauty_field`. Images persisted to `ligs-images/{reportId}/{slug}.png`. Response unchanged.

**Pre-push sanity checklist:** Added `docs/PRE-PUSH-SANITY-CHECKLIST.md` — final verification before push/deploy. Covers git diff safety, DRY_RUN verification, Stripe/Blob/OpenAI checks, env var validation, UI verification, green/red flags.

**Runtime mode hardening:** Added `lib/runtime-mode.ts` with `isProd`, `isDryRun`, `allowExternalWrites`, `stripeTestModeRequired`. Stripe routes (`create-checkout-session`, `webhook`) reject `sk_live_` when `stripeTestModeRequired` (non-prod). Engine/Blob/Email can gate writes on `allowExternalWrites` for full hardening.

**Beauty Profile view (`/beauty/view?reportId=…`):** BeautyViewClient now renders a full Beauty Profile using Blob-backed data: PreviewCarousel (vector_zero, light_signature, final_beauty images), EmotionalSnippet, FullReportAccordion, ShareCard, and three-voice sections (Light Signature, Archetype, Deviations, Corrective Vector). Supports DRY_RUN (`?dryRun=1`) with placeholder data when Blob returns 404. Errors: "No report selected" (missing reportId), "Report not found" (404). Paid/View Only notice and Back button in hero. Tracks report_fetch, images_loaded, beauty_view_error for analytics.

**ShareCard & dominantArchetype:** ShareCard component (`app/beauty/view/ShareCard.jsx`) provides a compact share card: archetype label, tagline, 3 hit points from `getMarketingDescriptor()`, signature image (prefers Light Signature), (L) brand mark. Copy share link + Download image actions. `BeautyProfileV1` schema extended with optional `dominantArchetype`; engine route sets it from E.V.E. archetype; older profiles use `extractArchetypeFromProfile`. Unit tests: label, tagline, hit points, brand mark, actions, helpers.

Landing homepage no longer uses cached or demo report state; it always fetches the latest report by ID from GET `/api/report/[reportId]` so new data and imagery are shown (form submit and `?reportId=` both trigger that fetch).

**Report persistence (same day):** Engine uses `saveReportAndConfirm` (retry on transient errors, verify by read-back). Success returned only after write is confirmed; on failure returns 503 and does not return `reportId`. Engine logs **`saveReportAndConfirm ok`** with `requestId` and `reportId` on confirmed write. GET `/api/report/[reportId]` reads from the same storage/key (`reportBlobPathname(reportId)`). 404 responses log `REPORT_NOT_FOUND` and include `code: "REPORT_NOT_FOUND"` for monitoring/alerts. E2E verification: `node scripts/verify-report-persistence.mjs [baseUrl]` (curl examples in script comment). **Alerting:** See **docs/REPORT-PERSISTENCE-ALERTING.md** for how to run the verify flow, watch logs for `saveReportAndConfirm ok` and absence of `REPORT_NOT_FOUND`, and enable alerting on that log/response code.

---

## Verification Log – 2026‑02‑15

SYSTEM_SNAPSHOT.md was checked against the repo. All sections match; one doc fix was applied (unwrap-response extension).

| Section | Status | Notes |
|--------|--------|--------|
| **1. Front-end routes** | ✅ | All paths present: `layout.tsx`, `page.tsx`, `LandingPage.jsx`, `error.jsx`, `globals.css`; `beauty/layout`, `beauty/page`, `beauty/view/page`, `BeautyViewClient.jsx`, `beauty/success`, `beauty/cancel`; `report-storage-test/page.jsx`. |
| **1.2 Components** | ✅ | `components/LightIdentityForm.jsx`, `components/LigsFooter.jsx` exist and are used. |
| **1.3 Client utilities** | ✅ | `lib/engine-client.js` (buildEnginePayload, submitToEngine, submitToEve); `lib/unwrap-response.ts`; `lib/analytics.js` (track → POST `/api/analytics/event`). |
| **1.4 Styling & assets** | ✅ | `app/globals.css`, Tailwind/PostCSS, fonts in layouts, `public/` assets. |
| **2. Back-end API routes** | ✅ | engine (E.V.E. at POST /api/engine), engine/generate (report-only), beauty/create, beauty/[reportId], beauty/demo, report/*, stripe/*, email/send-beauty-profile, analytics/event, generate-image. E.V.E. lives at POST /api/engine only. |
| **3. Environment variables** | ✅ | All listed vars appear in code at the locations stated; no extra env vars documented that are missing from repo. |
| **4. Vercel config** | ✅ | `vercel.json` is `{ "framework": "nextjs" }`; `.vercel/` exists; `VERCEL_ENV_SETUP.md` exists. |
| **5. Build pipeline** | ✅ | `package.json` scripts: dev, build, start, lint, test, test:run match. `next.config.ts` has `reactStrictMode: false`; `tsconfig.json` has `@/*` and allowJs; `eslint.config.mjs`, `postcss.config.mjs` present. |
| **6. Integration points** | ✅ | Internal flows (engine → report, engine → report → beauty, stripe webhook → email) and external services (OpenAI, Blob, Stripe, Resend/SendGrid) match code. Blob prefixes `ligs-reports/`, `ligs-beauty/`, `ligs-images/` in `lib/report-store.ts`. Rate limits: beauty/create 5/60s, beauty/[reportId] 20/60s in `lib/rate-limit.ts`. |
| **7. Verification checklist** | ✅ | All checklist items are valid and testable from the current codebase. |

**Doc fix applied:** Snapshot listed `lib/unwrap-response.js`; actual file is `lib/unwrap-response.ts`. Section 1.3 updated accordingly.

**2026-02-15 (route move):** E.V.E. handler lives at `app/api/engine/route.ts`. Report-only engine at `app/api/engine/generate/route.ts`. Frontend and beauty/create hit `/api/engine` for E.V.E.; `submitToEngine` hits `/api/engine/generate`. Single engine route at POST /api/engine only.
