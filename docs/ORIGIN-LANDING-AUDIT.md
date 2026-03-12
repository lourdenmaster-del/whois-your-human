# Origin Landing & Post-Landing Audit

**READ-ONLY AUDIT** — No code changes. Factual map of current implementation.

---

## 1. ROUTE MAP

| Route | File | How user gets there | Trigger | Intent |
|-------|------|---------------------|---------|--------|
| `/` | `middleware.ts` rewrites to `/origin` (URL stays `/`) | Direct visit, bookmark | Request to `/` | **Intended** — canonical landing |
| `/origin` | `app/origin/page.jsx` | Direct visit; redirect from `/beauty` | Request; 308 from `/beauty` | **Intended** — canonical landing |
| `/beauty` | `middleware.ts` → 308 to `/origin` | Direct visit | Request | **Intended** — redirect to landing |
| `/beauty/` | `middleware.ts` → 308 to `/origin` | Direct visit | Request | **Intended** — redirect to landing |
| `/beauty/view?reportId=...` | `app/beauty/view/page.jsx` | `router.push()` from OriginTerminalIntake after completion; links from other pages | `redirectNow()`, `handleRunWhoisClick()` success, `LandingPreviews` tile click | **Intended** — report/exemplar view |
| `/dossier` | `app/dossier/page.tsx` | Click "View Dossier" link (from /origin, PreviewRevealSequence, ReportDocument, etc.) | `<a href="/dossier">` | **Intended** — sample dossier |
| `/beauty/start` | `app/beauty/start/page.jsx` | Only when `NEXT_PUBLIC_WAITLIST_ONLY=0` and purchase flow; not reachable in waitlist-only | `router.push()` from BeautyLandingClient | **Legacy/conditional** — purchase flow |
| `/beauty/success` | `app/beauty/success/page.jsx` | Post-Stripe success redirect | Stripe redirect | **Legacy** — purchase flow |
| `/beauty/cancel` | `app/beauty/cancel/page.jsx` | Stripe checkout cancelled | Stripe redirect | **Legacy** — purchase flow |
| `/beauty/sample-report` | `app/beauty/sample-report/page.jsx` | Redirects to /origin on load; no public links | Direct URL only | **Legacy** — removed from public flow |
| Root `app/page.tsx` | `app/page.tsx` | `redirect("/origin")` — fallback if middleware bypassed | Unknown edge case | **Fallback** — likely never hit (middleware rewrite serves /origin) |

**No modals/overlays that behave like route steps** — all transitions are full-page route changes or in-component phase changes.

---

## 2. /origin COMPONENT TREE

### Top-level page
- **File:** `app/origin/page.jsx`
- **Renders:** `<template>` (HTML comment marker) + `OriginTerminalIntake`

### Layout
- **File:** `app/origin/layout.jsx`
- **Renders:** `<div className="beauty-theme whois-origin ...">` wrapping `{children}`

### Child components (all from OriginTerminalIntake)
`OriginTerminalIntake` (`components/OriginTerminalIntake.jsx`) is a single client component with no child component imports. All UI is inline JSX.

**Always rendered (when not in completion phase):**
- Root `<div>` (min-h-screen, black bg, whois-origin)
- Radial gradient overlay (`absolute inset-0`)
- `whois-aperture` container (scrollRef)
- `whois-aperture-inner` (terminal-style content area)

**Phase/state dependent:**
- **`phase === "completeAwaitingEnterRedirect"`:** Early return — entirely different JSX tree: completion-only UI (LIGHT IDENTITY ARTIFACT — RESOLVED, ARCHETYPE, OBSCURION, Press ENTER/tap, ← Return to Origin). No terminal, no aperture, no footer.
- **All other phases:** Main return with:
  - `visibleLines.map()` — terminal lines (gated: `currentField != null` hides all; `phase`/`text` filters hide specific lines)
  - `{showInputRow && (...)}` — intake row (`>`, input, blinking cursor)
  - `{showCompleteEnterPrompt && (...)}` — **DEAD CODE** (never reached; completion phase early-returns before this)
  - `{currentField == null && (...)}` — "Human WHOIS protocol" + "View Dossier"
  - `{typeof registryCount === "number" && (...)}` — registry footer ("Registry nodes recorded: {count}", "Full identity reports…")

**Shared across phases (potential drift):**
- "Human WHOIS protocol" and "View Dossier" render when `currentField == null` — i.e. during **processing** and **executing**, not only at completion. So protocol nav appears while "Resolving solar field..." is running.
- Registry footer shows whenever `registryCount` is set (fetched on mount); it appears in intake, processing, and would appear in main return — but completion phase early-returns so it does not show there.

---

## 3. PHASE / STATE MACHINE

| Phase | Sets it | Clears it | Renders | User sees | Actions | Next phase |
|-------|---------|-----------|---------|-----------|---------|------------|
| `idle` | Initial `useState("idle")` | Enter on name → `setPhase("intake")` | Main return; no visibleLines (currentField!=null); input row | First prompt "WHOIS &lt;your name&gt;"; `>`, input, cursor; no lines | Enter name | `intake` |
| `intake` | Enter on name (line 287) | — | Same as idle | Sequential prompts; `>`, input, cursor | Enter each field | Advances `currentField`: birthDate→birthPlace→birthTime→email |
| `processing` | `advanceToProcessing()` after email (line 219-220) | — | Main return; visibleLines (skip WHOIS name); no input row | "Parameters accepted.", "Resolving solar field...", etc.; Human WHOIS protocol; View Dossier; registry footer | None (auto) | `completeAwaitingEnterRedirect` (WAITLIST_ONLY) or `executing` (!WAITLIST_ONLY) |
| `executing` | Processing effect when !WAITLIST_ONLY (line 482) | — | Main return; same as processing | "Executing query..."; then API runs | None | `router.push` to /beauty/view or `completeAwaitingEnterRedirect` (on error) |
| `completeAwaitingEnterRedirect` | Waitlist success/fail, goToErrorAndComplete, processing effect (no email), handleRunWhoisClick errors | `redirectNow()` navigates away | **Early return** — completion-only UI | LIGHT IDENTITY ARTIFACT — RESOLVED, Light Identity Artifact, ARCHETYPE, OBSCURION, Press ENTER or tap to continue, ← Return to Origin | Enter/Space/tap → countdown 3→2→1 → redirect | Route change to `/beauty/view?reportId=exemplar-{archetype}` |

**Additional state (not phases):**
- `waitlistState`: `idle` | `running` | `done` — drives waitlist fetch effect
- `countdownRemaining`: `null` | 3 | 2 | 1 — countdown before redirect
- `currentField`: `"name"` | `"birthDate"` | ... | `null` — intake field
- `archetypePreviewShown`, `processingIndex`, etc. — processing timing

---

## 4. RENDER MATRIX

**Phases:** idle | intake | processing | executing | completeAwaitingEnterRedirect

| UI element | idle | intake | processing | executing | completeAwaitingEnterRedirect |
|------------|------|--------|------------|-----------|-------------------------------|
| title line (e.g. LIGHT IDENTITY ARTIFACT — RESOLVED) | — | — | — | — | ✓ (early-return UI) |
| subtitle (Light Identity Artifact) | — | — | — | — | ✓ |
| archetype label (ARCHETYPE) | — | — | — | — | ✓ |
| archetype value (OBSCURION) | — | — | — | — | ✓ |
| intake input row | ✓ | ✓ | — | — | — (early return) |
| ">" prompt | ✓ | ✓ | — | — | — |
| blinking cursor | ✓ | ✓ | — | — | — |
| "Press ENTER or tap to continue" | — | — | — | — | ✓ (plain text, no terminal) |
| HUMAN WHOIS PROTOCOL | — | — | ✓ | ✓ | — |
| Return to Origin | — | — | — | — | ✓ (early return) |
| View Dossier | — | — | ✓ | ✓ | — |
| LIGS footer/system line | — | — | — | — | — (not in OriginTerminalIntake) |
| report CTA | — | — | — | — | — |
| timer/countdown (3… 2… 1…) | — | — | — | — | ✓ (addLine) after tap |
| artifact card | — | — | — | — | — |
| registry footer (Registry nodes recorded) | ✓ | ✓ | ✓ | ✓ | — |
| hidden but mounted | — | — | — | — | — |

**Note:** During `idle`/`intake`, `visibleLines` are not rendered because `currentField != null` causes `return null` for every line. So the initial "WHOIS &lt;your name&gt;" line is never shown — user only sees input row.

**LIGS — Light Identity Generation System:** Rendered by `LigsFooter` in `app/beauty/view/page.jsx` only. **Not** in OriginTerminalIntake. User sees it after redirect to /beauty/view.

---

## 5. NAVIGATION / TRANSITION LOGIC

| Transition | Source file | Function | Condition | Target |
|------------|-------------|----------|-----------|--------|
| Landing intro → intake | `OriginTerminalIntake.jsx` | `handleKeyDown` | Enter + currentField===name + raw non-empty | phase=`intake`, currentField=`birthDate` |
| Field → next field | `OriginTerminalIntake.jsx` | `handleKeyDown` | Enter + valid input per field | currentField advances |
| Intake → processing | `OriginTerminalIntake.jsx` | `handleKeyDown` | Enter + currentField===email + valid email | `advanceToProcessing()` → phase=`processing`, currentField=null |
| Processing → complete (WAITLIST_ONLY) | `OriginTerminalIntake.jsx` | waitlist useEffect | waitlist fetch success/fail | setPhase(`completeAwaitingEnterRedirect`) |
| Processing → executing (!WAITLIST) | `OriginTerminalIntake.jsx` | processing useEffect | processingIndex complete, !WAITLIST_ONLY | setPhase(`executing`) |
| Executing → /beauty/view | `OriginTerminalIntake.jsx` | `handleRunWhoisClick` | Success, reportId | `router.push(\`/beauty/view?reportId=${reportId}\`)` |
| Executing → complete (error) | `OriginTerminalIntake.jsx` | `goToErrorAndComplete` | API/checkout error | setPhase(`completeAwaitingEnterRedirect`) |
| Complete → /beauty/view | `OriginTerminalIntake.jsx` | `redirectNow` | Countdown 3→2→1→0 or tap during countdown | `router.push(\`/beauty/view?reportId=exemplar-${archetype}\`)` |
| Complete → /origin (link) | `OriginTerminalIntake.jsx` | `<a href="/origin">` | User clicks "← Return to Origin" | Navigate to /origin |
| /origin → /dossier | `OriginTerminalIntake.jsx` | `<a href="/dossier">` | User clicks "View Dossier" | Navigate to /dossier |
| /beauty/view → /origin | `PreviewRevealSequence.jsx`, `ReportDocument.jsx`, `BeautyViewClient.jsx`, etc. | `<Link href="/origin">` | User clicks "← Return to Origin" | Navigate to /origin |
| /beauty/view → /dossier | Same files | `<Link href="/dossier">` | User clicks "View Dossier" | Navigate to /dossier |
| / → /origin | `middleware.ts` | `rewrite` | pathname === "/" | Same request, serve /origin (URL stays /) |
| /beauty → /origin | `middleware.ts` | `redirect` 308 | pathname === "/beauty" or "/beauty/" | Redirect to /origin |

---

## 6. POST-LANDING DRIFT INVENTORY

| Item | Location | Label |
|------|----------|-------|
| "View Dossier" during processing | OriginTerminalIntake, when currentField==null | **Likely drift** — shown before artifact resolved |
| "Human WHOIS protocol" during processing | OriginTerminalIntake, when currentField==null | **Likely drift** — protocol footer visible during "Resolving solar field..." |
| Dead `showCompleteEnterPrompt` block | OriginTerminalIntake lines 504-520 | **Likely drift** — unreachable (completion early-returns) |
| `ContinuePrompt` renders "> _" on /beauty/view | `app/beauty/view/ContinuePrompt.jsx` | **Intended** — terminal-style continue on preview, but duplicates visual language of intake |
| LigsFooter ("LIGS — Light Identity Generation System") on /beauty/view | `app/beauty/view/page.jsx` | **Intended** — per design |
| Multiple "Press ENTER or tap to continue" implementations | OriginTerminalIntake (completion), PreviewRevealSequence, etc. | **Unknown** — could be consolidation opportunity |
| Registry footer during intake | OriginTerminalIntake | **Unknown** — may be intended (subtle social proof) |
| /beauty/start, /beauty/success, /beauty/cancel | Separate routes | **Legacy** — purchase flow, not used in WAITLIST_ONLY |
| app/page.tsx redirect | Root page | **Fallback** — possibly dead code |
| SYSTEM_SNAPSHOT says origin renders BeautyLandingClient | Docs | **Doc drift** — actual origin page renders OriginTerminalIntake |

---

## 7. FILES RESPONSIBLE

| Role | Files |
|------|-------|
| Routing | `middleware.ts`, `app/origin/page.jsx`, `app/beauty/view/page.jsx`, `app/dossier/page.tsx`, `app/page.tsx` |
| Landing shell | `app/origin/layout.jsx`, `app/origin/page.jsx` |
| Intake flow | `components/OriginTerminalIntake.jsx` (inline; no separate intake component) |
| Processing flow | `components/OriginTerminalIntake.jsx` (processing effect, PROCESSING_LINES, processingIndex) |
| Completion prompt | `components/OriginTerminalIntake.jsx` (early-return block lines 414-449) |
| Report/dossier actions | `components/OriginTerminalIntake.jsx` (View Dossier link); `app/beauty/view/PreviewRevealSequence.jsx`; `app/beauty/view/ReportDocument.jsx` |
| Footer/system chrome | `components/OriginTerminalIntake.jsx` (Human WHOIS protocol, View Dossier, registry footer); `components/LigsFooter.jsx` (beauty/view only) |
| Shared terminal UI | `whois-aperture`, `whois-aperture-inner` — in OriginTerminalIntake and PreviewRevealSequence (same CSS classes) |
| Redirect logic | `components/OriginTerminalIntake.jsx` (`redirectNow`, `startRedirectCountdown`, `handleCompleteTap`) |

---

## 8. SCREEN-BY-SCREEN ACTUAL FLOW

**Step 1:** User visits `/` or `/origin`. URL may stay `/` (rewrite) or be `/origin`.

**Step 2:** User sees black screen, single input row: `>`, placeholder "WHOIS &lt;your name&gt;", blinking cursor. No visible terminal lines (they are skipped when currentField != null). Registry footer at bottom if count loaded. No "Human WHOIS protocol" or "View Dossier" yet (currentField is "name").

**Step 3:** User types name, presses Enter. `handleKeyDown` fires. currentField → "birthDate", phase → "intake". Same visual: input row with new placeholder "Birth date:". Still no lines (currentField != null).

**Step 4:** User enters birthDate, birthPlace, birthTime, email. Each Enter advances currentField. After email: `setCurrentField(null)`, `advanceToProcessing()` → phase "processing".

**Step 5:** Phase "processing". Terminal lines appear: "Parameters accepted.", "Resolving solar field...", "Mapping archetypal structure...", "Identity record ready." (with delays). "Human WHOIS protocol" and "View Dossier" appear (currentField == null). Registry footer visible. No input row.

**Step 6:** Processing completes. If WAITLIST_ONLY: waitlist useEffect runs, POST /api/waitlist. On response: addLine messages, `setPhase("completeAwaitingEnterRedirect")`. If !WAITLIST_ONLY: `setPhase("executing")`, handleRunWhoisClick runs (submit or checkout).

**Step 7:** Phase "completeAwaitingEnterRedirect". Component early-returns. User sees: LIGHT IDENTITY ARTIFACT — RESOLVED, Light Identity Artifact, ARCHETYPE, OBSCURION (or resolved archetype), "Press ENTER or tap to continue", "← Return to Origin". No terminal, no input, no "Human WHOIS protocol", no "View Dossier", no registry footer.

**Step 8:** User presses Enter or taps. `handleCompleteTap` → `setCountdownRemaining(3)`. Effect runs `startRedirectCountdown` → adds "3…", "2…", "1…" to lines (but user is on completion UI, so these lines are in state only — completion UI doesn't show them). After 3 seconds, `redirectNow()` → `router.push(\`/beauty/view?reportId=exemplar-${archetype}\`)`.

**Step 9:** Route changes to `/beauty/view?reportId=exemplar-Obscurion` (e.g.). BeautyViewClient loads. For exemplar: PreviewRevealSequence (phases 1–5: protocol lines, carousel, family cycle, artifact, "Press ENTER or tap to continue" + ContinuePrompt with "> _"). LigsFooter ("LIGS — Light Identity Generation System") at bottom. "Human WHOIS protocol", "← Return to Origin", "View Dossier" in PreviewRevealSequence.

**Step 10:** User presses Enter/taps on PreviewRevealSequence. `onComplete` → `setTerminalComplete(true)`. BeautyViewClient switches to ReportDocument.

**Step 11:** User sees ReportDocument: dossier-style report with LIGS HUMAN IDENTITY DOSSIER, registry block, sections, footer "Human WHOIS protocol", "← Return to Origin", "View Dossier".

**Step 12:** User clicks "← Return to Origin" → navigates to /origin. Or "View Dossier" → /dossier.

---

## 9. NO-ASSUMPTION DRIFT SUMMARY

### Intended design (inferred from docs and structure)
- Single landing: /origin with WHOIS-style terminal intake
- Sequential intake → processing → resolved artifact → "Press ENTER or tap to continue" → redirect to exemplar report
- Completion screen shows artifact heading, archetype, continue prompt only — no terminal chrome
- Protocol nav (Human WHOIS, View Dossier) appropriate at completion/report contexts
- WAITLIST_ONLY: exemplar redirect; purchase flow when disabled

### Current implementation
- /origin uses OriginTerminalIntake with phases: idle, intake, processing, executing, completeAwaitingEnterRedirect
- Completion phase has exclusive early-return UI (no terminal, no input, no "> _")
- Protocol nav ("Human WHOIS protocol", "View Dossier") appears during **processing** (currentField == null), before artifact is resolved
- Dead code: `showCompleteEnterPrompt` block in main return is unreachable
- Redirect always goes to `/beauty/view?reportId=exemplar-{archetype}` — no alternative targets from completion
- /beauty/view shows PreviewRevealSequence (with ContinuePrompt "> _") then ReportDocument; LigsFooter on page

### Top 5 sources of drift
1. **Protocol nav during processing** — "Human WHOIS protocol" and "View Dossier" render when `currentField == null`, which is true during processing and executing, not only at completion. User sees dossier/report links while "Resolving solar field..." is still running.
2. **Dead continue prompt block** — The `{showCompleteEnterPrompt && (...)}` block (lines 504-520) in the main return can never execute because `phase === "completeAwaitingEnterRedirect"` triggers an early return.
3. **ContinuePrompt "> _" on /beauty/view** — PreviewRevealSequence uses ContinuePrompt, which renders ">", "_", and blinking cursor. Same visual language as intake; may be intended terminal consistency or accidental duplication.
4. **No visible lines during intake** — `visibleLines` are all skipped when `currentField != null`, so the initial "WHOIS &lt;your name&gt;" line is never shown. User only sees the input row.
5. **Documentation mismatch** — SYSTEM_SNAPSHOT.md says origin renders BeautyLandingClient; actual origin page renders OriginTerminalIntake.
