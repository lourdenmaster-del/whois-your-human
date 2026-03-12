# /origin as Law — Drift Audit

**READ-ONLY.** No code changes.

**Canonical reference:** `/origin` defines layout, alignment, spacing, type hierarchy, continue prompt, button/link styling, terminal feel, chrome/footer for the entire flow.

---

## Part 0: /origin Canonical Baseline

**Route:** /origin  
**Files:** `app/origin/page.jsx`, `app/origin/layout.jsx`, `components/OriginTerminalIntake.jsx`

### Shell
- `min-h-screen flex flex-col items-center p-4 sm:p-6 overflow-x-hidden whois-origin`
- `background: #000`, `position: relative`
- Radial overlay: `absolute inset-0`, opacity 0.02, `whois-field-pulse` animation
- **No LigsFooter** on origin layout

### Content width
- `max-w-[min(100vw-2rem,1000px)]` `min-w-0` on content wrapper

### Intake/Processing state
- Aperture: `whois-aperture` → `whois-aperture-inner`
- Inner: `py-4 px-4 sm:px-5`, `min-h-120px`, `flex flex-col justify-end`
- Text: font-mono, `rgba(154,154,160,0.9)`, `lineHeight: 1.9`
- Alignment: left (no text-center on aperture)
- Footer when not processing: "Human WHOIS protocol" (text-[9px], rgba(122,122,128,0.4)), "View Dossier" (text-[11px] font-mono)
- Registry footer: `mt-auto pt-6 pb-2 text-center`, text-[13px]/[11px]

### Completion state (completeAwaitingEnterRedirect)
- Content wrapper: `flex-1 flex flex-col justify-center`, `text-center`
- Text stack: `space-y-1`, font-mono, rgba(154,154,160,0.9)
- Type hierarchy: text-[11px] uppercase (labels), text-[13px] (body), text-lg (archetype value)
- Continue prompt: `mt-2 text-left` (overrides text-center), text-[13px], plain-text appearance
- Link "← Return to Origin": `inline-block mt-6 text-[11px] font-mono`, rgba(154,154,160,0.7)
- **No aperture** in completion — flat text stack
- **No registry footer** in completion — early return excludes it

---

## Part 1: Per-Screen Audit

### Screen 1: /origin — Resolved artifact / completion

| Field | Value |
|-------|-------|
| **Route** | /origin (phase completeAwaitingEnterRedirect) |
| **File** | `components/OriginTerminalIntake.jsx` |
| **Component** | OriginTerminalIntake (early return) |
| **Matches alignment** | Yes — content in max-w-1000px; continue prompt text-left |
| **Matches spacing** | Yes — space-y-1, mt-2, mt-4, mt-6 |
| **Matches type hierarchy** | Yes — 11px/13px/lg, mono |
| **Matches continue prompt** | Yes — plain text, text-[13px], rgba(154,154,160,0.9) |
| **Matches button/link** | Yes — link inline, no pill/button look |
| **Matches terminal feel** | Yes — black bg, mono, whois-origin |
| **Chrome/footer** | No footer — matches (completion excludes registry) |
| **Drift** | None — this IS the canonical completion |
| **Container causing drift** | N/A |

---

### Screen 2: /beauty/view — Loading

| Field | Value |
|-------|-------|
| **Route** | /beauty/view |
| **File** | `app/beauty/view/page.jsx` (Suspense fallback) |
| **Component** | Inline fallback JSX |
| **Matches alignment** | Partial — centered (flex items-center justify-center), origin uses flex-1 justify-center on content |
| **Matches spacing** | Drift — px-6 py-24 vs origin p-4 sm:p-6 |
| **Matches type hierarchy** | Partial — font-mono text-sm, beauty-body beauty-text-muted; origin uses rgba(154,154,160,0.9) |
| **Matches continue prompt** | N/A — no continue |
| **Matches button/link** | N/A |
| **Matches terminal feel** | Partial — dark bg implied by beauty-page but no whois-origin, no radial overlay |
| **Chrome/footer** | Drift — inside registry-view page which has LigsFooter; origin has no LigsFooter |
| **Drift** | (1) Centered layout vs origin flex flow; (2) No whois-origin; (3) Different padding; (4) Wrapped by page with LigsFooter |
| **Container causing drift** | `main.beauty-page.min-h-screen.relative.flex.flex-col.items-center.justify-center.px-6.py-24`; parent `div.registry-view.beauty-theme` in page.jsx |

---

### Screen 3: /beauty/view — Error state

| Field | Value |
|-------|-------|
| **Route** | /beauty/view (error) |
| **File** | `app/beauty/view/BeautyViewClient.jsx` |
| **Component** | ErrorState |
| **Matches alignment** | Drift — `flex items-center justify-center`, `text-center`, `max-w-md` — centered card vs origin flow |
| **Matches spacing** | Drift — px-6 py-24, space-y-6 |
| **Matches type hierarchy** | Partial — font-mono text-sm; has `button` with `rounded border` — button styling origin doesn't use |
| **Matches continue prompt** | N/A |
| **Matches button/link** | Drift — Retry button: `px-4 py-2 rounded border border-[#2a2a2e]` — visible button; origin uses plain links |
| **Matches terminal feel** | Partial — bg-[#0a0a0b] dark; font-sans on main; no whois-origin, no aperture |
| **Chrome/footer** | Drift — LigsFooter on page |
| **Drift** | (1) Centered card layout; (2) Visible bordered Retry button; (3) font-sans; (4) max-w-md constraint |
| **Container causing drift** | `main.min-h-screen.font-sans.flex...`, `div.max-w-md.w-full.text-center.space-y-6`, `button.px-4.py-2.rounded.border` |

---

### Screen 4: /beauty/view — PreviewRevealSequence (exemplar, phase 5)

| Field | Value |
|-------|-------|
| **Route** | /beauty/view?reportId=exemplar-X |
| **File** | `app/beauty/view/PreviewRevealSequence.jsx` |
| **Component** | PreviewRevealSequence |
| **Matches alignment** | Drift — root has `justify-center`; origin completion has `justify-center` on content but different structure; PreviewReveal has hero `flex items-center justify-center` (centered image); protocol line + continue are in aperture-inner, left by default |
| **Matches spacing** | Partial — py-4 px-4 sm:px-5 matches aperture; but `py-6 min-h-[180px]` hero, `pt-2 mt-2 border-t` before continue — origin completion has no hero, no border-t |
| **Matches type hierarchy** | Partial — same font-mono, rgba(154,154,160,0.9); but ContinuePrompt has no explicit text-[13px] (inherits) |
| **Matches continue prompt** | Partial — ContinuePrompt used; has border-t border-white/[0.06] wrapper; origin completion has no border-t |
| **Matches button/link** | Yes — ContinuePrompt is plain-text |
| **Matches terminal feel** | Partial — whois-origin, aperture, radial overlay; but HERO block (image carousel/artifact) is origin-alien — origin completion is text-only |
| **Chrome/footer** | Drift — no footer in PreviewRevealSequence (we removed it), but PAGE wraps in registry-view + LigsFooter; origin has no LigsFooter |
| **Drift** | (1) Hero/image block — origin completion is text stack only; (2) border-t above continue — origin has none; (3) Wrapped by page with LigsFooter; (4) Root `justify-center` vs origin completion `flex-1 justify-center` |
| **Container causing drift** | `div.flex.items-center.justify-center.py-6.min-h-[180px]` (hero); `div.pt-2.mt-2.border-t.border-white/[0.06]` (continue wrapper); page.jsx `div.registry-view`, `LigsFooter` |

---

### Screen 5: /beauty/view — ReportDocument (after tap continue)

| Field | Value |
|-------|-------|
| **Route** | /beauty/view?reportId=exemplar-X (terminalComplete) |
| **File** | `app/beauty/view/ReportDocument.jsx` |
| **Component** | ReportDocument |
| **Matches alignment** | **Total drift** — `article.mx-auto.max-w-3xl`; left-aligned body but different layout model |
| **Matches spacing** | **Total drift** — `px-6 py-12 sm:px-10 sm:py-16`, `mb-10`, `mb-3` — article rhythm, not terminal |
| **Matches type hierarchy** | **Total drift** — PAPER_BG #fafaf8, black/charcoal text, serif body, monospace labels only for metadata |
| **Matches continue prompt** | N/A — no continue (document is static) |
| **Matches button/link** | Drift — footer links removed; when present would be black/55, different from origin gray |
| **Matches terminal feel** | **Total drift** — white/off-white paper; no whois-origin; no aperture; no black bg; reads as document, not terminal |
| **Chrome/footer** | Drift — ReportDocument has no footer (we removed); page still has LigsFooter |
| **Drift** | (1) Background #fafaf8 vs #000; (2) Serif body vs mono; (3) max-w-3xl vs 1000px; (4) Article layout vs terminal flow; (5) Bordered metadata block; (6) Section headings with Roman numerals |
| **Container causing drift** | `div.min-h-screen` style background PAPER_BG; `article.mx-auto.max-w-3xl.px-6.py-12`; `header`, `div.rounded.border.border-black/20` |

---

### Screen 6: /beauty/view — Page shell (registry-view, LigsFooter)

| Field | Value |
|-------|-------|
| **Route** | /beauty/view |
| **File** | `app/beauty/view/page.jsx` |
| **Component** | BeautyViewPage (page), LigsFooter |
| **Matches** | **Drift** — origin has no equivalent; /origin is NOT wrapped in registry-view or LigsFooter |
| **Drift** | (1) `registry-view beauty-theme min-h-screen font-sans` — font-sans; origin uses whois-origin; (2) LigsFooter with "LIGS — Light Identity Generation System" — origin has no footer |
| **Container causing drift** | `div.registry-view.beauty-theme.min-h-screen.font-sans`; `LigsFooter` |

---

## A. Drift List by Screen

| Screen | Drifts |
|--------|--------|
| **/origin completion** | None (canonical) |
| **/beauty/view loading** | Centered layout; no whois-origin; different padding; LigsFooter on page |
| **/beauty/view error** | Centered card; bordered Retry button; font-sans; LigsFooter |
| **PreviewRevealSequence** | Hero block (origin completion is text-only); border-t above continue; LigsFooter on page |
| **ReportDocument** | White paper bg; serif body; article layout; max-w-3xl; no terminal feel; LigsFooter |
| **/beauty/view page** | registry-view, font-sans, LigsFooter — applies to ALL beauty/view content |

---

## B. Files Responsible

| File | Role / drift |
|------|--------------|
| `app/beauty/view/page.jsx` | Wraps content in registry-view, font-sans; adds LigsFooter — affects all beauty/view screens |
| `components/LigsFooter.jsx` | Renders "LIGS — Light Identity Generation System" — not on /origin |
| `app/beauty/view/BeautyViewClient.jsx` | ErrorState: centered layout, Retry button styling |
| `app/beauty/view/PreviewRevealSequence.jsx` | Hero block; border-t on continue wrapper; layout (justify-center) |
| `app/beauty/view/ReportDocument.jsx` | White paper layout; serif; article structure; not terminal |
| `app/beauty/view/ContinuePrompt.jsx` | Used in PreviewRevealSequence; inherits context — no explicit text-[13px] match to origin |

---

## C. Cleanup Plan to Make All Pages Obey /origin

### 1. Page-level shell (beauty/view)

**Goal:** Beauty view page shell matches origin layout model.

- Remove or override `font-sans` on registry-view when showing terminal-flow content (PreviewRevealSequence). Use whois-origin or equivalent.
- Remove LigsFooter from beauty/view page when the content is terminal-flow (PreviewRevealSequence). Or: add LigsFooter to /origin for consistency — but user said /origin is law, so if origin has no LigsFooter, beauty/view should not have it in the terminal flow. Option: conditionally hide LigsFooter when PreviewRevealSequence or ReportDocument is showing, OR accept LigsFooter as part of beauty section and add to origin — audit says origin has no LigsFooter, so the law is no footer. Remove LigsFooter from beauty/view for the exemplar/report flow.
- Align loading fallback: use whois-origin, same padding (p-4 sm:p-6), same radial overlay, same max-width, left-aligned "Loading…".

### 2. ErrorState

**Goal:** Match origin error presentation — no visible button, plain link only.

- Remove bordered Retry button or restyle to plain-text link appearance.
- Use whois-origin shell, same padding, monospace, left-aligned layout.
- Remove font-sans.

### 3. PreviewRevealSequence

**Goal:** Phase 5 (resolved artifact) matches /origin completion layout as closely as possible.

- Consider: phase 5 is "artifact resolved" — origin completion is text-only. If artifact image is required, keep it but constrain to origin-like composition: same max-width, same spacing rhythm, no hero-centric layout.
- Remove border-t above continue (or match origin — origin completion has no border-t).
- Ensure continue prompt has text-[13px] explicitly to match origin.
- Page wrapper: see §1.

### 4. ReportDocument

**Goal:** Either (a) convert to terminal-style continuous flow that matches origin (black bg, mono, aperture feel) or (b) document as intentional "document mode" with explicit approval. User said /origin is law — so ReportDocument's white-paper look is drift. Cleanup: restyle ReportDocument to black bg, monospace, whois-origin, same max-width (1000px), same color palette — "registry dossier" as a terminal-style scrollable document, not white paper.

### 5. ContinuePrompt

**Goal:** Single canonical styling derived from /origin.

- Add explicit text-[13px] to match origin completion.
- Ensure color rgba(154,154,160,0.9) or #9a9aa0 (equivalent).
- Remove or standardize border-t on wrapper — origin completion has none.

### 6. Loading states

**Goal:** Match origin shell.

- Use whois-origin, p-4 sm:p-6, radial overlay, max-w-[min(100vw-2rem,1000px)], left-aligned "Loading registry record…".

---

## Summary

**/origin law:** Black bg, whois-origin, max-w-1000px, font-mono, rgba(154,154,160,0.9), no LigsFooter, aperture when terminal, text stack when completion, plain-text continue, no visible buttons.

**Largest drifts:** (1) ReportDocument — entirely different visual system (white paper); (2) LigsFooter on beauty/view; (3) ErrorState Retry button; (4) PreviewRevealSequence hero block and border-t; (5) Loading/error centered layout.
