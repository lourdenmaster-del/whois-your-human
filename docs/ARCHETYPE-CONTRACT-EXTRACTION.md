# Archetype Contract Extraction

**Read-only analysis.** Using Ignispectrum as the reference implementation, this document formalizes the single archetype template so the remaining 11 archetypes can be generated without redesigning the product.

**No code changes.** This is documentation only.

---

## PART 1 — Canonical Archetype Structure

The system uses archetype data from these sources:

| Source | Location | Fields |
|--------|----------|--------|
| **Archetype Contract** | `src/ligs/archetypes/contract.ts` | voice, visual, marketingDescriptor, marketingVisuals, copyPhrases |
| **Cosmic Analogues** | `src/ligs/cosmology/cosmicAnalogues.ts` | phenomenon, description, lightBehaviorKeywords |
| **Solar Seasons** | `src/ligs/astronomy/solarSeason.ts` | index, lonStartDeg, lonEndDeg, lonCenterDeg, anchorType |
| **Phrase Bank (E.V.E.)** | `src/ligs/voice/archetypePhraseBank.ts` | sensoryMetaphors, behavioralTells, relationalTells, shadowDrift, resetMoves |
| **Glyph Paths** | `lib/marketing/buildGlyphConditionedAssets.ts`, `lib/marketing/compose-card.ts`, `lib/marketing/static-overlay.ts` | archetype → glyph SVG path |
| **Vector Zero / beauty_baseline** | Engine/E.V.E. output | color_family, texture_bias, shape_bias, motion_bias |
| **Exemplar Backfill** | `lib/exemplar-synthetic.ts` | solarSeason, declination, anchor, cosmicAnalogue, variationKey, colorFamily, textureBias |

---

## PART 2 — Archetype Contract Schema

Every archetype must provide these fields. **Only fields actually used by the system** are included.

### Identity

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `name` | string | LIGS_ARCHETYPES | Canonical name (e.g. "Ignispectrum") |
| `solarSeasonIndex` | 0–11 | SOLAR_SEASONS | Fixed mapping; archetype ↔ index 1:1 |
| `anchorType` | "equinox" \| "solstice" \| "crossquarter" \| "none" | SOLAR_SEASONS | Per season entry |
| `polarity` | "waxing" \| "waning" | Computed from sunLonDeg | Not stored per archetype |

### Field Physics (Cosmic Analogue)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `cosmicAnalogue.phenomenon` | string | cosmicAnalogues.ts | Short label (e.g. "protostar ignition + bipolar jets") |
| `cosmicAnalogue.description` | string | cosmicAnalogues.ts | Physics description |
| `cosmicAnalogue.lightBehaviorKeywords` | string[] | cosmicAnalogues.ts | Used in engine/cosmology block |

### Human Interpretation (Phrase Bank)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `sensoryMetaphors` | string[] | archetypePhraseBank.ts | 3–5 phrases |
| `behavioralTells` | string[] | archetypePhraseBank.ts | 3–5 phrases |
| `relationalTells` | string[] | archetypePhraseBank.ts | 3–5 phrases |
| `shadowDrift` | string[] | archetypePhraseBank.ts | 2–4 phrases |
| `resetMoves` | string[] | archetypePhraseBank.ts | 2–4 phrases |

### Visual System (Contract.visual)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `palette` | string[] | contract.visual | Primary colors; first used for colorFamily in exemplar backfill |
| `texture_level` | "low" \| "medium" \| "high" | contract.visual | Used for textureBias in exemplar backfill |
| `abstractPhysicalCues` | string? | contract.visual | For marketing_background triangulation |
| `mood`, `materials`, `lighting`, `layout`, `symmetry`, `negative_space`, `focal_behavior`, `flow_lines`, `contrast_level` | various | contract.visual | Image prompt triangulation |

### Marketing / Descriptor (Contract.marketingDescriptor)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `archetypeLabel` | string | contract.marketingDescriptor | Display name |
| `tagline` | string | contract.marketingDescriptor | Short hook |
| `hitPoints` | string[] | contract.marketingDescriptor | 3–4 bullets |
| `ctaText` | string | contract.marketingDescriptor | CTA button |
| `ctaStyle` | "soft" \| "direct" \| "premium" \| "subtle" | contract.marketingDescriptor | Tone |

### Marketing Visuals (Contract.marketingVisuals)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `keywords` | string[] | contract.marketingVisuals | Image prompt keywords |
| `palette` | string[] | contract.marketingVisuals | Accent palette |
| `motion` | string | contract.marketingVisuals | Motion descriptor |

### Copy Phrases (Contract.copyPhrases)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `headlines` | string[] | contract.copyPhrases | Overlay headline options |
| `subheads` | string[] | contract.copyPhrases | Overlay subhead options |
| `ctas` | string[] | contract.copyPhrases | CTA options |
| `disclaimers` | string[] | contract.copyPhrases | Disclaimer options |

### Voice (Contract.voice) — Engine Report

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `emotional_temperature` | "low" \| "medium" \| "high" | contract.voice | Shapes emotional_snippet + ORACLE |
| `rhythm` | string | contract.voice | Sentence cadence |
| `lexicon_bias` | string[] | contract.voice | Preferred words |
| `metaphor_density` | "low" \| "medium" \| "high" | contract.voice | Metaphor use |
| `assertiveness` | "low" \| "medium" \| "high" | contract.voice | Declarative strength |
| `structure_preference` | "lists" \| "declarative" \| "narrative" \| "mixed" | contract.voice | Section structure |
| `notes` | string | contract.voice | LLM guidance |

### Glyph (Optional)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `glyphPath` | string | ARCHETYPE_GLYPH_PATHS | Relative to public/ (e.g. "glyphs/ignis.svg"). **Only Ignispectrum has a glyph today.** |

### Vector Zero / beauty_baseline (Derived at runtime)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `color_family` | string | E.V.E. / Vector Zero | From report or contract.visual.palette[0] |
| `texture_bias` | string | E.V.E. / Vector Zero | From report or contract.visual.texture_level |
| `shape_bias` | string | E.V.E. | Stored but not displayed in WHOIS |
| `motion_bias` | string | E.V.E. | Stored but not displayed in WHOIS |

---

## PART 3 — Dependency Map

For every contract field, where it is used:

| Field | File(s) | Function/Component | Purpose |
|-------|---------|-------------------|---------|
| **name** | contract.ts, solarSeason.ts, cosmicAnalogues.ts, archetypePhraseBank.ts | LIGS_ARCHETYPES, SOLAR_SEASONS, COSMIC_ANALOGUES, PHRASE_BANKS | Key for all lookups |
| **solarSeasonIndex** | solarSeason.ts | SOLAR_SEASONS, getSolarSeasonProfile, getSolarSeasonByIndex | Season segment, declination, anchor |
| **anchorType** | solarSeason.ts, exemplar-synthetic.ts, buildArtifactsFromProfile | getSolarSeasonByIndex, buildExemplarBackfill | WHOIS Anchor Type |
| **cosmicAnalogue** | cosmicAnalogues.ts, deterministic-blocks.ts, exemplar-synthetic.ts, engine/generate, ArchetypeArtifactCard | getCosmicAnalogue | Report §11, exemplar backfill, WHOIS Cosmic Analogue |
| **sensoryMetaphors, behavioralTells, relationalTells, shadowDrift, resetMoves** | archetypePhraseBank.ts, exemplar-synthetic.ts | getArchetypePhraseBank, buildExemplarSyntheticSections, buildExemplarFullReport | Synthetic exemplar sections |
| **voice.*** | contract.ts, engine/generate | buildReportGenerationPrompt, getArchetypeOrFallback | Archetype Voice Block in report prompt |
| **visual.*** | contract.ts, adapters.ts, buildImagePromptSpec, exemplar-synthetic | getArchetypeVisualMapShape, buildTriangulatedImagePrompt, buildExemplarBackfill | Image prompts, exemplar colorFamily/textureBias |
| **marketingDescriptor.*** | contract.ts, adapters.ts, descriptor.ts | getMarketingDescriptor, buildOverlaySpecWithCopy | Overlay copy, exemplar sections |
| **marketingVisuals.*** | contract.ts, adapters.ts | getMarketingVisuals, buildTriangulatedMarketingPrompt | Image prompt triangulation |
| **copyPhrases.*** | contract.ts, adapters.ts | getOverlayCopyBank | Overlay headline/subhead/CTA |
| **glyphPath** | buildGlyphConditionedAssets.ts, compose-card.ts, static-overlay.ts, LigsStudio | ARCHETYPE_GLYPH_PATHS, resolveMarkBuffer | Glyph-conditioned background, compose overlay. **Only Ignispectrum.** |
| **color_family, texture_bias** | vector_zero.beauty_baseline, ArchetypeArtifactCard, WhoisReportSections, buildArtifactsFromProfile | E.V.E. output, ArtifactInfoPanel | WHOIS Color Family, Texture Bias |

---

## PART 4 — Archetype Template Structure

A complete archetype definition spans **five modules**. Use this template when generating the remaining 11:

```typescript
// 1. SOLAR_SEASONS (solarSeason.ts) — one entry
{ index: N, archetype: "ArchetypeName", lonStartDeg: X, lonEndDeg: Y, lonCenterDeg: Z, anchorType: "equinox"|"solstice"|"crossquarter"|"none" }

// 2. COSMIC_ANALOGUES (cosmicAnalogues.ts)
{
  phenomenon: "short physics label",
  description: "Observational physics description.",
  lightBehaviorKeywords: ["keyword1", "keyword2", "keyword3", "keyword4"],
}

// 3. ARCHETYPE_CONTRACT_MAP (contract.ts)
{
  voice: {
    emotional_temperature: "low"|"medium"|"high",
    rhythm: "string",
    lexicon_bias: ["word1", "word2", ...],
    metaphor_density: "low"|"medium"|"high",
    assertiveness: "low"|"medium"|"high",
    structure_preference: "lists"|"declarative"|"narrative"|"mixed",
    notes: "LLM guidance string",
  },
  visual: {
    mood: "string",
    palette: ["color1", "color2", ...],
    materials: ["mat1", "mat2"],
    lighting: "string",
    texture_level: "low"|"medium"|"high",
    contrast_level: "low"|"medium"|"high",
    layout: "string",
    symmetry: "low"|"medium"|"high",
    negative_space: "low"|"medium"|"high",
    focal_behavior: "string",
    flow_lines: "none"|"subtle"|"present",
    abstractPhysicalCues: "string (optional)",
  },
  marketingDescriptor: {
    archetypeLabel: "ArchetypeName",
    tagline: "Short hook.",
    hitPoints: ["point1", "point2", "point3", "point4"],
    ctaText: "CTA button text",
    ctaStyle: "soft"|"direct"|"premium"|"subtle",
  },
  marketingVisuals: {
    keywords: ["kw1", "kw2", "kw3", "kw4"],
    palette: ["color1", "color2", ...],
    motion: "string",
  },
  copyPhrases: {
    headlines: ["h1", "h2", "h3"],
    subheads: ["s1", "s2"],
    ctas: ["c1", "c2", "c3"],
    disclaimers: ["d1", "d2"],
  },
}

// 4. PHRASE_BANKS (archetypePhraseBank.ts)
{
  sensoryMetaphors: ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  behavioralTells: ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  relationalTells: ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  shadowDrift: ["phrase1", "phrase2", "phrase3"],
  resetMoves: ["phrase1", "phrase2", "phrase3"],
}

// 5. GLYPH (optional — only if archetype has glyph-conditioned generation)
// Add to ARCHETYPE_GLYPH_PATHS in buildGlyphConditionedAssets.ts, compose-card.ts, static-overlay.ts
// { ArchetypeName: "glyphs/archetype-name.svg" }
```

---

## PART 5 — Ignispectrum Contract Verification

**Does Ignispectrum satisfy the contract?**

| Contract Field | Ignispectrum | Status |
|----------------|--------------|--------|
| SOLAR_SEASONS entry | index 0, lonStartDeg 0, lonEndDeg 30, anchorType "equinox" | ✅ |
| cosmicAnalogue | phenomenon "protostar ignition + bipolar jets", description, lightBehaviorKeywords | ✅ |
| voice | emotional_temperature "high", rhythm, lexicon_bias, metaphor_density "high", assertiveness "high", structure_preference "narrative", notes | ✅ |
| visual | mood, palette, materials, lighting, texture_level, contrast_level, layout, symmetry, negative_space, focal_behavior, flow_lines, abstractPhysicalCues | ✅ |
| marketingDescriptor | archetypeLabel, tagline "Transform with intensity.", hitPoints (4), ctaText "Ignite change", ctaStyle "direct" | ✅ |
| marketingVisuals | keywords, palette, motion | ✅ |
| copyPhrases | headlines (3), subheads (2), ctas (3), disclaimers (1) | ✅ |
| phraseBank | sensoryMetaphors (5), behavioralTells (5), relationalTells (5), shadowDrift (3), resetMoves (3) | ✅ |
| glyphPath | "glyphs/ignis.svg" in ARCHETYPE_GLYPH_PATHS | ✅ |

**Conclusion:** Ignispectrum fully satisfies the contract. All fields are present and used.

---

## PART 6 — Duplicated or Unnecessary Fields

### Duplication

| Concept | Locations | Notes |
|---------|-----------|-------|
| **Glyph path** | buildGlyphConditionedAssets.ts, compose-card.ts, static-overlay.ts, LigsStudio GLYPH_PATHS | Same map repeated; only Ignispectrum. Consolidation would require a single `ARCHETYPE_GLYPH_PATHS` export. |
| **Palette** | contract.visual.palette, contract.marketingVisuals.palette | Slightly different (visual = primary, marketingVisuals = accent). Both used. Not redundant. |
| **Archetype label** | contract.marketingDescriptor.archetypeLabel, LIGS_ARCHETYPES name | Same value; archetypeLabel is the display form. |

### Not displayed in WHOIS

| Field | Stored | Displayed |
|-------|--------|-----------|
| shape_bias | ✅ beauty_baseline | ❌ ArtifactInfoPanel shows colorFamily, textureBias only |
| motion_bias | ✅ beauty_baseline | ❌ Same |

### Optional / conditional

| Field | Required? | Notes |
|-------|-----------|-------|
| abstractPhysicalCues | No | Used for marketing_background triangulation; improves prompt quality |
| glyphPath | No | Only Ignispectrum has glyph today; other archetypes use DALL·E 3 or compose without glyph |

---

## Summary

- **Single source of truth:** `src/ligs/archetypes/contract.ts` (ARCHETYPE_CONTRACT_MAP)
- **Supporting modules:** cosmicAnalogues.ts, solarSeason.ts, archetypePhraseBank.ts
- **Glyph:** Only Ignispectrum; add to ARCHETYPE_GLYPH_PATHS when new glyph exists
- **Template:** Five modules × one entry per archetype
- **Ignispectrum:** Fully satisfies the contract

To generate the remaining 11 archetypes: add one entry to each of the five modules using the template structure. No system behavior changes required.
