# LIGS Archetype Glyph Law

**DO NOT MODIFY** the canonical geometry numbers. All archetype glyphs must inherit this structure.

## Canonical Geometry

| Element | Value | Rendered |
|---------|-------|----------|
| ViewBox | 0 0 1000 1000 | `<svg viewBox="0 0 1000 1000">` |
| Center | cx=500, cy=500 | — |
| Ring radius | 205 | `<circle cx="500" cy="500" r="205" fill="none" stroke="currentColor" stroke-width="56"/>` |
| Ring stroke-width | 56 | — |
| Center dot radius | 85 | `<circle cx="500" cy="500" r="85" fill="currentColor"/>` |
| Triangle points | 400,269 · 600,269 · 500,95.795 | `<polygon points="400,269 600,269 500,95.795" transform="rotate(0 500 500)" />` (×3 at 0°, 120°, 240°) |

## Layer Order

1. Ring (bottom)
2. Archetype geometry (triangles for Ignis)
3. Center dot (top — always visually above)

## File Location

`public/glyphs/ignis.svg` — canonical Ignis glyph.

## System Rule

All future archetype glyphs must:

- Use the same **viewBox (1000×1000)**
- Use the same **ring radius and thickness**
- Use the same **center dot radius**
- Use **rotational symmetry around (500,500)**
- Follow the same **visual weight**

Only the **archetype geometry** changes. This creates the **LIGS glyph language**.

## Scale in Code

When rasterizing/composing: glyph viewBox is **1000×1000**. Use `scale = glyphW / 1000` (not /100).
