# Verify ligs.io Deployment (Stance Layer)

Production returns 404 for `/api/agent/stance` and shows static zeros on the landing. This doc helps verify and fix the deployment.

## Quick verification

```bash
# 1. Get Vercel token: https://vercel.com/account/tokens
# 2. Run verification script
VERCEL_TOKEN=your_token node scripts/vercel-deployment-verify.mjs
```

The script reports:
- Which GitHub repo and branch the project deploys from
- Latest production deployment commit
- Whether 9db49d0 (stance layer) is live

## Manual checks (Vercel Dashboard)

1. **Project → Settings → Git**
   - Connected repository: should be `lourdenmaster-del/nextjs-boilerplate`
   - Production Branch: should be `main`
   - If wrong: disconnect and reconnect to nextjs-boilerplate, set Production Branch to main

2. **Project → Deployments**
   - Latest production deployment: check "Commit" — should include `9db49d0` or later
   - If not: click ⋮ → Redeploy

## If repo/branch is correct

If the project is correctly pointed at nextjs-boilerplate `main` but production still shows old code:

1. **Force redeploy**: Deployments → ⋮ on latest → Redeploy
2. **Check build logs**: Ensure build completed successfully (no errors)
3. **Propagation**: Vercel may take 1–2 minutes to serve the new build

## Production verification

After fixing, verify:

```bash
# GET stance counts
curl -s https://ligs.io/api/agent/stance

# Expected: {"endorse":0,"decline":0,"abstain":0,"schema":"whois-your-human/stance/v1"}

# POST stance (optional)
curl -s -X POST https://ligs.io/api/agent/stance \
  -H "Content-Type: application/json" \
  -d '{"stance":"abstain"}'

# Landing: https://ligs.io/whois-your-human — AI EVALUATION SIGNAL should show live counts
```
