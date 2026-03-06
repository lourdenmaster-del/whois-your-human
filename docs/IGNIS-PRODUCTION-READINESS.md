# Ignis Production Run Readiness Report

**Date:** 2026-02-20  
**Scope:** Studio-driven LIVE run (Lourden manual clicks)  
**Status:** **READY** (with one caveat)

---

## 1) Infrastructure / Build

| Check | Status |
|-------|--------|
| `npm run build` passes | ✅ **PASS** (fixed type errors: negative_space, flow_lines, provider-edits Buffer→Uint8Array) |
| LIVE gating strict | ✅ **CONFIRMED** — No external calls unless Dry Run unchecked AND user clicks Generate/Full Pipeline/Compose/Save |
| Env requirements | ✅ **CONFIRMED** — `ALLOW_EXTERNAL_WRITES === "true"` required for provider; `BLOB_READ_WRITE_TOKEN` required for Blob writes |

**Gating flow:**
- `effectiveDryRun = forceDryRun` (checkbox)
- When checked: DRY RUN CONTROLS only (Simulate buttons); Generate/Compose/Full Pipeline/Save hidden or disabled
- When unchecked: LIVE section shown; all buttons require `!apiDisabled && !effectiveDryRun`
- `image/generate`: `dryRun = !ALLOW_EXTERNAL_WRITES` (server-side)
- `exemplars/save`: Save buttons disabled when `effectiveDryRun`

---

## 2) Provider Routing (Ignis glyph-conditioned)

| Check | Status |
|-------|--------|
| `purpose=archetype_background_from_glyph` → DALL·E 2 edits | ✅ **CONFIRMED** — `providerUsed = "dalle2_edits"` |
| Load + rasterize `public/glyphs/ignis.svg` (1024 base) | ✅ **CONFIRMED** — `buildGlyphConditionedBaseImage`, `glyphDryPlan.glyphLoaded: { path: "public/glyphs/ignis.svg", rasterizedTo: "1024x1024" }` |
| Transparent 1024 mask | ✅ **CONFIRMED** — `buildGlyphConditionedMask`, `glyphDryPlan.maskCreated: { size: "1024x1024", transparent: true }` |
| Prompt: seed/growth directive | ✅ **CONFIRMED** — `finalPromptContainsSeedGrowth`, matches `/seed\|grows/i` |
| Prompt: "glyph centered and slightly below midline", "field grows outward" | ✅ **CONFIRMED** — `glyphConditionedBackground.ts` COMPOSITION_DIRECTIVE |
| Prompt: "Use the provided reference glyph image as the exact blueprint; match geometry 1:1" | ⚠️ **PARTIAL** — Current: "Keep glyph shape intact; no additional marks". Consider adding explicit blueprint phrase for extra confidence. |

---

## 3) Asset Completeness After LIVE Run

| Check | Status |
|-------|--------|
| manifest.urls.marketingBackground | ⚠️ **CAVEAT** — Not persisted from Studio. Studio Save buttons only write exemplarCard and shareCard. |
| manifest.urls.exemplarCard | ✅ **CONFIRMED** — Populated when "Save as Exemplar Card (Landing)" clicked |
| manifest.urls.shareCard | ✅ **CONFIRMED** — Populated when "Save as Share Card" clicked |
| No double glyph (hero overlay skipped when backgroundPurpose=glyph) | ✅ **CONFIRMED** — `createHeroGlyphOverlay` returns null when `backgroundPurpose === "archetype_background_from_glyph"` |

**Note:** For all 3 URLs, either:
- Run `POST /api/exemplars/generate` (archetype=Ignispectrum, mode=live, version=v2) — produces marketingBackground + shareCard (composed) + exemplarCard; or
- Use Studio Full Pipeline + both Save buttons — yields exemplarCard + shareCard (marketingBackground stays empty unless added later).

---

## 4) Landing + Lightbox

| Check | Status |
|-------|--------|
| Tile reads manifest.urls.exemplarCard (Ignis uses v2) | ✅ **CONFIRMED** — `loadExemplarManifestWithPreferred`; exemplars API returns v2 for Ignis |
| Lightbox images = [exemplarCard, marketingBackground, shareCard].filter(Boolean) | ✅ **CONFIRMED** — `lightboxImages` passed from manifest URLs |
| Tile button → full report flow | ✅ **CONFIRMED** — Unchanged |

---

## 5) Visual QA (Manual)

| Criterion | Notes |
|-----------|-------|
| Glyph shape 1:1 | Prompt: "Keep glyph shape intact" |
| Glyph centered, slightly below midline | COMPOSITION_DIRECTIVE + buildGlyphConditionedBaseImage (top offset 5%) |
| Field grows outward | COMPOSITION_DIRECTIVE |
| No text/logos in background | NEGATIVE_EXCLUSIONS + constraints |
| Corner logo/mark not clipped | EXEMPLAR_LOGO_CONFIG padding 6%, width 13% |

---

## Summary

### READY

- Build passes
- LIVE gating enforced (Dry Run checkbox + env)
- Ignis routes to `dalle2_edits`; glyph loaded, mask created; seed/growth in prompt
- Double glyph prevented in compose
- Exemplar + share card saves work; manifest merges URLs
- Landing tile + lightbox use manifest URLs; preferred v2 for Ignis

### Blocker / Next Fix

**One caveat:** Studio Full Pipeline + Save does **not** persist `marketingBackground`. Only exemplarCard and shareCard are written.

**Fix:** Add "Save as Marketing Background" and extend `POST /api/exemplars/save` to accept `target: "marketing_background"` + `marketingBackgroundB64` (or background URL fetch). Alternatively, use `POST /api/exemplars/generate` for a full Ignis v2 pack (all 3 URLs in one run).

### Optional Enhancement

Add to `buildGlyphConditionedBackgroundPrompt`:  
`"Use the provided reference glyph image as the exact blueprint; match geometry 1:1."`  
for stronger DALL·E 2 compliance.
