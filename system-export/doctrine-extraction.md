# Doctrine Extraction — LIGS

## Core Field Definitions

### LIGS Identity Layer

| Field/Term | Definition (from prompts/specs) |
|------------|----------------------------------|
| **Light Identity Report** | Full 14-section scientific-mythic identity report generated from birth data. Uses three-voice architecture and physics layer. |
| **Light Signature** | The spectral/structural pattern of identity — primary/secondary wavelengths, symmetry, tension fields. The "photonic fingerprint" of the subject. |
| **Vector Zero** | The unperturbed baseline of the Light Signature before deviations. NOT a new system; the default state from which deviations are measured. |
| **RAW SIGNAL** | Measurable photonic, gravitational, or temporal data. Pure observation. Physics language: vectors, gradients, flux, harmonics, interference patterns. |
| **CUSTODIAN** | Biological interpretation of the RAW SIGNAL. How the body receives, stabilizes, amplifies, or modulates. No psychology — only biological identity physics. |
| **ORACLE** | Mythic synthesis. Identity meaning from the forces. Declarative, inevitable, structural. No predictions, no destiny, no metaphor. |
| **emotional_snippet** | 1–2 declarative sentences summarizing the emotional/identity essence of the report. |
| **spectral gradient** | Wavelength band (e.g., 450–620 nm) associated with light/identity expression. |
| **gravitational harmonics** | Structural forces shaping identity; cosmic-local interference patterns. |
| **temporal flux** | Time-encoded patterns; circadian/seasonal encoding. |
| **cosmic-local interference** | Interaction between cosmic (astrological, symbolic) and local (birth place, time) forces. |

### Archetype System

| Term | Definition |
|------|------------|
| **Archetype (LIGS)** | One of 12 official types: Ignispectrum, Stabiliora, Duplicaris, Tenebris, Radianis, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis. |
| **Core Force** | Primary structural tendency of the archetype. |
| **Shadow Force** | Counter-tendency or tension within the archetype. |
| **Structural Tendency** | How the archetype manifests in behavior/structure. |
| **Mythic Signature** | Archetypal identity meaning in mythic terms. |
| **Behavioral Resonance** | How the archetype expresses through action. |

### Beauty / E.V.E. Layer

| Field/Term | Definition |
|------------|-------------|
| **E.V.E.** | Filter that transforms LIGS output into a Beauty-Only Profile. Extracts aesthetic/beauty-relevant content; does NOT generate new physics. |
| **Beauty Profile** | Filtered output: vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts. |
| **Beauty Signature** | Marketing/UI term for the aesthetic identity; "Your Beauty Signature begins here." |
| **beauty_baseline** | Default aesthetic: color_family, texture_bias, shape_bias, motion_bias. |
| **deviations** | Where the signature bends, drifts, or is perturbed from the baseline. Tension, asymmetry, environmental modulation. |
| **corrective_vector** | The pull back toward coherence; stabilization; rebalancing language. |
| **vector_zero_beauty_field** | Visual prompt for the baseline beauty field — unperturbed, coherent. |
| **light_signature_aesthetic_field** | Visual for the full Light Signature as aesthetic. |
| **final_beauty_field** | Integrated beauty state — signature + deviations + corrective vector. |
| **symmetry_profile** | Three numbers (lateral, vertical, depth) 0–1 representing baseline geometry. |
| **coherence_score** | 0–1; symmetry balance and wavelength stability. |
| **primary_wavelength** / **secondary_wavelength** | Spectral bands extracted from report (e.g., "580–620 nm"). |

### Cosmology Marbling (Engine v1.1)

| Term | Definition |
|------|-------------|
| **Cosmology Marbling** | Integrating cosmology into the 3-voice structure without new sections. Woven into sentences, not listed. |
| **Allowed systems** | Astrology, Numerology, Tarot, Kabbalah, Hermetic, Alchemy, Chakras, Western/Eastern elements, planetary rulerships, animal/plant/crystal, sacred geometry, mythic archetypes, geomancy, seasonal/lunar, mystery schools, resonances. |
| **RAW SIGNAL echo** | One subtle cosmological echo per section (e.g., color/wavelength resonance, directional magic). |
| **CUSTODIAN mirror** | One ancient physiological mirror per section (e.g., chakras as anatomical models). |
| **ORACLE fusion** | Full integration of physics, metaphysics, and human meaning. |

---

## Repeated Conceptual Language

| Phrase/Concept | Occurrence |
|----------------|------------|
| **scientific-mythic** | ENGINE_SPEC, IMAGE_PROMPT_SPEC, tone requirements, E.V.E. imagery |
| **identity physics** | ENGINE_SPEC, CUSTODIAN definition |
| **three voices** / **3-voice** | Every section; RAW SIGNAL, CUSTODIAN, ORACLE |
| **vectors, gradients, flux** | Physics layer; RAW SIGNAL |
| **no predictions, no destiny** | ORACLE voice; EVE_FILTER_SPEC |
| **deep navy #050814, violet #7A4FFF, red #FF3B3B** | Image prompts; EVE final_beauty_field |
| **structural / structurally inevitable** | ENGINE_SPEC tone; ORACLE |
| **abstract, no faces, no people** | IMAGE_PROMPT_SPEC; E.V.E. imagery |
| **50–80 words** | Image prompt length |
| **mythic-scientific, elegant, readable** | Cosmology Marbling tone |
| **NASA x Hermetic Order x Pulitzer essayist** | Marbling tone example |

---

## Terminology Inconsistencies

### 1. Report vs Profile vs Signature

| Context | Term Used |
|---------|-----------|
| Full 14-section output | Light Identity Report |
| E.V.E. filtered output | Beauty Profile, Beauty-Only Profile |
| Stripe product name | "Beauty Profile" — "Your E.V.E. Beauty Signature" |
| Layout meta | "Beauty" — "Your Beauty Signature begins here" |
| BeautyViewClient heading | "Your Light Identity Report" (when subjectName missing) |
| Email subject | "Your Light Identity Report" |
| Footer | "This report is generated uniquely for you using the LIGS engine" |

**Inconsistency:** "Beauty Profile," "Beauty Signature," and "Light Identity Report" are used interchangeably for the paid/E.V.E. output. The email says "Light Identity Report" while the Stripe product says "Beauty Profile" and "E.V.E. Beauty Signature."

### 2. Casing and Naming

| API/Storage | UI/Schema |
|-------------|-----------|
| `emotional_snippet` | `emotionalSnippet` |
| `image_prompts` | `imagePrompts`, `imagery_prompts` |
| `full_report` | `fullReport` |
| `vector_zero` | `vectorZero` |
| `light_signature` | `light_signature` (consistent) |
| `imagery_prompts` | `imagery_prompts` (in BeautyProfile) |

### 3. Imagery vs Image Prompts

- **image_prompts** (report): 2 prompts from engine for DALL·E, from IMAGE_PROMPT_SPEC
- **imagery_prompts** (BeautyProfile): 3 prompts from E.V.E. — vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field

Same concept (prompts for imagery) but different keys and counts.

### 4. "Public" vs "Paid"

- BeautyViewClient: `isPublic = true` — always shows "This is the public version of a Light Identity Report"
- No actual "paid" or "private" view exists; all profiles are accessible by URL
- "Pay to Unlock Full Report" on Landing refers to report, not Beauty Profile

### 5. LIGS vs (L)igs

- ENGINE_SPEC: "LIGS" (all caps)
- User prompt in image generation: "(L)igs report" — informal variant

---

## Canonical Color Palette (Embedded in Prompts)

| Hex | Name (in prompts) |
|-----|-------------------|
| #050814 | deep near-black navy |
| #FF3B3B | infrared red |
| #7A4FFF | ultraviolet violet |

Used in IMAGE_PROMPT_SPEC and EVE_FILTER_SPEC for image generation constraints.
