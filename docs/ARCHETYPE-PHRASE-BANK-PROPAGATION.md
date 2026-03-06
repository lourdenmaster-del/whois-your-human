# Ignispectrum Phrase Bank Propagation Verification

**Purpose:** Trace where `sensoryMetaphors`, `shadowDrift`, and `resetMoves` are used so phrase bank updates propagate correctly. No code changes. Documentation only.

**Source of truth:** `src/ligs/voice/archetypePhraseBank.ts` — `PHRASE_BANKS.Ignispectrum`

---

## 1. Engine Report Generation

| Location | Uses phrase bank? | Notes |
|----------|-------------------|-------|
| `app/api/engine/generate/route.ts` | **No** | `buildReportGenerationPrompt` injects birth context, solar season, cosmic analogue, archetype voice block. Phrase bank is **not** in the engine report prompt. |

**Conclusion:** Phrase bank changes do **not** affect the initial 14-section LIGS report. Engine output is independent of phrase bank.

---

## 2. E.V.E. Extraction

| Location | Uses phrase bank? | How |
|----------|-------------------|-----|
| `app/api/engine/route.ts` L215, L267 | **Yes** | `buildArchetypePhraseBankBlock(archetypeName)` → `buildPhraseBankBlock(archetype)` injects the full phrase bank (all 5 arrays) into the E.V.E. prompt. |
| `lib/eve-spec.ts` L74–76 | **Yes** | `buildArchetypePhraseBankBlock` calls `buildPhraseBankBlock`. |
| `lib/eve-spec.ts` L230 | **Yes** | EVE_FILTER_SPEC instructs: "Draw from sensoryMetaphors, behavioralTells, relationalTells, shadowDrift, and resetMoves as appropriate." |

**Propagation:** E.V.E. is an LLM filter. Updated phrase bank wording is **injected as guidance**. The LLM may paraphrase or use the exact phrases. Output (light_signature, archetype, deviations, corrective_vector) is **influenced** by phrase bank but not a literal copy. New wording can appear in E.V.E. output if the model chooses to use it.

---

## 3. Exemplar Synthetic Sections

| Location | Uses phrase bank? | Which entries |
|----------|-------------------|---------------|
| `lib/exemplar-synthetic.ts` L78–88 | **Yes** | `buildExemplarSyntheticSections`: uses **index 0 only** — `sensoryMetaphors[0]`, `behavioralTells[0]`, `relationalTells[0]`, `shadowDrift[0]`, `resetMoves[0]` |
| `lib/exemplar-synthetic.ts` L130, L161 | **Yes** | `buildExemplarFullReport`: uses **all** `resetMoves` for Key Moves section |

**Ignis index 0 values (current):**
- sensoryMetaphors[0]: "embers banked, waiting to catch"
- behavioralTells[0]: "jump in before the plan is finished"
- relationalTells[0]: "people lean in or step back"
- shadowDrift[0]: "burn out before the finish line"
- resetMoves[0]: "cold shower, slow breath, step outside"

**Propagation:**
- **shadowDrift** change ("mistake intensity for depth" → "mistake heat for sustained burn"): Does **not** affect exemplar synthetic. Only `shadowDrift[0]` is used; the changed item is `shadowDrift[2]`.
- **resetMoves** change (add 4th, or edit existing): **All** resetMoves are used in Key Moves. New or edited wording **will** appear in exemplar fullReport.
- **sensoryMetaphors** change ("glow in the periphery before dawn" → "core heating before the first flare"): Does **not** affect exemplar synthetic. That phrase is `sensoryMetaphors[3]`; only `[0]` is used.

---

## 4. Marketing Descriptors

| Location | Uses phrase bank? | Notes |
|----------|-------------------|-------|
| `src/ligs/archetypes/contract.ts` | **No** | Marketing descriptor (tagline, hitPoints, ctaText, copyPhrases) comes from `ARCHETYPE_CONTRACT_MAP`, not phrase bank. |
| `lib/marketing/descriptor.ts` | **No** | Uses `getMarketingDescriptor` from contract adapters. |
| `src/ligs/marketing/generateOverlaySpec.ts` | **No** | Uses contract copyPhrases, logo style; no phrase bank. |

**Conclusion:** Marketing descriptors are **independent** of phrase bank. Phrase bank changes do not affect marketing copy.

---

## 5. Registry Summary

| Location | Uses phrase bank? | How |
|----------|-------------------|-----|
| `app/beauty/view/RegistrySummary.jsx` L46, L72–78 | **Indirect** | `parseKeyMoves(profile.fullReport)` extracts Key Moves from fullReport. "Return to coherence" line uses first 2 key moves. |
| Source of fullReport | — | Real reports: `buildCondensedFullReport` (lib/eve-spec.ts). Exemplars: `buildExemplarFullReport` (lib/exemplar-synthetic.ts). |

**Propagation:** Key Moves in fullReport come from `phraseBank.resetMoves`. Registry Summary displays the first 2. **resetMoves** changes (add 4th, edit existing) **will** propagate. New 4th move would appear if it becomes keyMoves[0] or keyMoves[1] — but buildCondensedFullReport uses all resetMoves; parseKeyMoves takes first 2. So the first 2 resetMoves in the array are shown. Adding a 4th at the end does not change the first 2. Editing the first 2 would change Registry Summary.

---

## 6. Return to Coherence Section

| Location | Uses phrase bank? | How |
|----------|-------------------|-----|
| `app/beauty/view/WhoisReportSections.jsx` L104, L209+ | **Indirect** | Displays Corrective Vector (cv) and Key Moves. Key Moves from `parsed?.keyMoves` = `parseCondensedReport(profile.fullReport).keyMoves`. |
| `lib/beauty-report-presentation.js` | **No** | Sanitization only; no phrase bank. |

**Propagation:** Same as Registry Summary. Key Moves come from fullReport, which is built from `resetMoves`. **resetMoves** changes propagate. Corrective Vector content comes from E.V.E. output (LLM), not directly from phrase bank; phrase bank influences it via E.V.E. prompt.

---

## 7. buildCondensedFullReport (Key Moves Block)

| Location | Uses phrase bank? | How |
|----------|-------------------|-----|
| `lib/eve-spec.ts` L174–181 | **Yes** | `getArchetypePhraseBank(archetypeName)` → `bank.resetMoves`. Key Moves block = `resetMoves.map(m => '• ' + m)`. |

**Propagation:** **Literal.** All resetMoves are written into the fullReport string. Any change to resetMoves (add, remove, edit) **will** appear in the user-facing report.

---

## 8. buildArchetypeVisualVoice (Image Prompts)

| Location | Uses phrase bank? | Which entries |
|----------|-------------------|---------------|
| `src/ligs/image/buildArchetypeVisualVoice.ts` L115, L148, L157–158 | **Yes** | `sensoryMetaphors`, `behavioralTells`, `relationalTells`. **Not** shadowDrift or resetMoves. |
| `src/ligs/image/buildArchetypeVisualVoice.ts` L19–39 | **Hardcoded map** | `SENSORY_TO_VISUAL` maps Ignis phrases to visual cues. Includes: "embers banked, waiting to catch", "flame flickers at the edge of vision", "heat rising through cold stone", "glow in the periphery before dawn", "sparks when friction meets intent". |

**Propagation:**
- **sensoryMetaphors** change ("glow in the periphery before dawn" → "core heating before the first flare"): The new phrase would **not** have a direct `SENSORY_TO_VISUAL` entry. It would fall through to `metaphorToVisual` generic logic. To preserve visual consistency, add a new `SENSORY_TO_VISUAL` entry for "core heating before the first flare".
- **shadowDrift**, **resetMoves**: Not used here. No propagation.

---

## 9. triangulatePrompt

| Location | Uses phrase bank? | Notes |
|----------|-------------------|-------|
| `src/ligs/image/triangulatePrompt.ts` L9 | Import only | `getArchetypePhraseBank` is imported but **not used** in the file. Dead import. Phrase bank does not affect triangulation prompts. |

---

## 10. Validator

| Location | Uses phrase bank? | Notes |
|----------|-------------------|-------|
| `src/ligs/archetypes/validateArchetypeContract.ts` L63–76 | **Yes** | Validates array lengths and presence. Does not display wording. Phrase bank changes that keep lengths within spec will pass. |

---

## Propagation Notes for Recommended Ignis Changes

If applying the refinements from `docs/ARCHETYPE-IGNISPECTRUM-REVIEW.md`:

| Change | Propagation | Action Required |
|--------|-------------|-----------------|
| **shadowDrift**: "mistake intensity for depth" → "mistake heat for sustained burn" | E.V.E. (indirect), exemplar synthetic (only uses `shadowDrift[0]`, so this change does **not** affect exemplar sections) | None. Exemplar deviations use `shadowDrift[0]` = "burn out before the finish line". |
| **resetMoves**: add "choose one clear next step and take it" | buildCondensedFullReport, exemplar fullReport, Registry Summary, Return to Coherence | **Test update:** `archetypePhraseBank.test.ts` enforces `resetMoves.length === 3`. Change to `expect(bank.resetMoves.length).toBeGreaterThanOrEqual(2)` and `toBeLessThanOrEqual(4)` (or similar) if adding a 4th. |
| **sensoryMetaphors**: "glow in the periphery before dawn" → "core heating before the first flare" | buildArchetypeVisualVoice (seeded pick) | **Map update:** `buildArchetypeVisualVoice.ts` has `SENSORY_TO_VISUAL["glow in the periphery before dawn"] = "peripheral luminosity, pre-dawn tones"`. Add entry for "core heating before the first flare" (e.g. "core warmth, pre-ignition gradient") or remove the old key. |

---

## Summary: Propagation by Phrase Bank Array

| Array | Propagates to | Propagation type |
|-------|---------------|------------------|
| **sensoryMetaphors** | E.V.E. (guidance), exemplar synthetic (index 0 only), buildArchetypeVisualVoice (seeded pick + SENSORY_TO_VISUAL map) | E.V.E.: indirect. Exemplar: literal for [0]. Visual: literal if phrase in map; else generic fallback. |
| **shadowDrift** | E.V.E. (guidance), exemplar synthetic (index 0 only) | E.V.E.: indirect. Exemplar: literal for [0] only. Changing [2] does not affect exemplar. |
| **resetMoves** | E.V.E. (guidance), buildCondensedFullReport (Key Moves), buildExemplarFullReport (Key Moves), Registry Summary (first 2), Return to Coherence (Key Moves) | **Literal** in Key Moves block. Add/edit/remove propagates to fullReport, Registry Summary, Return to Coherence. |

---

## Recommended Changes vs. Propagation

From `docs/ARCHETYPE-IGNISPECTRUM-REVIEW.md`:

| Change | Propagation | Action needed |
|--------|--------------|---------------|
| shadowDrift: "mistake intensity for depth" → "mistake heat for sustained burn" | E.V.E. prompt only (indirect). Exemplar uses [0], not [2]. | Update phrase bank. No other code changes. |
| resetMoves: add "choose one clear next step and take it" | Key Moves block, Registry Summary (if in first 2), Return to Coherence | Update phrase bank. Will appear in fullReport Key Moves. archetypePhraseBank.test.ts expects exactly 3 resetMoves per archetype — **test must be updated** to allow 2–4 per contract. |
| sensoryMetaphors: "glow in the periphery before dawn" → "core heating before the first flare" | E.V.E., exemplar (only [0], so no effect), buildArchetypeVisualVoice | Update phrase bank. **Add** `"core heating before the first flare": "core luminosity, pre-ignition gradient"` (or similar) to `SENSORY_TO_VISUAL` in buildArchetypeVisualVoice.ts to preserve visual quality. |

---

## Verification Checklist (After Phrase Bank Updates)

1. [ ] Run `npm run validate-archetypes` — passes (array lengths 2–4 for shadow/reset if contract relaxed).
2. [ ] Update `archetypePhraseBank.test.ts` if resetMoves count changes from 3 to 4.
3. [ ] If sensoryMetaphors changed: add/update `SENSORY_TO_VISUAL` in `buildArchetypeVisualVoice.ts`.
4. [ ] Generate exemplar-Ignispectrum: `buildExemplarFullReport` and `buildExemplarSyntheticSections` use phrase bank; verify output.
5. [ ] Run E.V.E. on a real report: phrase bank in prompt; verify E.V.E. output reflects new tone.
6. [ ] View `/beauty/view?reportId=exemplar-Ignispectrum`: Key Moves, Return to Coherence, Registry Summary show updated resetMoves.
