# GLYPH ORIENTATION

**Radial orientation system for archetype glyphs.**

This document defines how the 12 solar segments map to glyph geometry. Use it when designing glyph SVGs so the glyph language matches the solar archetype model. See `docs/GLYPH-LAW.md` for geometry constants and `docs/GLYPH-PHYSICS.md` for physics–geometry mapping.

---

## Coordinate Convention

### Ecliptic Longitude

- **0°** = Vernal equinox (March ~21)
- **90°** = Summer solstice (June ~21)
- **180°** = Autumnal equinox (September ~21)
- **270°** = Winter solstice (December ~21)
- Angles increase **eastward** along the ecliptic.

### Glyph Radial Angle

- **0°** = 12 o'clock (top of glyph, toward negative y)
- **90°** = 3 o'clock (right)
- **180°** = 6 o'clock (bottom)
- **270°** = 9 o'clock (left)

**Mapping:** Glyph angle = ecliptic longitude. Vernal equinox (0°) aligns with the top of the glyph.

### SVG Implementation

For a glyph with center `(500, 500)` and radius `r`:

- Point at glyph angle θ (degrees):  
  `x = 500 + r × sin(θ)`  
  `y = 500 - r × cos(θ)`

(Signs reflect SVG y-down: "up" is negative y.)

---

## The 12 Solar Segments

Each segment spans **30°** ecliptic longitude. Segment centers are at odd multiples of 15°.

| Index | Archetype      | Lon Start | Lon End | Center (°) | Anchor      | Dominant Axis (Glyph Angle) |
|-------|----------------|-----------|---------|------------|-------------|-----------------------------|
| 0     | Ignispectrum   | 0         | 30      | **15**     | equinox     | 15°, 135°, 255° (3-fold)    |
| 1     | Stabiliora     | 30        | 60      | **45**     | crossquarter| 45° (horizontal equilibrium)|
| 2     | Duplicaris     | 60        | 90      | **75**     | —           | 75°, 255° (bilateral)       |
| 3     | Tenebris       | 90        | 120     | **105**    | solstice    | 105° (concentric, no axis)  |
| 4     | Radiantis      | 120       | 150     | **135**    | crossquarter| 360° radial (all directions)|
| 5     | Precisura      | 150       | 180     | **165**    | —           | 0°, 90°, 180°, 270° (grid)  |
| 6     | Aequilibris    | 180       | 210     | **195**    | equinox     | 195°, 15° (bilateral)       |
| 7     | Obscurion      | 210       | 240     | **225**    | crossquarter| 225° (oblique, layered)     |
| 8     | Vectoris       | 240       | 270     | **255**    | —           | 255° (single dominant)      |
| 9     | Structoris     | 270       | 300     | **285**    | solstice    | 45°, 135°, 225°, 315° (grid)|
| 10    | Innovaris      | 300       | 330     | **315**    | crossquarter| 315° (interface boundary)   |
| 11    | Fluxionis      | 330       | 360     | **345**    | —           | 345° (spiral / rotational)  |

---

## Dominant Axis by Archetype

### Single-Axis Archetypes

| Archetype | Center Angle | Expected Axis | Notes |
|-----------|--------------|---------------|-------|
| Stabiliora | 45° | 45° (or horizontal band) | Equilibrium favors near-horizontal balance |
| Tenebris | 105° | none (concentric) | Structure by absence; no strong radial axis |
| Obscurion | 225° | 225° | Oblique, layered; silhouette suggests one lean |
| Vectoris | 255° | 255° | Single collimated axis; clear directional thrust |
| Innovaris | 315° | 315° | Sharp boundary; interface along segment vector |
| Fluxionis | 345° | 345° | Spiral/rotational axis; flow toward segment |

### Multi-Axis Archetypes

| Archetype | Center Angle | Axes | Symmetry |
|-----------|--------------|------|----------|
| Ignispectrum | 15° | 15°, 135°, 255° | 3-fold (120°) |
| Duplicaris | 75° | 75°, 255° | Bilateral (180°) |
| Radiantis | 135° | all | Full radial |
| Precisura | 165° | 0°, 90°, 180°, 270° | 4-fold (grid-aligned) |
| Aequilibris | 195° | 195°, 15° | Bilateral (counterweights) |
| Structoris | 285° | 45°, 135°, 225°, 315° | 4-fold (filamentary grid) |

### Canonical Ignis Alignment

The canonical Ignis glyph (`public/glyphs/ignis.svg`) uses triangles at **0°, 120°, 240°** via `transform="rotate(0|120|240 500 500)"`. The unrotated polygon apex points up (12 o'clock), so these map directly to **0°, 120°, 240°** in glyph angle (0° = up).

The first axis at 0° aligns with the **vernal equinox** (segment start). The segment center is 15°; the canonical glyph anchors at the equinox rather than the segment midpoint.

For new glyphs: you may anchor **primary geometry at segment center** (e.g., 15° for Ignis) or at a seasonal anchor (0°, 90°, 180°, 270°). Document the choice in the glyph file.

---

## Summary: Design Checklist

1. **Segment assignment** — Each archetype owns one solar segment; center angle is fixed.
2. **Axis convention** — Glyph angle 0° = up; map ecliptic longitude directly.
3. **Dominant axis** — Use the table above; single-axis vs multi-axis follows GLYPH-PHYSICS.
4. **SVG implementation** — Use `transform="rotate(angle 500 500)"`; convert glyph angle to SVG rotate if your convention differs.
5. **Consistency** — All 12 glyphs share the same orientation convention for coherent solar language.

---

## See Also

- `docs/GLYPH-DESIGN-CHECKLIST.md` — 9-step checklist for creating new glyphs
- `docs/GLYPH-PRIMITIVE-SYSTEM.md` — Allowed primitives and archetype mapping
- `docs/GLYPH-LAW.md` — Canonical geometry, layer order, scale
- `docs/GLYPH-PHYSICS.md` — Physics–geometry mapping per archetype
- `docs/glyph-design-template.svg` — Design template with guides
- `docs/glyph-radial-grid.svg` — **Master design reference**: 12 solar segments, center angles, dominant axes (visual)
- `src/ligs/astronomy/solarSeason.ts` — `SOLAR_SEASONS` (authoritative segment data)
