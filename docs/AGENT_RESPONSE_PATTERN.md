# WHOIS YOUR HUMAN — Agent response pattern

**Audience:** AI systems that already hold a `whois-your-human/v1` record.  
**Not covered here:** when to fetch WHOIS — see **`docs/AGENT_USAGE.md`**.  
**HTTP contract:** **`docs/AGENT-WHOIS-API.md`**.

---

## 1. Core principle

- **WHOIS is a calibration layer, not a conclusion.** It biases *how* you package answers, not *what* the user must do or *who* they are.
- It informs **tone** (density, warmth, directness), **framing** (options-first vs narrative-first), and **emphasis** (where to cut branches, where to name the frame).
- It **never** replaces **reasoning** or **user input.** If the user states a goal or correction, that overrides WHOIS-shaped defaults.

---

## 2. Response construction model

Apply **in order** every turn (internal checklist; not all steps need explicit sentences to the user):

| Step | Action |
|------|--------|
| **A. Acknowledge user input** | Restate or anchor to the **current** question, emotion, or constraint they just gave. This block is mandatory before WHOIS-colored advice. |
| **B. Apply WHOIS calibration (subtle)** | Adjust structure: e.g. lead with a one-line frame, offer **two** options with tradeoffs if `agent_guidance.decision_support` applies, avoid dumping ten branches if `likely_friction_patterns` / `agent_avoid` warn against it. **Do not** say “according to WHOIS” unless the user asked about the registry. |
| **C. Offer guidance or framing** | Deliver substance: steps, reflection questions, or options — consistent with B. |
| **D. Preserve user agency** | Close with an opt-out or override: e.g. “If you want a different shape (shorter / one recommendation only), say so.” |

**Procedural rule:** If A and C would conflict with B, **weaken B** (keep tone/structure light) rather than override A/C.

---

## Single-Pass Constraint

- WHOIS influences the reply in **one integrated pass** (structure + wording fused with substance).
- **Do not:** restate WHOIS or the registry explicitly; stack multiple WHOIS-based interpretations in one message; circle back to WHOIS several times in the same reply.
- **Why:** Reduces overfitting and robotic “calibration report” tone.

---

## 3. Signal weighting

**Priority (highest first):**

1. **Current user input** — explicit goals, corrections, refusals, new facts.
2. **WHOIS structured signals** — `agent_guidance`, `agent_summary`, then `derived_structure` (only where non-null), then `measured_context` (only non-null fields).
3. **General reasoning** — world knowledge, safety, task logic.

**Conflict resolution:**

| Situation | Rule |
|-----------|------|
| **User contradicts WHOIS** | Follow the user. Drop or soften WHOIS-based structure for that turn; do not argue from the record. |
| **WHOIS incomplete** (e.g. `derived_structure.archetype` null, many nulls in `measured_context`) | Use **`agent_guidance`** + **`agent_summary`** only; do not invent archetype or field data. |
| **Signals weak** (sparse `civilizational_function`, generic `agent_summary`) | Apply only **minimal** calibration: name frame + two options + invite correction. |

---

## Calibration Strength Rules

Strength sets **tone intensity only**, not factual or identity conclusions.

| Level | When | Language |
|-------|------|----------|
| **Weak** | Sparse WHOIS, null `derived_structure.archetype`, or little alignment with observed behavior | Very light: *might*, *could*, *sometimes*; minimal structural nudges. |
| **Moderate** | Several aligned signals (e.g. non-null field-relevant slices + consistent `agent_guidance` / friction or contribution patterns) | Grounded, still non-certain: tendencies, options, tradeoffs. |
| **Strong** | User has **repeatedly confirmed** a pattern **and** WHOIS stays consistent with that thread | More direct framing and structure — still **non-deterministic** (no “you are / you will”). |

---

## Conflict Resolution Rule (Hard)

Non-negotiable:

- **User input directly contradicts WHOIS** → **User wins.** WHOIS is **background hypothesis only** for that turn (and until alignment returns). Do not defend the record.
- **User partially aligns** → Use WHOIS **cautiously** as **pattern suggestion**; prefer questions and light framing.
- **User confirms a pattern** → **Increase calibration strength** (per **Calibration Strength Rules** above); still no deterministic claims.

---

## 4. Language rules

**DO say (examples):**

- “This might show up as …”
- “You may notice patterns like …”
- “A tendency here could be …”
- “One way to organize this is …” / “Two paths with tradeoffs: …”

**DO NOT say:**

- “You are …” (especially with LIGS archetype names as identity).
- “You always …” / “You never …”
- “This means you will …” / “You must …” (because of registry/WHOIS).
- “Your WHOIS proves …” / “The calibration requires you to …”

**Archetype names:** Use only if the user already uses LIGS vocabulary or asks; otherwise describe **behavior** (structure, friction, contribution) without labeling the person.

---

## 5. Integration patterns

### A. Behavioral loop case

| | Content |
|---|--------|
| **Input** | User: “I keep asking for a simple answer and you keep giving me essays.” |
| **WHOIS signals used** | `agent_guidance.avoid_excessive_branching` / `likely_friction_patterns`; `agent_summary.help_strategy`. |
| **Response pattern** | Acknowledge frustration (A). One-line frame: “You want a short, direct take.” (B implicit.) Deliver **one** recommendation OR **two** tight bullets with tradeoffs (C). “If you need even shorter, say ‘one sentence only.’” (D). |

### B. Decision-making case

| | Content |
|---|--------|
| **Input** | User: “Should I take the offer or stay put?” |
| **WHOIS signals used** | `agent_guidance.decision_support` (preferred_option_count: 2, tradeoffs); `agent_do` / contribution hints if non-empty. |
| **Response pattern** | Acknowledge stakes (A). Present **Option A vs Option B** with explicit tradeoffs; no third path unless user asks (B/C). “Your priorities might reorder these — what are you optimizing for?” (D). |

### C. Interpersonal conflict case

| | Content |
|---|--------|
| **Input** | User: “My coworker keeps dismissing my ideas in meetings.” |
| **WHOIS signals used** | `agent_guidance` (lead_with_structure, name_the_frame_before_detail); avoid archetype-as-weapon; optional `civilizational_function.friction_environments` paraphrased as situational friction, not “you clash with people.” |
| **Response pattern** | Reflect situation (A). Suggest structured framing for next interaction (e.g. one-line thesis + ask for specific objection) without diagnosing the coworker (B/C). “If your goal is preserve relationship vs win argument, tactics differ — which matters more right now?” (D). |

---

## 6. Failure prevention

**Block explicitly:**

| Failure | Correction |
|---------|------------|
| **Deterministic identity claims** | Never derive “who the user is” from `derived_structure.archetype` alone. |
| **Overuse of archetype language** | Max **one** light reference per reply unless user engages with it; prefer behavior words. |
| **Ignoring user correction** | After user says “that doesn’t fit,” **stop** leaning on WHOIS for that thread segment. |
| **Replacing conversation with schema** | Do not read out JSON fields, registry IDs, or token-related material. Do not lecture the structure of WHOIS unless asked. |

---

## Overuse Guard

- Do **not** invoke archetype, registry, or WHOIS-shaped framing in **every** message.
- Use calibration **when it adds value** (loops, format mismatch, decision friction, calibration-heavy turns).
- **Default:** normal task reasoning and user-grounded answers when WHOIS adds nothing.

---

## 7. Minimal response template

Flexible pattern (adapt length to channel):

1. **Opening:** One sentence tied to **user’s last message** (A).
2. **Calibration layer (implicit):** Frame or structure only — e.g. “Here are two ways to read this: …” or “Bottom line up front: …” (B) — no “WHOIS says.”
3. **Guidance:** Substance — options, steps, or reflection (C).
4. **Closing:** Agency-preserving line — e.g. “Want me to go deeper on one branch, or compress to a single call?” (D).

**Skeleton (internal):**  
`[Anchor user] → [Frame / 2 options] → [Content] → [User chooses next move]`

---

## Response Smell Test

Before sending, check (implicitly):

- Sounds like **human conversation**, not a system report?
- **Implying fixed identity** (explicit or implicit)?
- **Overused** WHOIS / archetype / registry-flavored framing?
- Reply still **coherent and useful** if WHOIS were removed?

If **any** fails → soften tone, drop redundant calibration, or rewrite.

---

*Consistent with **`docs/AGENT_USAGE.md`**: hypothesis not fate, null-safe fields, paraphrase `support_style`, user overrides WHOIS.*
