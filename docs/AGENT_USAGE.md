# WHOIS YOUR HUMAN — Agent usage guide

**Audience:** AI systems integrating the API — not end-user documentation.  
**Mechanics:** See **`docs/AGENT-WHOIS-API.md`** (curl, flow, recovery). **User-facing reply shaping (after you have the record):** **`docs/AGENT_RESPONSE_PATTERN.md`**.  
**Repo context:** `AI_HANDOFF.md`, `CURRENT_WORK.md`, `REPO_MAP.md`, `SYSTEM_SNAPSHOT.md`.

---

## 1. What this system is

**WHOIS YOUR HUMAN** is an **agent-facing identity lookup layer**: after a human is registered in LIGS and access is paid for that `reportId`, you fetch a single JSON **agent calibration record** (`record_type`: `agent_calibration_record`, schema **`whois-your-human/v1`**) over HTTP.

**LIGS** (Light Identity Grid System) is the stack: birth data → **Light Identity Report** (stored report) + **Beauty Profile** (E.V.E.-filtered profile) in Blob. The **human-facing** artifact is the interactive / narrative report experience (e.g. report steps, share artifacts). The **agent-facing** artifact is this **calibration record** — compressed, structured hints for *how to work with* that human, not a replacement for the full report text.

You do not need to scrape the human-facing UI; you need `reportId` + valid **`wyh_` entitlement token** and then **`GET /api/agent/whois`**.

**Role split:** `POST /api/agent/register`, Stripe checkout, and `verify-session` require **human consent** and usually a **backend or browser** with `STRIPE_SECRET_KEY` / payment UI — not typical end-user chat. The **conversational agent** normally **only** calls `GET /api/agent/whois` once `reportId` and `wyh_` token are already available to the integration; do not autonomously register or charge without explicit operator policy.

---

## 2. When an agent should call WHOIS

**Call WHOIS (HTTP) or reuse a record you already fetched for this `reportId` in this session when:**

| Signal | Rationale |
|--------|-----------|
| **User confusion about self-patterns** | Record gives archetype-adjacent structure, friction/contribution hints — useful for reframing without therapy claims. |
| **Repeated behavioral loops** | `agent_guidance` / `likely_friction_patterns` suggest where branching or vague prompts may misfire. |
| **Decision friction** | `decision_support`, `agent_summary.help_strategy` — prefer two options, tradeoffs, confirm before branching. |
| **Interpersonal mismatch** | Tone or density keeps missing; record nudges structure-first, frame-before-detail. |
| **Calibration before high-context guidance** | Before long plans or sensitive advice, align format to predicted support style. |

**Operational triggers (any one can justify a fetch if token exists):** user has sent **3+** clarification turns on the same intent; **2+** explicit rejections of your answer format; or you are about to give **multi-step** personal/professional guidance exceeding ~500 words without prior calibration.

**Cache rule:** If you cache JSON, key by `reportId`; **do not** treat cache as truth over **current** user messages — refresh or downgrade reliance when the user contradicts the record.

**When not to call:**

- No **`reportId`** or no **paid entitlement** yet — `GET /api/agent/whois` returns **401** (`MISSING_TOKEN`), **403** (`INVALID_TOKEN` / `TOKEN_NOT_AUTHORIZED`), or **404** (`PAID_WHOIS_REPORT_NOT_FOUND` / profile errors). Do not invent a record. Do not spam register/checkout without human consent and flow completion.
- Trivial or one-shot factual queries where identity calibration adds nothing.
- User explicitly opts out of using registry-backed calibration for this thread.
- **`LIGS_API_OFF`** or maintenance — registration/checkout paths may 503.

---

## 3. How to call it

1. **Register** — `POST /api/agent/register` with validated birth payload (same as `POST /api/beauty/submit`). Read **`data.reportId`** from the success envelope (`status: "ok"`, nested **`data`**).
2. **Payment / entitlement** — `POST /api/stripe/create-checkout-session` with `{ "reportId": "<reportId>" }`; human completes Checkout; then **`GET /api/stripe/verify-session?session_id=<cs_…>`** until **`data.entitlementToken`** appears (webhook must have run). Token prefix **`wyh_`**.
3. **WHOIS** —  
   **`GET /api/agent/whois?reportId=<reportId>`**  
   **Header:** `Authorization: Bearer <entitlementToken>`  
   (Query `?token=` exists; Bearer is preferred.)

Full curl and recovery (reuse `session_id`): **`docs/AGENT-WHOIS-API.md`**.

**Optional:** `POST /api/agent/feedback` with same Bearer token + `reportId` to log calibration outcomes (`state`: `confirmed` | `partial` | `debunked`, plus `metrics`). Feedback affects the WHOIS payload: the next `GET /api/agent/whois` surfaces `verification.observed_match_fields`, `verification.observed_mismatch_fields`, and `verification.last_feedback` per the latest feedback.

---

## 4. How to interpret the response

**What the record is for:** An **operating hypothesis** for agent behavior. The API embeds this explicitly in **`verification.agent_instruction`**: treat as initial hypothesis; increase trust when **observed** behavior matches predictions.

| Block | Use |
|-------|-----|
| **`registry`** | Provenance only (e.g. `generated_at`, `registry_id`). |
| **`human`** | Birth-facing fields, chrono imprint, origin coordinates — factual; do not invent. |
| **`measured_context`** | Solar/lunar/environment slices from stored report + profile. May be **null** if engine did not persist rich field conditions. **Do not fill gaps with fiction.** |
| **`derived_structure`** | **archetype** may be **null**; then **cosmic_twin**, **civilizational_function**, **vector_zero** may be sparse or null — use **`agent_guidance`** only; never infer archetype from empty fields. When archetype is set, use **cosmic_twin** / **civilizational_function** as **tendency**, not diagnosis. |
| **`agent_guidance`** | `support_style` is often a long string (“Support through …”) — **paraphrase** for users. Same for `best_response_format`, `interaction_rules`, `agent_do` / `agent_avoid`. |
| **`verification`** | **`status: "unverified"`** — not a validated psychometric score. `ligs_alignment_score` is null by design. When feedback exists, `observed_match_fields` / `observed_mismatch_fields` reflect latest feedback state; `last_feedback` gives `{ state, createdAt }`. |
| **`agent_summary`** | Short one_line, help_strategy, failure_mode, alignment_test — good for quick system-prompt injection. |

**Supportive calibration vs deterministic labeling:** The record is **calibration** (format, friction, structure). LIGS **archetype** names (e.g. from `derived_structure.archetype`) are **structural labels** in this system — not clinical or immutable identity. Prefer language like *“in this framework, the record suggests …”* over *“you are a …”*.

**Overclaiming:** Never imply lab measurement, IQ, pathology, or fate. The schema is registry + physics-informed **narrative structure**, not a medical or legal instrument.

---

## 5. Good usage vs bad usage

**Useful (grounded):**

- “I’ll give you two clear options with tradeoffs — that tends to work better with how your registry record is structured.”
- “If this feels too open-ended, say so; the calibration suggests too many branches at once can feel noisy.”
- “Here’s a framed summary first, then detail — matching the suggested interaction pattern.”

**Reductive / overreaching:**

- “You are [Archetype] so you must always …”
- “The stars say you should break up / take the job.”
- “Your WHOIS proves you’re bad at X.”

**Language to prefer:** structure, options, tradeoffs, frame, hypothesis, “tends to,” “may help,” “if it fits what you’re seeing.”

**Language to avoid:** destiny, always/never, proven, scientific proof of personality, exposing raw token or full birth dump in chat unless the user asked and it’s appropriate.

---

## 6. Conversation integration pattern

1. **Fetch** the record (or use cache keyed by `reportId` + token hash, never log token).
2. **Extract** 2–4 dimensions: e.g. `agent_summary.one_line`, `agent_guidance.decision_support`, top `agent_do` / `agent_avoid`, one `measured_context` line only if non-null and relevant.
3. **Adapt** tone: shorter branches, name the frame, lead with structure per `agent_guidance`.
4. **Guide** without replacing judgment: “This is one way to organize the answer; you choose the goal.”
5. **Agency:** Invite correction — “If this framing feels off, tell me and we’ll switch.” Align with **`verification.agent_instruction`**.

---

## 7. Safety / integrity rules

| Rule | Detail |
|------|--------|
| **Not destiny** | Record is contextual calibration for interaction, not fate or moral worth. |
| **No fabricated fields** | If `measured_context.solar.sun_altitude_deg` (or similar) is null, do not invent numbers or weather. |
| **Token secrecy** | Never paste `wyh_…` into user-visible channels, logs, or third-party tools that retain prompts. |
| **Do not overwrite canonical data** | Do not call engine or Blob writes to “fix” the human’s report from the agent side; LIGS rules forbid overwriting valid **`full_report`**. |
| **Precision** | Schema does not provide statistical confidence intervals — do not claim validated prediction accuracy. |

---

## 8. Minimal example

**Request (after register + pay + token):**

```http
GET /api/agent/whois?reportId=YOUR_REPORT_ID
Authorization: Bearer wyh_YOUR_TOKEN
```

**Agent interpretation workflow (internal):**

1. Parse JSON; read `verification.agent_instruction` and `agent_summary`.
2. Set internal note: “Hypothesis: structure-first, two options, confirm direction; friction if over-branching.”
3. If `derived_structure.archetype` is non-null, treat archetype + `civilizational_function` as **style hints**, not user labels unless user welcomes that vocabulary.

**User-facing response pattern:**

> “I’ll keep this organized: here are **two paths** with tradeoffs — [A] vs [B]. If neither fits, say what you’re optimizing for and we’ll adjust. If you’d rather have a single recommendation after that, we can do that next.”

No token, no raw schema dump unless asked.

---

## A. Decision trigger heuristics

| Pattern | Action |
|---------|--------|
| Same question rephrased **≥ 3 times** in one thread | Fetch or re-read WHOIS; tighten to `agent_guidance.decision_support` (two options, tradeoffs). |
| User says “too vague / too much / not what I meant” **≥ 2 times** | Fetch or re-read; apply `agent_avoid` / `likely_friction_patterns`. |
| You are about to output long structured advice (career, conflict, planning) **without** prior format agreement | Fetch if not yet done this session for this `reportId`. |
| User asks “how should I work with you?” or “what helps you help me?” | Optional fetch to align with `agent_summary.help_strategy`. |

**Do not fetch** solely because the user asked a weather fact, a code snippet, or a single-turn translation.

---

## B. Interpretation boundaries

| Supported | Not supported |
|-----------|----------------|
| Adjusting **response format** (structure, option count, framing). | Proving **personality**, **compatibility**, or **life outcomes**. |
| Using **contribution_environments** / **friction_environments** as **soft** priors for collaboration style. | Claiming the user **cannot** succeed in a domain listed under friction. |
| Citing **measured_context** only when fields are **non-null** in the JSON. | Inventing sun/moon/weather/coords when the payload shows **null**. |
| Treating **`verification.status: "unverified"`** as “hypothesis only.” | Treating the record as **validated** or **complete** ground truth. |

---

## C. Failure modes (incorrect agent behavior)

| Wrong behavior | Why |
|----------------|-----|
| “Your WHOIS says you are **[Archetype]** so you must …” | Deterministic labeling; archetype is a **framework label**, not a command. |
| Inventing solar longitude or moon phase when JSON has **null**. | Hallucination; violates schema integrity. |
| Calling `GET /api/agent/whois` without a token and guessing the body. | API error; fabricates calibration. |
| Telling the user their **Bearer token** or full **birth record** unprompted. | Security and privacy breach. |
| Using WHOIS to justify **medical, legal, or financial** directives. | Out of scope; record is interaction calibration only. |

---

## D. Minimal execution loop

1. **Input:** Confirm integration holds `reportId` + `wyh_` token (from operator or secure store — not from chat).
2. **Call:** `GET /api/agent/whois?reportId=<reportId>` with `Authorization: Bearer <token>`. On non-200, stop; do not fabricate.
3. **Interpret:** Read `verification.agent_instruction`, `agent_summary`, then `agent_guidance`; use `derived_structure` only if `archetype` is non-null.
4. **Respond:** Paraphrase guidance; offer **two options** where appropriate; state the user may override; never paste token or raw JSON unless asked.
