# LIGS Multi-Modal Pipeline — System Overview

High-level map of the LIGS organism: Voice, Image, and Marketing overlay generation.

**References:** `docs/LIGS-VOICE-ENGINE-SPEC.md` (canonical voice spec), `SYSTEM_SNAPSHOT.md` (full stack).

---

## 1. What Exists

### Voice (`src/ligs/voice/`)
- **schema.ts** — VoiceProfile Zod schema; 12 LIGS archetypes; parse/safeParse
- **prompt/buildPromptPack.ts** — LLM prompt pack from profile (system voice, constraints, self-check)
- **prompt/archetypeAnchors.ts** — Archetype definitions (emotional temp, rhythm, lexicon bias)
- **prompt/selfCheck.ts** — Pre-final checklist
- **validate/** — banned words, claims, cadence, formatting, lexicon, channel structure
- **api/generate-request-schema.ts** — POST body validation (profile, task, channel, constraints)

### Image (`src/ligs/image/`)
- **schema.ts** — ImagePromptSpec (style, composition, constraints, output, prompt, variation)
- **buildImagePromptSpec.ts** — Profile + archetype → spec; deterministic motifs
- **validateImagePromptSpec.ts** — Exclusions, disallowed tokens, constraints
- **archetype-visual-map.ts** — 12 archetypes → palette, materials, lighting, symmetry, flow_lines
- **provider.ts** — DALL·E 3 integration; size mapping; "Avoid:" clause for negatives
- **cache.ts** — LRU (200) keyed by sha256(profile.id+version+purpose+aspectRatio+size+count+archetype+variationKey)
- **denylist.ts** — Brand/trademark sanitization for prompts
- **api/generate-request-schema.ts** — profile, purpose, image, variationKey, archetype

### Marketing (`src/ligs/marketing/`)
- **schema.ts** — MarketingOverlaySpec (copy, placement, styleTokens, constraints); templateId `square_card_v1`
- **templates.ts** — ONE template for 1:1; getTemplate(); static safeArea, logo (br), textBlock, ctaChip
- **buildOverlayPromptPack.ts** — Prompt pack for overlay copy (headline/subhead/cta)
- **generateOverlaySpec.ts** — LLM copy when allowed, else deterministic from archetype phrase banks
- **validateOverlaySpec.ts** — Banned words, medical claims, guarantees, lengths
- **archetype-copy-map.ts** — Phrase banks per archetype
- **api/compose-request-schema.ts** — profile, background (url|b64), purpose, output.size

---

## 2. End-to-End Flows

### Voice Generate
1. POST `/api/voice/generate` with `{ profile, task, channel?, constraints? }`
2. buildPromptPack → LLM (gpt-4o) → validateVoiceOutput
3. If score low → optional rewrite pass
4. Response: `{ requestId, text, validation, didRewrite, dryRun, modelUsed }`

### Image Generate
1. POST `/api/image/generate` with `{ profile, purpose, image: { aspectRatio, size, count }, variationKey?, archetype? }`
2. Cache lookup by sha256 key; if hit → return cached (cacheHit: true)
3. buildImagePromptSpec → validateImagePromptSpec
4. If ALLOW_EXTERNAL_WRITES: DALL·E 3; else DRY_RUN (images: [], providerUsed: null)
5. Response: `{ requestId, images, spec, validation, dryRun, providerUsed, cacheHit }`

### Image Compose (1:1 Square Card)
1. POST `/api/image/compose` with `{ profile, background: { url|b64 }, purpose, output?.size, templateId?, variationKey? }`
2. generateOverlaySpec → validateOverlaySpec
3. If ALLOW_EXTERNAL_WRITES: sharp compose (background + logo + SVG text + CTA chip) → PNG
4. Else: DRY_RUN (overlaySpec, overlayValidation, no image)
5. Response: `{ requestId, dryRun, overlaySpec, overlayValidation, image?: { b64, contentType } }`

---

## 3. Safety + Production Controls

- **Zod validation** — All request bodies validated; `.strict()` rejects unknown keys (no raw prompts)
- **No raw prompts** — Image generate and compose accept only structured params; prompts built server-side
- **ALLOW_EXTERNAL_WRITES** — Server-only; `"true"` enables real LLM/DALL·E/sharp; else DRY_RUN
- **Error codes** — IMAGE_REQUEST_INVALID, VOICE_PROFILE_INVALID, IMAGE_SPEC_INVALID, OVERLAY_SPEC_INVALID

---

## 4. Key Artifacts + Schemas

| Artifact | Location |
|----------|----------|
| VoiceProfile | `src/ligs/voice/schema.ts` |
| ImagePromptSpec | `src/ligs/image/schema.ts` |
| MarketingOverlaySpec | `src/ligs/marketing/schema.ts` |
| Generate voice request | `src/ligs/voice/api/generate-request-schema.ts` |
| Generate image request | `src/ligs/image/api/generate-request-schema.ts` |
| Compose request | `src/ligs/marketing/api/compose-request-schema.ts` |

---

## 5. API Endpoints (High Level)

| Endpoint | Request (key fields) | Response (key fields) |
|----------|----------------------|------------------------|
| POST `/api/voice/generate` | profile, task, channel? | requestId, text, validation, didRewrite, dryRun |
| POST `/api/image/generate` | profile, purpose, image | requestId, images, spec, validation, dryRun, cacheHit |
| POST `/api/image/compose` | profile, background, purpose | requestId, dryRun, overlaySpec, overlayValidation, image? |

---

## 6. Validation Layers + Scoring

| Validator | Score Rule | Rules |
|-----------|------------|-------|
| validateVoiceOutput | 100 − 25×errors − 5×warnings | banned words, claims, cadence, formatting, lexicon, channel |
| validateImagePromptSpec | 100 − 25×errors − 5×warnings | constraints true, negative exclusions, no disallowed in positive |
| validateOverlaySpec | 100 − 25×errors − 5×warnings | copy lengths, banned words, no medical claims, no guarantees, placement bounds |

---

## 7. Determinism Strategy

- **variationKey** — Client-supplied; changes copy/motifs; placements stay static
- **Image motifs** — hash(profile.id + purpose + variationKey) → material accents, lighting angle, texture grain
- **Image cache** — sha256(profile.id+version+purpose+aspectRatio+size+count+archetype+variationKey)
- **Overlay copy** — LLM when allowed; else hash-seeded phrase selection from archetype banks
- **Templates** — STATIC; never model-controlled; square_card_v1 is the only template

---

## 8. Golden Vertical Slice: 1:1 Square Card

### DRY_RUN
```bash
# ALLOW_EXTERNAL_WRITES unset or false
curl -X POST http://localhost:3000/api/image/compose \
  -H "Content-Type: application/json" \
  -d '{"profile": <VoiceProfile>, "background": {"b64": "<base64-png>"}, "purpose": "landing_hero", "output": {"size": "1024"}}'
# Returns overlaySpec + overlayValidation; no image b64
```

### Live Mode
```bash
# ALLOW_EXTERNAL_WRITES=true, BRAND_LOGO_PATH=/path/to/logo.png (optional)
# Same request → returns image: { b64: "...", contentType: "image/png" }
npm run dev
# POST /api/image/compose with background (url or b64), profile, purpose
```

---

## 9. Known Limitations / TODOs

- **Compose:** Only square_card_v1; only 1:1; logo optional (BRAND_LOGO_PATH)
- **Image generate:** Size 1024|1536; no WebP; DALL·E 3 only
- **Overlay copy:** LLM requires OPENAI_API_KEY + ALLOW_EXTERNAL_WRITES; fallback is deterministic phrases
- **Cache:** In-memory LRU; not distributed
- **Contrast sampling:** Text uses white + shadow; no adaptive dark/light yet

---

## Verification

- **Date:** 2026-02-23 (local)
- **All tests passing:** 100
- **Env vars (live mode):**
  - `ALLOW_EXTERNAL_WRITES=true` — for real LLM/DALL·E/sharp
  - `BRAND_LOGO_PATH` — path to logo for compose (optional)
  - `OPENAI_API_KEY` — for voice + image generate + overlay LLM
