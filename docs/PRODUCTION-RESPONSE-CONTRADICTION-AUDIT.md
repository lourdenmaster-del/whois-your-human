# Production Response Contradiction Audit — confirmationSent vs confirmationReason

**Observed:** `confirmationSent: true`, `confirmationReason: "provider_error"` from POST /api/waitlist. Read-only audit; no code changed.

---

## A. All branches that assign confirmationSent / confirmationReason

**File:** `app/api/waitlist/route.ts`

| Branch | confirmationSent | confirmationReason | Source |
|--------|------------------|--------------------|--------|
| 503 blob not configured | hardcoded `false` | `"blob_not_configured"` | Literals |
| Duplicate, no entry | hardcoded `false` | `"duplicate_skipped"` | Literals |
| Duplicate, within cooldown | hardcoded `false` | `"duplicate_recently_sent"` | Literals |
| **Duplicate, resend attempt** | `dupConfirmationSent` | `dupConfirmationReason` | try: `sendResult.sent`, `sendResult.reason` (or if sent: `"duplicate_resent"`); catch: only `dupConfirmationReason = "provider_error"` (dupConfirmationSent **not** updated) |
| **New signup** | `confirmationSent` | `confirmationReason` | try: `sendResult.sent`, `sendResult.reason`; catch: only `confirmationReason = "provider_error"` (confirmationSent **not** updated) |

**Helper:** `lib/email-waitlist-confirmation.ts` — `sendWaitlistConfirmation()` returns only:
- `{ sent: false, reason: "provider_key_missing" }`
- `{ sent: false, reason: "provider_error" }` (fetch throw)
- `{ sent: false, reason: "provider_rejected" }` (non-2xx)
- `{ sent: true, reason: "sent" }`

The helper **never** returns `{ sent: true, reason: "provider_error" }`.

---

## B. Branches where confirmationReason can be "provider_error"

1. **New signup (lines 309–323):**  
   `try { sendResult = await sendWaitlistConfirmation(...); confirmationSent = sendResult.sent; confirmationReason = sendResult.reason; if (sendResult.sent) await recordConfirmationSent(email); } catch (err) { confirmationReason = "provider_error"; }`  
   So `confirmationReason` becomes `"provider_error"` only in the **catch** (when `sendWaitlistConfirmation` throws or `recordConfirmationSent(email)` throws).

2. **Duplicate resend (lines 256–271):**  
   Same pattern: try runs send then optionally `recordConfirmationSent(email)`; catch sets only `dupConfirmationReason = "provider_error"`.

In both branches, **confirmationSent** (or dupConfirmationSent) is set in the try from `sendResult.sent`. In the catch, **only** the reason is set to `"provider_error"`; the sent flag is **not** set to `false`.

---

## C. Source of confirmationSent in those branches

- **Try block (no throw):**  
  `confirmationSent = sendResult.sent` (new signup); `dupConfirmationSent = sendResult.sent` (duplicate). So when the provider returns `{ sent: true, reason: "sent" }`, the sent flag becomes `true`.
- **Catch block:**  
  Only `confirmationReason = "provider_error"` (and in duplicate `dupConfirmationReason = "provider_error"`). **confirmationSent / dupConfirmationSent are not updated**, so they keep whatever was set in the try.

So if:
1. `sendWaitlistConfirmation` returns `{ sent: true, reason: "sent" }`,
2. `confirmationSent` is set to `true`,
3. then `recordConfirmationSent(email)` throws (e.g. Blob get/put failure),

the catch runs and sets only `confirmationReason = "provider_error"`. The response is then **confirmationSent: true**, **confirmationReason: "provider_error"**.

---

## D. Can any branch return confirmationSent: true and confirmationReason: "provider_error"?

**Yes.** Both the **new signup** and **duplicate resend** paths can:

1. In try: `sendWaitlistConfirmation` succeeds → `confirmationSent = true`, `confirmationReason = "sent"`.
2. Then `recordConfirmationSent(email)` throws (e.g. Blob error).
3. Catch: `confirmationReason = "provider_error"` only; sent flag stays `true`.
4. Return: `confirmationSent: true`, `confirmationReason: "provider_error"`.

So the contradiction is in the **route**, not in the send helper.

---

## E. Does the provider layer ever return an inconsistent object?

**No.** In `lib/email-waitlist-confirmation.ts`, every return is one of:

- `{ sent: false, reason: "provider_key_missing" }`
- `{ sent: false, reason: "provider_error" }`
- `{ sent: false, reason: "provider_rejected" }`
- `{ sent: true, reason: "sent" }`

There is no path that returns `{ sent: true, reason: "provider_error" }`. The inconsistency is introduced only by the route’s catch block not resetting the sent flag.

---

## F. Exact contradictory branch and minimum fix

**Contradictory branches:**

1. **New signup** — `app/api/waitlist/route.ts` lines 309–323: catch sets `confirmationReason = "provider_error"` but does not set `confirmationSent = false`.
2. **Duplicate resend** — same file lines 256–271: catch sets `dupConfirmationReason = "provider_error"` but does not set `dupConfirmationSent = false`.

**Minimum fix:** In both catch blocks, set the sent flag to `false` when treating the failure as a provider error:

- **New signup catch (after line 316):** add `confirmationSent = false;`
- **Duplicate resend catch (after line 264):** add `dupConfirmationSent = false;`

Then any throw (whether from `sendWaitlistConfirmation` or from `recordConfirmationSent`) yields `confirmationSent: false` and `confirmationReason: "provider_error"`, and the response is no longer contradictory.
