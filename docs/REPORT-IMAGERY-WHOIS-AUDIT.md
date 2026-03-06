# Report Imagery System — WHOIS-Style Identity Record Audit

**Read-only inspection.** No code changes. Verifies whether the visual artifact layer matches the WHOIS identity-record concept or drifts into generic marketing/aesthetic territory.

---

## PART 1 — Image Role Map

| Artifact Type | What It Represents in LIGS | Function (Identity Evidence / Visual Support / Marketing) | Belongs In |
|---------------|----------------------------|----------------------------------------------------------|------------|
| **Vector Zero** | Unperturbed baseline of the Light Signature before deviations — coherence, wavelengths, symmetry, beauty_baseline (color_family, texture_bias, shape_bias, motion_bias) | **Identity evidence** — registry baseline state | WHOIS report, landing (as sample) |
| **Light Signature** | Full Light Signature as aesthetic — spectral origin, light vectors, structural pattern, identity-as-beauty | **Identity evidence** — core identity field | WHOIS report, landing, share |
| **Final Beauty Field** | Integrated beauty state — signature + deviations + corrective vector as one field | **Identity evidence** — resolved identity artifact | WHOIS report, landing |
| **Share Card** | Archetype-branded card with tagline, hit points, primary image; designed for social sharing | **Marketing surface** with identity anchor | Share surface, optionally report footer |
| **Exemplar Card** | Composed card (bg + overlay) for archetype sample; used on landing and exemplar view | **Visual support** — sample identity artifact | Landing, exemplar report |
| **Marketing Background** | Raw DALL·E field image; archetype-triangulated; used as base for marketing/exemplar cards | **Marketing surface** — aesthetic base | Landing, compose pipeline |
| **Marketing Card** | Composed card (marketing_background + logo_mark + overlay); archetype + tagline + CTA | **Marketing surface** | Landing (removed from report page) |

**Summary:**
- **Identity evidence:** Vector Zero, Light Signature, Final Beauty Field — all derived from E.V.E. and report; represent structural identity.
- **Visual support:** Exemplar Card — sample of what an identity artifact looks like.
- **Marketing surface:** Share Card, Marketing Background, Marketing Card — designed for conversion and sharing; identity is referenced but not primary.

---

## PART 2 — Real Report Image Pipeline

| Image Type | Generation Route | Prompt Source | Storage Path | Render Location | Current Label | Label Accuracy |
|------------|------------------|---------------|--------------|-----------------|---------------|----------------|
| **Vector Zero** | POST `/api/generate-image` (engine route, after E.V.E.) | E.V.E. `imagery_prompts.vector_zero_beauty_field` — "Visual for the baseline beauty field — unperturbed, coherent, default aesthetic (colors, texture, shape, motion from beauty_baseline)" | `ligs-images/{reportId}/vector_zero_beauty_field.png` | PreviewCarousel (slide 0), Archetype Artifact hero (fallback) | "Vector Zero" | **Accurate** — matches system concept |
| **Light Signature** | POST `/api/generate-image` (engine route) | E.V.E. `imagery_prompts.light_signature_aesthetic_field` — "Visual for the full Light Signature as aesthetic — spectral, structural, identity-as-beauty" | `ligs-images/{reportId}/light_signature_aesthetic_field.png` | PreviewCarousel (slide 1), Archetype Artifact hero (preferred) | "Light Signature" | **Accurate** — matches system concept |
| **Final Beauty Field** | POST `/api/generate-image` (engine route) | E.V.E. `imagery_prompts.final_beauty_field` — "Visual for the integrated beauty state — signature + deviations + corrective vector as one beauty field" | `ligs-images/{reportId}/final_beauty_field.png` | PreviewCarousel (slide 2) | "Final Beauty" | **Partially accurate** — "Final Beauty" is shorter than "Final Beauty Field"; "beauty" leans aesthetic; "Field" would better reflect identity/registry language |
| **Share Card** | POST `/api/image/generate` (purpose share_card) | Triangulated: `buildTriangulatedImagePrompt` with mode `share_card`; archetype + solar profile | `ligs-images/{reportId}/share_card.png` | ShareCard component (primary image when present) | No per-image label; section "Share Your Light Identity" | N/A — Share Card is the whole section |
| **Marketing Card** | POST `/api/image/compose` (bg + logo + overlay) | Overlay from `buildOverlaySpecWithCopy`; background from marketing_background | `ligs-images/{reportId}/marketing_card.png` | (Removed from report page) | N/A | N/A |

**Section labels:**
- "Beauty Profile Images" — section title for PreviewCarousel
- "Archetype Artifact" — section title for hero + info panel
- "Share Your Light Identity" — section title for ShareCard

**Label accuracy assessment:**
- "Vector Zero" and "Light Signature" accurately describe identity concepts.
- "Final Beauty" truncates "Final Beauty Field"; "beauty" is aesthetic; "Field" ties to identity/registry.
- "Beauty Profile Images" is neutral but "Profile" is softer than "Registry" or "Identity Artifacts."

---

## PART 3 — Exemplar Image Pipeline

| Image Type | Source | Composed vs Generated | Storage | Strongest As | Marketing vs Registry |
|------------|--------|----------------------|---------|--------------|------------------------|
| **Exemplar Card** | POST `/api/exemplars/generate` or `/api/exemplars/save` | **Composed** — marketing_background (or dry placeholder) + overlay (headline, subhead, CTA, glyph/logo) | `ligs-exemplars/{archetype}/{version}/exemplar_card.png` | **Sample identity artifact** — shows what a composed identity card looks like; archetype-specific | Hybrid — overlay is marketing copy; visual is identity-anchored |
| **Marketing Background** | POST `/api/image/generate` (purpose marketing_background) or glyph-conditioned (Ignis) | **Generated** — DALL·E 3; triangulated by archetype, solar profile | `ligs-exemplars/{archetype}/{version}/marketing_background.png` | **Aesthetic base** — raw field; not a registry record | **Marketing-heavy** — purpose is marketing; used as background for cards |
| **Share Card** | POST `/api/image/generate` (purpose share_card) for non-Ignis; **composed** (same as exemplar_card) for Ignis | **Generated** (non-Ignis) or **Composed** (Ignis) | `ligs-exemplars/{archetype}/{version}/share_card.png` | **Share surface** — designed for social sharing | **Marketing-heavy** — share_card purpose is conversion/sharing |

**Exemplar carousel labels:** `["Exemplar Card", "Background", "Share Card"]`

**Assessment:**
- **Exemplar Card** — Strongest as sample identity artifact; composed with archetype overlay; supports WHOIS metaphor when framed as "sample registry record."
- **Background** — Raw aesthetic; "Background" is accurate but generic; feels more like marketing base than registry evidence.
- **Share Card** — Share surface; "Share Card" is accurate; feels more like marketing than registry evidence.

---

## PART 4 — WHOIS Consistency Check

| Image Type | Classification | Rationale |
|------------|----------------|-----------|
| **Vector Zero** | **A) Strong WHOIS-fit** | Directly represents the unperturbed baseline — a core registry concept. "Vector Zero" is system terminology. Feels like registry evidence. |
| **Light Signature** | **A) Strong WHOIS-fit** | Core identity concept; spectral/structural pattern of the identity. "Light Signature" is system terminology. Feels like identity evidence. |
| **Final Beauty Field** | **B) Acceptable support** | Represents integrated identity state (signature + deviations + corrective vector). "Final Beauty" leans aesthetic; "Field" would strengthen registry framing. Acceptable as identity artifact. |
| **Share Card** | **C) Weak / marketing-heavy** | Designed for sharing and conversion; overlay has tagline, hit points, CTA. Identity is referenced (archetype) but primary function is marketing. **Question:** Does it belong inside the report? — It is at the end as a share surface; acceptable if framed as "share your identity record" rather than "identity evidence." |
| **Exemplar Card** | **B) Acceptable support** | Sample of what an identity artifact looks like. Supports WHOIS metaphor when labeled as "Sample Identity Record" or "Exemplar Registry Entry." Overlay copy (headline, CTA) is marketing; visual structure supports registry. |
| **Marketing Background** | **C) Weak / marketing-heavy** | Raw aesthetic field; purpose is marketing_background. Not identity evidence; base layer for composed cards. |
| **Marketing Card** | **D) Off-model for report** | Composed for conversion; CTA, tagline, hit points. Correctly removed from report page. Belongs on landing, not in WHOIS report. |

**Specific answers:**

- **Does "Vector Zero" feel like registry evidence?** Yes. It is the baseline state before deviations — a core registry concept.
- **Does "Light Signature" feel like identity evidence?** Yes. It is the spectral/structural identity pattern.
- **Does "Final Beauty Field" feel like an identity artifact or just a pretty image?** It is intended as identity artifact (integrated state). The label "Final Beauty" leans aesthetic; "Final Beauty Field" or "Resolved Identity Field" would better reflect the system claim.
- **Does the Share Card belong inside the report?** Acceptable at the end as a share surface, if framed as "Share your identity record" rather than as identity evidence. It is a bridge from report to social sharing.
- **Do exemplar cards support the WHOIS metaphor?** Yes, when framed as sample registry entries. The label "Exemplar Card" is neutral; "Sample Identity Record" or "Exemplar Registry Entry" would strengthen the metaphor.
- **Are any labels misleading or too aesthetic relative to the system claim?** "Final Beauty" is vague; "Beauty Profile Images" is softer than "Identity Artifacts" or "Registry Visuals"; "Share Your Light Identity" is good. "Exemplar Card" could be "Sample Identity Record."

---

## PART 5 — Image Language / Labels

### Current User-Facing Labels

| Context | Label | Location |
|---------|-------|----------|
| Carousel slide 0 (real) | "Vector Zero" | PreviewCarousel |
| Carousel slide 1 (real) | "Light Signature" | PreviewCarousel |
| Carousel slide 2 (real) | "Final Beauty" | PreviewCarousel |
| Carousel slide 0 (exemplar) | "Exemplar Card" | PreviewCarousel |
| Carousel slide 1 (exemplar) | "Background" | PreviewCarousel |
| Carousel slide 2 (exemplar) | "Share Card" | PreviewCarousel |
| Section title | "Beauty Profile Images" | BeautyViewClient |
| Section title | "Archetype Artifact" | BeautyViewClient |
| Section title | "Share Your Light Identity" | BeautyViewClient |
| ShareCard button | "Download card" / "Download image" | ShareCard |
| ShareCard button | "Download signature" | ShareCard |
| Archetype Artifact image alt | "Light Signature for {subjectName}" | ArchetypeArtifactCard |

### Label Quality Assessment

| Label | Strength | Notes |
|-------|----------|-------|
| **Vector Zero** | Strong | System term; registry-aligned |
| **Light Signature** | Strong | System term; identity-aligned |
| **Final Beauty** | Vague | Truncates "Final Beauty Field"; "beauty" is aesthetic |
| **Exemplar Card** | Neutral | Could be "Sample Identity Record" for WHOIS |
| **Background** | Vague | Generic; doesn't convey identity |
| **Share Card** | Clear | Accurate for function |
| **Beauty Profile Images** | Too beauty/marketing-oriented | "Profile" is soft; "Identity Artifacts" or "Registry Visuals" would better reflect WHOIS |
| **Archetype Artifact** | Strong | "Artifact" supports registry/evidence framing |
| **Share Your Light Identity** | Strong | Identity-focused; good |
| **Download card** / **Download image** | Clear | Functional |
| **Download signature** | Strong | "Signature" ties to Light Signature |

**Labels that could better reflect identity registry language:**
- "Beauty Profile Images" → "Identity Artifacts" or "Registry Visuals"
- "Final Beauty" → "Final Beauty Field" or "Resolved Identity Field"
- "Exemplar Card" → "Sample Identity Record" or "Exemplar Registry Entry"
- "Background" (exemplar) → "Sample Field" or "Archetype Field"

---

## PART 6 — Lowest-Risk Future Improvements

### Tier A — Presentation / Label Changes Only

- Rename "Beauty Profile Images" → "Identity Artifacts" or "Registry Visuals"
- Rename "Final Beauty" → "Final Beauty Field" (carousel label)
- Rename "Exemplar Card" → "Sample Identity Record" (exemplar carousel)
- Rename "Background" (exemplar) → "Archetype Field" or "Sample Field"
- Add optional subtitle under carousel: "Visual evidence from your identity record"
- Ensure ShareCard section header emphasizes "Share your identity record" over pure marketing

### Tier B — Reassignment / Reordering of Existing Images

- Consider leading the report carousel with Light Signature (already preferred for Archetype Artifact hero) — currently order is Vector Zero, Light Signature, Final Beauty; could reorder to Light Signature, Vector Zero, Final Beauty to lead with strongest identity evidence
- For exemplars: consider leading with Exemplar Card (already first) — order is fine
- Share Card placement at end of report — acceptable; no change needed unless Share Card is reframed as optional "share your record" vs. core identity evidence

### Tier C — Prompt / Composition / Generation Changes

- E.V.E. imagery prompts: add explicit "identity record evidence" or "registry artifact" language to reinforce WHOIS framing (higher risk — may affect output)
- Marketing card: keep removed from report; no change
- Exemplar overlay copy: reduce CTA prominence if exemplar is framed as "sample registry entry" (higher risk — affects conversion)
- Share card purpose: already triangulated; could add "identity record" framing to overlay (medium risk)

---

## Summary

| Dimension | Assessment |
|-----------|------------|
| **Identity evidence** | Vector Zero, Light Signature, Final Beauty Field are strong identity artifacts; prompts and concepts align with WHOIS. |
| **Marketing drift** | Share Card, Marketing Background, Marketing Card are marketing-oriented; correctly scoped (Share at end, Marketing removed from report). |
| **Labels** | "Vector Zero" and "Light Signature" are strong; "Final Beauty" and "Beauty Profile Images" could be tightened for WHOIS. |
| **Exemplar** | Exemplar Card supports WHOIS as sample; Background and Share Card are more marketing; labels could be improved. |
| **Lowest-risk improvements** | Tier A (labels) first; Tier B (reorder) optional; Tier C (prompts/composition) only if deeper alignment is desired. |
