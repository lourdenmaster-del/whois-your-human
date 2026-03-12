# GLYPH DESIGN CHECKLIST

**Step-by-step checklist for creating a new archetype glyph.**

Use this checklist for **every** new glyph. Each step must be verified before the glyph is complete.

---

## 1. Confirm archetype sector

**Reference:** `docs/GLYPH-ORIENTATION.md`

- [ ] Identify the archetype's **solar segment** (index 0–11)
- [ ] Note the **center angle** (15°, 45°, 75°, … 345°)
- [ ] Confirm the **dominant axis** or axes for this archetype (single-axis vs multi-axis)

---

## 2. Confirm physics behavior

**Reference:** `docs/GLYPH-PHYSICS.md`

- [ ] Read the **physical behavior class** (ignition, equilibrium, flow, etc.)
- [ ] Apply the **geometric rule** (symmetry, shape language, edge style)
- [ ] Ensure geometry expresses the **cosmic analogue** and field behavior

---

## 3. Align geometry with dominant axis

**Reference:** `docs/GLYPH-ORIENTATION.md`, `docs/glyph-radial-grid.svg`

- [ ] Primary geometry aligns with the segment center angle
- [ ] Multi-axis archetypes: secondary axes at correct symmetry angles (e.g., 120° for 3-fold, 180° for bilateral)
- [ ] Optional: anchor at seasonal point (0°, 90°, 180°, 270°) when appropriate — document the choice

---

## 4. Ensure geometry stays between center dot and ring

**Reference:** `docs/GLYPH-LAW.md`, `docs/glyph-design-template.svg`

- [ ] All archetype geometry stays **inside** the inner ring boundary (r ≤ 205)
- [ ] No geometry **intersects** the center dot (r ≥ 85)
- [ ] Safe design region: **annulus between r = 85 and r = 205**

---

## 5. Use ≤4 primitive shapes

**Reference:** `docs/GLYPH-PRIMITIVE-SYSTEM.md`

- [ ] Geometry uses **2–4 primitive shapes** max (triangle, arc, bar, grid, spiral, spoke)
- [ ] Only allowed primitives; no ad-hoc shapes
- [ ] Avoid excessive subdivision; keep legible at ~40px

---

## 6. Verify symmetry rules

**Reference:** `docs/GLYPH-PHYSICS.md` (geometric rule per archetype)

- [ ] Symmetry matches archetype: 3-fold, 4-fold, bilateral, radial, etc.
- [ ] Rotational symmetry uses `transform="rotate(angle 500 500)"` with correct angles
- [ ] Mirror/bilateral symmetry is visually balanced

---

## 7. Export SVG using glyph-law template

**Reference:** `docs/GLYPH-LAW.md`, `docs/glyph-design-template.svg`

- [ ] ViewBox: `0 0 1000 1000`
- [ ] Center: (500, 500)
- [ ] **Layer order:** (1) ring → (2) archetype geometry → (3) center dot
- [ ] Ring: r=205, stroke-width=56
- [ ] Center dot: r=85
- [ ] Remove or hide design guides before final export

---

## 8. Place file in `public/glyphs/`

- [ ] Save as `public/glyphs/{name}.svg` (lowercase, no spaces)
- [ ] Naming convention: archetype-aligned (e.g., `ignis.svg`, `stabiliora.svg`)

---

## 9. Register glyph in archetype-glyph-registry.ts

**File:** `lib/archetype-glyph-registry.ts`

- [ ] Add `ArchetypeName: "glyphs/{name}.svg"` to `ARCHETYPE_GLYPH_PATHS`
- [ ] Path is relative to `public/`

---

## Quick reference

| Step | Key doc / file |
|------|----------------|
| 1 | GLYPH-ORIENTATION.md (12 solar segments) |
| 2 | GLYPH-PHYSICS.md (physical behavior → geometry) |
| 3 | GLYPH-ORIENTATION.md, glyph-radial-grid.svg |
| 4 | GLYPH-LAW.md, glyph-design-template.svg |
| 5–6 | GLYPH-PHYSICS.md |
| 7 | GLYPH-LAW.md, glyph-design-template.svg |
| 8 | `public/glyphs/` |
| 9 | `lib/archetype-glyph-registry.ts` |

---

## See also

- `docs/GLYPH-LAW.md` — Canonical geometry constants
- `docs/GLYPH-ORIENTATION.md` — Radial orientation, 12 segments
- `docs/GLYPH-PHYSICS.md` — Physics–geometry mapping
- `docs/GLYPH-PRIMITIVE-SYSTEM.md` — Allowed primitives, archetype→primitive mapping
- `docs/glyph-design-template.svg` — Design template with guides
- `docs/glyph-radial-grid.svg` — Master design reference (visual)
- `public/glyphs/ignis.svg` — Canonical example
