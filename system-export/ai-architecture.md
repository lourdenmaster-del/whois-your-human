# AI Architecture — LIGS

## Every Place AI Is Called

### 1. Report Generation (`app/api/engine/generate/route.ts`)

**Purpose:** Full Light Identity Report + emotional snippet  
**Model:** `gpt-4o`  
**API:** `openai.chat.completions.create`

**System prompt:** `ENGINE_SPEC` from `lib/engine-spec.ts` (LIGS Engine v1.0 + Cosmology Marbling Patch — see full text below)

**User prompt (abbreviated):**
```
Generate the full Light Identity Report and emotional snippet for this birth data using LIGS Engine v1.1 (canonical 14-section structure + Cosmology Marbling Patch):

Full Name: ${fullName}
Birth Date: ${birthDate}
Birth Time: ${birthTime}
Birth Location: ${birthLocation}
Email: ${email}

Output valid JSON only with exactly these keys: "full_report" (string, the complete 14-section report...) and "emotional_snippet" (string, 1-2 declarative sentences). No other text.
```

**Parameters:**
- `response_format: { type: "json_object" }`
- `temperature: 0.8`

**Input schema (implicit):** Birth data as plain text  
**Output schema:** `{ full_report: string, emotional_snippet: string }`  
**Validation:** `JSON.parse`; no schema validation. Falls back to empty strings if keys missing.

---

### 2. Image Prompts Generation (`app/api/engine/generate/route.ts`)

**Purpose:** 2 image prompts for DALL·E  
**Model:** `gpt-4o`  
**API:** `openai.chat.completions.create`

**System prompt:** `IMAGE_PROMPT_SPEC` from `lib/engine-spec.ts`:
```
Generate 2 image prompts for DALL-E or Midjourney based on the Light Identity Report. Each prompt should:
- Be abstract, scientific, cosmic: light fields, structural grids, identity architecture
- Reflect the assigned archetype and spectral imprint
- NO faces, people, literal astrology symbols
- Rich visual: deep near-black navy (#050814), infrared red (#FF3B3B), ultraviolet violet (#7A4FFF) accents, soft glows
- Scientific-mythic portal aesthetic
- 50-80 words each
```

**User prompt:**
```
Based on this (L)igs report, generate 2 image prompts as a JSON object with key "image_prompts" (array of 2 strings):

${fullReport.slice(0, 4000)}
```

**Parameters:**
- `response_format: { type: "json_object" }`
- `temperature: 0.7`

**Output schema:** `{ image_prompts: string[] }`  
**Validation:** `JSON.parse`; defaults to `[]` if parse fails or key missing.

---

### 3. Vector Zero Derivation (`app/api/engine/generate/route.ts`)

**Purpose:** Derive baseline state (Vector Zero) from report  
**Model:** `gpt-4o`  
**API:** `openai.chat.completions.create`

**System prompt:** `VECTOR_ZERO_SPEC` from `lib/vector-zero.ts`:
```
You derive Vector Zero from an existing Light Identity Report. Vector Zero is the unperturbed baseline of the Light Signature before deviations — NOT a new system or calculation, only the baseline state.

RULES:
1. Extract from the report: primary_wavelength and secondary_wavelength
2. Symmetry profile: three numbers (lateral, vertical, depth) 0–1
3. Beauty baseline: color_family, texture_bias, shape_bias, motion_bias
4. Coherence score: 0–1
5. Three voices: raw_signal, custodian, oracle

Output valid JSON only, with exactly this structure (no other keys):
{ "coherence_score", "primary_wavelength", "secondary_wavelength", "symmetry_profile", "beauty_baseline", "three_voice" }
```

**User prompt:**
```
Derive Vector Zero from this Light Identity Report. Output only the JSON object.

${fullReport.slice(0, 6000)}

Emotional snippet: ${emotionalSnippet}
```

**Parameters:**
- `response_format: { type: "json_object" }`
- `temperature: 0.5`

**Output schema:** VectorZero type (see `lib/vector-zero.ts`)  
**Validation:** Manual parse; `clamp` for numbers; String() for strings. On failure, Vector Zero is omitted from payload; no throw.

---

### 4. E.V.E. Filter (`app/api/engine/route.ts`)

**Purpose:** Transform LIGS report into Beauty-Only Profile  
**Model:** `gpt-4o`  
**API:** `openai.chat.completions.create`

**System prompt:** `EVE_FILTER_SPEC` from `lib/eve-spec.ts` (see full text) + appended:
```
STRICT OUTPUT: You must respond with valid JSON only. No prose, no markdown, no comments, no trailing commas, no additional fields. The only allowed shape is: {"image":"<base64 or URL>","report":"<string>"}
```

**User prompt:**
```
Transform this LIGS output into the Beauty-Only Profile. Output only a single JSON object with exactly two keys: "image" (base64 or URL string) and "report" (string). Nothing else.

Full report:
${fullReport.slice(0, 8000)}

Emotional snippet: ${emotionalSnippet}

${vectorZeroFromReport ? `Vector Zero (use this for vector_zero section):\n${JSON.stringify(vectorZeroFromReport)}` : ""}
```

**Note:** The system prompt describes a full BeautyProfile JSON structure, but the strict output overrides it — model is instructed to return only `{ image, report }`. The route then maps `parsed.report` into `light_signature.raw_signal` and fills other fields from `vector_zero` or empty defaults.

**Parameters:**
- `response_format: { type: "json_object" }`
- `temperature: 0.5`

**Output schema (actual):** `{ image: string, report: string }`  
**Validation:** Keys must be exactly `image` and `report`; both strings. Throws on shape mismatch.

---

### 5. Demo Image (`app/api/beauty/demo/route.ts`)

**Purpose:** Single DALL·E image for demo  
**Model:** `dall-e-3`  
**API:** `openai.images.generate`

**Prompt:** First image prompt from engine, or fallback:
```
Abstract light field, structural grid, deep navy, violet and soft red accents, scientific-mythic portal aesthetic, no figures, no faces, identity architecture, soft glows.
```

**Parameters:**
- `n: 1`
- `size: "1024x1024"`
- `quality: "standard"`
- `response_format: "url"`

**Validation:** None beyond checking `imageResponse.data?.[0]?.url`.

---

### 6. User Image Generation (`app/api/generate-image/route.ts`)

**Purpose:** Generate image from user-provided or beauty prompt  
**Model:** `dall-e-3`  
**API:** `openai.images.generate`

**Prompt:** From request body `body.prompt`; sliced to 4000 chars

**Parameters:**
- `n: 1`
- `size: "1024x1024"`
- `quality: "standard"`
- `response_format: "url"`

**Validation:** `prompt` required (400 if missing). Optional `reportId` and `slug` for Blob caching.

---

## Full Prompt Strings (Canonical Specs)

### ENGINE_SPEC (lib/engine-spec.ts) — Full Text

```
========================================================
LIGS ENGINE v1.0 — CANONICAL SPECIFICATION
========================================================

You are the LIGS Engine. Your purpose is to generate a full Light Identity Report using the scientific-mythic identity physics of the LIGS system. You must follow the structure, voice architecture, physics layer, archetype system, and tone exactly as defined below.

--------------------------------------------------------
STRUCTURE (14 SECTIONS)
--------------------------------------------------------
1. INITIATION  2. SPECTRAL ORIGIN  3. TEMPORAL ENCODING  4. GRAVITATIONAL PATTERNING
5. DIRECTIONAL FIELD  6. ARCHETYPE REVELATION  7. ARCHETYPE MICRO-PROFILES
8. BEHAVIORAL EXPRESSION  9. RELATIONAL FIELD  10. ENVIRONMENTAL RESONANCE
11. COSMOLOGY OVERLAY  12. IDENTITY FIELD EQUATION  13. LEGACY TRAJECTORY  14. INTEGRATION

Each section must be fully developed. No section may be shorter than 3–5 sentences. No summaries. No compression.

--------------------------------------------------------
VOICE ARCHITECTURE (MANDATORY FOR EVERY SECTION)
--------------------------------------------------------
RAW SIGNAL: Measurable photonic, gravitational, or temporal data. Pure observation. Physics language: vectors, gradients, flux, harmonics, interference patterns.
CUSTODIAN: Biological interpretation of the RAW SIGNAL. How the body receives, stabilizes, amplifies, or modulates. No psychology. Only biological identity physics.
ORACLE: Mythic synthesis. Identity meaning from the forces. No predictions. No destiny. No metaphor. Declarative, inevitable, structural.

--------------------------------------------------------
PHYSICS LAYER (MANDATORY)
--------------------------------------------------------
Every section must reference: light vectors, spectral gradients, gravitational harmonics, temporal flux, cosmic-local interference patterns.

--------------------------------------------------------
ARCHETYPE SYSTEM (OFFICIAL CANON)
--------------------------------------------------------
Ignispectrum, Stabiliora, Duplicaris, Tenebris, Radianis, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis. No other archetypes.

--------------------------------------------------------
ARCHETYPE MICRO-PROFILE FORMAT
--------------------------------------------------------
For dominant and subdominant: Core Force, Shadow Force, Structural Tendency, Mythic Signature, Behavioral Resonance. Specific, not generic.

--------------------------------------------------------
TONE: Scientific-mythic, declarative, precise. No metaphors, spirituality, personality-test language, predictions, narrative storytelling, filler.

--------------------------------------------------------
LIGS ENGINE v1.1 — COSMOLOGY MARBLING PATCH
--------------------------------------------------------
Integrate cosmology through 3-voice structure: RAW SIGNAL (physics + 1 cosmological echo), CUSTODIAN (biology + 1 ancient physiological mirror), ORACLE (full fusion). Systems: astrology, numerology, tarot, Kabbalah, Hermetic, alchemy, chakras, elements, planetary rulerships, animal/plant/crystal, sacred geometry, mythic archetypes, geomancy, seasonal/lunar, mystery schools, resonances. Woven, not listed. Tone: NASA x Hermetic Order x Pulitzer essayist.
```

### IMAGE_PROMPT_SPEC (lib/engine-spec.ts) — Full Text

```
Generate 2 image prompts for DALL-E or Midjourney based on the Light Identity Report. Each prompt should:
- Be abstract, scientific, cosmic: light fields, structural grids, identity architecture
- Reflect the assigned archetype and spectral imprint
- NO faces, people, literal astrology symbols
- Rich visual: deep near-black navy (#050814), infrared red (#FF3B3B), ultraviolet violet (#7A4FFF) accents, soft glows
- Scientific-mythic portal aesthetic
- 50-80 words each
```

### VECTOR_ZERO_SPEC (lib/vector-zero.ts) — Full Text

```
You derive Vector Zero from an existing Light Identity Report. Vector Zero is the unperturbed baseline of the Light Signature before deviations — NOT a new system or calculation, only the baseline state.

RULES:
1. Extract: primary_wavelength and secondary_wavelength (from spectral/light language).
2. Symmetry profile: three numbers (lateral, vertical, depth) 0–1 for unbent baseline geometry.
3. Beauty baseline: color_family, texture_bias, shape_bias, motion_bias (short descriptive strings).
4. Coherence score: 0–1 from symmetry balance and wavelength stability.
5. Three voices (raw_signal, custodian, oracle) — same LIGS voice rules.

Output valid JSON only with exactly: coherence_score, primary_wavelength, secondary_wavelength, symmetry_profile, beauty_baseline, three_voice.
```

### EVE_FILTER_SPEC (lib/eve-spec.ts) — Full Text

```
You are E.V.E., a filter. Transform LIGS engine output into a Beauty-Only Profile. You do NOT generate new physics. You ONLY extract and reformat.

EXTRACT: vector_zero (beauty_baseline, three_voice), light_signature, archetype, deviations, corrective_vector.
IGNORE: Big Three, numerology, tarot, Kabbalah, cosmology dumps, relational field, conflict style, money, love, health, legacy narrative.

For each extracted section: rewrite into 3-voice structure (raw_signal, custodian, oracle).

GENERATE 3 imagery prompts: vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field (50–80 words each). Scientific-mythic, no faces, navy #050814, violet #7A4FFF, red #FF3B3B.

Output valid JSON: vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts.
```

**Note:** The engine route appends a strict override instructing the model to return only `{"image":"...","report":"..."}`. The route then maps `parsed.report` into `light_signature.raw_signal` and builds the profile from that plus optional Vector Zero.

---

## Where Prompts Are Stored

| Spec | File | Export |
|------|------|--------|
| ENGINE_SPEC | `lib/engine-spec.ts` | `ENGINE_SPEC` |
| IMAGE_PROMPT_SPEC | `lib/engine-spec.ts` | `IMAGE_PROMPT_SPEC` |
| VECTOR_ZERO_SPEC | `lib/vector-zero.ts` | `VECTOR_ZERO_SPEC` |
| EVE_FILTER_SPEC | `lib/eve-spec.ts` | `EVE_FILTER_SPEC` |

Inline additions: birth data, report snippets, Vector Zero JSON in user messages.

---

## How Results Are Validated

| Call | Validation |
|------|------------|
| Report | `JSON.parse`; uses `?? ""` for missing keys. No schema check. |
| Image prompts | `JSON.parse`; `image_prompts ?? []`. No schema check. |
| Vector Zero | `JSON.parse`; manual field extraction with `clamp` and `String()`. On error, vector_zero omitted. |
| E.V.E. filter | `JSON.parse`; must have exactly `image` and `report` keys, both strings. Throws on mismatch. |
| DALL·E | Check `data?.[0]?.url`; no structured validation. |

**No runtime schema validation** (e.g., Zod, JSON Schema) is applied to any AI output. All validation is ad hoc.
