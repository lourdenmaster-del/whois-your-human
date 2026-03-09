# LIGS Glyph Law

**Canonical geometry and construction rules for the LIGS archetype glyph language.**

This document is the source of truth.  
Do **not** alter these constants without an explicit versioned migration plan.

---

## Canonical Coordinate System

**SVG viewBox**
- `viewBox="0 0 1000 1000"`

**Center**
- `cx = 500`
- `cy = 500`

All rotations and symmetry operations are anchored at `(500, 500)`.

---

## Canonical Base Form

These constants define the shared "language" all archetype glyphs inherit.

### Outer Ring
- `ringRadius = 205`
- `ringStrokeWidth = 56`

Reference:
```svg
<circle cx="500" cy="500" r="205" fill="none" stroke="currentColor" stroke-width="56" />
```

### Center Dot
- `dotRadius = 85`

Reference:
```svg
<circle cx="500" cy="500" r="85" fill="currentColor" />
```

### Archetype Geometry (Ignis)
- Triangle base points: `400,269` · `600,269` · `500,95.795`
- Three instances rotated around `(500, 500)` at 0°, 120°, 240°

Reference:
```svg
<polygon points="400,269 600,269 500,95.795" fill="currentColor" transform="rotate(0 500 500)" />
<polygon points="400,269 600,269 500,95.795" fill="currentColor" transform="rotate(120 500 500)" />
<polygon points="400,269 600,269 500,95.795" fill="currentColor" transform="rotate(240 500 500)" />
```

---

## Layer Order

1. Outer ring (bottom)
2. Archetype geometry (triangles for Ignis)
3. Center dot (top — always visually above)

---

## File Location

`public/glyphs/ignis.svg` — canonical Ignis glyph.

---

## Non-Canonical Glyphs

Files in `public/icons/` are UI icons and do NOT follow glyph-law geometry.
Only files in `public/glyphs/` are canonical archetype glyphs.

---

## System Rule

All future archetype glyphs must:

- Use the same **viewBox (1000×1000)**
- Use the same **ring radius and thickness**
- Use the same **center dot radius**
- Use **rotational symmetry around (500, 500)**
- Follow the same **visual weight**

Only the **archetype geometry** changes. This creates the **LIGS glyph language**.

---

## Scale in Code

When rasterizing or composing: glyph viewBox is **1000×1000**. Use `scale = glyphW / 1000` (not /100).
