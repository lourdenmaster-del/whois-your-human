# Continue / Enter / Tap Controls — Cohesion Audit

**READ-ONLY.** No code changes.

**Scope:** /origin, resolved artifact screen, /beauty/view flow, report/reveal/step components reachable in the main user path.

**Main path (WAITLIST_ONLY):** /origin → intake → processing → completeAwaitingEnterRedirect → tap → /beauty/view?reportId=exemplar-X → PreviewRevealSequence (phase 5) → tap → ReportDocument

---

## Per-Control Report

### Control 1: OriginTerminalIntake — Completion branch (early return)

| Field | Value |
|-------|-------|
| **Route** | /origin |
| **File** | `components/OriginTerminalIntake.jsx` |
| **Component** | OriginTerminalIntake (inline `<p>`) |
| **Exact text** | `Press ENTER or tap to continue` |
| **Type** | Visually invisible button (`<p>` with role="button", tabIndex=0, onClick, onKeyDown) |
| **Horizontal alignment** | Centered |
| **Alignment source** | Parent `text-center` on wrapper; `flex flex-col justify-center`; no flex justify on prompt itself — inherits center from block layout |
| **Font size** | text-[13px] |
| **Weight** | Normal (inherit) |
| **Letter spacing** | Inherit |
| **Casing** | Sentence (ENTER all caps) |
| **Color** | rgba(154,154,160,0.9) |
| **Opacity** | 0.9 |
| **Margin-top / spacing** | mt-6 |
| **Matches terminal** | Yes — monospace, gray, whois-origin context |

---

### Control 2: OriginTerminalIntake — showCompleteEnterPrompt block (DEAD CODE)

| Field | Value |
|-------|-------|
| **Route** | /origin (never reached — completion early-returns first) |
| **File** | `components/OriginTerminalIntake.jsx` |
| **Component** | OriginTerminalIntake (inline `<div>`) |
| **Exact text** | `Press ENTER or tap to continue` |
| **Type** | Visually invisible button (`<div>` role="button", tabIndex=0) |
| **Horizontal alignment** | Left (within aperture) |
| **Alignment source** | In whois-aperture-inner; `flex flex-col justify-end`; no explicit horizontal alignment — left-aligned by default |
| **Font size** | Inherit (whois-aperture-inner text-sm sm:text-base) |
| **Weight** | Normal |
| **Letter spacing** | Inherit |
| **Casing** | Sentence (ENTER all caps) |
| **Color** | rgba(154,154,160,0.9) |
| **Margin-top** | mt-0 (min-h-[2.2em]) |
| **Matches terminal** | Yes — same aperture, but UNREACHABLE |

---

### Control 3: ContinuePrompt (used by PreviewRevealSequence)

| Field | Value |
|-------|-------|
| **Route** | /beauty/view?reportId=exemplar-X |
| **File** | `app/beauty/view/ContinuePrompt.jsx` |
| **Component** | ContinuePrompt |
| **Exact text** | `Press ENTER or tap to continue` |
| **Type** | Visually invisible button (`<div>` role="button", tabIndex=0) |
| **Horizontal alignment** | Left |
| **Alignment source** | No text-align; parent `border-t` wrapper has no flex/justify; block layout, left-aligned |
| **Font size** | None (inherit from parent) — ContinuePrompt has no text-sm/text-[13px] |
| **Weight** | Normal |
| **Letter spacing** | Inherit |
| **Casing** | Sentence (ENTER all caps) |
| **Color** | #9a9aa0 (inline style) |
| **Margin-top** | mt-2 |
| **Matches terminal** | Partial — same color ballpark, monospace, but alignment differs (left vs centered) |

---

### Control 4: ContinuePrompt (used by ReportStep / InteractiveReportSequence)

| Field | Value |
|-------|-------|
| **Route** | /beauty/view (real report path only — InteractiveReportSequence) |
| **File** | `app/beauty/view/ContinuePrompt.jsx` (same component) |
| **Component** | ContinuePrompt |
| **Exact text** | `Press ENTER or tap to continue` |
| **Type** | Visually invisible button |
| **Horizontal alignment** | Left |
| **Alignment source** | Same as Control 3 — wrapper `pt-2 mt-2 border-t border-white/[0.06]`, no horizontal alignment |
| **Styling** | Same as Control 3 |
| **In main path?** | No — real-report path uses ReportDocument only; InteractiveReportSequence not currently rendered by BeautyViewClient |

---

### Control 5: TerminalResolutionSequence — terminal line + ContinuePrompt

| Field | Value |
|-------|-------|
| **Route** | Not in main path (TerminalResolutionSequence not used for exemplar) |
| **File** | `app/beauty/view/TerminalResolutionSequence.jsx` |
| **Component** | addLine (terminal line) + ContinuePrompt |
| **Exact text (line)** | `Press ENTER or tap to continue.` **(trailing period)** |
| **Exact text (prompt)** | `Press ENTER or tap to continue` (no period) |
| **Type** | Line = plain text in scroll; Prompt = ContinuePrompt (invisible button) |
| **Horizontal alignment** | Line: left (terminal); Prompt: left |
| **In main path?** | No — replaced by PreviewRevealSequence for exemplar |

---

### Control 6: OriginTerminalIntake — addLine (terminal lines only)

| Field | Value |
|-------|-------|
| **Route** | /origin |
| **File** | `components/OriginTerminalIntake.jsx` |
| **Component** | addLine() — adds to `lines` state; rendered in visibleLines map |
| **Exact text** | `Press ENTER or tap to continue` |
| **Type** | Plain text (terminal line) — but when phase is completeAwaitingEnterRedirect, this line is filtered out (return null) and we show the completion branch instead |
| **When visible** | Only in processing/main-return branch before completion; in completion phase we early-return so these lines don't appear |
| **Alignment** | Left (terminal line) |
| **In main path** | Effectively not visible at completion — user sees completion branch with Control 1 |

---

## A. List of Mismatches

1. **Alignment:** Origin completion (Control 1) is **centered** (text-center wrapper). ContinuePrompt (Control 3) in PreviewRevealSequence is **left-aligned**. Same flow, different alignment.

2. **Font size:** Origin completion uses `text-[13px]`. ContinuePrompt has no explicit font size — inherits (likely text-sm sm:text-base from whois-aperture-inner). Potential drift.

3. **Color format:** Origin uses `rgba(154,154,160,0.9)`. ContinuePrompt uses `#9a9aa0`. Equivalent but different notation; opacity implied vs explicit.

4. **Margin-top:** Origin completion uses `mt-6`. ContinuePrompt uses `mt-2`. Different vertical spacing above the prompt.

5. **TerminalResolutionSequence text mismatch:** Terminal line says `Press ENTER or tap to continue.` (with period); ContinuePrompt says `Press ENTER or tap to continue` (no period). Inconsistent if both ever shown.

6. **aria-label casing:** Origin uses `Press ENTER or tap to continue`; ContinuePrompt default prop uses `Press Enter or tap to continue` (lowercase "Enter" in ariaLabel default). Callers pass `ariaLabel="Press Enter or tap to continue"` — minor inconsistency with rendered text "ENTER".

7. **Unreachable code:** showCompleteEnterPrompt block (Control 2) is dead — never renders. Duplicates Control 1 logic with different container (aperture vs full-screen center).

---

## B. Files Responsible

| File | Role |
|------|------|
| `components/OriginTerminalIntake.jsx` | Origin completion prompt (Control 1); dead showCompleteEnterPrompt (Control 2); addLine terminal lines (Control 6) |
| `app/beauty/view/ContinuePrompt.jsx` | Shared continue control (Controls 3, 4) |
| `app/beauty/view/PreviewRevealSequence.jsx` | Renders ContinuePrompt in exemplar flow (Control 3) |
| `app/beauty/view/ReportStep.jsx` | Renders ContinuePrompt (Control 4) — not in current exemplar path |
| `app/beauty/view/InteractiveReportSequence.jsx` | Uses ReportStep — not in current exemplar path |
| `app/beauty/view/TerminalResolutionSequence.jsx` | Terminal line + ContinuePrompt (Control 5) — not in current exemplar path |

---

## C. Single Best Canonical Rule for All Continue Controls

**Canonical rule:**

1. **Exact text:** `Press ENTER or tap to continue` (no trailing period; ENTER all caps).

2. **Type:** Plain text with invisible-button behavior — role="button", tabIndex=0, onClick, onKeyDown (Enter/Space). No visible chrome: no border, background, box, pill, shadow, focus ring.

3. **Style:** Monospace (`ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace`), color `rgba(154,154,160,0.9)` or `#9a9aa0`, font-size 13px (text-[13px]), normal weight.

4. **Alignment:** Centered horizontally within the aperture/viewport, consistent with resolved artifact and completion screens.

5. **Spacing:** Margin-top `1.5rem` (mt-6) above the prompt when it is the primary CTA after resolved content; `0.5rem` (mt-2) when it appears under a border-t separator.

6. **Single implementation:** One shared component (e.g. ContinuePrompt) used everywhere, with optional props for `marginTop` and `align` (center | left). Origin completion and PreviewRevealSequence both use it with `align="center"` and `marginTop="mt-6"` for the resolved-artifact context.

---

## Summary

**Reachable in main path:** Control 1 (origin completion), Control 3 (PreviewRevealSequence).

**Key mismatch:** Origin completion is centered with mt-6; PreviewRevealSequence’s ContinuePrompt is left-aligned with mt-2. Alignment and spacing should be unified.

**Dead code:** Control 2 (showCompleteEnterPrompt in OriginTerminalIntake main return) — remove or refactor.
