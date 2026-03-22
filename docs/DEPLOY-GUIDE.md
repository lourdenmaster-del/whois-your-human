# LIGS WHOIS — Deploy Guide (Non-Technical)

Step-by-step guide to go from "local success" to "live on production."

---

## TASK 1 — REVOKE EXPOSED TOKENS ✅ DONE

**Status:** All 6 entitlements have been revoked (5 were active, 1 was already revoked).

**Command used:**
```bash
node scripts/revoke-exposed-tokens.mjs --report-id 08ee6fd5-22e8-468d-a2f9-e0c5fcbd2f11 --report-id 0975388f-20c3-432f-ac20-35d6e954f83b --report-id 422af211-fbe8-436f-85aa-8ca0f8c89151 --report-id 4719de73-e616-4a87-8809-fb2ac4ded078 --report-id 87bde9b6-5801-4772-a620-673227beee3b
```

**Result:** Each line showed `revoked reportId=...`

**If you need to revoke again later:**
1. List entitlements: `node scripts/revoke-exposed-tokens.mjs --list`
2. Revoke by reportId: `node scripts/revoke-exposed-tokens.mjs --report-id <id>`
3. Or by token: `node scripts/revoke-exposed-tokens.mjs --token wyh_xxxxx...`

---

## TASK 2 — PREP FOR DEPLOY

### 2.1 Check Debug Flags

**In Vercel → Project → Settings → Environment Variables:**

Make sure these are **NOT set** (or set to empty / 0) in Production:

| Variable | Must be |
|----------|---------|
| `NEXT_PUBLIC_FAKE_PAY` | Not set, or `0` |
| `NEXT_PUBLIC_DRY_RUN` | Not set, or `0` |
| `DEBUG_PROMPT_AUDIT` | Not set |
| `DEBUG_REVOKE` | Not set |
| `DEBUG_*` (any) | Not set |

**Why:** These bypass Stripe or skip real generation. You want real payment and real reports in production.

### 2.2 No localhost in Production

**Check:** `NEXT_PUBLIC_SITE_URL` must be your **live site URL** in Production (e.g. `https://ligs.io` or `https://your-project.vercel.app`).

**Where:** Vercel → Project → Settings → Environment Variables → `NEXT_PUBLIC_SITE_URL`

### 2.3 Required Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production**:

| Variable | What it is | Where to get it |
|----------|------------|------------------|
| `STRIPE_SECRET_KEY` | Stripe API key for charges | Stripe Dashboard → Developers → API keys → Secret key (starts with `sk_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | After you add the webhook (Task 5) — Stripe gives you `whsec_...` |
| `OPENAI_API_KEY` | OpenAI key for report generation | platform.openai.com → API keys |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | Vercel Dashboard → Storage → Blob → Create store → Copy token |

**Where to paste in Vercel:**
1. Go to your project on vercel.com
2. Click **Settings** → **Environment Variables**
3. Add each name (e.g. `STRIPE_SECRET_KEY`) and its value
4. Select **Production** (and Preview if you want)
5. Save

---

## TASK 3 — GIT PUSH (One Step at a Time)

### Step 1: Check git status

In your terminal, run:
```bash
git status
```

You’ll see a list of modified and new files.

### Step 2: Add files

Run:
```bash
git add -A
```

This stages all changes.

### Step 3: Commit

Run:
```bash
git commit -m "Pre-deploy: revoke exposed tokens, add deploy guide"
```

### Step 4: Push

Run:
```bash
git push
```

If you use a main branch:
```bash
git push origin main
```

---

## TASK 4 — DEPLOY (Vercel)

### 4.1 Where to add env vars

1. Go to **vercel.com** and open your project.
2. Click **Settings** (top menu).
3. Click **Environment Variables** (left sidebar).
4. Add each variable: **Name** = variable name, **Value** = your secret.
5. Choose **Production** (and optionally Preview).
6. Click **Save**.

### 4.2 How to trigger deploy

- **Automatic:** Push to your main branch. Vercel deploys automatically.
- **Manual:** Project → **Deployments** → three dots on latest → **Redeploy**.

### 4.3 Confirm deploy succeeded

1. Go to **Deployments**.
2. Latest deployment should show a green check.
3. Click it to open the live URL.
4. Open the site in your browser — it should load without errors.

---

## TASK 5 — STRIPE WEBHOOK

### 5.1 Where to go

1. Go to **dashboard.stripe.com**
2. Click **Developers** (top right).
3. Click **Webhooks**.

### 5.2 URL to enter

Use this URL (replace `your-domain` with your real domain):

```
https://your-domain.com/api/stripe/webhook
```

Example: `https://ligs.io/api/stripe/webhook` or `https://your-app.vercel.app/api/stripe/webhook`

### 5.3 Event to select

- Click **“Select events”** or **“Listen to”**.
- Choose: **`checkout.session.completed`**
- Save.

### 5.4 How to get the webhook secret

1. After you add the webhook, Stripe shows a **Signing secret**.
2. Click **Reveal** (or **Click to reveal**).
3. It looks like `whsec_xxxxxxxxxxxx`.

### 5.5 Where to paste it

1. In Vercel → **Settings** → **Environment Variables**
2. Add: `STRIPE_WEBHOOK_SECRET` = `whsec_xxxxx` (paste the full value)
3. Select **Production**
4. Save.
5. **Redeploy** so the new env var is used.

---

## TASK 6 — FINAL LIVE TEST

### Step 1: Open the site

Open your live URL (e.g. `https://ligs.io` or your Vercel domain).

### Step 2: Enter data

Fill in the form:

- Name
- Birth date (e.g. 1990-01-15)
- Birth time (e.g. 14:30)
- Birth location (e.g. New York, NY)
- Email

Click **Submit** or **Continue**.

### Step 3: Mint

You’ll get a preview or report. Click **Mint registry record** or the button that starts checkout.

### Step 4: Pay $0.99

1. Stripe checkout opens.
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry (e.g. 12/34), any CVC (e.g. 123), any postal code.
4. Complete payment.

### Step 5: What you should see

**SUCCESS = you end up on the success page with:**

- Message that the purchase is complete
- A section showing your **entitlement token** (starts with `wyh_`)
- Instructions or copy button for the token
- Link to view the report or return home

**If something fails:**

- 404 → Check that deploy finished and URL is correct
- Checkout error → Check `STRIPE_SECRET_KEY` and webhook
- Token not shown → Check Stripe webhook is configured and `STRIPE_WEBHOOK_SECRET` is set
- No report → Check `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN`

---

## Summary Checklist

- [ ] Tokens revoked
- [ ] Debug flags off (`NEXT_PUBLIC_FAKE_PAY`, `NEXT_PUBLIC_DRY_RUN`, `DEBUG_*`)
- [ ] `NEXT_PUBLIC_SITE_URL` = live domain
- [ ] Required env vars set in Vercel
- [ ] Git pushed
- [ ] Deploy succeeded
- [ ] Stripe webhook added and secret set
- [ ] Live test: form → mint → pay → success + token shown
