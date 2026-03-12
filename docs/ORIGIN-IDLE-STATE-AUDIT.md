# /origin Idle State Audit — WHOIS Line Not Visible

**Date:** 2026-03-10  
**Issue:** On local desktop, landing shows only `>` and blinking cursor; "WHOIS <your name>" is not visible.

---

## 1. What text is supposed to be visible in idle state

- **Intended:** The first line of the terminal thread should show **"WHOIS <your name>"** so the user knows to type their name in a WHOIS-style query.
- **Source:** `INTAKE_PROMPTS.name` = `"WHOIS <your name>"` (line 26).
- **Initial state:** `lines` is initialized with that value: `useState([INTAKE_PROMPTS.name])` (line 85), so `lines = ["WHOIS <your name>"]`.

---

## 2. How "WHOIS <your name>" is implemented

- **Not** placeholder text (input has `placeholder=""`).
- **Not** hidden helper text or aria-only (no separate element).
- **Not** conditional text that’s gated off in idle (the line is in `lines` and in `visibleLines`).

It is implemented as the **first element of the `lines` array**. The bug: that first element is a **plain string** (`"WHOIS <your name>"`), while the renderer expects **objects** `{ text, type }`.

- **addLine** (used for all later lines) does: `setLines(prev => [...prev, { text, type }])` — so every line added at runtime is `{ text, type }`.
- **Initial state** is the only place that pushes a raw string: `useState([INTAKE_PROMPTS.name])` → `lines[0] = "WHOIS <your name>"`.

In the render (lines 671–682):

```jsx
visibleLines.map((line, i) => (
  <div ...>
    {line.type === "user" ? "> " : ""}
    {line.text}
  </div>
))
```

For the first line, `line` is the string `"WHOIS <your name>"`, so:

- `line.type` → `undefined` (strings have no `.type`)
- `line.text` → `undefined` (strings have no `.text`)
- Output: `""` and `undefined` → **nothing visible**.

So "WHOIS <your name>" is **present in state** but **not rendered** because the renderer reads `line.text`, which is undefined for a string.

---

## 3. Color, opacity, styling

- Aperture text color: `rgba(154,154,160,0.9)` for system lines (line 666, 676).
- If the text were rendered, it would be visible. The problem is **no text is rendered** for the first line, not low contrast.

---

## 4. Whether the design intentionally shows only `>` and cursor

- **No.** The design intends one visible system line ("WHOIS <your name>") plus the input row (`> ` + input + cursor). The single-line WHOIS flow spec says the only primary visible interaction should be a single input line with a prompt format like "WHOIS <your name>" and `> _`. So the prompt line is meant to be visible; showing only `>` and cursor is a **bug** caused by the type mismatch above.

---

## 5. Which file/component controls this

- **File:** `components/OriginTerminalIntake.jsx`
- **Relevant pieces:**
  - **Initial state:** line 85 — `useState([INTAKE_PROMPTS.name])`
  - **Rendering:** lines 671–682 — `visibleLines.map` with `line.text` and `line.type`
  - **addLine:** lines 112–114 — always pushes `{ text, type }`

No other component controls the idle terminal content; the origin page simply renders `<OriginTerminalIntake />`.

---

## 6. Recommended fix (minimal, preserves terminal aesthetic)

**Root cause:** Initial `lines` contains a string; the renderer expects objects.

**Smallest fix:** Initialize `lines` with an object so the first line has `.text` and `.type`:

- Change:  
  `useState([INTAKE_PROMPTS.name])`  
  →  
  `useState([{ text: INTAKE_PROMPTS.name, type: "system" }])`

**Effect:** The first line renders as "WHOIS <your name>" in system color (`rgba(154,154,160,0.9)`), with no "> " prefix (since `type !== "user"`). The input row still shows `> ` and the cursor. No layout or styling change; no extra copy; the prompt is simply visible.

**Optional hardening:** In the map, normalize so that a string line still displays: e.g.  
`const text = typeof line === "string" ? line : line?.text;`  
and use `text` instead of `line.text` (and similarly for `type` if desired). That way any future raw string in `lines` still shows instead of disappearing.

---

## 7. Status

- **Fix applied:** Initial state updated to `[{ text: INTAKE_PROMPTS.name, type: "system" }]` in `OriginTerminalIntake.jsx`.
- **Optional:** Renderer normalization for string lines can be added in the same file if you want to guard against similar bugs later.
