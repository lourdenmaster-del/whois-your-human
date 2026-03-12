# Origin WHOIS Terminal Refinement — Deliverable Report

**Date:** 2026-03-10  
**Scope:** Single-line terminal-first WHOIS flow on `/origin`; report expansion placeholder.

---

## 1. Audit — What Had to Change

The `/origin` landing is implemented as a single client component, **`components/OriginTerminalIntake.jsx`**, rendered by `app/origin/page.jsx` with `app/origin/layout.jsx` providing the black/silver WHOIS layout. No backend or route structure changed.

**Changes made:**

| Area | Change |
|------|--------|
| **Initial state** | One primary line: `WHOIS <your name>` and a single input line (`> _`). No "Press ENTER to begin" or separate boot CTA. |
| **Constants** | Replaced `BOOT_LINES` with `HANDSHAKE_LINES` (five protocol lines). Shortened `INTAKE_PROMPTS` to registry-style prompts (name, date, time, place, email). |
| **Flow** | Idle → user submits name (ENTER) → handshake runs automatically in same thread → intake phase with one prompt at a time. |
| **Handshake** | After name submission, `runHandshake()` runs; phase `handshake`; lines appear with ~700 ms spacing; then phase switches to `intake` with `currentField = "date"`. |
| **Date confirmation** | On valid date + ENTER, `getArchetypeAndSegmentFromDate(iso)` runs; two lines added: "Solar segment resolved: …" and "Base archetype detected: …"; then next prompt (birth time). |
| **Visibility** | Input row shown only when: `phase === "idle"` OR (`phase === "intake"` and current field set) OR `completeAwaitingEnterRedirect`. Protocol nav and registry counter hidden during `idle` and `handshake`. |
| **Terminal history** | `visibleLinesCount` increased so prior answers remain visible in the thread. |
| **Refs** | `bootCompleteHandledRef` removed; `handshakeCompleteRef` used to avoid double-running handshake. |

**Unchanged by design:** `app/origin/page.jsx`, `app/origin/layout.jsx`, `lib/terminal-intake/parseInputs.ts`, `lib/terminal-intake/resolveArchetypeFromDate.js`, waitlist/redirect/exemplar logic, and backend APIs.

---

## 2. New Interaction Flow

1. **Idle** — User sees `WHOIS <your name>` and one input line. Helper text minimal or subtle.
2. **Name** — User types name, presses ENTER. No extra "begin" tap.
3. **Handshake** — Terminal prints five protocol lines in sequence (~700 ms apart). Input hidden. No user action required.
4. **Birth date** — Prompt: "Birth date:". User enters date (forgiving formats). On ENTER, if valid, date is stored; if `dateNeedsConfirm`, second ENTER confirms. On confirm, solar segment and base archetype are resolved and two lines printed; then next prompt.
5. **Birth time** — "Birth time (or UNKNOWN):". User enters time or UNKNOWN.
6. **Place** — "Place of birth:". User enters location.
7. **Email** — "Contact email:". User enters email.
8. **Processing** — Three system lines ("Resolving solar field…", etc.). Then archetype + "Identity record ready" and Ready state.
9. **Waitlist** — If `WAITLIST_ONLY`, waitlist POST runs; "Press ENTER or tap to continue" (or countdown); user continues → redirect to `/beauty/start` or exemplar.

All intake is single-line, one prompt at a time; prior answers stay in terminal history.

---

## 3. Tap Counts

- **Taps before archetype reveal (in UI):** **2–3**  
  - 1 = submit name (ENTER)  
  - 2 = submit birth date (ENTER)  
  - 3 = (optional) second ENTER to confirm date if `dateNeedsConfirm` is set  
  After that, solar segment and base archetype lines appear; no further tap needed for that reveal.

- **Taps before waitlist completion (before redirect):** **6–7**  
  - 1 = name, 2 = date, 3 = (optional) date confirm, 4 = time, 5 = place, 6 = email  
  - 7 = "Press ENTER or tap to continue" after waitlist success  
  So **6** if date does not need confirmation, **7** if it does (or 7 in all cases if counting the final continue as the completion step).

---

## 4. Files Changed

| File | Change |
|------|--------|
| **`components/OriginTerminalIntake.jsx`** | WHOIS-first initial state; handshake after name; single-line sequential intake; date → solar/archetype lines; visibility and phase logic; removed boot CTA and separate begin step; registry counter hidden during handshake. |
| **`app/beauty/view/ReportDocument.jsx`** | Added expansion placeholder block before footer: "Additional identity modules are available in the full report: Career Field Catalogue, Relationship Compatibility Analysis, Team Dynamics Map." (research-module tone, subtle styling). |

No other files modified. Build: `npm run build` succeeds.

---

## 5. Risks and Regressions

- **Handshake timing:** ~700 ms per line; if users mash ENTER, `handshakeCompleteRef` prevents re-entry. Focus is restored when input reappears after handshake (existing `inputRef` focus logic).
- **Date confirmation:** If `dateNeedsConfirm` is set, user must press ENTER twice for date (once to submit, once to confirm). Parsing remains forgiving; validation stays terminal-native.
- **Protocol nav / registry counter:** Shown only after handshake (`phase !== "idle" && phase !== "handshake"`). Avoids flashing during handshake.
- **Report expansion copy:** Placeholder only; no links or paywall. Can be replaced later with real modules or CTAs.
- **Existing behavior:** Waitlist, redirect, exemplar, dry-run, and beauty-unlock flows are unchanged; all reuse existing state and APIs.

---

## 6. Verification Log (SYSTEM_SNAPSHOT)

For **SYSTEM_SNAPSHOT.md**: add under Verification Log — 2026-03-10: *Origin landing refined to single-line WHOIS terminal flow; handshake after name; sequential intake; date→archetype lines; report expansion placeholder in ReportDocument. No new routes or env vars.*
