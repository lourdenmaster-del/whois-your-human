# Ignispectrum Archetype Review

**Purpose:** Evaluate Ignispectrum as the canonical reference archetype. No code changes. Documentation only.

**Sources:** `docs/ARCHETYPE-SPEC-IGNISPECTRUM.md`, `docs/ARCHETYPE-CONTRACT-EXTRACTION.md`, `src/ligs/voice/archetypePhraseBank.ts`, `src/ligs/archetypes/contract.ts`, `src/ligs/cosmology/cosmicAnalogues.ts`

---

## PART 1 — Review Against Contract

### Cosmic Analogue

**Ignispectrum → protostar ignition + bipolar jets**

| Element | Cosmic Phenomenon | Human Interpretation |
|--------|--------------------|------------------------|
| Core ignition | Nuclear ignition at critical density | "ignite others", "sparks when friction meets intent", "embers banked, waiting to catch" |
| Collimated outflow | Jets along rotational axis | "cut through hesitation with action" — partial; could be stronger |
| Bipolar symmetry | Some drawn in, some pushed away | "people lean in or step back" ✓ |
| Accretion → radiation | Energy transfer, system transition | "leave meetings energized, others drained" ✓ |

### Field Behavior

| Dimension | Assessment |
|-----------|------------|
| **Activation** | Strong. behavioralTells ("jump in before the plan is finished", "cut through hesitation with action") and lexicon_bias ("ignite", "energy", "intensity") clearly express ignition/activation. |
| **Energy transfer** | Present. "leave meetings energized, others drained" maps well to accretion-to-radiation. |
| **Directionality** | Moderate. "flowing, directional" in visual; "cut through hesitation" in phrase bank. Collimation (focused outflow) could be more explicit in phrase bank. |

### Drift Tendencies

| shadowDrift | Alignment | Notes |
|-------------|-----------|-------|
| "burn out before the finish line" | ✓ Strong | Maps to fuel exhaustion / accretion depleted. Clear. |
| "overwhelm others with urgency" | ✓ Strong | Scattered energy, not collimated. Good. |
| "mistake intensity for depth" | ⚠ Weak | Vague. "Depth" is underspecified. Could mean: mistaking surface heat for sustained transformation, or mistaking volume for substance. |

### Stabilization / Reset Behavior

| resetMove | Role | Notes |
|-----------|------|-------|
| "cold shower, slow breath, step outside" | Cooling, grounding | Effective. Reduces thermal overload. |
| "write it down instead of saying it" | Channeling | Good. Collimates energy into one direction (writing) instead of scatter. |
| "sit still for ten minutes—no phone" | Containment | Good. Stillness as accretion phase before next ignition. |

**Gap:** Reset moves stop at containment/cooling. They do not explicitly bridge to **focused ignition** or **directed energy**. The coherence outcome (clarity, activation, forward momentum) is implied by hitPoints ("Dynamic, forward-moving narrative") but not stated in the phrase bank. A fourth reset move could anchor the drift→reset→coherence arc: e.g. "choose one clear next step and take it" or "focus energy on a single decisive action."

### Phrase Bank Clarity

| Array | Clarity | Weak Spots |
|-------|---------|------------|
| sensoryMetaphors | High | "glow in the periphery before dawn" — evocative but less directly ignition/plasma than others. |
| behavioralTells | High | All map to activation, impulsivity, energy transfer. |
| relationalTells | High | "you ignite others or overwhelm them" — strong cosmic link. "people lean in or step back" — bipolar. |
| shadowDrift | Moderate | "mistake intensity for depth" is vague. |
| resetMoves | Moderate | Effective for cooling/containment; missing explicit bridge to focused activation. |

### Marketing Descriptor Clarity

| Field | Assessment |
|-------|------------|
| tagline | "Transform with intensity." — Clear, direct. |
| hitPoints | "Energetic vivid expression; Bold declarations and momentum; High metaphor density; Dynamic forward-moving narrative" — Clear. Coherence (forward momentum) is present. |
| ctaText | "Ignite change" — Strong ignition metaphor. |
| copyPhrases | headlines/subheads/ctas consistently use "ignite", "transform", "vivid", "energy". Coherent. |

### Visual Cues

| Parameter | Value | Alignment |
|-----------|-------|-----------|
| palette | warm, fiery, intense hues | ✓ Ignition, plasma |
| texture_level | medium | ✓ Not too smooth (cold) or chaotic (scattered) |
| motion | flowing, directional | ✓ Collimated flow |
| abstractPhysicalCues | white-hot core gradient, directional energy shear, prismatic heat haze | ✓ Strong. Core gradient = core ignition; directional = collimated; heat haze = plasma/radiation. |
| marketingVisuals.palette | warm, fiery, ember, amber | ✓ |
| marketingVisuals.motion | flowing, directional | ✓ |

**Weak signal:** None. Visual identity is well aligned with protostar ignition / plasma / energy release.

---

## PART 2 — Recommended Phrase Bank Improvements

**Structure unchanged.** Wording refinements only.

### shadowDrift

| Current | Suggested | Rationale |
|---------|-----------|-----------|
| "mistake intensity for depth" | "mistake heat for sustained burn" or "mistake flare for sustained ignition" | Ties to ignition metaphor; "sustained" clarifies the error (surface vs. lasting). |

### resetMoves (optional fourth)

| Current (3 items) | Suggested addition | Rationale |
|-------------------|--------------------|-----------|
| (none) | "choose one clear next step and take it" | Bridges containment → focused activation. Completes drift→reset→coherence arc. Contract allows 2–4 resetMoves; adding one stays within spec. |

### sensoryMetaphors (optional refinement)

| Current | Suggested | Rationale |
|---------|-----------|-----------|
| "glow in the periphery before dawn" | Keep or replace with "core heating before the first flare" | Current is poetic but less ignition-specific. Optional; not critical. |

---

## PART 3 — Cosmic Analogue Alignment

**Protostar ignition + bipolar jets** is reflected in:

| Location | Alignment |
|---------|-----------|
| cosmicAnalogues | ✓ phenomenon, description, lightBehaviorKeywords |
| phrase bank | ✓ "ignite others", "people lean in or step back", "leave meetings energized, others drained" |
| marketing descriptor | ✓ "Ignite change", "Transform with intensity", "energy", "vivid" |
| visual cues | ✓ white-hot core gradient, directional energy shear, flowing/directional motion |
| voice.lexicon_bias | ✓ energy, transform, ignite, vivid, intensity |

**Drift from metaphor:**

1. **Report language** — Not audited (engine prompts unchanged). Engine receives cosmic analogue block; RAW SIGNAL must cite it. No code change.
2. **"mistake intensity for depth"** — "Depth" does not map to cosmic analogue. Suggested replacement above.
3. **resetMoves** — Cooling/containment is consistent (accretion phase before reignition). Missing explicit "focused ignition" step is a minor gap, not a drift.

---

## PART 4 — Coherence Mechanics

**Target arc:** drift → reset → coherence

| Phase | Ignis Expression | Status |
|------|------------------|--------|
| **Drift** | overextension: "burn out before the finish line" ✓ | burnout, overwhelm, mistake intensity for depth |
| | scattered energy: "overwhelm others with urgency" ✓ | |
| **Reset** | cooling: "cold shower, slow breath, step outside" ✓ | |
| | channeling: "write it down instead of saying it" ✓ | |
| | containment: "sit still for ten minutes—no phone" ✓ | |
| **Coherence** | clarity: implied in hitPoints ("Dynamic, forward-moving narrative") | Not explicit in phrase bank |
| | activation: "Ignite change" in CTA | |
| | forward momentum: hitPoints | |

**Recommendation:** Add one reset move that explicitly returns to focused activation: e.g. "choose one clear next step and take it." This makes the coherence outcome visible in the phrase bank and completes the arc for the reference archetype.

---

## PART 5 — Visual Identity Verification

| Check | Result |
|-------|--------|
| Palette communicates ignition/plasma | ✓ warm, fiery, ember, amber |
| Texture supports energy (not flat/cold) | ✓ medium |
| Motion suggests collimated flow | ✓ flowing, directional |
| abstractPhysicalCues evoke core + outflow | ✓ white-hot core gradient, directional energy shear, prismatic heat haze |

**Weak signals:** None identified. Visual parameters reinforce ignition / plasma / energy release.

---

## PART 6 — Deliverable Summary

### 1. Ignis Strengths

- **Cosmic alignment:** Protostar ignition + bipolar jets is consistently reflected in phrase bank ("ignite", "people lean in or step back"), marketing ("Ignite change"), and visual cues (core gradient, directional shear).
- **Field behavior:** Clear activation/ignition language across behavioralTells, relationalTells, and lexicon_bias.
- **Drift:** shadowDrift (burnout, overwhelm) maps well to fuel exhaustion and scattered energy.
- **Reset:** Cooling and channeling moves are effective and metaphor-consistent.
- **Visual identity:** Strong. abstractPhysicalCues (white-hot core, directional shear, heat haze) directly evoke plasma/ignition.
- **Marketing:** Tagline, hitPoints, CTA, and copy phrases are coherent and ignition-aligned.
- **Structure:** All contract fields present; phrase bank arrays properly populated.

### 2. Ignis Weaknesses

- **"mistake intensity for depth"** — Vague; "depth" does not map to cosmic analogue. Weakest phrase in shadowDrift.
- **Coherence gap** — resetMoves do not explicitly bridge to focused activation. The drift→reset→coherence arc is implied but not fully stated in the phrase bank.
- **"glow in the periphery before dawn"** — Minor: less ignition-specific than other sensoryMetaphors, though still valid.

### 3. Recommended Phrase Bank Improvements

| Array | Change | Priority |
|-------|--------|----------|
| shadowDrift | Replace "mistake intensity for depth" with "mistake heat for sustained burn" or "mistake flare for sustained ignition" | High |
| resetMoves | Add "choose one clear next step and take it" (optional fourth) | Medium |
| sensoryMetaphors | Consider "core heating before the first flare" for "glow in the periphery before dawn" | Low |

### 4. Visual Identity Confirmation

**Confirmed.** Palette, texture, motion, and abstractPhysicalCues all reinforce ignition / plasma / energy release. No weak signals. No changes needed.

### 5. Readiness as Reference Archetype

**Ignispectrum is ready** to serve as the canonical reference archetype for the remaining 11, with the following caveats:

- **Optional refinements** (shadowDrift wording, optional fourth resetMove) would strengthen the template. They are not blocking.
- **Current state** is already strong: cosmic alignment, field behavior, drift, reset, visual identity, and marketing are coherent and well-integrated.
- **The remaining 11** can use Ignis as the model for: (a) tight cosmic-analogue→phrase-bank mapping, (b) explicit drift→reset→coherence arc, (c) visual cues that reinforce the phenomenon, (d) marketing copy that echoes the archetype metaphor.

**Conclusion:** Ignispectrum is suitable as the reference archetype. Apply the recommended phrase bank refinements when convenient; they improve clarity and completeness but are not required for reference status.
