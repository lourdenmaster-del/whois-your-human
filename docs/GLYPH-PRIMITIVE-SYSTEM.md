# GLYPH PRIMITIVE SYSTEM

**Primitive geometry language for LIGS archetype glyphs.**

This document defines the six allowed primitives and how they map to physical behavior and archetypes. Use it with `docs/GLYPH-PHYSICS.md` and `docs/glyph-radial-grid.svg` to ensure all archetype glyphs feel like one coherent symbolic language.

---

## Rule: ≤4 Primitives

**Every glyph must use 2–4 primitive instances.** This keeps the language sparse, legible at ~40px, and visually coherent across all 12 archetypes. Combine primitives via rotation, mirror, or repetition—but never exceed four.

---

## Allowed Primitives

| Primitive | SVG form | Visual meaning | Typical use |
|-----------|----------|----------------|-------------|
| **Triangle** | `<polygon>` | Outward thrust, ignition, directional shear | Ignition, shock, paired apex |
| **Arc** | `<path>` arc or `<circle>` segment | Curve, orbit, concentric field | Equilibrium, absorption, flow, balance |
| **Bar** | `<rect>` or thin `<polygon>` | Directional axis, linear momentum, beam | Collimated flow, grid element, boundary |
| **Grid** | Repeating bars or modules | Periodic structure, skeletal network | Precision, filamentary, modular |
| **Spiral** | `<path>` curved | Rotational flow, angular momentum | Accretion, disk, laminar transport |
| **Spoke** | Radially arranged bars/rays | Central emission, radial symmetry | Radiance, filament nodes |

---

## Primitive → Physical Behavior

| Physical behavior | Primary primitive(s) | Secondary |
|-------------------|----------------------|-----------|
| Ignition / Outflow | triangle | — |
| Equilibrium / Stability | bar, arc | — |
| Replication / Paired | triangle, bar | — |
| Absorption / Indirect | arc | — |
| Radiance / Central | spoke | — |
| Precision / Periodic | grid, bar | — |
| Three-body balance | triangle, arc | — |
| Occlusion / Silhouette | arc, bar | — |
| Direction / Collimated | bar | — |
| Filamentary / Network | grid, spoke | — |
| Shock / Transition | bar, triangle | — |
| Flow / Spiral | spiral, arc | — |

---

## Archetype → Primitives Used

| Archetype | Primitive(s) | Notes |
|-----------|---------------|-------|
| Ignispectrum | triangle | 3 instances @ 0°, 120°, 240° |
| Stabiliora | bar, arc | Horizontal bar(s); gentle arc for equilibrium |
| Duplicaris | triangle, bar | Paired twins; mirror symmetry |
| Tenebris | arc | Concentric or layered arcs; structure by absence |
| Radiantis | spoke | Rays from center; full radial |
| Precisura | grid, bar | 4-fold grid; crisp bars at cardinals |
| Aequilibris | triangle, arc | Three-point balance; bilateral arc forces |
| Obscurion | arc, bar | Layered arcs; thin rim bar for silhouette |
| Vectoris | bar | Single dominant bar along axis (e.g. 255°) |
| Structoris | grid, spoke | Filamentary grid; nodes at diagonals |
| Innovaris | bar, triangle | Sharp boundary bar; breakout triangle |
| Fluxionis | spiral, arc | Curved spiral; laminar arc |

---

## Examples on the Glyph Radial Grid

**Reference:** `docs/glyph-radial-grid.svg`, `docs/GLYPH-ORIENTATION.md`. Center (500,500), 0° = up.

### Triangle (Ignispectrum)

Three triangles at **0°, 120°, 240°**—aligned with vernal equinox and 3-fold symmetry. Each triangle apex points radially outward. Base spans ~200 units; apex at r≈173 from center. Example: `public/glyphs/ignis.svg`.

### Bar (Vectoris)

Single bar along dominant axis **255°**. Bar runs through center or offset along 255° ray. Length stays within r=85–205 annulus. Sharp ends; no taper.

### Arc (Tenebris, Stabiliora)

- **Tenebris:** Concentric arcs centered at (500,500). Arc radius between 85–205. Suggests deflection, lensing.
- **Stabiliora:** Horizontal arc (near 45° equilibrium band) or gentle crescent. Conveys gravitational balance.

### Spoke (Radiantis)

Bars or thin triangles radiating from center at 12 or more angles. Even spacing. All stay within ring. Can use 12 (segment boundaries) or 8 (cardinals + diagonals).

### Grid (Precisura, Structoris)

- **Precisura:** 4 bars at **0°, 90°, 180°, 270°** (cardinals). Optional cross or plus. Crisp, orthogonal.
- **Structoris:** 4 bars at **45°, 135°, 225°, 315°** (diagonals). Filamentary; nodes at intersections.

### Spiral (Fluxionis)

Curved path from outer ring toward center, or partial spiral arc. Suggests accretion, rotation. Axis along segment center **345°**.

---

## Primitive Combinations (≤4 rule)

| Archetype | Count | Combination |
|-----------|-------|-------------|
| Ignispectrum | 3 | 3× triangle (same primitive, 3 instances) |
| Vectoris | 1 | 1× bar |
| Duplicaris | 2 | 2× triangle or 2× bar (paired) |
| Radiantis | 1–4 | 4× spoke, or 1 radial group of spokes (count as 1) |
| Precisura | 2–4 | 4× bar (orthogonal) or 2 bars + 2 cross-bars |
| Fluxionis | 1–2 | 1× spiral + optional arc |

**Note:** A "radial group" (e.g. 12 spokes) can count as **1 primitive** if the spokes are identical and procedurally rotated. Otherwise, each distinct shape counts.

---

## Coherence Rules

1. **One archetype = one primitive palette.** Do not mix unrelated primitives (e.g. spiral + grid is rare; flow + structure can combine arc + grid in Structoris).
2. **Orientation follows segment.** Align primary geometry with dominant axis from `GLYPH-ORIENTATION.md`.
3. **No ad-hoc shapes.** Stick to triangle, arc, bar, grid, spiral, spoke. Custom paths must read as one of these.
4. **≤4 primitives total.** Count rotation instances as one primitive if identical.

---

## See Also

- `docs/GLYPH-LAW.md` — Canonical geometry, layer order
- `docs/GLYPH-PHYSICS.md` — Physical behavior → geometric rule
- `docs/GLYPH-ORIENTATION.md` — 12 segments, dominant axis
- `docs/GLYPH-DESIGN-CHECKLIST.md` — 9-step checklist
- `docs/glyph-radial-grid.svg` — Visual reference for segment angles
- `public/glyphs/ignis.svg` — Canonical triangle example
