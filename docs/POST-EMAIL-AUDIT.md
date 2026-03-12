# Post-email sequence audit (OriginTerminalIntake)

**Scope:** Behavior after user submits email (advanceToProcessing through redirect). Intake is locked; this doc describes only post-email.

## File controlling post-email behavior

- **`components/OriginTerminalIntake.jsx`** — All processing, completion, waitlist, continue instruction, and redirect logic.

## Exact post-email sequence (current)

### 1. On email submit (advanceToProcessing)

- `setPhase("processing")`, `setProcessingIndex(0)`
- **Lines added:** `"Parameters accepted."`, `""` (blank)

### 2. Processing phase (useEffect, phase === "processing")

- **Lines added** (with delays 900ms, 1200ms, 800ms):
  - `"Resolving solar field..."`
  - `"Mapping archetypal structure..."`
  - `"Identity record ready."`
- When `processingIndex >= PROCESSING_LINES.length`:
  - After 800ms: `Archetype: ${archetype}`, `"Ready."`
  - If WAITLIST_ONLY and valid email: `setWaitlistState("running")` → waitlist POST
  - If WAITLIST_ONLY and no email: `""`, `"Press ENTER or tap to continue"`, setPhase(completeAwaitingEnterRedirect)
  - If !WAITLIST_ONLY: `""`, `"Executing query..."`, setPhase("executing")

### 3. Waitlist path (WAITLIST_ONLY, waitlistState === "running")

- POST `/api/waitlist`
- **Success, already registered:** `"Identity record already exists."`, `"Contact node verified."`
- **Success, new:** `"Contact node recorded."`, `"Identity query logged."`, optional `"Confirmation signal transmitted."`
- **Error / catch:** `"Identity query could not be recorded."`, `"You may continue, but confirmation is not secured."`
- Then: `""`, `"Press ENTER or tap to continue"`, setPhase(completeAwaitingEnterRedirect), setCountdownRemaining(null)

### 4. Completion / continue

- **Instruction shown:** `"Press ENTER or tap to continue"` (when phase === completeAwaitingEnterRedirect && countdownRemaining == null)
- **Countdown:** On first Enter/tap, setCountdownRemaining(3), startRedirectCountdown(); every 1s: addLine("2…") then addLine("1…"), then redirectNow()

### 5. Redirect

- **redirectNow():** saveOriginIntake(formData), router.push(`/beauty/view?reportId=exemplar-${archetype}`)
- No backend/waitlist/email logic changed by polish.

## Constants

- PROCESSING_LINES: "Resolving solar field.", "Mapping archetypal structure.", "Identity record ready."
- PROCESSING_DELAYS_MS: [900, 1200, 800]

---

## Post-email polish (applied)

- **advanceToProcessing:** Removed blank line after "Parameters accepted." so first processing line follows immediately.
- **Waitlist success (already registered):** One line: "Identity record already exists. Contact node verified."
- **Waitlist success (new):** One line "Contact node recorded. Identity query logged." then optional "Confirmation signal transmitted."
- **Waitlist error / catch:** One line: "Identity query could not be recorded. You may continue, but confirmation is not secured."
- **Continue instruction:** Unchanged — "Press ENTER or tap to continue".
- **Countdown / redirect:** Unchanged — 3… 2… 1… then redirectNow() to exemplar view.
- **Intake:** Not modified.
