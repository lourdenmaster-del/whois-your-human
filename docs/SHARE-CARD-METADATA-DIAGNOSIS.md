# Share Card Metadata Block — Diagnosis

**Date:** 2026-03-09  
**Scope:** Why metadata block is not visible in the UI

---

## 1. VERIFICATION: GENERATED SHARE CARD

### Render path (`lib/marketing/static-overlay.ts`)

**Composite order:**
1. Background (Light Signature, resized to 1200×1200)
2. Grid (0.3% opacity)
3. Top-left header (ARCHETYPE SIGNATURE + archetype name + optional mark)
4. Bottom-left metadata block
5. Bottom-right system mark

Nothing is drawn after the metadata block that could obscure it.

### Metadata block draw calls (identity block)

**Template** (`src/ligs/marketing/templates.ts`):
```ts
identityBlock: { x: 0.06, y: 0.75, w: 0.5, h: 0.2 }
```

**At 1200×1200:**
- x: 72px
- y: 900px (75% from top — bottom quarter of image)
- w: 600px
- h: 240px (nominal)

**Backing rect:**
- `backX = idBlock.x - 4` → 68px
- `backY = idBlock.y - 4` → 896px
- `backH = idLines.length * 19 + 24` → ~176px (8 lines + padding)
- Fill: `rgba(0,0,0,0.08)` (6% black — very subtle)

**Text:**
- Line height: 19px
- Font sizes: 9px (LIGHT IDENTITY REPORT, Generated), 10px (Name, Archetype, LIR-ID)
- Fill: `rgba(255,255,255,0.55)` for labels, `rgba(255,255,255,0.9)` for data
- First line y: `idBlock.y + 16` → 916px
- Last line (Generated) baseline: ~1042px
- Block extends to ~y=1072px

**Conclusion:** The metadata block is drawn into the output buffer. It is the 4th composite layer and is not overwritten.

---

## 2. VERIFICATION: ACTUAL SAVED ASSET

**Cannot directly inspect Blob-stored images without a real report.** To verify:

1. Generate a new Beauty report (full pipeline, not dry run).
2. Open `shareCardUrl` from the API response directly in a browser (full 1200×1200).
3. Confirm whether the metadata block is visible at full resolution.

**Expected:** At full size, the block should be visible. Fonts are 9–10px at 1200px, which is legible.

---

## 3. VERIFICATION: UI CROPPING / DISPLAY

### Display setup

| Context | Container | Image |
|---------|-----------|-------|
| Preview Phase 5 | `max-w-[280px] sm:max-w-[320px] min-h-[220px]` | `object-cover`, `min-h-[220px]` |
| Full report Artifact Reveal | `max-w-[280px] sm:max-w-[320px] min-h-[220px]` | `object-cover`, `min-h-[220px]` |

Both use `object-cover` with no `object-position` override (default center).

### Effective container dimensions

- Width: 280px (mobile) or 320px (sm+)
- Height: `min-h-[220px]` → 220px

So the container is ~280×220 or 320×220 (wider than tall).

### object-cover behavior

For a 1200×1200 image in a 280×220 container:

- Scale to cover: `scale = 280/1200 ≈ 0.233`
- Image logical size: 280×280
- Center crop: remove (280−220)/2 = 30px from top and bottom
- Visible region (original coords): y ≈ 129–1071

**Metadata block:** y ≈ 900–1072  
**Visible region:** y ≈ 129–1071  

→ Metadata is fully in view at 280px width.

For a 320×220 container:

- Scale to cover: `scale = 320/1200 ≈ 0.267`
- Image logical size: 320×320
- Center crop: remove (320−220)/2 = 50px from top and bottom
- Visible region: y ≈ 187–1012

**Metadata block:** y ≈ 900–1072  
**Visible region:** y ≈ 187–1012  

→ Bottom ~60px of metadata (including “Generated” and part of LIR-ID) is cropped.

### Effective font size at display

- 280px: scale ≈ 0.233 → 9px ≈ 2.1px, 10px ≈ 2.3px  
- 320px: scale ≈ 0.267 → 9px ≈ 2.4px, 10px ≈ 2.7px  

All metadata text is well below readable size (~12px+).

### Overlays

- Archetype overlay: center, 45% width — does not cover bottom-left metadata.
- Bottom band: hidden when share card is the base (`!finalArtifactImage` / `!isShareCardBase`).
- No other overlays cover the metadata block.

### Summary

- At 280px: metadata is not cropped but is too small to read (≈2px).
- At 320px: metadata is partially cropped and too small.
- `object-cover` is cropping because the container is wider than tall.

---

## 4. DIAGNOSIS

**A. Is the metadata block present in the generated share card file?**  
Yes. It is drawn as the 4th composite layer in `renderIdentityCardOverlay` and is written into the output PNG.

**B. If yes, why is it not visible in-app?**  
- **Primary:** Fonts (9–10px) scale to ~2–2.7px at 280–320px display size, which is too small to resolve.
- **Secondary (320px):** `object-cover` center-crops and removes the bottom ~60px of the image, truncating the lower part of the metadata block.
- **Tertiary:** Backing `rgba(0,0,0,0.08)` may be too subtle on light backgrounds, but the main issue is scale.

**C. If no, what prevents it from being drawn?**  
N/A — the block is drawn.

---

## 5. PROPOSED MINIMUM FIX

Target: make the metadata legible in-app without redesign.

### Option A — Larger in-app display (lowest risk)

Increase artifact display size to raise effective font size:

- e.g. `max-w-[360px] sm:max-w-[420px]`
- At 420px, 10px → ~3.5px (still small but more visible).
- Larger containers would reduce cropping, but fonts remain the bottleneck.

### Option B — Increase font sizes in compose (recommended)

Increase metadata fonts in `renderIdentityCardOverlay`:

- LIGHT IDENTITY REPORT: 9px → 14px  
- Data lines: 10px → 16px  
- Generated: 9px → 12px  

At 320px display, 16px → ~4.3px (still small but closer to legibility).  
At 420px, 16px → ~5.6px (readable for short labels).

### Option C — Use `object-contain` for the share card

- Switch from `object-cover` to `object-contain` only for the final share card.
- Entire card stays visible, no cropping.
- May introduce letterboxing but avoids cutoff.

### Option D — Move metadata block upward

- Adjust template so `identityBlock.y` moves from 0.75 to ~0.68.
- Puts metadata further from bottom crop.
- Does not fix font size.

### Recommended combination

1. **Increase font sizes in compose** (Option B): 14px / 16px / 12px.  
2. **Use `object-contain`** for share-card base only (Option C): avoid cropping bottom.  
3. Optionally **slightly increase backing opacity** (e.g. 0.08 → 0.12) for better contrast.
