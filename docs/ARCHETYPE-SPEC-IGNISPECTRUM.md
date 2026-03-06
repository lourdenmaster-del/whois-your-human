# Archetype Spec: Ignispectrum (Reference)

Canonical example for the archetype spec template. Use this when building the remaining 11 archetypes.

---

## Identity

| Field | Value |
|-------|-------|
| **name** | Ignispectrum |
| **solarSeasonIndex** | 0 |
| **anchorType** | equinox |
| **lonStartDeg** | 0 |
| **lonEndDeg** | 30 |
| **lonCenterDeg** | 15 |

---

## Cosmology

| Field | Value |
|-------|-------|
| **phenomenon** | protostar ignition + bipolar jets |
| **description** | A collapsing cloud reaches critical density; nuclear ignition begins at the core. Collimated outflows along the rotational axis carry angular momentum away. The system transitions from accretion-dominated to radiation-dominated. |
| **lightBehaviorKeywords** | collimated outflow, core ignition, bipolar symmetry, accretion-to-radiation |

---

## Voice

| Field | Value |
|-------|-------|
| **emotional_temperature** | high |
| **rhythm** | energetic, dynamic, emphatic |
| **lexicon_bias** | energy, transform, ignite, vivid, intensity |
| **metaphor_density** | high |
| **assertiveness** | high |
| **structure_preference** | narrative |
| **notes** | Fiery, transformative, vivid; high metaphor use; bold declarations. |

---

## Phrase Bank

**sensoryMetaphors:**
- embers banked, waiting to catch
- flame flickers at the edge of vision
- heat rising through cold stone
- glow in the periphery before dawn
- sparks when friction meets intent

**behavioralTells:**
- jump in before the plan is finished
- cut through hesitation with action
- speak before thinking it through
- leave meetings energized, others drained
- push past comfort to see what happens

**relationalTells:**
- people lean in or step back
- arguments get heated; you mean well
- you ignite others or overwhelm them
- intensity is your love language
- you need partners who can match or ground

**shadowDrift:**
- burn out before the finish line
- overwhelm others with urgency
- mistake intensity for depth

**resetMoves:**
- cold shower, slow breath, step outside
- write it down instead of saying it
- sit still for ten minutes—no phone

---

## Visual System

| Field | Value |
|-------|-------|
| **palette** | warm, fiery, intense hues |
| **materials** | dynamic, fluid |
| **lighting** | dramatic, high contrast |
| **texture_level** | medium |
| **contrast_level** | high |
| **layout** | dynamic, diagonal |
| **symmetry** | low |
| **negative_space** | medium |
| **focal_behavior** | flowing, directional |
| **flow_lines** | present |
| **abstractPhysicalCues** | white-hot core gradient, directional energy shear, prismatic heat haze |

---

## Marketing

| Field | Value |
|-------|-------|
| **archetypeLabel** | Ignispectrum |
| **tagline** | Transform with intensity. |
| **hitPoints** | Energetic vivid expression; Bold declarations and momentum; High metaphor density; Dynamic forward-moving narrative |
| **ctaText** | Ignite change |
| **ctaStyle** | direct |
| **keywords** | energy, transform, vivid, intensity |
| **motion** | flowing, directional |
| **headlines** | Ignite your transformation; Vivid energy, real change; Transform with intensity |
| **subheads** | Dynamic, bold, and unapologetically vivid.; Where energy meets purpose. |
| **ctas** | Transform now; Get started; Ignite |
| **disclaimers** | Results vary. Individual experience may differ. |

---

## Glyph

| Field | Value |
|-------|-------|
| **glyphPath** | glyphs/ignis.svg |

---

## Module Locations

- SOLAR_SEASONS: `src/ligs/astronomy/solarSeason.ts` index 0
- COSMIC_ANALOGUES: `src/ligs/cosmology/cosmicAnalogues.ts`
- ARCHETYPE_CONTRACT_MAP: `src/ligs/archetypes/contract.ts`
- PHRASE_BANKS: `src/ligs/voice/archetypePhraseBank.ts`
- Glyph: `lib/marketing/buildGlyphConditionedAssets.ts`, `compose-card.ts`, `static-overlay.ts`
