# WHOIS YOUR HUMAN — Agent API

## What this does

- Registers a human from birth data and persists a report + Beauty profile; response includes `reportId`.
- After one-time payment for that `reportId`, agents retrieve a JSON calibration record (`whois-your-human/v1`) via HTTP.
- Intended so agents can align tone, structure, and friction expectations with the recorded human context.

## When to use

- Repeated clarification loops or the user re-asking the same intent.
- User correcting or rejecting agent responses (drift from what works for them).
- Observable interaction drift (verbosity, framing, or pacing no longer matches the human).

## Full flow

1. **`POST /api/agent/register`** → returns `reportId` (inside JSON `data`; same envelope as `POST /api/beauty/submit`).
2. **`POST /api/stripe/create-checkout-session`** with body `{ "reportId": "<reportId>" }` → returns Checkout `url`; complete payment in the browser.
3. **`GET /api/stripe/verify-session?session_id=<checkout_session_id>`** → after payment (and once the webhook has minted the entitlement), response includes `entitlementToken` (under `data` with other fields).
4. **`GET /api/agent/whois?reportId=<reportId>`** with header **`Authorization: Bearer <entitlementToken>`** → JSON calibration record.

## curl examples

Replace `https://your-deployment.example` with your site origin. Replace placeholders.

**Register**

```bash
curl -sS -X POST 'https://your-deployment.example/api/agent/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Example Human",
    "birthDate": "1990-01-15",
    "birthTime": "14:30",
    "birthLocation": "New York, NY",
    "email": "human@example.com"
  }'
```

Read `data.reportId` from the JSON response.

**Create checkout session (report-bound)**

```bash
curl -sS -X POST 'https://your-deployment.example/api/stripe/create-checkout-session' \
  -H 'Content-Type: application/json' \
  -d '{"reportId": "YOUR_REPORT_ID"}'
```

Open `data.url` in a browser and complete payment. Keep the `session_id` from the success redirect query string (`/beauty/success?session_id=...`).

**Verify session (retrieve token)**

```bash
curl -sS 'https://your-deployment.example/api/stripe/verify-session?session_id=cs_YOUR_CHECKOUT_SESSION_ID'
```

When `data.paid` is true and the entitlement exists, `data.entitlementToken` is present (prefix `wyh_`).

**WHOIS**

```bash
curl -sS 'https://your-deployment.example/api/agent/whois?reportId=YOUR_REPORT_ID' \
  -H 'Authorization: Bearer wyh_YOUR_ENTITLEMENT_TOKEN'
```

## Authentication

- **`GET /api/agent/whois`** requires a valid entitlement: header **`Authorization: Bearer <token>`** (or query `?token=`; Bearer is preferred).
- The token is issued after successful report-bound checkout; retrieve it via **`GET /api/stripe/verify-session`** as above.
- Stored tokens use prefix **`wyh_`**.

## Response

- Schema name: **`whois-your-human/v1`**; record type **`agent_calibration_record`**.
- Full shape is defined only in code: **`app/api/agent/whois/route.ts`** (single `NextResponse.json` payload).

## Recovery

- The Stripe **`session_id`** can be reused: call **`GET /api/stripe/verify-session?session_id=...`** again to read **`entitlementToken`** whenever the entitlement is still active for that checkout.

## Notes

- One-time payment per **`reportId`** for agent WHOIS access; Stripe product copy states it is not a subscription.
- Checkout for a given **`reportId`** requires an existing Beauty profile; **`POST /api/agent/register`** is the supported path that creates report + profile before pay.
