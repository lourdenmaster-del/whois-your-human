# LIGS Voice Creation Engine Spec (Cursor-ready)

## Goal
Generate a consistent, high-quality **brand voice profile** from user input inside the LIGS system, and apply it to produce copy in multiple formats (web, email, captions, scripts). The engine must:
- Capture *tone, cadence, vocabulary, constraints*
- Encode *archetype alignment* (12 LIGS)
- Provide *deterministic reuse* (same inputs → same voice)
- Support *style adaptation* by channel while preserving identity
- Enforce safety + exclusion rules (e.g., no astrology icons, no medical claims, no slurs)

---

## Core Concepts

### Voice Profile (VProfile)
A structured object representing a user's voice + constraints.

**Inputs (sources):**
1) Explicit user settings (sliders/choices)
2) Example text samples (user-provided)
3) Brand constraints (forbidden words, claims, topics)
4) LIGS archetype selection (single or blend)
5) Audience + channel (optional)

**Outputs:**
- `voice_profile.json` (canonical)
- `voice_prompt.md` (LLM-ready system/prefix prompt)
- `style_tests.md` (a few "golden" outputs for regression checks)
- `lint_rules.yaml` (hard constraints used by validators)

---

## Pipeline Overview

### 0) Data Collection UI (front-end)
Collect:
- Archetype: one of 12 (+ optional secondary blend with weights)
- "How should it feel?" (checkboxes + free text)
- Do/Don't list
- Vocabulary preferences (technical / poetic / minimal / punchy)
- 2–5 writing samples (optional but ideal)
- Brand nouns/proper names
- Audience + channel (site, email, IG, longform, etc.)

### 1) Normalize & Extract Signals
- Clean samples (strip signatures, URLs, boilerplate)
- Detect:
  - Reading level (approx)
  - Sentence length distribution (short/med/long)
  - Punctuation patterns (em dashes, ellipses, parentheses)
  - Common phrases + signature verbs
  - Taboo patterns (what user dislikes)
- Summarize into **style features**.

### 2) Archetype Mapping (LIGS Alignment Layer)
Archetype contributes:
- Emotional temperature
- Rhythm
- Lexicon bias
- Metaphor density
- Assertiveness
- Structure preference (lists, declarative, narrative)

**Example (Stabiliora):**
- regulated, calm, coherent
- minimal hype, no chaotic intensity
- balanced qualifiers, gentle certainty
- smooth transitions, symmetry, clarity

### 3) Compose Canonical Voice Profile
Create `VProfile` with:
- Identity: name, brand, archetype(s)
- Voice descriptors (5–12)
- Cadence rules (sentence length, paragraph length)
- Vocabulary rules (preferred, avoided, "banned")
- Claims rules (evidence threshold, prohibited domains)
- Formatting rules (headings, bullets, emoji, capitalization)
- Channel adapters (website hero vs. email vs. caption)

### 4) Generate LLM Prompt Pack
Build:
- **System voice block** (stable, short, authoritative)
- **User/Task wrapper** (variable per request)
- **Channel adapter block** (format-specific)
- **Hard constraints block** (never do X)
- **Self-check rubric** (quick checklist before final)

### 5) Validation / Lint (post-generation)
Before returning text:
- Constraint scan (banned words, disallowed claims)
- Style adherence scoring (cadence, descriptors)
- "Archetype drift" check (e.g., Stabiliora shouldn't sound chaotic)
- Optional: deterministic "re-write pass" if score < threshold

### 6) Versioning
- Every update creates a new `voice_profile_version`
- Keep last N versions + diff summary
- Regression tests: compare outputs on a fixed set of prompts

---

## Data Structures

### `voice_profile.json` (canonical)
```json
{
  "id": "vp_001",
  "version": "1.0.0",
  "created_at": "ISO-8601",
  "owner_user_id": "user_123",
  "brand": {
    "name": "LIGS Beauty",
    "products": ["..."],
    "audience": "..."
  },
  "ligs": {
    "primary_archetype": "Stabiliora",
    "secondary_archetype": null,
    "blend_weights": {"Stabiliora": 1.0}
  },
  "descriptors": [
    "calm", "regulated", "premium", "clear", "warmly precise"
  ],
  "cadence": {
    "sentence_length": {"target_words": 14, "range": [8, 22]},
    "paragraph_length": {"target_sentences": 2, "range": [1, 4]},
    "rhythm_notes": "smooth transitions, balanced clauses, minimal exclamations"
  },
  "lexicon": {
    "preferred_words": ["balance", "restore", "steady", "signal", "support"],
    "avoid_words": ["hack", "crush", "obsessed", "crazy"],
    "banned_words": ["guarantee", "miracle", "cure"]
  },
  "formatting": {
    "emoji_policy": "none",
    "exclamation_policy": "rare",
    "capitalization": "standard",
    "bullets": "allowed",
    "headline_style": "clean minimal, title case"
  },
  "claims_policy": {
    "medical_claims": "prohibited",
    "before_after_promises": "prohibited",
    "substantiation_required": true,
    "allowed_phrasing": ["may help", "supports", "designed to"]
  },
  "channel_adapters": {
    "website": {
      "tone_shift": "slightly more polished",
      "structure": ["headline", "subhead", "3 bullets", "cta"]
    },
    "email": {
      "tone_shift": "more direct + personal",
      "structure": ["subject options", "preview line", "body", "ps"]
    },
    "social_caption": {
      "tone_shift": "more concise",
      "structure": ["hook", "value", "soft CTA"]
    }
  },
  "examples": {
    "do": [
      "Quiet confidence; clarity over hype.",
      "Balanced language: precise but kind."
    ],
    "dont": [
      "Overpromising or dramatic transformations.",
      "Chaotic punctuation or excessive slang."
    ]
  }
}
```
