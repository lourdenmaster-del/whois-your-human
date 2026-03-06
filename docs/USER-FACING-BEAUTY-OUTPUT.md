# What the Paid User Sees — Beauty Profile View

**Purpose:** Show exactly what the end user sees after purchase. For sharing with ChatGPT or other collaborators.

**Note:** The Radiantis example uses data from `tests/mocks/full_report.json` (E.V.E. filter spec output). The Stabiliora example is archetype-consistent fiction. The production engine route may use a simplified E.V.E. prompt; when the full E.V.E. spec is used, the ThreeVoice sections and Aesthetic Fields are populated as shown. DRY_RUN and some live runs may show placeholder content in ThreeVoice cards (e.g. "—") until E.V.E. output is fully aligned.

---

## 1. Final Rendered Output Surface

| Aspect | Detail |
|--------|--------|
| **Type** | Web page (Next.js App Router client component) |
| **Route** | `/beauty/view?reportId={reportId}` |
| **Component** | `app/beauty/view/BeautyViewClient.jsx` |
| **Data source** | GET `/api/beauty/[reportId]` → `BeautyProfileV1` from Vercel Blob |
| **Transformation** | Profile JSON → React components. No HTML string injection. |
| **Internal structure hidden** | Yes. The 14-section raw report is not shown as 14 sections. |

### Main Rendering Components

| Component | Location | Renders |
|-----------|----------|---------|
| `EmotionalSnippet` | `app/beauty/view/EmotionalSnippet.jsx` | Subject name (h1), emotional snippet (quoted italic) |
| `PreviewCarousel` | `app/beauty/view/PreviewCarousel.jsx` | 3 images with labels: Vector Zero, Light Signature, Final Beauty |
| `ThreeVoiceSection` | Inline in BeautyViewClient | Each section: Raw signal, Custodian, Oracle |
| `FullReportAccordion` | `app/beauty/view/FullReportAccordion.jsx` | Expandable full report (pre-wrap text) |
| Aesthetic Fields block | Inline in BeautyViewClient | Vector Zero Beauty Field, Light Signature Aesthetic Field, Final Beauty Field (if present) |

---

## 2. Transformation Layer

### From 14-Section Report to Beauty Profile

**Input:** Light Identity Report (14 sections: initiation, spectral origin, archetype revelation, deviations, etc.) plus vector_zero JSON from engine/generate.

**Transformation:** E.V.E. (Extract, Validate, Emit) — OpenAI filter in `app/api/engine/route.ts`:

- **Extracts** from the full report only: vector_zero, light_signature, archetype, deviations, corrective_vector.
- **Ignores** Big Three, numerology, tarot, Kabbalah, relational/money/love/health/legacy.
- **Rewrites** each extracted section into 3-voice structure:
  - **raw_signal:** Measurable, observational. Physics language.
  - **custodian:** Biological interpretation.
  - **oracle:** Mythic synthesis.
- **Generates** 3 imagery prompts: vector_zero_beauty_field, light_signature_aesthetic_field, final_beauty_field.

**Output:** `BeautyProfile` (lib/eve-spec.ts) → merged into `BeautyProfileV1` with subjectName, emotionalSnippet, fullReport, imageUrls, timings.

**Display mapping:**

| Stored field | User-facing label / behavior |
|--------------|------------------------------|
| subjectName | Page heading (h1) |
| emotionalSnippet | Quoted italic under heading |
| imageUrls[0..2] | Carousel slides: Vector Zero, Light Signature, Final Beauty |
| light_signature | Card "Light Signature" — Raw signal, Custodian, Oracle |
| archetype | Card "Archetype" — Raw signal, Custodian, Oracle |
| deviations | Card "Deviations" — Raw signal, Custodian, Oracle |
| corrective_vector | Card "Corrective Vector" — Raw signal, Custodian, Oracle |
| fullReport | Accordion "Full Report" (expandable) |
| imagery_prompts.* | Section "Aesthetic Fields" — 3 descriptive paragraphs |

---

## 3. Sample Full Final User-Visible Output

Below is the exact text a user would see on screen for a Radiantis/Structoris profile (from test mock data). Layout and visual hierarchy are implied by the structure.

---

← Back to Beauty  
Paid / View Only — no checkout on this page

---

**Maria Elena**

*A structural pattern formed by forces at initialization.*

---

**BEAUTY PROFILE IMAGES**

[Carousel: 3 images — Vector Zero | Light Signature | Final Beauty]  
Labels under carousel: Vector Zero, Light Signature, Final Beauty  
Prev/Next controls, dot indicators.

---

**SHARE YOUR LIGHT IDENTITY REPORT**

[Input field with URL] [Copy Link]

---

**LIGHT SIGNATURE**

Raw signal: Primary 580 nm, secondary 460 nm. Spectral gradient 450–620 nm.

Custodian: The organism encodes this flux through retinal and vestibular pathways.

Oracle: The Light Signature holds illumination and structure in balance.

---

**ARCHETYPE**

Raw signal: Dominant Radiantis, subdominant Structoris. Core Force illumination.

Custodian: Biological expression follows the Radiantis–Structoris axis.

Oracle: Radiantis and Structoris define the archetypal frame.

---

**DEVIATIONS**

Raw signal: Lateral drift; tension profile low. Symmetry lateral 0.72, vertical 0.68.

Custodian: Environmental modulation introduces deviation from baseline.

Oracle: The signature bends under local conditions; the structure holds.

---

**CORRECTIVE VECTOR**

Raw signal: Pull toward coherence; rebalancing along vertical axis.

Custodian: The organism corrects toward the unbent configuration.

Oracle: The corrective vector returns the identity to its baseline.

---

**FULL REPORT** [+ expand]

1. INITIATION
RAW SIGNAL: Spectral gradient 450–620 nm at initialization.
CUSTODIAN: The organism stabilizes this flux through axial centers.
ORACLE: Radiantis emerges as the dominant force.

2. SPECTRAL ORIGIN
Primary wavelength 580 nm, secondary 460 nm. Symmetry lateral 0.72, vertical 0.68, depth 0.71. Tension profile: low.

3. ARCHETYPE REVELATION
Dominant: Radiantis. Subdominant: Structoris. Core Force: illumination; Shadow: rigidity.

4. DEVIATIONS
Environmental modulation introduces lateral drift; corrective pull toward coherence.

(Placeholder sections 5–14 omitted.)

---

**AESTHETIC FIELDS**

**VECTOR ZERO BEAUTY FIELD**

Unperturbed beauty field: warm-neutral palette, smooth texture, balanced shapes, steady motion. Deep navy #050814, soft violet #7A4FFF glow. No figures. 50 words.

**LIGHT SIGNATURE AESTHETIC FIELD**

Light Signature as aesthetic: 580 nm and 460 nm bands, spectral gradient, structural grid. Identity-as-beauty. Navy and violet. 50 words.

**FINAL BEAUTY FIELD**

Integrated beauty state: signature plus deviations plus corrective vector. Scientific-mythic, deep navy #050814, violet #7A4FFF, red #FF3B3B accents. No faces. 50 words.

---

[Start Over] (purple button)

---

This report is generated uniquely for you using the LIGS engine.

---

## 4. Second Example — Stabiliora

---

← Back to Beauty  
Paid / View Only — no checkout on this page

---

**James Chen**

*Balance and coherence at rest — the signature holds steady where structure meets regulation.*

---

**BEAUTY PROFILE IMAGES**

[Carousel: 3 images — Vector Zero | Light Signature | Final Beauty]

---

**SHARE YOUR LIGHT IDENTITY REPORT**

[Input field with URL] [Copy Link]

---

**LIGHT SIGNATURE**

Raw signal: Warm-neutral baseline 520–600 nm. Symmetry high; lateral 0.78, vertical 0.80. Minimal drift.

Custodian: The organism maintains this field through soft, even regulation of spectral input.

Oracle: The Light Signature rests in coherence; balance is the default state.

---

**ARCHETYPE**

Raw signal: Dominant Stabiliora. Subdominant Aequilibris. Core Force: regulation; Shadow: stasis.

Custodian: Biological expression favors steady, symmetrical patterns and gentle certainty.

Oracle: Stabiliora and Aequilibris anchor the archetypal frame in calm and clarity.

---

**DEVIATIONS**

Raw signal: Slight lateral asymmetry under load. Tension remains low; drift within 0.1 of baseline.

Custodian: Environmental modulation is gentle; the system corrects without strain.

Oracle: The signature bends only slightly; the structure returns to coherence on its own.

---

**CORRECTIVE VECTOR**

Raw signal: Soft pull toward vertical alignment; rebalancing through symmetrical flow lines.

Custodian: The organism restores coherence through minimal corrective effort.

Oracle: The corrective vector returns the identity to its baseline without drama or intensity.

---

**FULL REPORT** [+ expand]

[Full text of 14-section report — omitted here for brevity; same structure as above.]

---

**AESTHETIC FIELDS**

**VECTOR ZERO BEAUTY FIELD**

Unperturbed beauty field: warm-neutral palette, soft earth tones, organic texture, balanced shapes, steady motion. Blush, cream, rosewater. No figures. Minimal, premium.

**LIGHT SIGNATURE AESTHETIC FIELD**

Light Signature as aesthetic: regulated flux, coherent spectral gradient, soft symmetrical flow. Identity-as-beauty. Blush and cream. Balance and coherence.

**FINAL BEAUTY FIELD**

Integrated beauty state: signature plus deviations plus corrective vector. Calm, regulated, coherent. Deep navy #050814, lavender #7A4FFF, soft rose accents. No faces. Premium minimal.

---

[Start Over]

---

This report is generated uniquely for you using the LIGS engine.

---
