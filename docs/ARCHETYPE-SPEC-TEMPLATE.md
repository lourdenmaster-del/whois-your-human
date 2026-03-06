# Archetype Specification Template

Use this template to define a new LIGS archetype. Fill every section before adding to the codebase.

Reference: `docs/ARCHETYPE-SPEC-IGNISPECTRUM.md`

---

## Identity

| Field | Type | Example |
|-------|------|---------|
| **name** | string | `ArchetypeName` |
| **solarSeasonIndex** | 0–11 | `0` |
| **polarity** | "waxing" \| "waning" | Computed from sunLonDeg; not stored |
| **anchorType** | "equinox" \| "solstice" \| "crossquarter" \| "none" | `equinox` |

---

## Cosmology

| Field | Type | Example |
|-------|------|---------|
| **cosmicAnalogue.phenomenon** | string | `protostar ignition + bipolar jets` |
| **cosmicAnalogue.description** | string | Observational physics description (2–3 sentences). |
| **cosmicAnalogue.lightBehaviorKeywords** | string[] | `["keyword1", "keyword2", "keyword3", "keyword4"]` |

---

## Voice (Engine Report)

| Field | Type | Options |
|-------|------|---------|
| **emotional_temperature** | string | `low` \| `medium` \| `high` |
| **rhythm** | string | e.g. `energetic, dynamic, emphatic` |
| **lexicon_bias** | string[] | 4–6 preferred words |
| **metaphor_density** | string | `low` \| `medium` \| `high` |
| **assertiveness** | string | `low` \| `medium` \| `high` |
| **structure_preference** | string | `lists` \| `declarative` \| `narrative` \| `mixed` |
| **notes** | string | LLM guidance (tone, avoid patterns) |

---

## Phrase Bank (E.V.E.)

| Field | Min | Example |
|-------|-----|---------|
| **sensoryMetaphors** | 3–5 | `["embers banked, waiting to catch", ...]` |
| **behavioralTells** | 3–5 | `["jump in before the plan is finished", ...]` |
| **relationalTells** | 3–5 | `["people lean in or step back", ...]` |
| **shadowDrift** | 2–4 | `["burn out before the finish line", ...]` |
| **resetMoves** | 2–4 | `["cold shower, slow breath, step outside", ...]` |

---

## Visual System

| Field | Type | Example |
|-------|------|---------|
| **palette** | string[] | `["warm", "fiery", "intense hues"]` |
| **materials** | string[] | `["dynamic", "fluid"]` |
| **lighting** | string | `dramatic, high contrast` |
| **texture_level** | string | `low` \| `medium` \| `high` |
| **contrast_level** | string | `low` \| `medium` \| `high` |
| **layout** | string | `dynamic, diagonal` |
| **symmetry** | string | `low` \| `medium` \| `high` |
| **negative_space** | string | `low` \| `medium` \| `high` |
| **focal_behavior** | string | `flowing, directional` |
| **flow_lines** | string | `none` \| `subtle` \| `present` |
| **abstractPhysicalCues** | string? | Optional; for marketing_background |
| **shape_bias** | string | Short descriptor (beauty_baseline; not in WHOIS) |
| **motion_bias** | string | Short descriptor (beauty_baseline; not in WHOIS) |

---

## Marketing

| Field | Type | Example |
|-------|------|---------|
| **archetypeLabel** | string | `ArchetypeName` |
| **tagline** | string | `Transform with intensity.` |
| **hitPoints** | string[] | 3–4 bullets |
| **ctaText** | string | `Ignite change` |
| **ctaStyle** | string | `soft` \| `direct` \| `premium` \| `subtle` |
| **keywords** | string[] | 4+ for image prompts |
| **motion** | string | `flowing, directional` |
| **headlines** | string[] | 2–3 overlay options |
| **subheads** | string[] | 1–2 overlay options |
| **ctas** | string[] | 2–3 overlay options |
| **disclaimers** | string[] | 1–2 options |

---

## Glyph (Optional)

| Field | Type | Notes |
|-------|------|-------|
| **glyphPath** | string | Relative to `public/` (e.g. `glyphs/archetype-name.svg`). Only add when glyph exists. |

---

## Module Targets

After filling this spec, add entries to:

1. `src/ligs/astronomy/solarSeason.ts` — SOLAR_SEASONS
2. `src/ligs/cosmology/cosmicAnalogues.ts` — COSMIC_ANALOGUES
3. `src/ligs/archetypes/contract.ts` — ARCHETYPE_CONTRACT_MAP
4. `src/ligs/voice/archetypePhraseBank.ts` — PHRASE_BANKS
5. (Optional) `lib/marketing/buildGlyphConditionedAssets.ts`, `compose-card.ts`, `static-overlay.ts` — ARCHETYPE_GLYPH_PATHS

Run `validateArchetypeContract` before committing.
