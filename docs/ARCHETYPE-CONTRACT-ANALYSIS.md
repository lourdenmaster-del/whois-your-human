# Archetype Contract Analysis

**Purpose:** Identify all archetype-specific logic in the repo and propose a unified `ArchetypeContract` type that formalizes existing fields without adding new concepts.

---

## 1. Files Involved

| File | Role | Archetype Data |
|------|------|----------------|
| `src/ligs/voice/schema.ts` | Canonical enum | `LigsArchetypeEnum` (12 values) |
| `src/ligs/voice/prompt/archetypeAnchors.ts` | Voice/tone | `ARCHETYPE_ANCHORS` → `ArchetypeAnchor` |
| `src/ligs/image/archetype-visual-map.ts` | Image style | `ARCHETYPE_VISUAL_MAP` → `ArchetypeVisualParams` |
| `lib/marketing/descriptor.ts` | Marketing descriptor | `DESCRIPTOR_MAP` → label, tagline, hitPoints, ctaText, ctaStyle |
| `lib/marketing/visuals.ts` | Marketing visuals prompts | `ARCHETYPE_STYLE` → keywords, palette, motion |
| `lib/marketing/prompts.ts` | Image prompt builder | Uses `ARCHETYPE_VISUAL_MAP` directly |
| `src/ligs/marketing/archetype-copy-map.ts` | Overlay copy | `ARCHETYPE_COPY_PHRASES` → headlines, subheads, ctas, disclaimers |
| `src/ligs/marketing/buildOverlayPromptPack.ts` | Overlay system prompt | Uses `getArchetypeAnchor()` for notes, lexicon_bias |
| `src/ligs/marketing/generateOverlaySpec.ts` | Overlay spec generator | Uses `ARCHETYPE_COPY_PHRASES` for deterministic copy |
| `src/ligs/image/buildImagePromptSpec.ts` | Image prompt spec | Uses `ARCHETYPE_VISUAL_MAP`; marketing branch uses `lib/marketing/visuals.ts` |
| `components/VoiceProfileBuilder.jsx` | UI | `LIGS_ARCHETYPES` list (duplicate of enum) |
| `lib/marketing/types.ts` | Types | `MarketingDescriptor`, `CTAStyle` |
| `app/api/marketing/generate/route.ts` | API | Consumes `primary_archetype`, `contrastDelta` |
| `app/api/marketing/visuals/route.ts` | API | Consumes `primary_archetype`, `variationKey`, `contrastDelta` |
| `app/api/image/generate/route.ts` | API | Consumes `archetype` override, `variationKey` |
| `src/ligs/image/cache.ts` | Cache key | `archetype` + `variationKey` in sha256 |

---

## 2. Extracted Fields by Domain

### 2.1 Voice / Tone (ArchetypeAnchor)

| Field | Type | Source |
|-------|------|--------|
| `emotional_temperature` | `"low" \| "medium" \| "high"` | archetypeAnchors.ts |
| `rhythm` | string | archetypeAnchors.ts |
| `lexicon_bias` | string[] | archetypeAnchors.ts |
| `metaphor_density` | `"low" \| "medium" \| "high"` | archetypeAnchors.ts |
| `assertiveness` | `"low" \| "medium" \| "high"` | archetypeAnchors.ts |
| `structure_preference` | `"lists" \| "declarative" \| "narrative" \| "mixed"` | archetypeAnchors.ts |
| `notes` | string | archetypeAnchors.ts |

### 2.2 Image Style (ArchetypeVisualParams)

| Field | Type | Source |
|-------|------|--------|
| `mood` | string | archetype-visual-map.ts |
| `palette` | string[] | archetype-visual-map.ts |
| `materials` | string[] | archetype-visual-map.ts |
| `lighting` | string | archetype-visual-map.ts |
| `texture_level` | `"low" \| "medium" \| "high"` | archetype-visual-map.ts |
| `contrast_level` | `"low" \| "medium" \| "high"` | archetype-visual-map.ts |
| `layout` | string | archetype-visual-map.ts |
| `symmetry` | SymmetryLevel | archetype-visual-map.ts |
| `negative_space` | SymmetryLevel | archetype-visual-map.ts |
| `focal_behavior` | string | archetype-visual-map.ts |
| `flow_lines` | `"none" \| "subtle" \| "present"` | archetype-visual-map.ts |

### 2.3 Marketing Descriptor (lib/marketing)

| Field | Type | Source |
|-------|------|--------|
| `archetypeLabel` | string | descriptor.ts |
| `tagline` | string | descriptor.ts |
| `hitPoints` | string[] | descriptor.ts |
| `ctaText` | string | descriptor.ts |
| `ctaStyle` | `"soft" \| "direct" \| "premium" \| "subtle"` | descriptor.ts |
| `contrastDelta` | number (0–1) | types.ts (passed in, not stored per archetype) |

### 2.4 Marketing Visuals (ArchetypeStyle)

| Field | Type | Source |
|-------|------|--------|
| `keywords` | string[] | visuals.ts |
| `palette` | string[] | visuals.ts |
| `motion` | string | visuals.ts |

### 2.5 Overlay Copy (ArchetypeCopyPhrases)

| Field | Type | Source |
|-------|------|--------|
| `headlines` | string[] | archetype-copy-map.ts |
| `subheads` | string[] | archetype-copy-map.ts |
| `ctas` | string[] | archetype-copy-map.ts |
| `disclaimers` | string[] | archetype-copy-map.ts |

### 2.6 Runtime / Request Parameters (not per-archetype)

| Field | Type | Usage |
|-------|------|-------|
| `primary_archetype` | LigsArchetype | VoiceProfile.ligs, API requests |
| `variationKey` | string | Deterministic variation; cache key; encodes `cd{delta}`, `raw_{archetype}` |
| `contrastDelta` | number (0–1) | Marketing surface clarity lift; default 0.15 |

---

## 3. Archetype → X Mapping Summary

| Mapping | Location | Shape |
|---------|----------|-------|
| **archetype → voice/tone** | `src/ligs/voice/prompt/archetypeAnchors.ts` | `ArchetypeAnchor` |
| **archetype → palette (image)** | `src/ligs/image/archetype-visual-map.ts` | `palette` in `ArchetypeVisualParams` |
| **archetype → palette (marketing visuals)** | `lib/marketing/visuals.ts` | `palette` in `ArchetypeStyle` |
| **archetype → voice/tone (overlay)** | `buildOverlayPromptPack` uses `getArchetypeAnchor` | Same as voice |
| **archetype → marketing copy (descriptor)** | `lib/marketing/descriptor.ts` | `archetypeLabel`, `tagline`, `hitPoints`, `ctaText`, `ctaStyle` |
| **archetype → marketing copy (overlay)** | `src/ligs/marketing/archetype-copy-map.ts` | `headlines[]`, `subheads[]`, `ctas[]`, `disclaimers[]` |
| **archetype → image prompt behavior** | `archetype-visual-map.ts` + `buildImagePromptSpec` | mood, palette, materials, lighting, layout, symmetry, focal_behavior, flow_lines |
| **archetype → marketing visuals prompts** | `lib/marketing/visuals.ts` | keywords, palette, motion (separate from image map) |
| **archetype → marketing image prompts** | `lib/marketing/prompts.ts` | Uses `ARCHETYPE_VISUAL_MAP` (same as image) |

---

## 4. Proposed Unified `ArchetypeContract`

```ts
/** Canonical 12 LIGS archetypes. Single source of truth. */
type LigsArchetype =
  | "Ignispectrum"
  | "Stabiliora"
  | "Duplicaris"
  | "Tenebris"
  | "Radiantis"
  | "Precisura"
  | "Aequilibris"
  | "Obscurion"
  | "Vectoris"
  | "Structoris"
  | "Innovaris"
  | "Fluxionis";

/** Voice/tone for LLM and copy generation */
interface ArchetypeVoice {
  emotional_temperature: "low" | "medium" | "high";
  rhythm: string;
  lexicon_bias: string[];
  metaphor_density: "low" | "medium" | "high";
  assertiveness: "low" | "medium" | "high";
  structure_preference: "lists" | "declarative" | "narrative" | "mixed";
  notes: string;
}

/** Image generation style (used by image prompts and marketing prompts) */
interface ArchetypeVisual {
  mood: string;
  palette: string[];
  materials: string[];
  lighting: string;
  texture_level: "low" | "medium" | "high";
  contrast_level: "low" | "medium" | "high";
  layout: string;
  symmetry: "low" | "medium" | "high";
  negative_space: "low" | "medium" | "high";
  focal_behavior: string;
  flow_lines: "none" | "subtle" | "present";
}

/** Marketing descriptor (label, tagline, hit points, CTA) */
interface ArchetypeMarketingDescriptor {
  archetypeLabel: string;
  tagline: string;
  hitPoints: string[];
  ctaText: string;
  ctaStyle: "soft" | "direct" | "premium" | "subtle";
}

/** Overlay copy phrase banks (headline, subhead, cta, disclaimer) */
interface ArchetypeCopyPhrases {
  headlines: string[];
  subheads: string[];
  ctas: string[];
  disclaimers: string[];
}

/** Marketing visuals prompts (logo mark, background) – keywords + motion */
interface ArchetypeMarketingVisuals {
  keywords: string[];
  /** Can diverge from ArchetypeVisual.palette for marketing-specific tones */
  palette: string[];
  motion: string;
}

/**
 * Unified contract: all archetype-specific data in one place.
 * Each key is a LigsArchetype. Consumers take the slice they need.
 */
interface ArchetypeContract {
  voice: ArchetypeVoice;
  visual: ArchetypeVisual;
  marketingDescriptor: ArchetypeMarketingDescriptor;
  overlayCopy: ArchetypeCopyPhrases;
  marketingVisuals: ArchetypeMarketingVisuals;
}

type ArchetypeContractMap = Record<LigsArchetype, ArchetypeContract>;
```

---

## 5. Redundancies and Inconsistencies

### 5.1 Palette Duplication

| Location | Stabiliora Palette Example |
|----------|-----------------------------|
| `archetype-visual-map.ts` | `["warm-neutral", "soft earth tones", "muted", "soft neutrals"]` |
| `lib/marketing/visuals.ts` | `["blush", "cream", "rosewater", "lavender"]` |

**Issue:** Same archetype has two different palettes. Image pipeline uses visual map; marketing visuals use a separate, more “marketing” palette. Not necessarily wrong, but no formal relationship.

### 5.2 Keywords / Lexicon Overlap

- `archetypeAnchors.lexicon_bias`: `["balance", "restore", "steady", "coherent", "regulated"]`
- `lib/marketing/visuals.keywords`: `["balance", "coherence", "regulation"]`

**Issue:** Semantically similar; different arrays. Could be derived from one another or documented as intentional (voice vs. visual).

### 5.3 CTA Sources

- `descriptor.ctaText`: Single string, e.g. `"Restore balance"`
- `archetype-copy-map.ctas`: Array, e.g. `["Learn more", "Discover", "Explore"]`

**Issue:** Two CTA systems: descriptor has one primary CTA; overlay has a pool. Different use cases but no shared type or naming.

### 5.4 Mood / Motion Overlap

- `ArchetypeVisualParams.mood`: `"calm, regulated, coherent"`
- `ArchetypeVisualParams.focal_behavior`: `"single point, gentle"`
- `ArchetypeStyle.motion`: `"symmetrical flow lines"`

**Issue:** `motion` in `ArchetypeStyle` is similar to `flow_lines` + `focal_behavior` in the visual map. Different names, overlapping concepts.

### 5.5 Archetype List Duplication

- `LigsArchetypeEnum` in `src/ligs/voice/schema.ts`
- `LIGS_ARCHETYPES` in `VoiceProfileBuilder.jsx`
- `ARCHETYPE_ANCHORS` keys
- `ARCHETYPE_VISUAL_MAP` keys
- `ARCHETYPE_STYLE` keys (lib/marketing/visuals)
- `DESCRIPTOR_MAP` keys
- `ARCHETYPE_COPY_PHRASES` keys

**Issue:** Same 12 archetypes repeated in many places. Single enum is the source of truth; others should derive from it.

### 5.6 Unknown Archetype Handling

- `lib/marketing/visuals.ts`: `NEUTRAL_FALLBACK` for unknown archetype
- `arch as LigsArchetype` in `buildImagePromptSpec`: Uses `ARCHETYPE_VISUAL_MAP.Stabiliora` when unknown
- `app/api/marketing/visuals/route.ts`: Uses `"Stabiliora"` for profile when archetype is unknown, passes raw name via `raw_X` in variationKey

**Issue:** No shared strategy for unknown archetypes across voice, image, and marketing.

### 5.7 variationKey Semantics

- Default: `"0"` (image), `"demo-1"` (LigsStudio)
- Marketing: Encodes `cd{contrastDelta}` and optionally `raw_{archetype}`
- Overlay: Used in `simpleHash(profile.id + purpose + variationKey)` for deterministic copy

**Issue:** `variationKey` carries multiple meanings (variation id, contrast delta, raw archetype). No single schema or documentation.

---

## 6. Recommendation Summary

1. **Single archetype enum:** Use `LigsArchetypeEnum` from `src/ligs/voice/schema.ts` as the only source for archetype values.
2. **Unified contract:** Introduce `ArchetypeContract` (or equivalent) as the documented aggregation of all archetype-specific fields.
3. **Resolve palette split:** Either unify or explicitly document why image vs. marketing visuals use different palettes (e.g. “marketing tints”).
4. **Centralize unknown-archetype logic:** One fallback type (e.g. `Stabiliora`) and one function that returns the effective archetype + contract slice.
5. **Document variationKey:** Specify supported formats (`cd0.15`, `raw_X_cd0.15`) and which systems consume them.
