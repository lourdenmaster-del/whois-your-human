# Arc-Static-Images Asset Review

**Purpose:** Manual review checklist for `public/arc-static-images/` PNG assets.
Use this to track which files need cleanup for best visual quality.

**Last check:** 2026-03-08 — all 12 archetype files exist.

## Archetype → File Mapping

| Archetype   | Filename                | Notes                    |
|-------------|-------------------------|--------------------------|
| Aequilibris | aequilibris-static1.png  |                          |
| Duplicaris  | duplicaris-static1.png  |                          |
| Fluxionis   | fluxonis-static1.png    | **Filename typo:** fluxonis (not fluxionis) |
| Ignispectrum| ignispectrum-static1.png |                          |
| Innovaris   | innovaris-static1.png   |                          |
| Obscurion   | obscurion-static1.png   |                          |
| Precisura   | precisura-static1.png   |                          |
| Radiantis   | radiantis-static1.png   |                          |
| Stabiliora  | stabiliora-static1.png  |                          |
| Structoris  | structoris-static1.png  |                          |
| Tenebris    | tenebris-static1.png     |                          |
| Vectoris    | vectoris-static1.png    |                          |

## Cleanup Recommendations (Manual Review)

Inspect each file and check if any of the following apply:

| File                     | Transparent BG | Cropping | Brightness/Contrast | Edge Cleanup |
|--------------------------|----------------|----------|---------------------|--------------|
| aequilibris-static1.png  | ☐             | ☐        | ☐                   | ☐            |
| duplicaris-static1.png   | ☐             | ☐        | ☐                   | ☐            |
| fluxonis-static1.png     | ☐             | ☐        | ☐                   | ☐            |
| ignispectrum-static1.png | ☐             | ☐        | ☐                   | ☐            |
| innovaris-static1.png    | ☐             | ☐        | ☐                   | ☐            |
| obscurion-static1.png    | ☐             | ☐        | ☐                   | ☐            |
| precisura-static1.png    | ☐             | ☐        | ☐                   | ☐            |
| radiantis-static1.png    | ☐             | ☐        | ☐                   | ☐            |
| stabiliora-static1.png   | ☐             | ☐        | ☐                   | ☐            |
| structoris-static1.png   | ☐             | ☐        | ☐                   | ☐            |
| tenebris-static1.png     | ☐             | ☐        | ☐                   | ☐            |
| vectoris-static1.png     | ☐             | ☐        | ☐                   | ☐            |

### Legend

- **Transparent BG needed:** Image has dark/solid background; blend modes won't work well. Convert to PNG with transparent background.
- **Cropping needed:** Excess padding or off-center subject; tighten bounds.
- **Brightness/Contrast adjustment:** Muddy or washed-out; adjust levels for clearer presentation.
- **Edge cleanup:** Jagged or unclean edges; refine mask/alpha.

### General Notes

- Images use `mix-blend-mode: soft-light` and ~0.5 opacity in overlays; transparent or light backgrounds work best.
- Avoid hard rectangle edges; use `object-fit: contain` with adequate padding.
- Preserve ancient/advanced/scientific tone; avoid garish or low-quality assets.
