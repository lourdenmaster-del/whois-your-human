# WHOIS Agent Flow — Live Test Runbook

**Purpose:** Verify the paid WHOIS agent flow end-to-end. Use for local/dev validation and production smoke checks.

---

## Prerequisites

| Requirement | Purpose |
|-------------|---------|
| `BLOB_READ_WRITE_TOKEN` | Report + Beauty Profile persistence; entitlement + feedback storage |
| `OPENAI_API_KEY` | Drift-check LLM call |
| `STRIPE_SECRET_KEY` (sk_test_) | Checkout + verify-session (full paid flow only) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification (full paid flow only) |
| `RESEND_API_KEY` or `SENDGRID_API_KEY` | Post-purchase email (full paid flow only) |
| `NEXT_PUBLIC_WAITLIST_ONLY=0` | Re-enable purchase flow in UI |
| Dev server running | `npm run dev` |

---

## Path A: Agent Flow Without Stripe (Local)

Use when you want to verify WHOIS, feedback, and drift-check without a real checkout.

### 1. Start dev server

```bash
npm run dev
```

### 2. Run verification script

```bash
npm run verify:agent-flow http://localhost:3000
```

**Expected output:**
```
1. dry-run OK — reportId: <uuid>
2. mint-agent-token OK — token: wyh_...
3. GET whois OK — last_feedback: absent
4. POST feedback OK — state: confirmed
5. GET whois (after feedback) OK — last_feedback: confirmed
   observed_match_fields: 4 items
6. POST drift-check OK — drift: false severity: low
Agent flow verification complete.
```

### 3. Manual cURL checks (optional)

**Mint token for existing reportId:**
```bash
curl -X POST http://localhost:3000/api/dev/mint-agent-token \
  -H "Content-Type: application/json" \
  -d '{"reportId":"YOUR_REPORT_ID"}'
```

**WHOIS:**
```bash
curl -X GET "http://localhost:3000/api/agent/whois?reportId=YOUR_REPORT_ID" \
  -H "Authorization: Bearer wyh_YOUR_TOKEN"
```

**Feedback:**
```bash
curl -X POST http://localhost:3000/api/agent/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wyh_YOUR_TOKEN" \
  -d '{"reportId":"YOUR_REPORT_ID","state":"confirmed","metrics":{}}'
```

**Drift-check:**
```bash
curl -X POST http://localhost:3000/api/agent/drift-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wyh_YOUR_TOKEN" \
  -d '{"reportId":"YOUR_REPORT_ID","currentText":"Sample text to compare."}'
```

---

## Path B: Full Paid Flow (Stripe + Webhook + Email)

Use when verifying checkout → webhook → email → verify-session → token recovery.

### 1. Stripe CLI for webhook forwarding

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Note the webhook signing secret (e.g. `whsec_...`) and set `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 2. Create report and checkout

1. Open `/origin` (or `/beauty` if WAITLIST_ONLY=0)
2. Complete intake → submit
3. Proceed to Stripe Checkout (test card: `4242 4242 4242 4242`)
4. After payment, note the redirect URL: `/beauty/success?session_id=cs_xxx`

### 3. Verify-session (token recovery)

```bash
curl -X GET "http://localhost:3000/api/stripe/verify-session?session_id=cs_YOUR_SESSION_ID"
```

**Expected (after webhook has run):**
```json
{
  "status": "ok",
  "data": {
    "paid": true,
    "reportId": "...",
    "entitlementToken": "wyh_...",
    "executionKey": "exg_..."
  }
}
```

Poll until `entitlementToken` appears (webhook runs asynchronously).

### 4. Webhook verification

Check server logs for:
- `webhook_checkout_start`
- `agent_entitlement_minted`
- `webhook_post_purchase_email_sent` (if email provider configured)

### 5. Email verification

If `RESEND_API_KEY` or `SENDGRID_API_KEY` is set, the purchaser should receive the post-purchase email. Check inbox (and spam).

### 6. Agent flow with recovered token

Use the `entitlementToken` from verify-session:

```bash
TOKEN="wyh_..."   # from verify-session
REPORT_ID="..."   # from verify-session or checkout metadata

curl -X GET "http://localhost:3000/api/agent/whois?reportId=$REPORT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Reference

| Error | Cause |
|-------|-------|
| `BEAUTY_PROFILE_NOT_FOUND` (mint) | Run dry-run first; Blob not configured |
| `REPORT_NOT_FOUND` (mint) | Invalid reportId |
| `INVALID_TOKEN` (whois/feedback/drift) | Token not found or revoked |
| `TOKEN_NOT_AUTHORIZED` | Token valid but reportId mismatch |
| `OPENAI_API_KEY_NOT_SET` (drift) | Drift-check requires LLM |
| `STRIPE_NOT_CONFIGURED` | Stripe keys missing |
| `403 DEV_ONLY` (mint) | mint-agent-token is dev-only |

---

## What Each Path Verifies

| Step | Path A (no Stripe) | Path B (full paid) |
|------|--------------------|--------------------|
| Report + profile creation | dry-run | Checkout → engine → E.V.E. |
| Entitlement mint | dev mint-agent-token | Webhook |
| Token recovery | N/A | verify-session |
| Post-purchase email | N/A | Webhook → send-beauty-profile |
| GET whois | ✓ | ✓ |
| POST feedback | ✓ | ✓ |
| Feedback → whois reflection | ✓ | ✓ |
| POST drift-check | ✓ | ✓ |
