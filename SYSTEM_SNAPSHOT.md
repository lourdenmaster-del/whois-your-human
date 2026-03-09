# LIGS Full-Stack System Snapshot

**Authoritative reference for the current stack.** This file is the single source of truth for front-end routes, back-end API routes, environment variables, Vercel config, build pipeline, and integration points. Any structural change to the app (new routes, new API handlers, new env vars, new integrations, or changes to existing structure) **must** be reflected here—update this document in the same change set.

First-time system map for **ligs-frontend** (Next.js 16, React 19). Use this to verify the full stack is wired correctly.

---

## 0. Imagery source of truth

**Rule:** Final imagery is determined by **engine output + style pipeline**, not ad-hoc UI defaults.

| Source | When used | Role |
|--------|-----------|------|
| **Engine output** | When present | `primaryArchetype` (from solar/report), `secondaryArchetype`, `voiceProfile` drive imagery |
| **Profile** | API calls (image/generate, compose) | `profile.ligs.primary_archetype`, `profile.ligs.secondary_archetype` from caller |
| **Style layer** | Always | `src/ligs/archetypes/contract.ts` + `buildImagePromptSpec` / `buildTriangulatedImagePrompt` determine visual grammar |
| **FALLBACK_PRIMARY_ARCHETYPE** | Only when engine/profile archetype missing | `contract.ts`; used by API routes, minimal-profile, LigsStudio, ShareCard |
| **DEFAULT_PROFILE** | LigsStudio fresh session | `LigsStudio.tsx`; UI default when no stored state |

**Precedence:** Engine (primary + secondary + voiceProfile) > Profile > FALLBACK_PRIMARY_ARCHETYPE. E.V.E. affects copy/overlay/descriptors only; visuals come from archetype contract + triangulation. Guardrail test: `engineResultPromptGuardrail.test.ts`.

---

## 0.5 Public surface area (MVP waitlist-only)

**Production entry points:**
- `/` → 308 redirect to `/origin` (middleware)
- `/origin` — Canonical public landing. Hero → Ignis exemplar + 3 bullets → waitlist form → static 12-grid (non-clickable) → footer. No View report, no Open Artifact, no modals, no Previous Reports, no Featured Keeper, no dev controls.
- `/beauty`, `/beauty/` → 308 redirect to `/origin` (middleware; most reliable on Vercel)
- `/api/waitlist` — POST only; email capture; rate limited; writes to Blob.
- `/api/exemplars` — GET; used by landing for Ignis image. Read-only.
- `/api/status` — GET; used by useApiStatus (hidden when waitlist-only).

**Not linked from /origin:** `/beauty/start`, `/beauty/view`, `/ligs-studio`, `/voice`, `/api/dev/*`, Stripe checkout.

---

## 0.6 Known limitations (exemplar preview flow)

**Terminal preview flow:** `/beauty/view` renders `PreviewRevealSequence` (exemplar, profile-driven, top-loaded) → `InteractiveReportSequence`. No dossier, no WHOIS grid, no registry cards. **Sample report removed from public flow:** `/beauty/sample-report` redirects to `/origin`; no public links lead there.

---

## 1. Front-end architecture

### 1.1 App structure (App Router)

| Path | Type | Purpose |
|------|------|--------|
| `middleware.ts` | Root | Single-hop redirects: www→apex (308); /→rewrite /origin (no redirect); /beauty, /beauty/→/origin (308). Canonical host: ligs.io. Matcher excludes _next, api, favicon. |
| `app/layout.tsx` | Root layout | Space Grotesk font, `globals.css`, metadata (title, OG, Twitter), `NEXT_PUBLIC_SITE_URL` for canonical/OG |
| — | — | No `app/page.tsx`; middleware rewrites `/` to `/origin` (200, no redirect) |
| `app/error.jsx` | Client | Error boundary: message + “Try again” reset |
| `app/globals.css` | Global styles | Tailwind + app CSS |

**Origin section** (canonical landing):

| Path | Type | Purpose |
|------|------|--------|
| `app/origin/page.jsx` | Server | Renders `BeautyLandingClient`. Canonical public landing. |
| `app/origin/layout.jsx` | Layout | System serif (Georgia), `beauty-theme`, background transparent. |

**Beauty section** (nested under `app/beauty/` — `/beauty` 301 → `/origin`):

| Path | Type | Purpose |
|------|------|--------|
| `app/beauty/layout.jsx` | Layout | System serif (Georgia), `beauty-theme`, background transparent (page-level bg set per route) |
| `app/beauty/page.jsx` | Server | Renders `BeautyLandingClient` only. Single Beauty landing. |
| `app/beauty/BeautyLandingClient.jsx` | Client | **Waitlist-only by default:** Hero; Ignis exemplar + 3 bullets; Early Access waitlist; 12-regime static grid (no links, no click handlers); Footer. Hero background: `/ligs-landing-bg.png` (dark geometric) only — no beauty-background, beauty-hero, or blob-driven hero. Set `NEXT_PUBLIC_WAITLIST_ONLY=0` to re-enable purchase flow. |
| `app/beauty/start/page.jsx` | Client | Birth form (LightIdentityForm). Requires unlocked; redirects to `/origin` if not. Terminal-aligned: black bg, origin-terminal box, mono text. Submit → `submitToBeautySubmit`/`submitToBeautyDryRun`; on success → `/beauty/view?reportId=...`. |
| `app/beauty/view/page.jsx` | Client | View beauty profile by `?reportId=`; uses `BeautyViewClient`, `getBaseUrl()` from `NEXT_PUBLIC_VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` |
| `app/beauty/view/BeautyViewClient.jsx` | Client | **Terminal preview flow only.** Exemplar: waits for profile, then `PreviewRevealSequence` (top-loaded, 8-phase reveal) → `InteractiveReportSequence`. Real report: `InteractiveReportSequence` only. Missing/invalid reportId: simple error state + link to /origin. No dossier, no WHOIS grid, no registry cards. DRY_RUN (`?dryRun=1`) shows placeholder when Blob empty. Tracks report_fetch, images_loaded, errors. |
| `app/beauty/sample-report/page.jsx` | Client | **Removed from public flow.** Redirects to /origin on load. Route kept for code safety; no public links lead here. |
| `app/beauty/success/page.jsx` | Page | Post-Stripe success (with `reportId`). Terminal-aligned: black bg, origin-terminal box, mono text, no LigsFooter. |
| `app/beauty/cancel/page.jsx` | Page | Stripe checkout cancelled. Terminal-aligned: black bg, origin-terminal box, mono text. |

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
| `LandingPreviews` | `components/LandingPreviews.jsx` | Renders **Examples**: 12 archetype slots in `LIGS_ARCHETYPES` order; data from GET `/api/exemplars?version=v1` or fallback `/exemplars/{archetype}.png`. Props: `staticGrid` (non-interactive, no links, non-Ignis opacity 0.6, "Unlocking Soon"), `highlightArchetype` (full opacity in static mode). When `staticGrid`: no click handlers, no modal, no "View report"/"Open Artifact" links. Previous Light Identity Reports section removed (verify via Vercel Blob dashboard only). |
| `PreviewCardModal` | `components/PreviewCardModal.jsx` | Modal with image carousel (Vector Zero, Light Signature, Final Beauty), emotional snippet, Stripe checkout button. Touch swipe support. |
| `PreviewRevealSequence` | `app/beauty/view/PreviewRevealSequence.jsx` | **Exemplar only.** Profile-driven, top-loaded 5-phase terminal reveal: archetype image carousel (cycle → resolve) → archetype expression → final artifact. Phase 2 uses `ArchetypeResolveCarousel`. When `profile.isLockedPreview` (non-Ignis exemplars), phases 3 and 5 show pill-shaped "Unlocking" blur overlay. Replaces TerminalResolutionSequence for exemplar when profile is ready. |
| `TerminalResolutionSequence` | `app/beauty/view/TerminalResolutionSequence.jsx` | Continuation of /origin: local solar-season + archetype resolution from `getOriginIntake`; timed line reveals; archetype snippet (descriptor, cosmic analogue, phrase bank); sample artifact thumbnail; `ContinuePrompt` ("Press ENTER or tap to continue"). No API calls. Same black/white terminal look as /origin. **Not used for exemplar** (PreviewRevealSequence used instead). |
| `ArchetypeResolveCarousel` | `components/ArchetypeResolveCarousel.jsx` | Reusable archetype image carousel: cycles through archetype visuals, then resolves onto `finalArchetype`. Uses `lib/archetype-static-images`. **Used by PreviewRevealSequence Phase 2 only** — NOT used by /origin. |
| `OriginTerminalIntake` | `components/OriginTerminalIntake.jsx` | Canonical /origin terminal flow: boot → intake (name, date, time, place, email) → processing → direct archetype lines + waitlist/CTA → completeAwaitingEnterRedirect. Text-only, no carousel. WAITLIST_ONLY: Enter redirects to exemplar-Ignispectrum. |
| `ArchetypeArtifactCard` | `components/ArchetypeArtifactCard.jsx` | Premium collectible layout: hero image, center archetype overlay, left vertical info panel. `showDevFields?: boolean` passed to ArtifactInfoPanel. Used on LigsStudio. |
| `ArchetypeNameOverlay` | `components/ArchetypeNameOverlay.jsx` | Center band overlay with subtle scrim and blur for artifact hero. |
| `ArtifactInfoPanel` | `components/ArtifactInfoPanel.jsx` | Left gallery-placard panel with archetype, variationKey, date/location, solar, etc. `showDevFields?: boolean` (default false) hides schemaVersion, engineVersion, and reportId row; reportId visible only when showDevFields=true. |
| `ArtifactCompare` | `components/ArtifactCompare.jsx` | Two-column Compare Runs wrapper for LigsStudio (previous vs current). |
| `EmotionalSnippet` | `app/beauty/view/EmotionalSnippet.jsx` | Renders subject name and emotional snippet quote. |
| `TestModeLogger` | `components/TestModeLogger.tsx` | Client component; logs "TEST MODE" to console when `NEXT_PUBLIC_TEST_MODE=1` |
| `LigsFooter` | `components/LigsFooter.jsx` | Footer for landing |
| `VoiceProfileBuilder` | `components/VoiceProfileBuilder.jsx` | 5-step wizard: archetype, descriptors, banned words, claims policy, channel adapters; builds + validates VoiceProfile; stores in local state |
| `LigsStudio` | `components/LigsStudio.tsx` | Internal studio: VoiceProfile JSON (default Ignispectrum), **purpose dropdown** (marketing_background, share_card, archetype_background_from_glyph); Ignis defaults to marketing_background (FIELD-FIRST); variationKey (exemplar-v2), size, background source; **Reset to Fluxionis**; **Ignis: Archetype Anchor (Field-First)** panel (DALL·E 3 field + archetype static image in compose); Generate Background, Compose, **Full Pipeline**; 6 Variations, Generate Marketing; **Save as Exemplar Card (Landing)**, **Save as Share Card**, **Save as Marketing Background**; Manifest URLs JSON snippet; previews, spec/validation JSON. **Last Response Debug** (after Generate Background): providerUsed, purposeEchoed, cacheHit, glyphBranchUsed, requestId, buildSha, validation, error, imageUrl. **Dry Run Mode**: Simulate only; Save buttons disabled. LIVE: Generate/Compose/Full Pipeline/Save. Compare mode: ArtifactCompare; **Live Test** → POST /api/dev/live-once. |
| `MarketingHeader` | `components/MarketingHeader.tsx` | Displays archetype label, tagline, hit points, CTA; optional logo mark + marketing background. Uses descriptor + assets from /api/marketing/generate. Graceful degradation when assets missing. |

### 1.3 Client utilities

| Module | Purpose |
|--------|--------|
| `lib/engine-client.js` | `buildEnginePayload`, `submitToEngine`, `submitToBeautyDryRun(formData)` → POST `/api/beauty/dry-run`; `submitToEve`, `submitToBeautySubmit` |
| `lib/unwrap-response.ts` | Unwrap API JSON; throw with `error` / `code` on non-OK |
| `lib/analytics.js` | `track(event, reportId?)` → POST `/api/analytics/event` |
| `lib/landing-storage.js` | `saveLastFormData`, `loadLastFormData`, `clearLastFormData` — localStorage for form state. `saveOriginIntake`, `getOriginIntake`, `clearOriginIntake` — origin terminal intake (birth date/time/location) for /beauty/view local resolution. `setBeautyUnlocked()`, `isBeautyUnlocked()` — pay-first unlock (set from success page after Stripe checkout). |
| `lib/archetypes.js` | Canonical `LIGS_ARCHETYPES` — 12 archetypes in solar-season order. Single source for lib/ and components (resolveArchetypeFromDate, API beauty route, LandingPreviews, archetype-preview-config). |
| `lib/terminal-intake/resolveArchetypeFromDate.js` | Client-safe archetype resolution from birth date. Uses `LIGS_ARCHETYPES` from lib/archetypes; `approximateSunLongitudeFromDate` + 12×30° segments. Returns "Ignispectrum" if unparseable. |
| `lib/api-client.js` | `fetchBlobPreviews({ maxCards, maxPreviews, useBlob })` — GET `/api/report/previews` wrapper |
| `lib/exemplar-cards.ts` | `EXEMPLAR_CARDS` — legacy static exemplar cards (6 archetypes); landing Examples now uses 12 slots from `LIGS_ARCHETYPES` + manifests/placeholders |
| `lib/archetype-public-assets.ts` | Archetype → public asset URL mapping. `getArchetypePublicAssetUrls(archetype)` returns `{ marketingBackground, exemplarCard, shareCard }` from `public/{archetype}-images/` (e.g. `aequilibris-images/`, `fluxionis-images/`). Files: `{archetype}-prime1..3.png`. Used when Blob manifest missing: beauty API, exemplars API, getExemplarManifestsServer. |
| `lib/archetype-static-images.ts` | Archetype → static image path mapping. `getArchetypeStaticImagePath`, `hasArchetypeStaticImage`, `getArchetypeStaticImagePathOrFallback`, `ARC_STATIC_FALLBACK`. Uses `public/arc-static-images/{archetype}-static1.png`. Fluxionis → fluxonis-static1.png (asset typo). Used by archetype-preview-config, compose-card, static-overlay, LigsStudio, LandingPreviews, etc. |
| `lib/archetype-preview-config.js` | `ARCHETYPE_PREVIEW_CONFIG`, `getArchetypePreviewConfig(archetype)`, `buildPlaceholderSvg(displayName)` — display names, archetype static image path (via getArchetypeStaticImagePath), sample artifact URLs, teaser for all 12 archetypes. Used by PreviewRevealSequence, TerminalResolutionSequence, ArchetypeArtifactCard, InteractiveReportSequence, LandingPreviews. |
| `lib/report-composition.ts` | Report composition layer: `composeArchetypeSummary`, `composeLightExpression`, `composeCosmicTwin`, `composeReturnToCoherence`. Converts phrase-bank fragments into complete sentences. No repetition of archetype resolution or cosmic analogue (those appear once in TerminalResolutionSequence). Used by InteractiveReportSequence. |
| `lib/exemplar-store.ts` | `saveExemplarToBlob`, `saveExemplarManifest`, `loadExemplarManifest`, `loadExemplarManifestWithPreferred`, `exemplarPath`, `exemplarManifestPath`, `PREFERRED_ARCHETYPE_VERSIONS` — Blob at `ligs-exemplars/{archetype}/{version}/`. Ignispectrum prefers v2 when available. |
| `lib/sample-report.ts` | `SAMPLE_REPORT_IGNIS` — structured static content for Ignispectrum exemplar (initiation, cosmicTwin, fieldConditions, archetypeExpression, deviations, returnToCoherence). Previously used by `/beauty/sample-report`; route now redirects to /origin. Observational, scientific tone. |
| `lib/runtime-mode.ts` | `isProd`, `isDryRun`, `isTestMode`, `allowExternalWrites`, `allowBlobWrites`, `stripeTestModeRequired` — unified env guard; when `TEST_MODE=1`: dry image gen, deterministic overlay; Blob writes ON unless `DISABLE_BLOB_WRITES=1` |
| `lib/dry-run-config.ts` | Client-side `DRY_RUN`, `FAKE_PAY`, `TEST_MODE` from `NEXT_PUBLIC_*` env vars |
| `lib/preflight.ts` | `runPreflight()` — server-only checks OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, DRY_RUN unset, allowExternalWrites. Returns `{ ok, checks, checklist }`. Used by `/api/dev/preflight` and `/api/dev/beauty-live-once`. |
| `lib/ligs-studio-utils.ts` | `pickBackgroundSource(imageResult)` — prefers url over b64; `backgroundToInputString(bg)`; `getPngDimensionsFromBase64(b64)`; `isPlaceholderPng(b64, minSize)`; `TINY_PNG_B64` (1x1 placeholder) |
| `lib/marketing/` | Marketing Descriptor (archetype→label, tagline, hitPoints, CTA), buildMarketingImagePrompts (logo mark), buildLogoMarkPrompt, buildTriangulatedMarketingPrompt (visuals.ts) — marketing_background/overlay/share_card use triangulation. **Archetype visual:** markType="archetype" when archetype has static image; compose-card/static-overlay use `getArchetypeStaticImagePath` for archetype anchor; corner label uses markArchetype. **Ignis FIELD-FIRST:** marketing_background for Ignispectrum injects CENTER VOID block; compose-card places archetype static image in void (33% width, slightly below midline). POST /api/marketing/generate, POST /api/marketing/visuals. See docs/MARKETING-LAYER.md. |
| `lib/history/onThisDay.ts` | `getOnThisDayContext(month, day, lang)` — fetches "on this day" from Wikimedia/Wikipedia API; 24h in-memory cache; curation (events, births, holidays, max 6 items). Used by beauty/submit to enrich birthContext. |
| `lib/astronomy/computeSunMoonContext.ts` | `computeSunMoonContext(lat, lon, utcTimestamp, timezoneId)` — Sun/Moon horizontal coords, twilight phase, sunrise/sunset, day length, moon phase/illumination. Uses astronomy-engine only (no external APIs). beauty/submit attaches sun + moon to birthContext; engine buildBirthContextBlock injects concise Sun/Moon section. |
| `lib/engine/constraintGate.ts` | `scanForbidden(text)` — scans full_report for forbidden terms (chakra, kabbalah, sacred geometry, etc.); `redactForbidden(text, keys)` — replaces matches with [removed]. Engine/generate runs one repair OpenAI pass when hits > 0; re-scan; if hits remain, redacts in dev. |
| `lib/idempotency-store.ts` | Blob-backed idempotency at `ligs-runs/{route}/{idempotencyKey}.json`. `getIdempotentResult`, `setIdempotentResult`, `isValidIdempotencyKey`, `deriveIdempotencyKey` (deterministic sub-keys for marketing/share replays). Routes: engine-generate, engine, marketing-generate, image-generate. In-memory fallback when no Blob. |
| `lib/waitlist-store.ts` | Blob at `ligs-waitlist/entries/{sha256(email).slice(0,32)}.json`. `insertWaitlistEntry(payload)` → `{ ok, alreadyRegistered? }`; uses `head()` before `put()` for duplicate check. Payload: email, created_at, source, preview_archetype?, solar_season?. Used by `/api/waitlist`. |
| `lib/email-waitlist-confirmation.ts` | `sendWaitlistConfirmation(email)` — LIGS-voice confirmation via Resend or SendGrid. Subject: "Your identity query has been logged". Uses `RESEND_API_KEY` or `SENDGRID_API_KEY`, `EMAIL_FROM`. Used by `/api/waitlist` for new signups only. |

### 1.5 Voice Profile (LIGS)

| Module | Purpose |
|--------|--------|
| `src/ligs/voice/schema.ts` | Zod schema for `VoiceProfile`; `parseVoiceProfile()`, `safeParseVoiceProfile()` |
| `src/ligs/voice/errors.ts` | `VoiceEngineError` (discriminated union); `zodToVoiceEngineError()`, `toVoiceEngineError()` |
| `src/ligs/voice/normalize.ts` | `normalizeVoiceProfile()` – validate via Zod, light trim + lexicon dedupe, returns VoiceProfile or null |
| `src/ligs/voice/index.ts` | Barrel exports |
| `src/ligs/voice/prompt/buildPromptPack.ts` | `buildPromptPack()`, `toSystemPrompt()` — LLM prompt pack from VoiceProfile |
| `src/ligs/voice/prompt/archetypeAnchors.ts` | `ARCHETYPE_ANCHORS`, `getArchetypeAnchor()` — 12 LIGS archetype definitions |
| `src/ligs/archetypes/contract.ts` | Single source of truth: `LIGS_ARCHETYPES`, `FALLBACK_PRIMARY_ARCHETYPE`, `ArchetypeContract`, `ARCHETYPE_CONTRACT_MAP`, `NEUTRAL_FALLBACK`, `getArchetypeContract`, `getArchetypeOrFallback`. Canonical 12 archetypes with voice, visual, marketingDescriptor, marketingVisuals, copyPhrases. Imagery fallback when engine output missing. |
| `src/ligs/archetypes/adapters.ts` | Compatibility adapters: `getArchetypeVisualMapShape`, `getArchetypeVoiceAnchorShape`, `getMarketingDescriptor`, `getOverlayCopyBank`, `getMarketingVisuals`, `getVisualMapRecord`, `getVoiceAnchorRecord`, `getOverlayCopyRecord`, `getVisualParamsOrFallback`. Legacy `archetype-visual-map.ts`, `archetypeAnchors.ts`, `archetype-copy-map.ts` now derive from these adapters (thin re-exports); DO NOT EDIT headers point to contract. |
| `src/ligs/voice/prompt/selfCheck.ts` | `buildSelfCheckRubric()`, `formatSelfCheckBlock()` — pre-final checklist |
| `src/ligs/voice/validate/` | Post-generation validation: `validateVoiceOutput()`, banned words, claims, cadence, formatting, lexicon, channel structure |
| `src/ligs/image/schema.ts` | `ImagePromptSpec` Zod schema: purpose, style (palette/materials arrays, texture_level/contrast_level enums), composition (symmetry/negative_space/flow_lines enums), constraints (no_text, no_logos, no_faces, no_figures, no_symbols, no_astrology, avoid_busy_textures, safety_notes?), output (aspectRatio, size "1024"|"1536", count 1–4), prompt, variation (variationId, motifs, randomnessLevel) |
| `src/ligs/image/buildImagePromptSpec.ts` | `buildImagePromptSpec(profile, options)` — triangulated prompts; optional `solarProfile`, `twilightPhase`. Marketing purposes (marketing_background, marketing_overlay, share_card) route to buildTriangulatedMarketingPrompt; marketing_logo_mark uses buildLogoMarkPrompt; `NEGATIVE_EXCLUSIONS` exported |
| `src/ligs/image/triangulatePrompt.ts` | `getPrimaryArchetypeFromSolarLongitude`, `resolveSecondaryArchetype`, `buildTriangulatedImagePrompt` — 3-stage coherence: primary (solar anchor, max 2 atoms) + secondary (texture/motion/contrast only, max 1 atom, capped 35% of primary) → resolved block (single palette/structure from primary). Modes: variation, signature, marketing_background, marketing_overlay, share_card. Twilight modulation. **Tuning:** marketing_background archetype-aware mode (high-energy → "premium negative space, high-clarity field"); Ignispectrum secondary → Vectoris; marketing_background twilight default "day"; contract.visual.abstractPhysicalCues for archetype-native field line. |
| `src/ligs/image/buildArchetypeVisualVoice.ts` | `buildArchetypeVisualVoiceSpec(archetype, { mode, entropy?, seed? })` — semi-living archetype visuals: fixed spine from voice contract + seeded variability from phrase banks; mode: exemplar \| variation \| signature |
| `src/ligs/image/validateImagePromptSpec.ts` | Validates spec (required constraints true, negative contains exclusions, positive has no disallowed tokens); pass/score/issues; score 100 − 25×errors − 5×warnings |
| `src/ligs/voice/api/generate-request-schema.ts` | Zod schema for POST /api/voice/generate body; `parseGenerateVoiceRequest()`, `GenerateVoiceRequest` |
| `src/ligs/marketing/schema.ts` | `MarketingOverlaySpec` Zod schema: id, version, created_at, ligs, purpose, output, templateId, copy (headline/subhead/cta/disclaimer), placement (safeArea, logo, textBlock), styleTokens (incl. optional logoStyle: text, weight, tracking, opacity, blur, glow, radius, fill, stroke, circleFill, circleStroke), constraints, markType ("brand"|"archetype"), markArchetype. `getLogoStyleWithDefaults()`, `LogoStyle` type. |
| `src/ligs/marketing/templates.ts` | ONE template `square_card_v1` for 1:1; `getTemplate(templateId, aspectRatio)` |
| `src/ligs/marketing/buildOverlayPromptPack.ts` | `buildOverlayPromptPack()` — prompt pack for overlay copy generation in archetype voice |
| `src/ligs/marketing/generateOverlaySpec.ts` | `generateOverlaySpec()` — LLM copy when allowed, else deterministic; static placements from templates; archetype→logoStyle mapping. `buildOverlaySpecWithCopy(profile, options, copy)` — sync spec builder with custom copy for LIGS Studio DRY compose; sets logoStyle from archetype; Ignispectrum → markType "archetype", markArchetype "Ignispectrum". |
| `src/ligs/marketing/validateOverlaySpec.ts` | `validateOverlaySpec()` — copy lengths, banned words, medical claims, guarantees, placement bounds; pass/score/issues |

See **docs/LIGS-VOICE-ENGINE-SPEC.md** for the full spec.

### 1.6 Styling & assets

- **Tailwind** (PostCSS) + `app/globals.css`
- **Fonts:** system sans stack (root), system serif (beauty); no Google Fonts (build-safe offline/sandbox)
- **Public:** `public/` (e.g. `signatures/beauty-background.png`, `signatures/beauty-hero.png`, `exemplars/*.png`, `arc-static-images/*.png` archetype static images, `favicon.ico`, `brand/ligs-mark-primary.png` global logo at `/brand/ligs-mark-primary.png`, etc.)

---

## 2. Back-end routes (API)

All under `app/api/`. Route handlers use `@/lib` helpers and shared validation where applicable.

### 2.1 Core engine & E.V.E.

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/engine/generate` | Report-only. Validates body. Optional `idempotencyKey` (UUID): when present, returns stored result from `ligs-runs/engine-generate/{key}.json` if exists (no OpenAI). **X-Force-Live** gated: header `X-Force-Live: 1` honored only when `ALLOW_FORCE_LIVE=true` (default false). If dry run: mock report → `saveReportAndConfirm`. Else: OpenAI → full report, snippet → Constraint Gate → image prompts, vector zero → saveReportAndConfirm. On success stores to idempotency when key present. Uses `OPENAI_API_KEY`. |
| POST | `/api/engine` | E.V.E. pipeline. Optional `idempotencyKey` (UUID): when present, returns stored result from `ligs-runs/engine/{key}.json` if exists (no OpenAI). Validates body → internal fetch to `POST /api/engine/generate` (passes idempotencyKey) → fetch `GET /api/report/{reportId}` → OpenAI E.V.E. filter → `buildBeautyProfile` → `saveBeautyProfileV1`. If `allowExternalWrites` and not `dryRun`: (1) `POST /api/generate-image` × 3 (signatures); (2) `POST /api/image/generate` for marketing_background + marketing_logo_mark (triangulated) → save to Blob; (3) compose marketing card (bg + logo + overlay) → marketing_card.png; (4) `POST /api/image/generate` for share_card (triangulated) → share_card.png. Persists marketingBackgroundUrl, logoMarkUrl, marketingCardUrl, shareCardUrl. Idempotency: skips regenerate if URLs exist in Blob; derived keys for cache. Logs `assets_manifest` after DRY and LIVE. Uses `OPENAI_API_KEY`, `VERCEL_URL`. |

### 2.2 Beauty API

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/beauty/create` | Rate limit 5/60s. Validates engine body → POST to `/api/engine` → returns `reportId`. Uses `VERCEL_URL`. |
| POST | `/api/beauty/dry-run` | Simulates Beauty flow. Body `birthData`, `dryRun`. Calls `POST /api/engine/generate` with `dryRun: true`; saves BeautyProfileV1 to Blob via `saveBeautyProfileV1` (when `BLOB_READ_WRITE_TOKEN` set) so previews and `/beauty/view` work locally for $0. Returns `{ reportId, beautyProfile, checkout }`. No Stripe call. |
| GET | `/api/beauty/[reportId]` | Rate limit 20/60s. Loads Beauty Profile V1 from Blob via `loadBeautyProfileV1`; enriches marketingBackgroundUrl, logoMarkUrl, marketingCardUrl, shareCardUrl from Blob; 404 if not found. |
| GET | `/api/keepers/[reportId]` | Returns keeper manifest JSON from `ligs-keepers/{reportId}.json`. Query `?dry=1` loads from `ligs-keepers-dry/` for landing validation without spend. 404 when not found. Used by `/beauty?keeperReportId=X` for featured keeper hero. |
| GET | `/api/exemplars` | Query `?version=v1`. Returns list of exemplar manifests for all 12 archetypes that exist in Blob. Used by landing Examples section. |
| POST | `/api/exemplars/generate` | Body: `{ archetype, mode: "dry"|"live", version: "v1" }`. Exemplar pack: marketing_background (LIVE; Ignis: glyph-conditioned), share_card (non-Ignis: DALL·E; Ignis: composed from same background for coherence), exemplar_card (compose, always). Saves to `ligs-exemplars/{archetype}/{version}/`. Manifest.urls: marketingBackground, shareCard, exemplarCard. Stable idempotency for marketing_background, share_card (non-Ignis only). |
| POST | `/api/exemplars/save` | Body: `{ archetype, version, target?: "exemplar_card" \| "share_card" \| "marketing_background", exemplarCardB64? }` (or `marketingBackgroundB64` when target=marketing_background). Saves to Blob; loads existing manifest, merges URLs, writes back. LigsStudio: "Save as Exemplar Card", "Save as Share Card", "Save as Marketing Background". Uses `getPreferredExemplarVersion` (Ignis→v2). No extra generation. |

### 2.3 Report storage API

| Method | Route | Handler summary |
|--------|--------|------------------|
| GET | `/api/report/[reportId]` | Reads from same storage/key as engine: Blob `ligs-reports/{reportId}.json` or memory. `getReport(reportId)` → returns `full_report`, `emotional_snippet`, `image_prompts`, `vector_zero`. 404 logs `REPORT_NOT_FOUND` (monitor for persistence gaps); response includes `code: "REPORT_NOT_FOUND"`. |
| GET | `/api/report/previews` | Fetches from Beauty Profiles in Blob (`ligs-beauty/`). Lists profiles (most recent first), extracts `subjectName` (subjectName/fullName), `emotionalSnippet`, image URLs from `ligs-images/{reportId}/{slug}`. Query: `useBlob`, `maxPreviews`/`maxCards` (default 3). Read-only. Mock cards when Blob empty (DRY_RUN). |
| GET | `/api/report/debug` | `getStorageInfo()`, optional `listBlobReportPathnames` / `getMemoryReportIds`; test pattern description. |

### 2.3a Waitlist

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/waitlist` | Email capture with duplicate check and confirmation. Body: `{ email: string, source?: string, birthDate?: string, archetype_preview?: string, solar_season?: string }`. When `birthDate` (YYYY-MM-DD) provided, computes `archetype_preview` and `solar_season` server-side via `approximateSunLongitudeFromDate` + `getPrimaryArchetypeFromSolarLongitude`. Validates email; rate limit 5 req/60s per IP+UA. Blob at `ligs-waitlist/entries/{sha256(email).slice(0,32)}.json`. Duplicate → 200 `{ ok: true, alreadyRegistered: true }` (no confirmation resend). New signup → `insertWaitlistEntry` → `sendWaitlistConfirmation` (Resend or SendGrid) → 200 `{ ok: true }`. Requires `BLOB_READ_WRITE_TOKEN`. One of `RESEND_API_KEY` or `SENDGRID_API_KEY` for confirmation. |

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
| POST | `/api/image/generate` | Body: `profile`, `purpose`, `image`, `variationKey?`, `archetype?`, `idempotencyKey?` (UUID). Optional idempotency: when key present, returns stored result from `ligs-runs/image-generate/{key}.json` if exists (no provider call). Zod strict. buildImagePromptSpec → validateImagePromptSpec. LRU cache (max 200) + idempotency store. On success stores to idempotency when key present. ALLOW_EXTERNAL_WRITES server-only. Denylist pass. Returns `{ requestId, images, spec, validation, dryRun, providerUsed, cacheHit, purposeEchoed, glyphBranchUsed, buildSha }`; `X-Build-Sha` header from `VERCEL_GIT_COMMIT_SHA` or `"local"`. **archetype_background_from_glyph:** DALL·E 2 edits via `dalle2_edits`; loads `public/glyphs/ignis.svg`, rasterizes to 1024×1024 base + transparent mask; prompt from `buildGlyphConditionedBackgroundPrompt`. No fallback to DALL·E 3: on glyph load/rasterize or edits provider failure, returns 500 `GLYPH_CONDITIONED_FAILED` with clear reason. DRY returns `glyphDryPlan`. Cache hit for glyph purpose returns `providerUsed: "dalle2_edits"`. |
| POST | `/api/image/compose` | 1:1 Square Marketing Card compositor. Body: `profile`, `background` (url or b64), `purpose`, `templateId?`, `output?`, `variationKey?`, `overlaySpec?`. Rejects background <256x256 (400 BACKGROUND_TOO_SMALL); logs dimensions in dev. If `overlaySpec` missing: `buildOverlaySpecWithCopy` server-side. For `markType=archetype`: `composeExemplarCardToBuffer` (glyph + text); else `composeMarketingCardToBuffer`. Logo: GLOBAL_LOGO_PATH or "(L)". LigsStudio: prefers `imageResult.images[0].url` → `backgroundUrl`; client blocks placeholder b64. Returns `{ requestId, dryRun, buildOverlaySpec?, overlaySpec, overlayValidation, image? }`. |
| POST | `/api/generate-image` | Body `prompt`, optional `reportId`, `slug`. If `reportId` + slug and existing Blob image URL → return it. Else DALL·E 3 → optional save to Blob (`saveImageToBlob`) → return URL. Uses `OPENAI_API_KEY`. |

### 2.8 LIGS Studio & status

| Method | Route | Handler summary |
|--------|--------|------------------|
| GET | `/api/status` | Returns `{ disabled: boolean }` for production kill-switch. When `LIGS_API_OFF=1`, `disabled: true`. Frontend hides/disables sensitive CTAs when disabled. No auth. |
| GET | `/api/ligs/status` | Returns `{ allowExternalWrites, provider, logoConfigured, logoFallbackAvailable }` for LIGS Studio Warning Lights. `logoConfigured=true` when BRAND_LOGO_PATH readable or when `public/brand/ligs-mark-primary.png` exists. No auth. |

### 2.9 Dev (non-production only)

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/dev/live-once` | Dev-only. 403 when `NODE_ENV=production`. Rate limit: 1 request per server process (429 "LIVE_ONCE already used; restart dev server"). Body: `fullName`, `birthDate`, `birthTime`, `birthLocation`, `email?` (default `dev@example.com`). Forwards to `POST /api/engine/generate` with `X-Force-Live: 1` (bypasses `DRY_RUN`). Returns engine JSON. Used by LigsStudio "Live Test" button. Set `DEBUG_PROMPT_AUDIT=1` to log prompt audit in terminal. |
| POST | `/api/dev/verify-saved` | Dev-only. 403 in production. Body: `{ reportId }`. UNSAVED: returns `ok:false, reason:unsaved`. Else calls `getReport`; returns `ok:true` with `reportFound`, `keys`, `full_report_length`, `blobKey` when found, else `ok:false, reason:not_found`. Used by LigsStudio "Verify saved to Blob" button. |
| GET | `/api/dev/preflight` | Dev-only. 403 in production. Runs `runPreflight()` — checks OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, DRY_RUN unset, allowExternalWrites. Returns `{ ok, checks, checklist }`. Used before live Beauty run. |
| POST | `/api/dev/beauty-live-once` | Dev-only. 403 in production. **Golden Run:** exactly one live run per browser session (cookie `beauty-live-once-key`); retries with same `idempotencyKey` allowed (returns cached). Body may include `idempotencyKey` (else auto-generated). Runs preflight; POST `/api/beauty/submit` with `dryRun: false`, `idempotencyKey`. Logs: idempotencyHit, cacheHit/Miss, imageCount. Returns `{ reportId, subjectName, dominantArchetype, viewUrl, meta }`. |
| GET | `/api/dev/verify-report` | Dev-only. 403 in production. Query `?reportId=X`. Verifies Beauty Profile in Blob, image URLs, schemaVersion, prompts, archetype. When DRY_RUN=1, also requires marketingCardUrl (profile or ligs-images/{reportId}/marketing_card). Returns `{ ok, checks, imageUrls, marketingCardUrl?, summary }`. |
| GET | `/api/dev/verify-marketing-card` | Dev-only. 403 in production. Query `?reportId=X`. Verifies marketing_card blob exists. Returns `{ ok, marketingCardUrl?, summary }`. |
| GET | `/api/dev/glyph-debug` | Dev-only. Query `?name=ignis` or `?name=ignis_icon`. Audits glyph/icon SVG. LigsStudio "GLYPH SOURCE OF TRUTH AUDIT". |
| GET | `/api/dev/glyph-rasterize` | Dev-only. Query `?name=ignis` or `?name=ignis_icon`. Rasterizes glyph/icon SVG to 512×512 PNG. |

### 2.10 Marketing

| Method | Route | Handler summary |
|--------|--------|------------------|
| POST | `/api/marketing/generate` | Body: `primary_archetype`, `variationKey?`, `contrastDelta?`, `idempotencyKey?` (UUID). Optional idempotency: when key present, returns stored result from `ligs-runs/marketing-generate/{key}.json` if exists. Uses **cached path**: calls `POST /api/image/generate` twice (purpose marketing_logo_mark, marketing_background) so LRU cache applies; no direct `generateImagesViaProvider`. Returns `{ descriptor, assets, requestId, dryRun }`. DRY_RUN returns descriptor + empty assets. |
| POST | `/api/marketing/visuals` | Body: `primary_archetype` (string), `variationKey?`, `contrastDelta?` (default 0.15). Wrapper: calls POST /api/image/generate twice (purpose marketing_logo_mark, marketing_background). Returns `{ logoMark?, marketingBackground?, warnings? }`. Normalizes via pickBackgroundSource. Partial success; warnings describe failures. |

---

## 3. Environment variables

| Variable | Where used | Purpose |
|----------|------------|--------|
| `LIGS_API_OFF` | `lib/api-kill-switch.ts`, all sensitive POST routes, GET `/api/status` | `"1"` or `"true"` = production kill-switch; blocks image gen, Blob writes, Stripe checkout, marketing/exemplar/engine/beauty/voice/email. Returns 503 `{ disabled: true, reason: "maintenance" }`. Frontend uses GET `/api/status` to hide/disable CTAs. |
| `NEXT_PUBLIC_DRY_RUN` | `lib/dry-run-config.ts`, LigsStudio | `"1"` or `"true"` = client never sends generate/verify requests; shows Dry Run Preview and banner |
| `NEXT_PUBLIC_FAKE_PAY` | `lib/dry-run-config.ts`, BeautyLandingClient, PayUnlockButton, PreviewCardModal | `"1"` or `"true"` = CTA bypasses Stripe; sets unlock, redirects to /beauty/start (marketing testing). **Production: leave unset.** |
| `NEXT_PUBLIC_TEST_MODE` | `lib/runtime-mode.ts`, `lib/dry-run-config.ts`, compose, generate-image, TestModeLogger | `"1"` or `"true"` = dry image gen, deterministic overlay; Blob writes ON unless `DISABLE_BLOB_WRITES=1`; logs "TEST MODE" in console. **Production: leave unset.** |
| `DISABLE_BLOB_WRITES` | `lib/runtime-mode.ts` | `"1"` or `"true"` = disable Blob writes (optional hard off; even in TEST_MODE) |
| `NEXT_PUBLIC_SITE_URL` | `app/layout.tsx`, beauty view | Canonical/OG base URL (default `https://ligs.io`) |
| `NEXT_PUBLIC_VERCEL_URL` | `app/beauty/view/page.jsx`, `BeautyViewClient.jsx` | Base URL when deployed on Vercel |
| `VERCEL_URL` | API routes (origin for internal fetch / redirects) | Server-side base host (no protocol); code uses `https://${VERCEL_URL}` |
| `OPENAI_API_KEY` | `/api/engine`, `/api/engine/generate`, `/api/beauty/demo`, `/api/generate-image`, `/api/voice/generate`, `/api/image/generate` | GPT-4o and DALL·E 3 |
| `DRY_RUN` | `/api/engine` (and script) | `"1"` = mock report, no OpenAI |
| `ALLOW_EXTERNAL_WRITES_IN_DEV` | `lib/runtime-mode.ts` | `"1"` = allow Blob/OpenAI writes in dev (test image generation locally) |
| `ALLOW_EXTERNAL_WRITES` | `/api/voice/generate`, `/api/image/generate`, `/api/image/compose` | `"true"` = real LLM/image calls; otherwise dry-run. Server-side only; never client-controlled. |
| `ALLOW_FORCE_LIVE` | `/api/engine/generate` | `"true"` = honor header `X-Force-Live: 1` to bypass dry-run. Default false; Force-Live cannot accidentally bypass dry-run when unset. |
| `ALLOW_PREVIEW_LIVE_TEST` | `/api/dev/preflight`, `/api/dev/beauty-live-once`, `/api/dev/verify-report` | `"1"` = allow dev routes on Vercel Preview (NODE_ENV=production). Use for full-cylinders LIVE test on Preview. |
| `NEXT_PUBLIC_SHOW_DEV_CONTROLS` | (other pages) | `"1"` = show dev controls. Conversion-first Beauty landing no longer renders Dev Live pipeline section. |
| `NEXT_PUBLIC_WAITLIST_ONLY` | `BeautyLandingClient.jsx` | `"0"` = re-enable purchase flow. Default (unset) = waitlist-only. |
| *(removed)* `BRAND_LOGO_PATH` | — | No longer used. Compose always uses `GLOBAL_LOGO_PATH` from `lib/brand.ts`. |
| `ENABLE_PLACEHOLDER_LOGO` | `/api/image/compose`, `/api/ligs/status` | `"true"` = use "(L)" SVG placeholder when global logo file missing. Default false. Demo-safe. |
| `BLOB_READ_WRITE_TOKEN` | `lib/report-store.ts`, `lib/beauty-profile-store.ts` | Vercel Blob for reports, beauty profiles, images; if unset, reports in-memory, beauty profiles unavailable (E.V.E. still needs Blob for production) |
| `STRIPE_SECRET_KEY` | `/api/stripe/create-checkout-session`, `/api/stripe/webhook` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Webhook signature verification |
| `RESEND_API_KEY` | `/api/email/send-beauty-profile`, `lib/email-waitlist-confirmation` | Resend (preferred if set) |
| `SENDGRID_API_KEY` | `/api/email/send-beauty-profile`, `lib/email-waitlist-confirmation` | SendGrid fallback |
| `EMAIL_FROM` | `/api/email/send-beauty-profile`, `lib/email-waitlist-confirmation` | From address (default `Beauty`/`LIGS <onboarding@resend.dev>`) |
| `NODE_ENV` | Report 404 debug, engine quota detail, form dev defaults, `/api/dev/live-once` 403 guard | Development vs production behavior |
| `DEBUG_PROMPT_AUDIT` | `/api/engine/generate` | `"1"` = log PROMPT_AUDIT (hasHardConstraints, hasForbiddenList, hasBirthContext, head) before OpenAI call |
| `DEBUG_PERSISTENCE` | `/api/engine/generate` | `"1"` = when Blob write fails, return 200 with UNSAVED reportId and full_report (dev fallback) |

**Required for full production:**

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN` (required for Beauty flow and persisted reports)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (for paid Beauty)
- One of `RESEND_API_KEY` or `SENDGRID_API_KEY` (for post-purchase email and waitlist confirmation)

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
| **Vercel Blob** | Reports `ligs-reports/{reportId}.json`, Beauty V1 `ligs-beauty/{reportId}.json`, images `ligs-images/{reportId}/{slug}.png|jpg`, keepers `ligs-keepers/{reportId}.json`, DRY keepers `ligs-keepers-dry/{reportId}.json`, exemplars `ligs-exemplars/{archetype}/{version}/{slug}.png` and `manifest.json` |
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

## Verification Log – 2026‑03‑09 (Vercel build fix — route export)

**Route export fix:** Next.js (Webpack) rejects route files that export non-handler functions. Extracted `buildReportGenerationPrompt` and helpers to `lib/engine/buildReportGenerationPrompt.ts`. Route `app/api/engine/generate/route.ts` now imports from lib; only exports `POST`. Test `buildReportGenerationPrompt.test.ts` imports from lib. Builds pass (Turbopack + Webpack).

## Verification Log – 2026‑03‑09 (Canonical archetype descriptive layers)

**Contract preview block:** Extended `ArchetypeContract` with `preview: { humanExpression, civilizationFunction, archetypalVoice, environments }` for all 12 archetypes. **Adapter:** `getArchetypePreviewDescriptor(archetype)` in `src/ligs/archetypes/adapters.ts` returns preview from contract. **archetype-preview-config.js:** Teaser content (civilizationFunction, environments) now sourced from contract via adapter; removed duplicate `TEASER_BY_ARCHETYPE`. Preview/report pages read civilization function from canonical contract. No resolver, timing, layout, or image mapping changes.

## Verification Log – 2026‑03‑08 (Archetype public asset name cleanup)

**Standardized naming:** All archetype image folders renamed to `public/{archetype}-images/` (e.g. `aequilibris-images`, `fluxionis-images`). Files: `{archetype}-prime1.png`, `prime2`, `prime3` (fixed `innovaros_prime3.png` → `innovaris-prime3.png`). `lib/archetype-public-assets.ts` updated to match. No API or preview logic changed.

## Verification Log – 2026‑03‑08 (Archetype public asset wiring)

**Public asset mapping:** `lib/archetype-public-assets.ts` maps archetype → `{ marketingBackground, exemplarCard, shareCard }` from existing public folders (e.g. `stabiliora-images`, `fluxionis-images`). Mapping: prime1=marketingBackground, prime2=exemplarCard, prime3=shareCard. **Beauty API:** When Blob manifest missing, use public assets first; else Ignis→IGNIS_V1_ARTIFACTS, others→locked static. **Exemplars API:** When Blob manifest null, build manifest from public assets; all 12 archetypes now return manifests when public folders exist. **getExemplarManifestsServer:** Same fallback logic. Landing grid and preview flow use real public images; locked fallback only when public assets missing.

## Verification Log – 2026‑03‑08 (Exemplar manifest-first contract)

**API beauty route:** Exemplar path now uses manifest-first for all archetypes. When manifest exists (from `loadExemplarManifestWithPreferred`), `imageUrls` come from `manifest.urls` (marketingBackground, exemplarCard, shareCard). When manifest missing: Ignis → `IGNIS_V1_ARTIFACTS` fallback; non-Ignis → locked static `/exemplars/{archetype}.png`. Removed Ignis-only branch that always used IGNIS_V1_ARTIFACTS.

---

## Verification Log – 2026‑03‑08 (Preview polish + canonical archetypes)

**Preview text:** Phase text in PreviewRevealSequence made archetype-neutral: "Resolving archetype signature...", "Archetype signature identified.", "This is a visual representation of how your archetype expresses." Phase 4–5 unchanged. **Canonical archetypes:** Added `lib/archetypes.js` with `LIGS_ARCHETYPES`; resolveArchetypeFromDate, API beauty route, LandingPreviews, archetype-preview-config now import from lib/archetypes. **Teaser config:** `lib/archetype-preview-config.js` expanded to all 12 archetypes with `teaser: { civilizationFunction, environments }`. PreviewRevealSequence uses `getArchetypePreviewConfig(arch).teaser` for post-reveal block.

---

## Verification Log – 2026‑03‑08 (Archetype-matched locked preview images)

**Origin → preview flow:** User birth date on /origin now resolves archetype via `lib/terminal-intake/resolveArchetypeFromDate.js` (approximateSunLongitude + 12×30° segments) → redirect to `exemplar-{Archetype}`. **API:** GET `/api/beauty/[reportId]` for non-Ignis exemplars without manifest: returns synthetic profile with `imageUrls: [/exemplars/{archetype}.png]` × 3, `isLockedPreview: true`. **PreviewRevealSequence:** When `profile.isLockedPreview`, phases 3 and 5 show pill-shaped "Unlocking" blur overlay (same treatment as LandingPreviews). Ignis unchanged (v1 assets); other 11 archetypes use existing `public/exemplars/*.png` assets. Archetype validation: `LIGS_ARCHETYPES` on API; unknown archetype → 404.

---

## Verification Log – 2026‑03‑08 (PreviewRevealSequence)

**Top-loaded exemplar reveal:** For exemplar preview only, replaced `TerminalResolutionSequence` with `PreviewRevealSequence`. BeautyViewClient waits for profile, then renders `PreviewRevealSequence` (profile-driven, 8-phase terminal reveal: glyph → Vector Zero → cosmic twin copy → human integration → final artifact build). Single persistent image area. On complete → `InteractiveReportSequence`. `TerminalResolutionSequence` retained but not used for exemplar.

---

## Verification Log – 2026‑03‑07 (Dossier removal)

**Dossier permanently removed:** `/beauty/view` now renders only the terminal preview flow. Exemplar: `TerminalResolutionSequence` → `InteractiveReportSequence`. Real report: `InteractiveReportSequence` only. Missing/invalid reportId: simple error state + link to /origin. Deleted: RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, PreviewCarousel, ShareCard, ShareCard.test.jsx. No WHOIS grid, no registry cards, no dossier layout. BeautyViewClient simplified; InteractiveReportSequence is the only report surface.

---

## Verification Log – 2026‑03‑07 (Dossier removal)

**Dossier permanently removed:** BeautyViewClient now renders only the terminal preview flow. Exemplar: TerminalResolutionSequence → InteractiveReportSequence. Real report: InteractiveReportSequence only. Missing/invalid reportId: simple error state + link to /origin. Deleted: RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, PreviewCarousel, ShareCard, ShareCard.test.jsx. No WHOIS grid, no registry cards, no dossier layout. ArchetypeArtifactCard retained for LigsStudio.

---

## Verification Log – 2026‑03‑07 (Dossier removal)

**Dossier permanently removed:** BeautyViewClient now renders only the terminal preview flow. Exemplar: TerminalResolutionSequence → InteractiveReportSequence. Real report: InteractiveReportSequence only. Missing/invalid reportId: simple error state + link to /origin. Deleted: RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, PreviewCarousel, ShareCard, ShareCard.test.jsx. No WHOIS grid, no registry cards, no dossier layout.

---

## Verification Log – 2026‑03‑07 (Dossier removal)

**Dossier permanently removed:** BeautyViewClient now renders only the terminal preview flow. Exemplar: TerminalResolutionSequence → InteractiveReportSequence. Real report: InteractiveReportSequence only. Missing/invalid reportId: simple error state + link to /origin. Deleted: RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, PreviewCarousel, ShareCard, ShareCard.test.jsx. No WHOIS grid, no registry cards, no dossier layout.

---

## Verification Log – 2026‑03‑07 (Dossier removal)

**Dossier removed:** BeautyViewClient now renders only the terminal preview flow. Exemplar: TerminalResolutionSequence → InteractiveReportSequence. Real report: InteractiveReportSequence only. Missing/invalid reportId: simple error state + link to /origin. Deleted: RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, PreviewCarousel, ShareCard, ShareCard.test.jsx. No WHOIS grid, no registry cards, no dossier layout.

---

## Verification Log – 2026‑03‑07 (Dossier removal)

**Dossier removed:** BeautyViewClient now renders only the terminal preview flow. Exemplar: TerminalResolutionSequence → InteractiveReportSequence. Real report: InteractiveReportSequence only. Missing/invalid reportId: simple error state + link to /origin. Deleted: RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, PreviewCarousel, ShareCard, ShareCard.test.jsx. No WHOIS grid, no registry cards, no dossier layout.

---

## Verification Log – 2026‑03‑07 (Report composition layer)

**Report composition:** Added `lib/report-composition.ts` with `composeArchetypeSummary`, `composeLightExpression`, `composeCosmicTwin`, `composeReturnToCoherence`. Each returns 1–2 complete sentences. Rules: no repetition of archetype resolution; cosmic analogue appears only in TerminalResolutionSequence; phrase-bank fragments converted to full sentences; Key Moves lists converted to readable practice phrases; no generic fallbacks. InteractiveReportSequence uses composition layer; ARCHETYPE RESOLVED step uses non-repeating "The registry classifies this identity within the X regime."

## Verification Log – 2026‑03‑07 (Report composition layer)

**Report composition:** Added `lib/report-composition.ts` with `composeArchetypeSummary`, `composeLightExpression`, `composeCosmicTwin`, `composeReturnToCoherence`. Converts phrase-bank fragments into complete sentences. No repetition of archetype resolution or cosmic analogue (those appear once in TerminalResolutionSequence). Key Moves lists converted to readable practice sentences. No generic fallbacks. InteractiveReportSequence uses composition layer; step 1 uses non-repeating "The registry classifies this identity within the X regime."

## Verification Log – 2026‑03‑07 (Report composition layer)

**Report composition:** Added `lib/report-composition.ts` with `composeArchetypeSummary`, `composeLightExpression`, `composeCosmicTwin`, `composeReturnToCoherence`. Converts phrase-bank fragments into complete sentences. No repetition of archetype resolution or cosmic analogue (those appear once in TerminalResolutionSequence). Key Moves lists converted to readable practice sentences. No generic fallbacks. InteractiveReportSequence uses composition layer; step 1 uses non-repeating "The registry classifies this identity within the X regime."

## Verification Log – 2026‑03‑07 (Interactive Report Sequence)

**Exemplar flow:** After TerminalResolutionSequence completes, exemplar previews show `InteractiveReportSequence` instead of the dossier. 6-step stack reveal: ARCHETYPE RESOLVED → ARCHETYPE SUMMARY → LIGHT EXPRESSION → COSMIC TWIN RELATION → ARTIFACT REVEAL → RETURN TO COHERENCE. Enter/tap to continue (canonical: "Press ENTER or tap to continue"); last step shows "Return to Origin" only. Components: `InteractiveReportSequence`, `ReportStep`, `ContinuePrompt`. `buildIgnisSteps(profile)` tightened: summary (hit + phenomenon/behavioral), light expression (oracle/custodian/emotionalSnippet/behavioral), cosmic twin (phenomenon-specific), return (key moves/cv/resetMove). Dossier bypassed for exemplar flow.

**Hard alignment pass (2026-03-07):** `/origin` is design law. Removed `/beauty/sample-report` from public flow (redirects to /origin). Standardized continue prompts to "Press ENTER or tap to continue" across OriginTerminalIntake, TerminalResolutionSequence (uses ContinuePrompt component), InteractiveReportSequence. Aligned BeautyViewClient surfaces (select report, loading, error, dossier) to terminal: black bg #0a0a0b, white text, same spacing. Removed SeeMoreSampleReport from dossier.

**Cleanup + alignment (2026-03-07):** Deleted `SeeMoreFootnote.jsx` (SeeMoreSampleReport, SeeMoreUnlock) — dead code after sample-report removal. `/beauty/start`, `/beauty/success`, `/beauty/cancel` already terminal-aligned: black bg #0a0a0b, origin-terminal box, mono text, terminal footer. LigsFooter removed from success/cancel. No public links to /beauty/sample-report.

## Verification Log – 2026‑03‑07 (Ignis-authored report surface)

**Minimum viable refactor:** When `profile.dominantArchetype === "Ignispectrum"` or `profile.isExemplar`, dossier main gets `ignis-report-surface` class. **Shell:** Overrides `--registry-accent` (#b8956b), `--registry-accent-muted`, `--registry-border` (#2e2b28); links to origin use accent. **Section grammar:** `.report-section` on WHOIS block, RegistrySummary, PreviewReportSummary, CosmicTwinRelation, WhoisReportSections, Archetype Artifact, Identity Artifacts. Ignis overrides: 2px left border, muted accent, 6px radius, lighter shadow. WHOIS block keeps full accent on left edge. No copy changes; data flow unchanged.

## Verification Log – 2026‑03‑08 (Archetype image carousel — glyph reveal replaced)

**ArchetypeResolveCarousel:** New reusable component cycles through archetype images, then resolves onto the correct archetype. Uses `getArchetypeStaticImagePath` from `lib/archetype-static-images`. Timing: `cycleDurationMs` 480, `cycleCount` 6, `resolveTransitionMs` 700, `resolveHoldMs` 1400. **PreviewRevealSequence** Phase 2: replaced single-image fade with carousel; phase advance driven by `onResolve` (not timer). **Glyph-based reveal removed** — no glyph fade, glyph formation, or glyph overlay in this flow. CSS: `.archetype-resolve-carousel`, `.archetype-resolve-settled`. Removed `.preview-archetype-phase2-sequence` keyframes. TerminalResolutionSequence unchanged (not in active exemplar flow).

## Verification Log – 2026‑03‑08 (Origin carousel integration)

**Origin archetype resolve:** OriginTerminalIntake now uses ArchetypeResolveCarousel during `archetypeResolve` phase. Flow: processing completes → "Resolving archetype signature..." → carousel slot (max-w 200px, min-h 200px) cycles archetype images with deceleration (380ms → 580ms) → resolves to `finalArchetype` from birth date → onResolve adds "Primary archetype detected: {archetype}", "Identity record ready." → postResolve (waitlist or CTA). **Deceleration:** `CAROUSEL_CONFIG` uses `cycleDurationStartMs` 380, `cycleDurationEndMs` 580; `getCycleDelayMs` interpolates per index. No layout/copy changes beyond reveal replacement.

## Verification Log – 2026‑03‑08 (Origin archetype resolve polish)

**Visual integration:** `.origin-archetype-resolve-panel` — softer border (rgba 0.7), subtle gradient background, 10px radius, inset highlight + drop shadow; responsive min-height (180px mobile, 200px sm+). **Reduce boxiness:** Border and bg tuned for terminal blend; `.archetype-resolve-in-terminal` adds object-fit: contain for legible image. **Final resolve:** `.archetype-resolve-settled` refined to opacity 1, scale 1.015, 0.5s transition; more conclusive feel. **Copy timing:** `onSettle` callback fires when final image visually settles (start of resolve_hold); terminal lines "Primary archetype detected" + "Identity record ready" appear in sync with settle; `resolveHoldMs` 700 for origin. **Mobile:** Panel uses min(100%, 200px) width, responsive margins. **Preview/origin consistency:** Same settled CSS, same carousel motion language.

## Verification Log – 2026‑03‑08 (Origin pacing + enter prompt fix)

**Enter prompt bug:** Input row (">" and blinking cursor) was showing during countdown/processing/archetypeResolve. Root cause: condition `phase === "completeAwaitingEnterRedirect"` alone; countdown runs during that phase. Fix: `showInputRow` now requires `countdownRemaining == null` for completeAwaitingEnterRedirect — input hidden during countdown (3, 2, 1). User can still press Enter (document keydown) to skip. **Slower flow:** BOOT_DELAYS_MS ~5.9s (was ~3.9s); PROCESSING_DELAYS_MS ~11.7s (was ~6.8s); 900ms pause before "Resolving archetype signature..."; carousel 520→780ms cycle, 900ms transition, 1100ms hold; countdown 1200ms/tic. **Pacing:** Varied, not mechanical; longer dwells on meaningful steps.

## Verification Log – 2026‑03‑08 (Origin final pacing refinement)

**Feel pass:** Boot delays tightened (480ms breathe vs 600) to avoid dead air; processing delays irregular (820, 1680, 2140, 1980, 2680, 920, 1720). **Micro-pauses:** 1150ms before "Resolving archetype signature..."; 550ms `resolvePauseBeforeFinalMs` before final image lands; 480ms between "Primary archetype detected" and "Identity record ready." **Carousel search+resolve:** 400→920ms cycle (faster scan, slower evaluation); final image gets `archetype-resolve-settled` immediately on land (opacity 1, distinct from cycle 0.88); onSettle at start of resolve_transition so copy syncs with visual. **Enter prompt:** No regression; showInputRow logic unchanged.

## Verification Log – 2026‑03‑08 (Origin rollback — carousel removed)

**Origin restored to iconic terminal landing.** ArchetypeResolveCarousel, archetypeResolve phase, postResolve phase, origin-archetype-resolve-panel, and all preview-style resolve logic removed from `/origin`. Flow: boot → intake → processing → "Primary archetype detected: —", "Identity record ready." → waitlist/CTA → completeAwaitingEnterRedirect. Original BOOT_DELAYS_MS and PROCESSING_DELAYS_MS restored. Redirect to exemplar-Ignispectrum. **PreviewRevealSequence unchanged** — carousel remains in /beauty/view exemplar flow only. **Clean separation:** landing/intake vs preview/report reveal.

## Verification Log – 2026‑03‑08 (Final cleanup — image-first)

**Final cleanup pass:** (1) Deleted `lib/archetype-glyph-registry.ts` — dead code, no imports. (2) Renamed `glyphPath` → `archetypeImagePath`, `glyphUsed` → `archetypeVisualUsed` in static-overlay; kept `glyphPath`/`glyphUsed` in API response for backward compat. (3) Updated LigsStudio, ignis-landing, exemplars/generate comments to archetype image terminology. (4) Hardened archetype-static-images: added `getArchetypeStaticImagePathOrFallback`, Fluxionis→fluxonis note. (5) CSS: archetype-overlay-fade-in, archetype-solo-fade-in animations; refined opacity. (6) Added `docs/ARC-STATIC-IMAGES-REVIEW.md` for manual asset cleanup tracking.

## Verification Log – 2026‑03‑08 (Archetype static images — glyph removal)

**Visual system:** Removed glyph SVGs, glyph overlays, glyph formation animations, and glyph fade logic. Replaced with archetype static images from `public/arc-static-images/`. **Mapping:** `lib/archetype-static-images.ts` — `getArchetypeStaticImagePath(archetype)`, `hasArchetypeStaticImage`, `ARC_STATIC_FALLBACK`. **Preview config:** `lib/archetype-preview-config.js` uses static images via `archetypeStaticImagePath` / `hasArchetypeVisual` (no glyphPath). **Components:** LandingPreviews, BeautyLandingClient, PreviewRevealSequence, ArchetypeArtifactCard, ReportStep, InteractiveReportSequence, TerminalResolutionSequence — all use archetype static images. **Compose/marketing:** compose-card, static-overlay use `getArchetypeStaticImagePath` for archetype anchor. **LigsStudio:** Proof overlay and dry compose use archetype static image (not glyph). **CSS:** `.archetype-static-image-overlay` (opacity, blend, contain); `.preview-archetype-*`, `.artifact-resolution-archetype-solo`. **Fallback:** Missing archetype → Ignispectrum image or graceful omit. Image-generation prompts (glyphField, glyphConditionedBackground) unchanged — glyph terminology retained for legacy AI prompts.

## Verification Log – 2026‑03‑07 (Preview + email flow lockdown)

**Mobile/phone stabilization:** OriginTerminalIntake — tap-to-continue row (completeAwaitingEnterRedirect) with min-h-[44px], cursor-pointer, onClick=redirectNow; overflow-x-hidden, min-w-0 on container. TerminalResolutionSequence — touch-manipulation on continue control; overflow-x-hidden, min-w-0. Sample report — min-h-[44px], touch-manipulation on nav links. No layout or copy changes.

## Verification Log – 2026‑03‑07 (Waitlist email confirmation)

**Waitlist email capture and confirmation:** `lib/waitlist-store.ts` — Blob at `ligs-waitlist/entries/{sha256(email).slice(0,32)}.json`; `insertWaitlistEntry` with duplicate check via `head()` before `put()`. Stored fields: email, created_at, source, preview_archetype?, solar_season?. `lib/email-waitlist-confirmation.ts` — `sendWaitlistConfirmation` via Resend or SendGrid; LIGS-voice body. **API:** POST `/api/waitlist` accepts `birthDate`; computes `preview_archetype` and `solar_season` from `approximateSunLongitudeFromDate` + `getPrimaryArchetypeFromSolarLongitude`. Duplicate → 200 `{ ok: true, alreadyRegistered: true }` (no resend). New → confirmation (fire-and-forget) → 200 `{ ok: true, confirmationSent: true }`. **OriginTerminalIntake:** passes `birthDate`; success messages "Contact node recorded.", "Early registry status confirmed.", "Registry confirmation transmitted." (when confirmationSent).

## Verification Log – 2026‑03‑07 (Archetype preview refactor)

**Archetype preview config:** Added `lib/archetype-preview-config.js` with `ARCHETYPE_PREVIEW_CONFIG`, `getArchetypePreviewConfig(archetype)`, and `buildPlaceholderSvg(displayName)`. Ignispectrum: displayName "IGNISPECTRUM", glyphPath "/glyphs/ignis.svg", sampleArtifactUrl from `IGNIS_LANDING_URL`. Unknown archetypes: displayName = archetype.toUpperCase(), glyphPath/sampleArtifactUrl null, hasGlyph/hasSampleArtifact false. **TerminalResolutionSequence:** Uses config for thumbnail (sampleArtifactUrl || buildPlaceholderSvg), glyph (only when hasGlyph), label (config.displayName). **ArchetypeArtifactCard:** showGlyphOverlay + getArchetypePreviewConfig for archetype-specific glyph. **PreviewCarousel:** glyphOverlayArchetype prop; glyphOverlayForIgnis backward compat. **BeautyViewClient:** glyphOverlayArchetype={profile.isExemplar ? profile.dominantArchetype : null}; showGlyphOverlay when isExemplar && config.hasGlyph. **globals.css:** .archetype-glyph-overlay (same rules as .ignis-glyph-overlay). Ignis unchanged.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake` (birth date) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS` for local resolution. Timed line reveals; 3–5 archetype snippet lines from `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank`; Ignis exemplar thumbnail; auto-advance to dossier (no Enter). No pre-purchase engine/API hit. Same black/white terminal styling as /origin.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS` for local resolution. Snippet from `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank`. Sample artifact: Ignis v1 exemplar_card (only client-side asset). Auto-advances to dossier after ~2.2s. No pre-purchase engine/API hit. `lib/landing-storage`: `saveOriginIntake`/`getOriginIntake` persist intake from /origin.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `reportId` starts with `exemplar-`, BeautyViewClient shows TerminalResolutionSequence first. Sequence: (L)IGS SYSTEM CONTINUING SESSION → Retrieving local/cosmic metadata → Resolving solar season/archetype → Your cosmic metadata begins in [season] → This resolves into [archetype] → 3–5 archetype snippet lines (from getMarketingDescriptor, getCosmicAnalogue, getArchetypePhraseBank) → sample artifact thumbnail → auto-advance to dossier. Uses getOriginIntake (birthDate) → approximateSunLongitudeFromDate → getPrimaryArchetypeFromSolarLongitude. No pre-purchase engine/API hit. Profile fetch runs in parallel; dossier revealed after sequence completes.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake()` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS` for local resolution. No API calls. Timed line reveals, 3–5 archetype snippet lines from `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank`, sample artifact thumbnail (Ignis v1), auto-advance to dossier. Reuses existing lib/ mappings; no new engine/API hit before purchase.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake()` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS` for local resolution. No API calls. Timed line reveals, 3–5 archetype snippet lines from `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank`, sample artifact thumbnail (Ignis v1), auto-advance to dossier. Reuses existing lib mappings; no new engine/API hit before purchase.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake()` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS` for local resolution. No API calls. Timed line reveals (Retrieving local/cosmic metadata, Resolving solar season/archetype) → personal archetype snippet (3–5 lines from `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank`) → sample artifact thumbnail → auto-advance to dossier after 2.2s. Same black/white terminal look as /origin. `lib/landing-storage`: `saveOriginIntake` / `getOriginIntake` persist intake from OriginTerminalIntake.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake()` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS` for local resolution. No API calls. Timed line reveals, 3–5 archetype snippet lines from `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank`, sample artifact thumbnail (Ignis v1), auto-advance to dossier. Same black/white terminal look as /origin. `lib/landing-storage.js`: `saveOriginIntake` / `getOriginIntake` for intake passed from origin.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `reportId` starts with `exemplar-`, BeautyViewClient shows TerminalResolutionSequence first. Uses `getOriginIntake()` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → SOLAR_SEASONS, getMarketingDescriptor, getCosmicAnalogue, getArchetypePhraseBank. No API calls before purchase. Timed line reveals → personal archetype snippet (3–5 lines) → sample artifact thumbnail → auto-advance to dossier. Same black/white terminal look as /origin. TerminalResolutionSequence component added.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Exemplar preview flow:** When `reportId` starts with `exemplar-`, BeautyViewClient shows TerminalResolutionSequence first. Uses `getOriginIntake` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → SOLAR_SEASONS, getMarketingDescriptor, getCosmicAnalogue, getArchetypePhraseBank. No API calls. Timed line reveals → personal archetype snippet (3–5 lines) → sample artifact thumbnail → auto-advance to dossier. Same black/white terminal look as /origin. TerminalResolutionSequence component added.

## Verification Log – 2026‑03‑07 (Terminal resolution preview)

**Terminal resolution sequence:** When `/beauty/view?reportId=exemplar-*`, shows `TerminalResolutionSequence` first (continuation of /origin). Uses `getOriginIntake` (birthDate) → `approximateSunLongitudeFromDate` → `getPrimaryArchetypeFromSolarLongitude` → `SOLAR_SEASONS`, `getMarketingDescriptor`, `getCosmicAnalogue`, `getArchetypePhraseBank` for 3–5 archetype snippet lines. Timed line reveals, sample artifact thumbnail (Ignis v1), auto-advance to dossier. No pre-purchase engine/API hit. Same black/white terminal look as /origin.

## Verification Log – 2026‑03‑06 (Sample report navigation)

**Sample report:** Added "← Return to preview dossier" navigation (top + bottom) linking to `/beauty/view?reportId=exemplar-Ignispectrum`. Kept "← Back to Origin" as secondary. Registry-ctrl styling; flex layout for mobile/desktop. Preview dossier → sample report flow unchanged (SeeMoreSampleReport).

## Verification Log – 2026‑03‑05 (Report layer: reuse existing data)

**Preview Report Summary:** Refactored to use profile data (light_signature, archetype, deviations, corrective_vector, fullReport/Key Moves, cosmicAnalogue from buildArtifactsFromProfile). No static exemplar text. **RegistrySummary:** Enabled for exemplars (removed isExemplar guard); now populates from buildExemplarSyntheticSections + buildExemplarFullReport for Ignis sample. **Sample report:** Unchanged; still static `lib/sample-report.ts` (SAMPLE_REPORT_IGNIS).

## Verification Log – 2026‑03‑05 (Report layer: use existing profile data)

**Preview Report Summary:** Refactored to use existing profile data (light_signature, archetype, deviations, corrective_vector, fullReport/Key Moves, cosmicAnalogue from buildArtifactsFromProfile). No static exemplar text. **RegistrySummary:** Enabled for exemplars (removed isExemplar → null); Ignis sample now gets regime, stability, return from synthetic sections. **Sample report:** Unchanged; still powered by lib/sample-report.ts. No new parallel report architecture.

## Verification Log – 2026‑03‑05 (Report layer: use existing profile data)

**Preview Report Summary:** Refactored to use existing profile data (light_signature, archetype, deviations, corrective_vector, fullReport/Key Moves, cosmicAnalogue from buildArtifactsFromProfile). No static exemplar text. **RegistrySummary:** Enabled for exemplars; now renders for both real reports and exemplars. Exemplar Ignis sample gets meaningful summary from buildExemplarSyntheticSections + buildExemplarFullReport. **Sample report:** Unchanged; remains static (lib/sample-report.ts).

## Verification Log – 2026‑03‑05 (Report layer: reuse existing data)

**Preview Report Summary:** Refactored to use profile data (light_signature, archetype, deviations, corrective_vector, fullReport/Key Moves, cosmicAnalogue from buildArtifactsFromProfile). No static exemplar text. **RegistrySummary:** Enabled for exemplars; now renders for both real reports and exemplars. **Sample report:** Unchanged; remains powered by static `lib/sample-report.ts` (SAMPLE_REPORT_IGNIS).

## Verification Log – 2026‑03‑05 (Report layer: reuse existing data)

**Preview Report Summary:** Refactored to use profile data (light_signature, archetype, deviations, corrective_vector, fullReport/Key Moves, cosmicAnalogue from buildArtifactsFromProfile). No static exemplar text. **RegistrySummary:** Enabled for exemplars; now renders for both real reports and exemplars. Exemplar Ignis sample record populates from buildExemplarSyntheticSections + buildExemplarFullReport. **Sample report:** /beauty/sample-report remains static (lib/sample-report.ts). No new parallel report architecture.

## Verification Log – 2026‑03‑05 (Report layer stabilization)

**Preview Report Summary:** Added REPORT SUMMARY block to /beauty/view after Registry Summary, before Field Conditions. 5–7 lines of Ignispectrum exemplar text; calm scientific tone. PreviewReportSummary component. **Sample report:** /beauty/sample-report uses `lib/sample-report.ts` (SAMPLE_REPORT_IGNIS) with six sections: INITIATION, COSMIC TWIN RELATION, FIELD CONDITIONS, ARCHETYPE EXPRESSION, DEVIATIONS, RETURN TO COHERENCE. **Connect preview to sample:** "See more: open sample full record →" footnotes (SeeMoreSampleReport) link to /beauty/sample-report; appear after Report Summary, Cosmic Twin, Field Conditions, Archetype Artifact.

## Verification Log – 2026‑03‑06 (Preview depth: Cosmic Twin + sample report)

**Preview flow:** Added Cosmic Twin Relation block (after Registry Summary, before Field Conditions). Added "See more: open sample full record →" footnotes to Cosmic Twin, Field Conditions, Archetype Artifact; link to `/beauty/sample-report`. New route `/beauty/sample-report`: sample full report with longer interpretive sections; "See more: unlock your full identity record →" footnotes link to `/origin`. Registry styling consistent across preview and sample report.

## Verification Log – 2026‑03‑06 (Preview depth + sample report)

**Cosmic Twin Relation:** New section on /beauty/view after Registry Summary, before Field Conditions. Explains subject–cosmic analogue relationship in registry voice. **See more footnotes:** Preview sections (Cosmic Twin, Field Conditions, Archetype Artifact) link to /beauty/sample-report. **Sample report:** New route /beauty/sample-report with deeper interpretive sections; footnotes link to /origin (unlock flow). CosmicTwinRelation, SeeMoreFootnote (SeeMoreSampleReport, SeeMoreUnlock) components added.

## Verification Log – 2026‑03‑06 (Cosmic Twin Relation + sample report flow)

**Preview extensions:** Added Cosmic Twin Relation summary block to /beauty/view (after Registry Summary, before Field Conditions). Added "See more: open sample full record →" footnotes to Cosmic Twin Relation, Field Conditions & Resolved Identity, and Archetype Artifact sections; links to /beauty/sample-report. New route /beauty/sample-report: sample full report with longer interpretive sections (WHOIS, Registry Summary, Cosmic Twin, Field Conditions, Archetype Expression, Deviations); "See more: unlock your full identity record →" footnotes link to /origin. CosmicTwinRelation, SeeMoreFootnote (SeeMoreSampleReport, SeeMoreUnlock) components added.

## Verification Log – 2026‑03‑06 (Preview depth + sample report)

**Cosmic Twin Relation:** New section on /beauty/view after Registry Summary, before Field Conditions. Explains subject–cosmic analogue relationship in registry voice. **See more footnotes:** Preview sections (Cosmic Twin, Field Conditions, Archetype Artifact) link to /beauty/sample-report. **Sample report:** New route /beauty/sample-report with deeper interpretive sections; footnotes link to /origin (unlock flow). CosmicTwinRelation, SeeMoreFootnote (SeeMoreSampleReport, SeeMoreUnlock) components added.

## Verification Log – 2026‑03‑05 (Locked baseline to production)

**Deployment:** Locked baseline shipped to ligs.io. Commit `3a85273`. Origin uses OriginTerminalIntake (terminal flow, WAITLIST_ONLY); Enter redirects to exemplar-Ignispectrum. `/api/beauty/exemplar-Ignispectrum` returns 200 with synthetic exemplar. WHOIS sections, RegistrySummary, Ignis exemplar wiring included. See docs/LIGS-LOCKDOWN-SNAPSHOT.md, docs/PRODUCTION-DEPLOYMENT-VERIFICATION.md.

## Verification Log – 2026‑03‑04 (Landing locked)

**Landing lock:** `.cursor/rules/landing-lock.mdc` — always-applied rule forbids edits to BeautyLandingClient, LandingPreviews, origin page/layout, and origin styles in globals.css without explicit user approval. No reformatting, refactoring, or auto-fixing. Source files carry `DO NOT REFORMAT OR REFACTOR` comments.

## Verification Log – 2026‑03‑04 (Finish repo hygiene)

**Root fallback:** Restored `app/page.tsx` — redirects `/` to `/origin` if middleware bypassed. **TypeScript:** Fixed NODE_ENV assignment (cast `process.env` in tests); fixed regex `s` flag in glyphField.test (use `[\s\S]` instead). **Lint:** Renamed `useBlob` → `isBlobEnabled` in exemplar-store, keeper-manifest, idempotency-store, report-store, beauty-profile-store; fixed MarketingHeader setLoadingVisuals queueMicrotask. `npx tsc --noEmit`, `npm run build`, `npm run lint` all pass.

## Verification Log – 2026‑03‑04 (Production hygiene pass)

**Build/lint:** Fixed prefer-const (engine, exemplars/generate, triangulatePrompt); react/no-unescaped-entities (not-found, BeautyLandingClient, LigsStudio); set-state-in-effect (success, LandingPreviews, MarketingHeader) via queueMicrotask defer. **Cleanup:** Removed redundant app/page.tsx (middleware rewrite handles /→/origin). **Perf:** Added width/height (1024×1024) to Ignis hero img and ExemplarSlot imgs to prevent layout shift. **Origin:** No SSR Blob fetch; client fetches exemplars; IGNIS_LANDING_URL single source of truth; glyph overlay + locked-blur intact.

## Verification Log – 2026‑03‑04 (Landing polish: hero tagline, CTA, labels, form trust, OG meta)

**Hero:** Added muted line "(L)igs: Helping Humans Integrate Since 2026" under "(L)igs — The physics of you." Footer unchanged. **CTA:** Primary "Begin your Light Identity Report →" + secondary text link "Join Early Access" (scrolls to #form). **Labels:** Ignispectrum (Title Case) for headings; generic "UNLOCKING SOON" chip in waitlist + grid (no "IGNISPECTRUM unlocking soon"). **Form:** "No spam. Early access only." under waitlist submit; placeholder `your@email.com`. **OG meta:** origin/layout.tsx: title/description/OG/Twitter match hero; og:image = IGNIS_LANDING_URL. Root layout: added og:image (was missing).

## Verification Log – 2026‑03‑04 (Ignis glyph overlay)

**Glyph overlay:** `.ignis-glyph-overlay` in globals.css — position: absolute; inset: 0; margin: auto; width: 40%; opacity: 0.38; faint drop-shadow glow; z-index: 20. Hero tile + Examples grid Ignis tile both layer `/glyphs/ignis.svg` above base image. No filter; SVG stays transparent.

## Verification Log – 2026‑03‑04 (Hydration mismatch fixes)

**"missing required error components, refreshing" fix:** Moved `window.location` / `getDryRunFromUrl()` / `getTestModeFromUrl()` from render to `useEffect` in BeautyLandingClient, beauty/start, BeautyViewClient. SSR/client now match on first paint; URL flags applied after mount. Added `dev:no-overlay` script (NEXT_DISABLE_ERROR_OVERLAY=1) for diagnosis.

## Verification Log – 2026‑03‑04 (Origin 500 fix)

**Internal server error:** Removed `getExemplarManifestsServer` call from `/origin` page. Page is now sync; client fetches exemplars via `/api/exemplars`. Avoids 500 when Blob/network fails during SSR. Ignis still uses `IGNIS_LANDING_URL`; grid uses client-fetched manifests or static fallbacks.

## Verification Log – 2026‑03‑04 (Lock Ignis v1 + restore locked blur overlays)

**Ignis:** Hero and Examples use `IGNIS_LANDING_URL` (v1 exemplar_card); no API override. **Blur overlays:** Locked cards (non-Ignis in static grid) show pill-shaped "Unlocking" overlay with backdrop-filter; z-index 10 above image; `.locked-blur-overlay` in globals.css with `-webkit-backdrop-filter` for iOS Safari. Overlay shows on all locked cards (including placeholder).

## Verification Log – 2026‑03‑04 (Lock Ignis landing to v1 exemplar_card)

**Ignis landing image:** Hardcoded `IGNIS_LANDING_URL` (v1 exemplar_card Blob URL). Hero tile and Examples grid both use it; no API override, no placeholder, no v2. Glyph overlay opacity reduced to 0.06 (card may already contain glyph). `lib/exemplar-store.ts`: `IGNIS_LANDING_URL` constant; `getExemplarManifestsServer` returns it for `ignisImageUrl`.

## Verification Log – 2026‑03‑04 (Origin SSR: no Ignis flicker)

**Flicker fix:** /origin page now server-renders Ignis URL + manifests via `getExemplarManifestsServer()`. `BeautyLandingClient` accepts `initialIgnisImageUrl` and `initialManifests`; when provided, skips client fetch. Initial HTML contains correct img src; no post-load swap. `export const dynamic = "force-dynamic"` on origin page. `lib/exemplar-store.ts`: added `getExemplarManifestsServer(version)` (same logic as GET /api/exemplars).

## Verification Log – 2026‑03‑02 (Restore prior Ignis background source)

**Regression fix:** Glyph-overlay work switched Ignis from `exemplarCard` to `marketingBackground`, causing wrong imagery after load. Restored prior logic (585b944): (1) Hero + Examples use `urls.exemplarCard ?? urls.exemplar_card` from manifest; env/static fallbacks unchanged. (2) API fallback manifest injects `exemplarCard`/`exemplar_card` = IGNIS_CANONICAL_FALLBACK (env or /exemplars/ignispectrum.png). (3) Glyph overlay kept on both tiles. (4) `lib/ignis-landing.ts` no longer used for landing.

## Verification Log – 2026‑03‑02 (Ignis placeholder fix)

**Ignis never uses static placeholder:** (1) `lib/exemplar-store.ts`: `IGNIS_CANONICAL_FALLBACK` returns env URL or `null` (never `/exemplars/ignispectrum.png`). (2) `GET /api/exemplars`: When Blob manifest is unavailable, injects Ignis manifest with `exemplarCard` = env or `undefined` (never static path). (3) `BeautyLandingClient.jsx` hero tile: if resolved Ignis URL is missing or equals placeholder path, use `NEXT_PUBLIC_IGNIS_EXEMPLAR_URL` or keep empty-state (glyph overlay + dev-only badge "IGNIS NO REAL IMAGE"); never show dash when real URL available. (4) `LandingPreviews.jsx` ExemplarSlot: same anti-placeholder guard for Ignis tiles; `ignisNoRealImage` prop for glyph + dev badge when no real URL. Production must never show `/exemplars/ignispectrum.png` for Ignis.

## Verification Log – 2026‑03‑04 (Final people-proof polish)

**Root 200:** Deleted `app/page.tsx`; middleware rewrite serves /origin for `/` (200, no redirect). **Health marker:** Simplified to `<!-- ORIGIN_LANDING: v1 53ec531 -->` in origin source (template element). **Background:** Compressed `ligs-landing-bg.png` 2.1MB → 434KB (sharp, same 1024×1024 dimensions).

## Verification Log – 2026‑03‑04 (Production hardening pass)

**Landing people-proof:** (1) No debug artifacts (BUILD_ID, LOGO DEBUG, deploy stamp, debug query strings). (2) Middleware: www→apex 308, / rewrite to /origin, /beauty→/origin 308; matcher includes `/` explicitly. (3) Health marker `<!-- ORIGIN_LANDING: v1 e1292a8 -->` in origin page source (hidden). (4) Watermark img: width/height 1086×724 for layout stability; aria-hidden, alt="". (5) CTA console.logs gated behind NODE_ENV development. (6) .origin-page-bg: fixed, inset:0, height:100dvh, no transform; mobile background-position 50% 20%. Assets: ligs-landing-bg.png 2.1MB, ligs-logo.jpeg 32KB; both in /public, return 200 on ligs.io.

## Verification Log – 2026‑03‑02 (iPhone Safari: pageBg layer + img watermark)

**iOS Safari fix:** `background-attachment: fixed` removed entirely. Page background uses dedicated fixed-position div (`.origin-page-bg`): `position: fixed; inset: 0; z-index: -1` with `background-size: cover`, `background-position: center`, `transform: translateZ(0)` for reliable repaint on iPhone. Hero watermark switched from `background-image` div to `<img>` (`.hero-watermark-img`): `position: absolute; left/top 50%; transform: translate(-50%,-50%); width: 120%; opacity: 0.26` (0.28 on mobile). Ensures background fills and watermark is visible on iPhone 14 Safari.

## Verification Log – 2026‑03‑02 (Origin hero mobile responsiveness)

**Mobile hero:** Origin hero now responsive on small screens. `app/globals.css`: `.hero-panel` → `padding: 20px 16px`, `border-radius: 18px` on mobile, `32px 40px` / `28px` on desktop; `.hero-headline` / `.hero-subhead` use `clamp()` for font scaling (28–44px, 14–18px). `components/LandingPreviews.jsx`: locked blur overlay uses `maxWidth/maxHeight: 95%` (removed fixed min/max pixels) for responsive scaling without overflow.

## Verification Log – 2026‑03‑02 (Hero layering + text contrast)

**Hero:** Page background = ligs-landing-bg.png (dark geometric texture). Hero panel has logo watermark (ligs-logo.jpeg, 85% size, opacity 0.28, z-index 0) behind hero text. Hero text in relative wrapper (z-index 1). Panel bg rgba(0,0,0,0.35) for legibility. **Text:** Added `--text-on-dark`, `--text-on-dark-muted` to :root. Origin landing uses these for all body text; form inputs keep dark text on light bg. No black text on dark background. `.hero-panel` replaces `.hero-logo-panel`.

## Verification Log – 2026‑03‑02 (Middleware redirects, production fix)

**Production redirect fix:** `/origin` 404 and `/beauty` not redirecting on Vercel. Switched from `next.config` redirects to `middleware.ts`. `middleware.ts` at repo root: redirects `/` → `/origin`, `/beauty` and `/beauty/` → `/origin` (308 permanent). Matcher `['/', '/beauty', '/beauty/']` so `/beauty/start`, `/beauty/view`, etc. are NOT redirected. Removed redirects from `next.config.ts`.

## Verification Log – 2026‑03‑02 (Origin canonical, Beauty 301 redirect)

**Public entry route rename:** `/origin` is the canonical public landing page. `/beauty` and `/beauty/` redirect permanently (308 via middleware) to `/origin`. Root `/` redirects to `/origin`. Waitlist submissions from `/origin` use `source: "origin"` for analytics. Hero, waitlist, static 12-grid intact. Flow pages (`/beauty/start`, `/beauty/view`, etc.) unchanged.

## Verification Log – 2026‑02‑20 (Compose visibility + debug overlay)

**Compose text/glyph visibility:** Headline/subhead use explicit fill #FFFFFF, opacity >= 0.9; `buildTextOverlaySvg` centralizes text overlay. Glyph load/rasterize failure: throws 500 in dev, logs in prod (no silent transparent). COMPOSE_DEBUG=1: outlines safeArea, textBlock, ctaChip; pure white text; scrim rgba(0,0,0,0.35); logs layer order. Response: composedUrl, logoUsed, glyphUsed, textRendered. LigsStudio "Last Response Debug (Compose)" shows composedUrl, logoUsed, glyphUsed, textRendered.

## Verification Log – 2026‑02‑20 (1:1 background for square_card_v1 compose)

**Aspect ratio coupling:** When purpose is marketing_background and compose uses square_card_v1 (1:1), Generate Background now produces 1:1. `buildImagePromptSpec`: respects `options.aspectRatio` when provided; callers (LigsStudio, image/generate) pass aspect from request. LigsStudio: `composeOutputAspectRatio` derived from template (square_card_v1 → 1:1); `backgroundGenParams.aspectRatio` = compose output. Glyph + text render in correct 1:1 frame.

## Verification Log – 2026‑02‑20 (Compose placeholder background fix)

**LIVE compose no longer uses 1x1 placeholder:** LigsStudio runCompose prefers `imageResult.images[0].url` → `backgroundUrl` → `backgroundSource`. Dedicated `backgroundUrl` state set after Generate Background and Full Pipeline success. Client guard: if background would be placeholder b64 (<512x512), block compose with "Compose blocked: background is placeholder (1x1). Generate Background first." `lib/ligs-studio-utils`: `getPngDimensionsFromBase64`, `isPlaceholderPng`, `TINY_PNG_B64` exported. Server `/api/image/compose`: reject backgrounds <256x256 with 400 BACKGROUND_TOO_SMALL; log dimensions in dev. getComposePayload reflects real source; copy payload shows `background.url` when available.

## Verification Log – 2026‑02‑20 (Compose overlaySpec server-side build + glyph anchor)

**Compose overlaySpec fix:** POST `/api/image/compose` when overlaySpec missing: builds server-side via `buildOverlaySpecWithCopy(profile, { templateId, output, purpose, variationKey }, undefined)` — deterministic, no LLM. Hard validation: 400 "overlaySpec required" if neither overlaySpec nor profile+purpose. For `markType=archetype` (Ignis): uses `composeExemplarCardToBuffer` (hero glyph anchor + headline/subhead/cta); else `composeMarketingCardToBuffer`. Response includes `buildOverlaySpec: true` when server built overlaySpec. LigsStudio run6Variations now sends overlaySpec (buildOverlaySpecWithCopy) in compose payload.

## Verification Log – 2026‑02‑20 (Imagery source of truth)

**Imagery source of truth:** Engine output + style pipeline; no UI overrides. Added `FALLBACK_PRIMARY_ARCHETYPE` to contract.ts; replaced hardcoded "Stabiliora" in engine route, engine/generate, marketing/visuals, exemplars/generate, minimal-profile, LigsStudio, ShareCard. E.V.E. affects copy/voice only; visuals from contract + buildTriangulatedImagePrompt. Guardrail test `engineResultPromptGuardrail.test.ts`: primary=Fluxionis, secondary=Structoris; asserts both influences, twilight=day, no crisp drift.

## Verification Log – 2026‑02‑20 (Studio Fluxionis archetype)

**Studio moved to Fluxionis (final archetype):** DEFAULT_PROFILE.primary_archetype = "Fluxionis"; descriptors = ["flow", "adapt", "evolve", "fluent"]. Both Reset buttons now "Reset to Fluxionis". Fluxionis contract: mood fluid/adaptive/continuous motion/graceful change; palette oceanic teal/violet/soft ember accents; lighting soft with moving highlights/gentle caustic-like diffusion; layout flowing curves/wavefields/laminar streams; abstractPhysicalCues added. Fluxionis negative additions: busy noise, splashy paint, literal water, fantasy elements, rainbow. NOT high-energy. printFluxionisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Innovaris archetype)

**Studio moved to Innovaris:** DEFAULT_PROFILE.primary_archetype = "Innovaris"; descriptors = ["innovate", "fresh", "breakthrough", "reimagine"]. Both Reset buttons now "Reset to Innovaris". Innovaris contract: mood inventive/exploratory/fresh/surprising-but-coherent; palette tempered brights/teal/violet/apricot hints; lighting clean with playful highlights; layout modular experimentation/gentle asymmetry/novel forms; abstractPhysicalCues added; contrast medium (NOT high-energy). Innovaris negative additions: tech HUD, circuitry, cyberpunk, neon. printInnovarisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Structoris archetype)

**Studio moved to Structoris:** DEFAULT_PROFILE.primary_archetype = "Structoris"; descriptors = ["structure", "order", "architecture", "logic"]. Both Reset buttons now "Reset to Structoris". Structoris contract: mood architectural/grounded/structural integrity/engineered calm; palette stone/graphite/warm gray/off-white; lighting directional but soft; layout grid/beams/layered planes/modular blocks; abstractPhysicalCues added. Structoris negative additions: blueprint text, technical labels, UI overlay, dimensions. NOT high-energy. printStructorisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Vectoris archetype)

**Studio moved to Vectoris:** DEFAULT_PROFILE.primary_archetype = "Vectoris"; descriptors = ["directional", "momentum", "path", "forward"]. Both Reset buttons now "Reset to Vectoris". Vectoris contract: mood directional/resolved/oriented/forward-clarity; palette cool neutrals + sharp violet/azure accent; lighting clear/crisp/slight edge highlights; layout strong directional lines/diagonal drift/clear pathing; abstractPhysicalCues added. Vectoris negative additions: HUD overlay, arrows, icons, typography. NOT high-energy (contrast medium). printVectorisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Obscurion archetype)

**Studio moved to Obscurion:** DEFAULT_PROFILE.primary_archetype = "Obscurion"; descriptors = ["obscure", "layered", "enigmatic", "depth"]. Both Reset buttons now "Reset to Obscurion". Obscurion contract: mood concealed/velvety/enigmatic/depth-with-structure (distinct from Tenebris nocturne); palette deep smoke/blackened violet/muted indigo/graphite; lighting chiaroscuro-lite/controlled shadows/thin rim light; layout asymmetry with hidden axis; abstractPhysicalCues added. Obscurion negative additions: horror, gothic fantasy, occult symbols, skulls, bats, spooky. NOT high-energy (contrast medium). printObscurionPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Aequilibris archetype)

**Studio moved to Aequilibris:** DEFAULT_PROFILE.primary_archetype = "Aequilibris"; descriptors = ["balance", "harmony", "equilibrium", "elegant"]. Both Reset buttons now "Reset to Aequilibris". Aequilibris contract: mood poised/harmonious/balanced tension; palette cool warm neutrals/pearl/soft stone/faint gold; lighting even with subtle specular accents; layout bilateral symmetry/gentle counterweights; flow_lines subtle arcs; abstractPhysicalCues added. Aequilibris negative additions: spa look, bland, sterile generic. NOT high-energy. printAequilibrisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Precisura archetype)

**Studio moved to Precisura:** DEFAULT_PROFILE.primary_archetype = "Precisura"; descriptors = ["precise", "exact", "measured", "clear"]. Both Reset buttons now "Reset to Precisura". Precisura contract: mood crisp/exact/clean/surgical clarity; palette cool whites/graphite/muted steel/subtle violet accent; lighting clear/controlled/sharp edge definition; abstractPhysicalCues added. Precisura negative additions: messy gradients, painterly chaos, tech HUD, glare. Precisura NOT high-energy. printPrecisuraPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Radiantis archetype)

**Studio moved to Radiantis:** DEFAULT_PROFILE.primary_archetype = "Radiantis"; descriptors = ["luminous", "clarity", "radiance", "uplifting"]. Both Reset buttons now "Reset to Radiantis". Radiantis contract: mood luminous/clear/uplifting/clean energy; palette bright warm whites/sunlit gold/soft apricot/airy pastels; lighting high-key/soft bloom/clean highlights; abstractPhysicalCues added. Radiantis negative additions: lens flares, glitter, neon, sci-fi, cheesy, inspirational stock, stock photo. Radiantis NOT high-energy (contrast medium, mood without vivid/energetic). printRadiantisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Studio Tenebris archetype)

**Studio moved to Tenebris:** DEFAULT_PROFILE.primary_archetype = "Tenebris"; descriptors = ["shadow", "depth", "mystery", "quiet"]. Both Reset buttons now "Reset to Tenebris". Tenebris contract: full voice + visual + marketingDescriptor + marketingVisuals + copyPhrases; abstractPhysicalCues = "soft depth gradient, gentle edge falloff, restrained luminosity, premium nocturne field". Tenebris negative additions: spooky, scary, skulls, horror, occult symbols, gothic fantasy. Tenebris NOT high-energy (contrast medium, mood quiet/deep). printTenebrisPrompt.test.ts added.

## Verification Log – 2026‑02‑20 (Ignispectrum marketing_background tuning)

**High-energy archetype tuning (marketing_background only):** (1) Mode directive archetype-aware: when primary contrast_level===high or mood includes energetic/vivid/intense → "full-width, premium negative space, high-clarity field" instead of "soft". (2) resolveSecondaryArchetype: Ignispectrum+null/same → Vectoris (reinforce ignition); calm primaries keep next. (3) marketing_background + share_card twilightPhase default "day" (was nautical); buildImagePromptSpec + buildTriangulatedMarketingPrompt. (4) contract.visual.abstractPhysicalCues (optional): Ignispectrum has "white-hot core gradient, directional energy shear, prismatic heat haze"; added to resolved block as "• Field:" for marketing modes. (5) Motion line: high-energy primary → "directional momentum, crisp drift"; calm → "smooth transitions" or "directional flow".

## Verification Log – 2026‑02‑20 (Examples: 12 archetype slots)

**Landing Examples:** Now shows all 12 archetypes in `LIGS_ARCHETYPES` order. Responsive grid: 1 col mobile, 2 col sm, 3 col md, 4 col lg. Data: GET `/api/exemplars?version=v1` → manifest per archetype; image from `manifest.urls.exemplarCard` else `/exemplars/{archetype}.png` else neutral placeholder (no broken img). Text from `manifest.marketingDescriptor` else `getMarketingDescriptor(archetype)`. `ExemplarSlot` uses `onError` fallback for images.

## Verification Log – 2026‑03‑07 (GLYPH-ORIENTATION docs)

**docs/GLYPH-ORIENTATION.md:** Radial orientation system for archetype glyphs. 12 solar segments, center angles (15°–345°), ecliptic→glyph mapping (0°=up), dominant axis per archetype. References `src/ligs/astronomy/solarSeason.ts` as authoritative.

## Verification Log – 2026‑03‑07 (GLYPH-DESIGN-CHECKLIST)

**docs/GLYPH-DESIGN-CHECKLIST.md:** 9-step checklist for creating new archetype glyphs. Steps: sector, physics, axis alignment, geometry bounds, ≤4 primitives, symmetry, export, placement, registry. Used for every new glyph.

## Verification Log – 2026‑03‑07 (GLYPH-PRIMITIVE-SYSTEM)

**docs/GLYPH-PRIMITIVE-SYSTEM.md:** Primitive geometry language for glyphs. Six allowed primitives: triangle, arc, bar, grid, spiral, spoke. Primitive→physical behavior, archetype→primitive mapping, radial-grid examples, ≤4 primitives rule. Ensures coherent symbolic language across all archetypes.

## Verification Log – 2026‑03‑08 (Glyph system cleanup)

**Legacy glyph deprecated.** `public/glyphs/ignis_mark.svg` (non–glyph-law geometry) moved to `public/icons/ignis_icon.svg` as UI icon (favicon/app icon). Only `public/glyphs/` contains canonical archetype glyphs. docs/GLYPH-LAW.md: added "Non-Canonical Glyphs" section. glyph-debug, glyph-rasterize: support ?name=ignis_icon (icons path). LigsStudio: Debug candidates ignis, ignis_icon. Canonical glyph remains `public/glyphs/ignis.svg`.

## Verification Log – 2026‑03‑08 (Glyph system standardization — archetype-agnostic)

**Glyph support now archetype-agnostic.** Single registry `lib/archetype-glyph-registry.ts`: `ARCHETYPE_GLYPH_PATHS` — add `{ Archetype: "glyphs/name.svg" }` to enable glyph everywhere. generateOverlaySpec: markType=archetype when archetype in registry (no Ignis-only check). static-overlay: corner label uses markArchetype; dev geometry validation relaxed (viewBox 1000×1000, ring r=205, dot r=85; no polygon count). archetype-preview-config: glyphPath derived from registry. LandingPreviews, BeautyLandingClient: glyph overlay when `getArchetypePreviewConfig(archetype).glyphPath` exists. Add glyph: (1) `public/glyphs/{name}.svg`, (2) register in ARCHETYPE_GLYPH_PATHS.

## Verification Log – 2026‑03‑04 (Canonical glyph law — LIGS archetype glyph)

**Law glyph specification locked.** `public/glyphs/ignis.svg` is the canonical archetype glyph. ViewBox 0 0 1000 1000; center 500,500; ring r=205 stroke-width=56; center dot r=85; triangle points 400,269 600,269 500,95.795 rotated 0°/120°/240°. Layer order: ring → archetype geometry → center dot. All compose/static-overlay scale = glyphW/1000. **Unified:** compose-card, static-overlay, buildGlyphConditionedAssets, LigsStudio, glyph-debug, glyph-rasterize use `ignis.svg`. Rule: `.cursor/rules/glyph-law.mdc`.

## Verification Log – 2026‑02‑26 (Exemplars save from Studio)

**POST /api/exemplars/save:** Saves composed image only. Input: archetype, version, exemplarCardB64, optional overlay (headline, subhead, cta). Saves to `ligs-exemplars/{archetype}/v1/exemplar_card.png` and manifest. LigsStudio "Save to Landing" button enabled when compose result exists. Refresh /beauty to see in Examples.

## Verification Log – 2026‑02‑28 (Canonical Ignis glyph: ring+dot+3 triangles)

**Glyph cleanup:** Legacy `ignis_mark.svg` (non–glyph-law) moved to `public/icons/ignis_icon.svg` as UI icon. Only `public/glyphs/` contains canonical glyph-law symbols.

## Verification Log – 2026‑02‑28 (GLYPH SOURCE OF TRUTH AUDIT)

**Glyph debug routes:** GET `/api/dev/glyph-debug?name=ignis` (canonical glyph) or `?name=ignis_icon` (UI icon). GET `/api/dev/glyph-rasterize` same. **LigsStudio:** "GLYPH SOURCE OF TRUTH AUDIT" section: candidate files ignis.svg (canonical), ignis_icon.svg (UI icon in public/icons/).

## Verification Log – 2026‑02‑28 (PROOF OVERLAY FREE – zero spend)

**Render Proof Card (FREE):** Client-only renderer, zero external calls. LigsStudio: "PROOF OVERLAY (FREE)" section when Dry Run ON or `NEXT_PUBLIC_PROOF_ONLY=1`. Button "Render Proof Card (FREE)" uses placeholder gradient + square_card_v1 overlay + Ignis glyph (public/glyphs/ignis.svg). Hardcoded copy: "Ignispectrum", "Transform with intensity.", "Ignite change". **Hard fail on glyph:** If glyph cannot load, rejects with `GLYPH_LOAD_FAILED` — no silent skip. **Proof outputs:** glyphUsed, glyphPath, outputDims, proof image displayed. **PROOF_ONLY:** When `NEXT_PUBLIC_PROOF_ONLY=1`, all live imagery buttons blocked. Dry Run defaults to ON when PROOF_ONLY. `lib/dry-run-config.ts`: PROOF_ONLY export.

## Verification Log – 2026‑02‑28 (Ignis glyph overlay fix + layout)

**A) Glyph rendering (no black blob):** `public/glyphs/ignis.svg` — canonical glyph-law geometry. Static overlay uses it for archetypes in ARCHETYPE_GLYPH_PATHS. Rasterization: viewBox respected, contain fit, centered, transparent background. `stripBackgroundRects()` removes any rect from glyph SVG. Fill forced to #FAF8F5 @ 0.9 opacity. Dev outline: `NEXT_PUBLIC_GLYPH_DEBUG_OUTLINE=true` or NODE_ENV=development draws 1px magenta outline around glyph bounds (server + client). **B) Layout:** square_card_v1 textBlock: x:0.12, y:0.10, w:0.76, h:0.28; ctaChip: x:0.32, y:0.78, w:0.36, h:0.10; glyph anchor centerY ~0.56, sizePct ~0.32. Optional "Ignispectrum" label at top-left for Ignis. **C) Compose response:** added glyphPath, rasterDims, previewImageUrl alongside glyphUsed, logoUsed, textRendered, backgroundDims, outputDims.

## Verification Log – 2026‑02‑26 (Global logo + Studio "Logo: OK")

**Global logo (canonical):** `GLOBAL_LOGO_PATH = "/brand/ligs-mark-primary.png"` in `lib/brand.ts` — single source of truth. Served from `public/brand/ligs-mark-primary.png`. GET `/api/ligs/status` checks that file exists; `logoConfigured=true` when reachable. LigsStudio displays "Logo: OK" or "Logo: missing". POST `/api/image/compose` always uses global logo (or "(L)" placeholder when `ENABLE_PLACEHOLDER_LOGO=true`). Compose overlay: always bottom-left (6% padding, 13% width, opacity 0.9, no shadow/glow). BRAND_LOGO_PATH env removed.

## Verification Log – 2026‑02‑28 (Ignis archetype glyph + markType)

**markType archetype for Ignis:** Added `markType: "brand"|"archetype"` and `markArchetype` to MarketingOverlaySpec. `buildOverlaySpecWithCopy` / `generateOverlaySpec` set `markType: "archetype"`, `markArchetype: "Ignispectrum"` for Ignispectrum. `lib/marketing/compose-card.ts`: `resolveMarkBuffer(spec, logoBuffer)` loads `public/glyphs/ignis.svg` when markType=archetype instead of (L) monogram; `createSignatureFieldOverlaySvg` adds subtle radial overlay; `maybeAddDevStamp` adds "IGNIS MARK" at 2% opacity in dev only. Exemplar manifest includes `markType`. `deriveIdempotencyKey` used for image/generate (UUID required). LandingPreviews: cache-bust `?v=` for Ignis exemplar card. BeautyView: exemplar shows `exemplarCard` first; exemplar reportIds use `manifest.urls.exemplarCard` as primary image.

## Verification Log – 2026‑02‑26 (Exemplar Pack v1)

**Exemplar Pack v1:** POST `/api/exemplars/generate` (body: `{ archetype, mode: "dry"|"live", version: "v1" }`) generates marketing_background + share_card (LIVE only), exemplar_card (compose always). Saves to `ligs-exemplars/{archetype}/{version}/`. Stable idempotency: `deriveIdempotencyKey(base, suffix)` for UUID keys. GET `/api/exemplars?version=v1` returns list of manifests. `lib/exemplar-store.ts` for Blob storage. `LandingPreviews` fetches exemplars when available, fallback to `EXEMPLAR_CARDS`. Global logo: `public/brand/ligs-mark-primary.png`; compose uses resolveMarkBuffer (glyph for Ignis, else brand logo).

## Verification Log – 2026‑02‑20 (Keeper exact prompts + DRY prefix + live-run checklist)

**Exact provider prompts in keeper manifest:** Keeper now stores the EXACT strings sent to the provider (positive, negative, full concatenated). `image/generate` returns `providerPrompt: { positive, negative, full }`; engine captures these and never rebuilds via `buildImagePromptSpec`. Only writes keeper when we have actual provider prompts for all image assets. Signatures: full = `${positive} Avoid: ${negative}`.slice(0,4000); marketing/logo/share: full = `${positive} Avoid: ${negative}.`.slice(0,4000).

**DRY keeper prefix:** `saveKeeperManifest(manifest, dryRun=true)` writes to `ligs-keepers-dry/{reportId}.json`. `loadKeeperManifest(reportId, dry=true)` reads from that prefix. GET `/api/keepers/[reportId]?dry=1` loads DRY keepers. Landing `/beauty?keeperReportId=X&dry=1` fetches DRY keeper for validation without spend. Engine DRY marketing block writes keeper to `ligs-keepers-dry/` after composing deterministic marketing card.

**Live-run checklist (8 bullets):** See docs/LIVE-RUN-CHECKLIST.md.

---

## Verification Log – 2026‑02‑20 (Full cylinders: LIVE marketing + share card)

**Step 1 – Marketing assets:** Engine calls POST `/api/image/generate` for `marketing_background` (16:9) and `marketing_logo_mark` (1:1). Both triangulated via `buildTriangulatedMarketingPrompt` → `buildTriangulatedImagePrompt`. Saves to `ligs-images/{reportId}/marketing_background.png` and `ligs-images/{reportId}/logo_mark.png`. Persists `marketingBackgroundUrl`, `logoMarkUrl`.

**Step 2 – Compose marketing card:** Uses `marketingBackgroundUrl` + `logoMarkUrl` + `buildOverlaySpecWithCopy` → `composeMarketingCardToBuffer` → `ligs-images/{reportId}/marketing_card.png`. Persists `marketingCardUrl`.

**Step 3 – Share card:** POST `/api/image/generate` (purpose share_card); saves to `ligs-images/{reportId}/share_card.png`; persists `shareCardUrl`.

**Logo mark triangulation:** `marketing_logo_mark` now routes through `buildTriangulatedMarketingPrompt` (mode `marketing_logo_mark`) instead of `buildLogoMarkPrompt`.

**Idempotency:** Checks `getImageUrlFromBlob` before each generation; skips if asset exists. `deriveIdempotencyKey` for marketing-bg, logo-mark, share-card. GET `/api/beauty/[reportId]` enriches all four URLs from Blob.

**Keeper bundle:** On full-cylinders LIVE success, engine writes `ligs-keepers/{reportId}.json` (asset manifest: reportId, archetypes, twilight, marketing descriptor, prompts for each asset, URLs, createdAt, identitySpecVersion). `saveKeeperManifest` in `lib/keeper-manifest.ts`. BeautyProfile gets `keeperReady: true` and `keeperManifestUrl`. GET `/api/keepers/[reportId]` returns manifest. Landing `/beauty?keeperReportId=X` fetches keeper and renders featured hero (background, logo, marketing card, share card, tagline, hitPoints).

## Verification Log – 2026‑02‑20 (Anti-bullshit protections)

**Idempotency keys:** `lib/idempotency-store.ts` — Blob `ligs-runs/{route}/{idempotencyKey}.json`. When `allowExternalWrites` or X-Force-Live honored, `idempotencyKey` (UUID) is **required**; missing → 400. engine/generate, engine, marketing/generate, image/generate. Engine client, LigsStudio, beauty/submit pass key per click.

**Marketing cached path:** POST `/api/marketing/generate` now calls `POST /api/image/generate` twice (marketing_logo_mark, marketing_background) instead of `generateImagesViaProvider`; LRU cache applies.

**Force-Live gate:** `X-Force-Live: 1` honored only when `ALLOW_FORCE_LIVE=true` (default false). Prevents accidental dry-run bypass.

**Golden Run:** `/api/dev/beauty-live-once` — one live run per browser session (cookie); retries with same idempotencyKey allowed. Logs idempotencyHit, cacheHit/Miss, imageCount. **cylinders_report** at end: llmCallsAttempted, imageCallsAttempted, allowExternalWrites, idempotencyHit, routesHit.

**FULL CYLINDERS rehearsal:** DRY_RUN=1 + ALLOW_EXTERNAL_WRITES=false → zero OpenAI spend. engine/generate + E.V.E. use fixtures. Preflight passes in rehearsal mode with just BLOB_READ_WRITE_TOKEN. See docs/FULL-CYLINDERS-REHEARSAL.md.

## Verification Log – 2026‑02‑20 (Beauty assets + start page)

**Missing production assets added:** `public/exemplars/` (6 archetype PNGs) and `public/signatures/` (beauty-hero, beauty-background, etc.) were untracked; production served 404 for exemplar images and hero backgrounds. Both folders committed. `app/beauty/start/page.jsx` added (was untracked; flow depends on it). Obsolete `public/beauty-background.png`, `public/beauty-hero.png` removed (replaced by signatures/).

## Verification Log – 2026‑02‑20 (Previews route delegation)

**Dynamic route guard:** When `[reportId]` catches reserved segment "previews" or "debug" (e.g. in deployments where static routes lose precedence), it delegates to the sibling route handler. Ensures `/api/report/previews` always returns `{ previewCards }` regardless of route matching order.

## Verification Log – 2026‑02‑28 (Ignispectrum v2 + prefer v2 for Ignis)

**Ignispectrum v2:** Generated via POST `/api/exemplars/generate` (archetype: Ignispectrum, mode: live, version: v2). Writes to `ligs-exemplars/Ignispectrum/v2/` (marketing_background.png, share_card.png, exemplar_card.png, manifest.json). Manifest includes markType, markArchetype, urls for all 3 images. v1 unchanged.

**Prefer v2 for Ignis:** `PREFERRED_ARCHETYPE_VERSIONS` in exemplar-store maps Ignispectrum → v2. `loadExemplarManifestWithPreferred(archetype, requestedVersion)` tries preferred first, then requested. GET `/api/exemplars?version=v1` and beauty view exemplar-Ignispectrum now return v2 for Ignis. Landing shows new exemplar card.

## Verification Log – 2026‑02‑20 (Remove double glyph in exemplar compose)

**compose-card.ts:** When background was generated with purpose `archetype_background_from_glyph` (Ignis), `createHeroGlyphOverlay` returns null — glyph appears once, as seed in generated image. `composeExemplarCardToBuffer` accepts `backgroundPurpose`; exemplars/generate passes it when Ignis. Small marks (markType archetype, resolveMarkBuffer) unchanged.

## Verification Log – 2026‑02‑20 (Save Marketing Background from Studio)

**exemplars/save:** Accepts `target: "marketing_background"` with `marketingBackgroundB64`. Saves to `ligs-exemplars/{archetype}/{version}/marketing_background.png`, merges manifest.urls.marketingBackground without overwriting exemplarCard/shareCard.

**LigsStudio:** "Save as Marketing Background" button; enabled when Step 1 (background) exists, disabled in Dry Run. Fetches URL to base64 when background is provider URL. JSON snippet shows saved marketingBackgroundUrl after save.

## Verification Log – 2026‑02‑20 (Ignis share_card coherence, no blanks)

**Ignis share_card:** For Ignis v2, share_card is no longer generated via DALL·E. Instead, composed from the SAME glyph-conditioned background + overlay spec (same as exemplar_card). Saves to share_card.png after compose. Ensures manifest.urls.shareCard always populated; no blanks in click-through.

**Manifest:** After LIVE run, urls.marketingBackground, urls.exemplarCard, urls.shareCard all set. GET `/api/beauty/[reportId]` for exemplar-Ignispectrum returns imageUrls with all 3; PreviewCarousel and ShareCard show no blanks.

## Verification Log – 2026‑02‑20 (LigsStudio Ignis seed → composed visibility)

**Seed Glyph Preview (Ignis only):** Panel shown when purpose=archetype_background_from_glyph or archetype=Ignispectrum. Displays `public/glyphs/ignis.svg` before generation. Visible in DRY and LIVE.

**Step labels:** "Step 1: Generated Background" and "Step 2: Composed Card (Marketing Overlay)". Both previews render after Full Pipeline.

**Two Save buttons:** "Save as Exemplar Card (Landing)" → exemplar_card slot. "Save as Share Card" → share_card slot. POST `/api/exemplars/save` accepts `target: "exemplar_card" | "share_card"`; loads existing manifest, merges URLs, uses `getPreferredExemplarVersion` (Ignis→v2).

**Manifest URLs snippet:** After Full Pipeline, JSON shows `{ marketingBackgroundUrl, exemplarCardUrl, shareCardUrl }`.

**Dry Run:** Save buttons disabled when Dry Run checked; Seed Glyph still shown.

## Verification Log – 2026‑02‑20 (LigsStudio purpose dropdown)

**Purpose dropdown:** Replaced free-text purpose with select (marketing_background, share_card, archetype_background_from_glyph). When archetype is Ignispectrum, purpose defaults to archetype_background_from_glyph.

**Safety:** Dry Run Mode checkbox unchanged; no LIVE calls unless user unchecks and clicks Generate/Compose/Full Pipeline.

## Verification Log – 2026‑02‑20 (Beauty hero: dark geometric only)

**Hero background:** Replaced all hero/landing backgrounds with `/ligs-landing-bg.png` (dark geometric) only. Removed `ligs-logo.jpeg` from hero content box; hero card now uses same dark geometric with subtle scrim. Gradient overlays lightened (0.25/0.08/0.3) for dark bg. No beauty-background.png, beauty-hero.png, /signatures/, or fetchBlobPreviews in hero path.

## Verification Log – 2026‑02‑20 (Beauty waitlist-only: remove Previous Light Identity Reports)

**LandingPreviews:** Removed "Previous Light Identity Reports" section entirely. Removed blob preview fetch, renderCardGrid, fetchBlobPreviews usage, useRouter, previewCards/selectedViewId state. Dropped props: maxCards, maxPreviews, useBlob, initialCards, showPreviousReports. Public /beauty now: Hero → Ignis exemplar + 3 bullets → Waitlist → static 12-regime grid (no links, no modal, no View report/Open Artifact) → Unlock teaser (when !WAITLIST_ONLY) → Footer.

## Verification Log – 2026‑02‑20 (archetype_background_from_glyph DRY + dalle2_edits)

**Glyph-conditioned DRY:** POST `/api/image/generate` with `purpose=archetype_background_from_glyph` and `archetype=Ignispectrum` returns rich DRY payload: `providerUsed: "dalle2_edits"`, `glyphDryPlan` with glyphLoaded (public/glyphs/ignis.svg, rasterized 1024×1024), maskCreated (1024×1024 transparent), finalPromptContainsSeedGrowth, finalPrompt, fileUrlPlan (LIVE: provider URL → exemplars/generate → saveExemplarToBlob marketing_background). Replaced "silhouette" with "shape" in glyph prompt to pass validation. Provider-edits: added `model: "dall-e-2"` for OpenAI API compliance.

## Verification Log – 2026‑02‑20 (Previews response shape)

**Previews API:** GET `/api/report/previews` returns `{ previewCards, status, requestId }` at top level for spec compliance. Client (`fetchBlobPreviews`) reads `json?.data?.previewCards ?? json?.previewCards`.

## Verification Log – 2026‑02‑26 (Image-model clean prompts + mechanical coherence)

**Visual grammar line:** Replaced PRIMARY SUMMARY with single compact line: `PRIMARY: palette-bias spectrum, composition geometry, light-behavior` (no repeated adjectives). Mode directive first, then bullets in fixed order: Palette → Structure → Focal → Texture → Negative space (marketing) → Secondary (max 2 lines) → Twilight.

**Secondary hard limits:** Secondary may not contain Palette/Structure/Focal words (SECONDARY_FORBIDDEN). Max 2 bullet lines, char cap ≤35% of primary. `buildProviderPromptString(positive, negative)` for DALL-E 3 "Avoid:" append.

**Mode differentiation:** marketing_background: broad negative space, minimal texture, soft gradients. share_card: top band clear, framed center, stronger edge definition. Marketing modes add "no embedded text", "no UI elements" to negative.

## Verification Log – 2026‑02‑26 (Triangulation hardening + marketing unification)

**Triangulation hardening:** Secondary block capped at 35% of primary chars (truncate at line boundary). Primary max 2 atoms, secondary max 1 atom. `buildCoherenceImageBlock` outputs resolved block: single palette/structure (primary wins), secondary contributes only texture/motion/contrast. New modes: marketing_background, marketing_overlay, share_card (entropy 0.6/0.8, negative-space guidance).

**Marketing via triangulation:** `lib/marketing/visuals.ts` — `buildTriangulatedMarketingPrompt(identity, mode)` wraps buildTriangulatedImagePrompt; identity: primaryArchetype, secondaryArchetype?, solarProfile?, twilightPhase?, seed?. buildImagePromptSpec routes marketing_background, marketing_overlay, share_card to triangulation; same NEGATIVE_EXCLUSIONS. Removed buildMarketingBackgroundPrompt. Tenebris adds archetype-specific negatives (spooky, scary, skulls, horror, occult symbols, gothic fantasy). Radiantis adds (lens flares, glitter, neon, sci-fi, cheesy, inspirational stock, stock photo). Precisura adds (messy gradients, painterly chaos, tech HUD, glare). Aequilibris adds (spa look, bland, sterile generic). Obscurion adds (horror, gothic fantasy, occult symbols, skulls, bats, spooky). Vectoris adds (HUD overlay, arrows, icons, typography). Structoris adds (blueprint text, technical labels, UI overlay, dimensions). Innovaris adds (tech HUD, circuitry, cyberpunk, neon). Fluxionis adds (busy noise, splashy paint, literal water, fantasy elements, rainbow).

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

**Marketing Visuals slice:** POST `/api/marketing/visuals` wrapper calls image/generate twice (marketing_logo_mark, marketing_background). `lib/marketing/visuals.ts`: buildLogoMarkPrompt, buildTriangulatedMarketingPrompt (marketing_background/overlay/share_card use triangulation). buildImagePromptSpec routes marketing purposes to triangulation when applicable; variationKey encodes contrastDelta (cd0.15) and raw archetype (raw_X) for unknowns. Normalizes via pickBackgroundSource. Returns logoMark?, marketingBackground?, warnings[]. Unit + route tests.

**Marketing Composer layer:** Added archetype-driven marketing: `lib/marketing/types.ts` (MarketingDescriptor, MarketingAssets), `descriptor.ts` (deterministic archetype→label, tagline, hitPoints, CTA), `prompts.ts` (buildMarketingImagePrompts for logo mark + header background), `minimal-profile.ts` (for future use). POST `/api/marketing/generate` accepts `primary_archetype`, returns `{ descriptor, assets }`; calls image provider when ALLOW_EXTERNAL_WRITES; DRY_RUN returns descriptor only. `MarketingHeader` component; LigsStudio: Generate Marketing + Show Marketing Layer toggle. contrastDelta (0–1) for marketing-surface clarity lift. docs/MARKETING-LAYER.md. Unit + route tests.

**LigsStudio comparison mode:** Generate 6 Variations pushes result set to `variationHistory` (max 2 entries). Compare Runs section: two columns—left (previous run), right (current run); each labeled with primary_archetype and variationKey. Session-only, no persistence. UI only.

**LigsStudio Full Pipeline compose payload fix:** After image/generate returns `images[0]` as `{ url }` object, the compose payload was sending `background.url` as the whole object instead of the string. Added `lib/ligs-studio-utils.ts` with `pickBackgroundSource(imageResult)` (handles images[0].url, images[0].b64, images[0] string, image.url, image.b64) and `backgroundToInputString(bg)`. LigsStudio now normalizes generate response into string-only values; compose body uses `background: { url }` or `background: { b64 }` with strings. On no background from generate, shows "No background returned from image/generate" and does not call compose. Background input field stores strings only. Status panel already shows compose dryRun and overlayValidation. Unit tests in `lib/__tests__/ligs-studio-utils.test.ts`.

**LIGS Studio:** Added internal `/ligs-studio` page and `LigsStudio` component. Two-column layout (inputs left, previews right); VoiceProfile JSON (Stabiliora prefill), purpose, variationKey, size 1024|1536, background paste. Actions: Generate Background (POST /api/image/generate), Compose Marketing Card (POST /api/image/compose), Run Full Pipeline, Generate 6 Variations. Output: background/composed previews, imageSpec/overlaySpec JSON panels, status box (requestId, dryRun, score, pass, cacheHit). localStorage persistence, Copy payload/response. Profile validation via safeParseVoiceProfile.

---

## Verification Log – 2026‑02‑20 (Sun/Moon birth context)

**Sun/Moon birth context:** Added `lib/astronomy/computeSunMoonContext.ts` with `computeSunMoonContext(lat, lon, utcTimestamp, timezoneId)` — computes Sun altitude/azimuth, twilight phase (day/civil/nautical/astronomical/night), sunrise/sunset (local), day length; Moon altitude/azimuth, phase name, illumination. Uses astronomy-engine (Equator, Horizon, Illumination, MoonPhase, SearchRiseSet) and luxon for timezone conversion. No external APIs. `POST /api/beauty/submit` calls it after deriveFromBirthData, attaches sun + moon to birthContext; on failure logs warning and continues without sun/moon. Engine `buildReportGenerationPrompt` (lib/engine) includes buildBirthContextBlock with concise Sun and Moon sections when present. Tests: computeSunMoonContext (twilightPhase, illuminationFrac, altitudes, sunrise/sunset); buildReportGenerationPrompt (Sun/Moon sections when present).

---

## Verification Log – 2026‑02‑20 (Archetype visual voice)

**Archetype voice in image generation:** Added `src/ligs/image/buildArchetypeVisualVoice.ts` with `buildArchetypeVisualVoiceBlock(archetype)` — translates `getArchetypeVoiceAnchorShape` + `getArchetypePhraseBank` into visual grammar (bullet-style directives, &lt;20 lines, no literal objects). Injected into: (1) `buildImagePromptSpec` non-marketing path; (2) engine signature image path before `POST /api/generate-image`. Added `NEGATIVE_EXCLUSIONS` to signature image prompts (previously missing). Marketing visuals logic unchanged.

**Semi-living archetype visuals:** Replaced `buildArchetypeVisualVoiceBlock` with `buildArchetypeVisualVoiceSpec(archetype, { mode, entropy?, seed? })`. Fixed visual spine from voice contract + seeded variability from phrase banks. mode: exemplar | variation | signature. Variation path: mode "variation", entropy 0.2, seed profile.id+purpose+variationKey. Signature path: mode "signature", entropy 0.3, seed reportId+slug. Exemplar mode ready for future injection.

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

**Archetype Voice Block in engine report:** `buildReportGenerationPrompt(birthData, archetype?, birthContext?)` in `lib/engine/buildReportGenerationPrompt.ts`. Imports `getArchetypeOrFallback` from contract; appends Archetype Voice Block (emotional_temperature, rhythm, lexicon_bias, metaphor_density, assertiveness, structure_preference, notes) to the report user prompt. Instructs LLM to shape emotional_snippet and ORACLE phrasing by these parameters. Optional `archetype` in EngineBody (validate-engine-body); defaults to Stabiliora when absent. Route `app/api/engine/generate/route.ts` imports and uses it. Unit test: `buildReportGenerationPrompt.test.ts` asserts voice block present for Stabiliora.

---

## Verification Log – 2026‑02‑23

**Glyph Field Renderer prompt builder:** Added `lib/marketing/glyphField.ts` with `buildGlyphFieldPrompt(archetype, contrastDelta?)` for the canonical "(L)" glyph. SECTION 1 (fixed glyph, topology, legibility); SECTION 2 (archetype field distortion from contract: palette, mood, materials, lighting, flow_lines, marketingVisuals). Deviation Budget: HIGH for expressive archetypes (emotional_temperature high or flow_lines present), LOW for stable. Hard constraints: no extra text, no zodiac, no corporate badge, no creatures. `getGlyphFieldNegative()` for negative prompt. Unit tests in `lib/marketing/__tests__/glyphField.test.ts`. No API changes.

**LIGS Studio Warning Lights:** Added GET `/api/ligs/status` returning `{ allowExternalWrites, provider, logoConfigured, logoFallbackAvailable }`. LigsStudio fetches on mount and displays Warning Lights: Mode (LIVE/DRY_RUN), Provider, Logo (OK/placeholder (L)/missing), Cache, Request, Error.

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

**Production API kill-switch:** Added `LIGS_API_OFF=1` env var. When set, `lib/api-kill-switch.ts` returns 503 `{ disabled: true, reason: "maintenance" }` from all sensitive POST routes (image/generate, image/compose, generate-image, marketing/*, exemplars/*, beauty/submit, beauty/dry-run, beauty/create, engine, engine/generate, voice/generate, stripe/create-checkout-session, email/send-beauty-profile). GET `/api/status` returns `{ disabled }` for frontend. Frontend uses `useApiStatus()` to hide/disable CTAs in BeautyLandingClient, Beauty start, PayUnlockButton, PreviewCardModal, LigsStudio.

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

---

## Verification Log – 2026‑02‑20

**Glyph branch visibility and no silent fallback:**

| Change | Location | Notes |
|--------|----------|------|
| **Last Response Debug box** | `LigsStudio.tsx` | After Generate Background (live only): providerUsed, purposeEchoed, cacheHit, glyphBranchUsed, requestId, buildSha, validation, error, imageUrl |
| **Glyph branch no fallback** | `app/api/image/generate/route.ts` | Try/catch around glyph load + edits; 500 `GLYPH_CONDITIONED_FAILED` on failure; dev logging `[GLYPH BRANCH]` |
| **Cache hit provider fix** | `app/api/image/generate/route.ts` | Cache hit for `archetype_background_from_glyph` returns `providerUsed: "dalle2_edits"` |
| **Version header** | `app/api/image/generate/route.ts` | `X-Build-Sha` + `buildSha` in JSON from `VERCEL_GIT_COMMIT_SHA` or `"local"` |

---

## Verification Log – 2026‑02‑20 (MVP Hardening)

**Full system sweep — reduce surface area:**

| Change | Location | Notes |
|--------|----------|------|
| **Waitlist rate limit** | `lib/waitlist-rate-limit.ts`, `/api/waitlist` | 5 req/60s per IP+UA; in-memory; 429 + Retry-After when exceeded |
| **Dev routes** | `/api/dev/*` | All return 403 in production (NODE_ENV check); preflight/beauty-live-once/verify-report allow ALLOW_PREVIEW_LIVE_TEST on Vercel Preview |
| **Public surface** | `/beauty` | Waitlist-only by default; no links to View report, Open Artifact, modals, keepers, studio; Stripe/generate hidden |
| **Env flags** | SYSTEM_SNAPSHOT | TEST_MODE, FAKE_PAY, DRY_RUN: Production leave unset |

## Verification Log – 2026‑02‑20 (Waitlist capture)

**Zero-dependency waitlist via Vercel Blob:**

| Change | Location | Notes |
|--------|----------|------|
| **POST /api/waitlist** | `app/api/waitlist/route.ts` | Email capture; validates, writes to `ligs-waitlist/{iso}_{random}.json`; no Stripe/image/engine. |
| **Early Access section** | `BeautyLandingClient.jsx` | Email input + "Join Early Access" button; success: "You're on the list." |
| **NEXT_PUBLIC_WAITLIST_ONLY** | `.env.example`, BeautyLandingClient | Default waitlist-only; `"0"` re-enables purchase flow. |

## Verification Log – 2026‑02‑20 (Conversion-first MVP)

**Beauty landing refactored for conversion:**

| Change | Location | Notes |
|--------|----------|------|
| **BeautyLandingClient** | `app/beauty/BeautyLandingClient.jsx` | Hero; Ignis exemplar + 3 bullets; Form; 12-regime static grid; Unlock teaser; Footer. Removed Featured Keeper, Previous Reports, Dev Live pipeline. Form sits above grid. |
| **LandingPreviews** | `components/LandingPreviews.jsx` | Added `staticGrid`, `showPreviousReports`, `highlightArchetype`. Static mode: disabled clicks, no links, non-Ignis opacity 0.6, "Unlocking Soon" label. |

## Verification Log – 2026‑02‑20 (FIELD-FIRST + glyph anchor)

**Ignis: no DALL·E 2 edits; field-first + glyph in compose:**

| Change | Location | Notes |
|--------|----------|------|
| **CENTER VOID directive** | `src/ligs/image/triangulatePrompt.ts` | For Ignispectrum + marketing_background: inject CENTER_VOID_IGNIS block (radial origin, ~1/3 center void, field grows outward) |
| **Exemplars/generate** | `app/api/exemplars/generate/route.ts` | Ignis uses marketing_background (DALL·E 3), 1:1 aspect; backgroundPurpose always `marketing_background` |
| **Hero glyph overlay** | `lib/marketing/compose-card.ts` | createHeroGlyphOverlay: Ignis glyph 33% width, slightly below midline, warm radial glow; FIELD-FIRST config |
| **LigsStudio** | `components/LigsStudio.tsx` | Default purpose marketing_background; "Ignis: Glyph Anchor (Field-First)" panel; removed glyph preflight/IGNIS SEED MODE OFF |
