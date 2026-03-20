# WHOIS YOUR HUMAN — Agent API Reference

**Audience:** Developers integrating AI systems with the WHOIS calibration API.  
**Related:** `docs/AGENT_USAGE.md` (when to call, interpretation), `docs/AGENT_RESPONSE_PATTERN.md` (user-facing reply shaping), `docs/AGENT-FLOW-RUNBOOK.md` (live test runbook).

---

## Base URL

Production: `https://ligs.io`  
Local: `http://localhost:3000`

Use `NEXT_PUBLIC_SITE_URL` or `VERCEL_URL` when available; default is `https://ligs.io`.

---

## Authentication

The WHOIS endpoint requires a **Bearer token** (`wyh_` prefix) issued after payment. The token is an entitlement token that authorizes access to a specific `reportId`.

**Methods:**
1. **Header (preferred):** `Authorization: Bearer <token>`
2. **Query param:** `?token=<token>`

**Obtaining a token:**
1. Human completes Stripe checkout for a report (or pre-purchase).
2. Stripe webhook mints the entitlement token.
3. Client calls `GET /api/stripe/verify-session?session_id=<cs_xxx>` until `entitlementToken` appears in the response.
4. Store the token securely; do not expose it in user-facing channels.

---

## Endpoint

### GET /api/agent/whois

Returns the agent calibration record for a paid report.

**Request:**
- `reportId` (required) — Query parameter. The report ID from registration or checkout.
- `Authorization: Bearer <token>` or `?token=<token>`

**Full request example:**

```http
GET /api/agent/whois?reportId=abc-123-def-456
Authorization: Bearer wyh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Full Response JSON Example

```json
{
  "schema": "whois-your-human/v1",
  "record_type": "agent_calibration_record",
  "registry": {
    "authority": "LIGS Human WHOIS Registry",
    "registry_id": "A1B-2C3-45",
    "record_status": "registered",
    "generated_at": "2025-03-20T14:30:00.000Z",
    "visibility": "agent-facing",
    "verification_mode": "prediction-first"
  },
  "human": {
    "subject_name": "Jane Doe",
    "birth_date": "1990-03-15",
    "birth_time_local": "14:30",
    "birth_location": "New York, NY",
    "chrono_imprint": {
      "local": "14:30",
      "utc": "19:30"
    },
    "origin_coordinates": {
      "label": "New York, 40.7128°N, 74.0060°W",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  },
  "measured_context": {
    "solar": {
      "solar_longitude_deg": 354.2,
      "solar_segment": "Late-Winter",
      "anchor_type": "none",
      "declination_deg": -2.1,
      "polarity": "waning",
      "sun_altitude_deg": 45,
      "sun_azimuth_deg": 210,
      "sunrise_local": "06:45",
      "sunset_local": "18:30",
      "day_length_minutes": 705
    },
    "lunar": {
      "phase": "Waning Gibbous",
      "illumination_pct": 80,
      "moon_altitude_deg": 30,
      "moon_azimuth_deg": 120
    },
    "environment": {
      "magnetic_field_index": null,
      "climate_signature": null,
      "sensory_field_conditions": []
    }
  },
  "derived_structure": {
    "archetype": "Fluxionis",
    "cosmic_twin": "accretion disk / spiral flow",
    "coherence_score": 0.85,
    "vector_zero": {
      "primary_wavelength_nm": "580",
      "secondary_wavelength_nm": "420",
      "axes": {
        "lateral": 0.7,
        "vertical": 0.6,
        "depth": 0.5
      }
    },
    "civilizational_function": {
      "structural_function": "This structure adapts to the field in real time. It flows with input, shifts shape, and keeps coherence through change rather than by resisting it. It contributes when the job is to meet the moment, not to stick to a fixed script.",
      "civilizational_role": "Systems absorb shock because someone can bend without breaking. This structure provides the flexibility that lets groups persist through change instead of snapping.",
      "contribution_environments": [
        "Roles that require constant adaptation to people or conditions",
        "Improvisation, facilitation, and real-time coordination",
        "Environments where requirements shift often and plans are provisional",
        "Places that reward meeting the moment over sticking to the plan"
      ],
      "friction_environments": [
        "Rigid hierarchies with fixed roles and scripts",
        "Roles that reward one unchanging position or a fixed brand",
        "Contexts that read flow as lack of commitment or spine"
      ]
    }
  },
  "agent_guidance": {
    "support_style": "Support through This structure adapts to the field in real time. It flows with input, shifts shape, and keeps coherence through change rather than by resisting it. It contributes when the job is to meet the moment, not to stick to a fixed script.",
    "best_response_format": "Lead with structure, then provide concise options with explicit tradeoffs.",
    "planning_mode": "prediction-first with checkpointed direction changes",
    "decision_support": {
      "preferred_option_count": 2,
      "needs_clear_tradeoffs": true,
      "avoid_excessive_branching": true
    },
    "interaction_rules": {
      "lead_with_structure": true,
      "name_the_frame_before_details": true,
      "chunk_complexity": true,
      "confirm_major_direction_changes": true
    },
    "agent_do": [
      "Roles that require constant adaptation to people or conditions",
      "Improvisation, facilitation, and real-time coordination",
      "Environments where requirements shift often and plans are provisional",
      "Places that reward meeting the moment over sticking to the plan"
    ],
    "agent_avoid": [
      "Rigid hierarchies with fixed roles and scripts",
      "Roles that reward one unchanging position or a fixed brand",
      "Contexts that read flow as lack of commitment or spine"
    ],
    "likely_friction_patterns": [
      "Rigid hierarchies with fixed roles and scripts",
      "Roles that reward one unchanging position or a fixed brand",
      "Contexts that read flow as lack of commitment or spine"
    ],
    "best_use_of_this_human": [
      "Roles that require constant adaptation to people or conditions",
      "Improvisation, facilitation, and real-time coordination",
      "Environments where requirements shift often and plans are provisional",
      "Places that reward meeting the moment over sticking to the plan"
    ]
  },
  "verification": {
    "status": "unverified",
    "ligs_alignment_score": null,
    "predicted_match_fields": [
      "support_style",
      "decision_support",
      "likely_friction_patterns",
      "best_use_of_this_human"
    ],
    "observed_match_fields": [],
    "observed_mismatch_fields": [],
    "agent_instruction": "Use this profile as an initial operating hypothesis. Update trust upward when observed behavior repeatedly matches the predicted pattern."
  },
  "agent_summary": {
    "one_line": "Fluxionis structure with strongest contribution in Roles that require constant adaptation to people or conditions.",
    "help_strategy": "Start with two structured options, state tradeoffs, and confirm direction before branching.",
    "failure_mode": "Rigid hierarchies with fixed roles and scripts",
    "alignment_test": "Check whether structured, role-aligned options increase response clarity and decision speed."
  }
}
```

---

## Field Descriptions

| Block | Field | Description |
|-------|-------|-------------|
| **registry** | `registry_id` | Deterministic ID from reportId + generated_at (e.g. `A1B-2C3-45`) |
| | `generated_at` | ISO timestamp when report was created |
| | `visibility` | Always `"agent-facing"` |
| | `verification_mode` | Always `"prediction-first"` |
| **human** | `subject_name` | From intake |
| | `birth_date`, `birth_time_local`, `birth_location` | Birth metadata |
| | `chrono_imprint` | `local` / `utc` time display when resolvable |
| | `origin_coordinates` | `label` (e.g. "Place, 40.7128°N, 74.0060°W"), `latitude`, `longitude` |
| **measured_context** | `solar` | Solar longitude, segment index, anchor type, declination, polarity, sun/moon coords, twilight, day length |
| | `lunar` | Phase, illumination %, altitude, azimuth |
| | `environment` | Magnetic field index, climate signature, sensory field conditions (may be null) |
| **derived_structure** | `archetype` | One of: Ignispectrum, Stabiliora, Duplicaris, Tenebris, Radiantis, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis. May be null. |
| | `cosmic_twin` | Physics phenomenon mapped to archetype (e.g. "accretion disk / spiral flow") |
| | `coherence_score` | 0–1 from Vector Zero; null if not present |
| | `vector_zero` | `primary_wavelength_nm`, `secondary_wavelength_nm`, `axes` (lateral, vertical, depth) |
| | `civilizational_function` | `structural_function`, `civilizational_role`, `contribution_environments`, `friction_environments` |
| **agent_guidance** | `support_style` | "Support through {structural_function}" or fallback |
| | `best_response_format` | Static: "Lead with structure, then provide concise options with explicit tradeoffs." |
| | `planning_mode` | Static: "prediction-first with checkpointed direction changes" |
| | `decision_support` | `preferred_option_count: 2`, `needs_clear_tradeoffs`, `avoid_excessive_branching` |
| | `interaction_rules` | Boolean flags for structure-first, frame-before-details, etc. |
| | `agent_do` | Top 4 contribution environments |
| | `agent_avoid` | Top 4 friction environments |
| | `likely_friction_patterns` | Same as agent_avoid |
| | `best_use_of_this_human` | Same as agent_do |
| **verification** | `status` | Always `"unverified"` — not a validated psychometric score |
| | `ligs_alignment_score` | Always null |
| | `observed_match_fields` | Populated when latest feedback is `confirmed` (mirrors `predicted_match_fields`); empty otherwise |
| | `observed_mismatch_fields` | Populated when latest feedback is `debunked` (mirrors `predicted_match_fields`); empty otherwise |
| | `last_feedback` | When feedback exists: `{ state, createdAt }` — `state` is `"confirmed"` \| `"partial"` \| `"debunked"`; omitted when no feedback |
| | `agent_instruction` | Static instruction to treat as hypothesis |
| **agent_summary** | `one_line` | One-line summary; archetype + contribution when available |
| | `help_strategy` | Static: "Start with two structured options, state tradeoffs, and confirm direction before branching." |
| | `failure_mode` | First friction environment or fallback |
| | `alignment_test` | Static: "Check whether structured, role-aligned options increase response clarity and decision speed." |

---

## Error Cases

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `MISSING_REPORT_ID` | `reportId` query param missing or empty |
| 401 | `MISSING_TOKEN` | No Bearer or `?token=` provided |
| 403 | `INVALID_TOKEN` | Token not found or invalid |
| 403 | `TOKEN_NOT_AUTHORIZED` | Token valid but `reportId` does not match entitlement |
| 404 | `PAID_WHOIS_REPORT_NOT_FOUND` | Stored report not found |
| 404 | `BEAUTY_PROFILE_NOT_FOUND` | Beauty profile not found |
| 404 | `BEAUTY_PROFILE_PARSE_FAILED` | Profile corrupted |
| 404 | `BEAUTY_PROFILE_SCHEMA_MISMATCH` | Profile schema mismatch |
| 500 | `PROFILE_LOAD_FAILED` | Other profile load error |

Error response shape:
```json
{
  "error": "INVALID_TOKEN"
}
```
or
```json
{
  "error": "PAID_WHOIS_REPORT_NOT_FOUND",
  "reportId": "abc-123"
}
```

---

## Rate Limits

**Current reality:** None. The WHOIS endpoint has no rate limit. Other routes (e.g. `beauty/create` 5/60s, `beauty/[reportId]` 20/60s) use in-memory rate limiting that resets on cold start.

---

## Integration Examples

### cURL

```bash
curl -X GET "https://ligs.io/api/agent/whois?reportId=YOUR_REPORT_ID" \
  -H "Authorization: Bearer wyh_YOUR_TOKEN"
```

### JavaScript fetch

```javascript
const reportId = "abc-123-def-456";
const token = "wyh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const res = await fetch(
  `https://ligs.io/api/agent/whois?reportId=${encodeURIComponent(reportId)}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

if (!res.ok) {
  const err = await res.json();
  throw new Error(err.error || res.statusText);
}

const record = await res.json();
console.log(record.derived_structure.archetype);
console.log(record.agent_guidance.support_style);
```

### Token recovery (verify-session)

If the human has the Stripe `session_id` from checkout, the entitlement token can be recovered:

```bash
curl -X GET "https://ligs.io/api/stripe/verify-session?session_id=cs_xxx"
```

Response when paid and webhook has run:
```json
{
  "paid": true,
  "reportId": "abc-123",
  "prePurchase": false,
  "entitlementToken": "wyh_xxx...",
  "executionKey": "exg_xxx..."
}
```

Poll until `entitlementToken` appears (webhook runs asynchronously after checkout).

---

## Optional: Feedback Endpoint

`POST /api/agent/feedback` — Log calibration outcome. Same Bearer token required.

**Request:**
```json
{
  "reportId": "abc-123",
  "state": "confirmed",
  "metrics": {},
  "notes": "optional"
}
```

**State:** `"confirmed"` | `"partial"` | `"debunked"`

**Response:** `{ "ok": true }`

**Effect on WHOIS:** Feedback affects the WHOIS payload. The next `GET /api/agent/whois` for that `reportId` will surface the latest feedback: `verification.observed_match_fields` and `verification.observed_mismatch_fields` are populated per state (`confirmed` → match; `debunked` → mismatch; `partial` → both empty), and `verification.last_feedback` includes `{ state, createdAt }`.

---

## Drift Check Endpoint

`POST /api/agent/drift-check` — Compare current human text to the stored WHOIS baseline. Same Bearer token required.

**Purpose:** Baseline comparison only. Answers: "Does this text appear aligned or off-pattern relative to the stored calibration?" Not diagnosis, therapy, recalibration, or identity evolution.

**Important:** The result is a **model-based comparison signal**, not a verified measurement. Use it to reduce uncertainty, not as ground truth.

### Prerequisites

- Valid `wyh_` entitlement token (from paid checkout for this `reportId`)
- `reportId` with an existing paid WHOIS record
- `OPENAI_API_KEY` set in the environment (drift analysis requires a live LLM call)

### Request

```json
{
  "reportId": "abc-123-def-456",
  "currentText": "The human's current message or written text to compare."
}
```

### Response (200)

```json
{
  "drift": true,
  "severity": "medium",
  "type": "tone",
  "confidence": 0.7,
  "summary": "Current text shows more fragmented structure than the baseline suggests; tone is denser than expected."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `drift` | boolean | `true` if text appears off-pattern; `false` if aligned or inconclusive |
| `severity` | string | `"low"` \| `"medium"` \| `"high"` — strength of mismatch when drift is true; always `"low"` when drift is false |
| `type` | string | `"tone"` \| `"structure"` \| `"emotional"` \| `"mixed"` — dominant mismatch type |
| `confidence` | number | 0–1, how confident the assessment is (conservative) |
| `summary` | string | Short explanation; no medical or diagnostic claims |

### cURL example

```bash
curl -X POST "https://ligs.io/api/agent/drift-check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wyh_YOUR_TOKEN" \
  -d '{"reportId":"YOUR_REPORT_ID","currentText":"The text to compare against the baseline."}'
```

### Error conditions

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 400 | `INVALID_BODY` | Body is not a JSON object |
| 400 | `MISSING_REPORT_ID` | `reportId` missing or empty |
| 400 | `MISSING_CURRENT_TEXT` | `currentText` missing or empty |
| 401 | `MISSING_TOKEN` | No `Authorization: Bearer <token>` header |
| 403 | `INVALID_TOKEN` | Token not found or invalid |
| 403 | `TOKEN_NOT_AUTHORIZED` | Token valid but `reportId` does not match entitlement |
| 404 | (from WHOIS) | WHOIS baseline not found for `reportId` |
| 500 | `DRIFT_ANALYSIS_FAILED` | LLM call failed |
| 500 | `DRIFT_ANALYSIS_EMPTY` | Model returned no content |
| 500 | `DRIFT_ANALYSIS_INVALID` | Model output could not be parsed |
| 502 | `WHOIS_FETCH_FAILED` | Internal WHOIS fetch failed |
| 502 | `BASELINE_LOAD_FAILED` | Network or other error loading baseline |
| 503 | `OPENAI_API_KEY_NOT_SET` | `OPENAI_API_KEY` not configured |
| 503 | (kill switch) | `LIGS_API_OFF=1` |

Error responses include `error`, `message`, and `reportId` (when applicable) for correlation.

### Limitations

- Uses an LLM; result is a model-based comparison signal, not a verified measurement
- No recalibration, state machine, or human override
- Baseline comes from WHOIS `agent_guidance`, `agent_summary`, and stored `emotional_snippet`
- Requires `OPENAI_API_KEY`; blocked when `LIGS_API_OFF=1`
