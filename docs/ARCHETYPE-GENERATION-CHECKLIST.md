# Archetype Generation Checklist

Use this checklist when adding or verifying a LIGS archetype. Ensures consistent, complete implementation.

---

## Prerequisites

- Read `docs/ARCHETYPE-CONTRACT-EXTRACTION.md`
- Use `docs/ARCHETYPE-SPEC-TEMPLATE.md` as the fill-in template
- Reference `docs/ARCHETYPE-SPEC-IGNISPECTRUM.md` for the canonical example

---

## Steps

### 1. Fill ARCHETYPE-SPEC-TEMPLATE

Copy the template and fill every section for the new archetype. Do not skip fields.

### 2. Add entry to SOLAR_SEASONS

**File:** `src/ligs/astronomy/solarSeason.ts`

Add one entry to the `SOLAR_SEASONS` array. Index must be 0–11 and match the archetype's position. Ensure `lonStartDeg`, `lonEndDeg`, `lonCenterDeg` follow the 30° segments. Set `anchorType` appropriately.

### 3. Add entry to COSMIC_ANALOGUES

**File:** `src/ligs/cosmology/cosmicAnalogues.ts`

Add `phenomenon`, `description`, `lightBehaviorKeywords` (4+ keywords). Use observational physics tone.

### 4. Add entry to ARCHETYPE_CONTRACT_MAP

**File:** `src/ligs/archetypes/contract.ts`

Add full contract: `voice`, `visual`, `marketingDescriptor`, `marketingVisuals`, `copyPhrases`. All sub-fields required.

### 5. Add phrase bank

**File:** `src/ligs/voice/archetypePhraseBank.ts`

Add `sensoryMetaphors` (3–5), `behavioralTells` (3–5), `relationalTells` (3–5), `shadowDrift` (2–4), `resetMoves` (2–4). Language: modern, grounded, non-woo.

### 6. Optional: Add glyph

Only if the archetype has a canonical glyph SVG:

- Create `public/glyphs/{archetype-name}.svg` (follow GLYPH-LAW geometry)
- Add to `ARCHETYPE_GLYPH_PATHS` in:
  - `lib/marketing/buildGlyphConditionedAssets.ts`
  - `lib/marketing/compose-card.ts`
  - `lib/marketing/static-overlay.ts`

### 7. Run contract validator

```bash
npm run validate-archetypes
```

Or run all tests (includes validator):

```bash
npm run test:run
```

### 8. Generate exemplar pack via Studio

- Open `/ligs-studio`
- Set archetype, run Full Pipeline or Generate Marketing
- Use "Save as Exemplar Card" / "Save as Marketing Background" when ready
- Or use POST `/api/exemplars/generate` with `{ archetype, mode: "live", version: "v1" }`

### 9. Verify WHOIS report

- View `/beauty/view?reportId=exemplar-{ArchetypeName}` (e.g. `exemplar-Stabiliora`)
- Confirm: Record ID, Status, Subject, Archetype, Solar Season, Declination, Anchor Type, Cosmic Analogue, Color Family, Texture Bias render correctly
- Confirm Registry Summary (real reports only) and Field Conditions display

### 10. Add marketing descriptor

Marketing descriptor is part of step 4 (ARCHETYPE_CONTRACT_MAP). If overlay copy needs tuning, update `marketingDescriptor` and `copyPhrases` in contract.ts.

---

## Implementation Status (All 12 Archetypes)

| Archetype | SOLAR_SEASONS | COSMIC_ANALOGUES | CONTRACT_MAP | PHRASE_BANK | Glyph | Exemplar Pack |
|-----------|---------------|------------------|--------------|-------------|-------|---------------|
| Ignispectrum | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ v1, v2 |
| Stabiliora | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Duplicaris | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Tenebris | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Radiantis | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Precisura | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Aequilibris | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Obscurion | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Vectoris | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Structoris | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Innovaris | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Fluxionis | ✅ | ✅ | ✅ | ✅ | ❌ | — |

**Summary:** All 12 archetypes have full contract implementation (SOLAR_SEASONS, COSMIC_ANALOGUES, ARCHETYPE_CONTRACT_MAP, PHRASE_BANKS). Only Ignispectrum has a glyph and a generated exemplar pack. The remaining 11 need exemplar packs generated via Studio or `/api/exemplars/generate` when ready for landing/sample display.
