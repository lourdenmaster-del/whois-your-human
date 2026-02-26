# Vercel Preview LIVE Test Environment

Use a Vercel **Preview** deployment to run a full-cylinders LIVE test (6 image gens + keeper manifest) without affecting production.

## 1. Branch

Create and push the `beauty/golden-run` branch (or use an existing Preview-triggering branch):

```bash
git checkout -b beauty/golden-run
# ... make changes ...
git add -A
git commit -m "chore: Vercel Preview LIVE test setup"
git push -u origin beauty/golden-run
```

## 2. Preview Environment Variables (Vercel)

In **Vercel Dashboard** → Project → **Settings** → **Environment Variables**, add or confirm these for **Preview** only (not Production):

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | *(your key)* | Required for report + E.V.E. + images |
| `BLOB_READ_WRITE_TOKEN` | *(your token)* | Required for reports, profiles, images, keepers |
| `ALLOW_EXTERNAL_WRITES` | `true` | **Must be exact string** for image/generate to call DALL-E |
| `DRY_RUN` | *(unset)* | Leave empty or delete. Must NOT be `1` or `true` |
| `NEXT_PUBLIC_TEST_MODE` | *(unset)* | Leave empty or delete |
| `NEXT_PUBLIC_SHOW_DEV_CONTROLS` | `1` | Shows LIVE TEST RUN button on Preview when `?dev=1` |
| `ALLOW_PREVIEW_LIVE_TEST` | `1` | Allows `/api/dev/preflight`, `/api/dev/beauty-live-once`, `/api/dev/verify-report` on Preview |

**Important:** Apply these only to the **Preview** environment (not Production), except for shared secrets like `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN` which you may already have on Production.

## 3. Deploy

- Push to the branch or open a PR. Vercel will create a Preview deployment.
- The Preview URL is shown in the Vercel dashboard, PR comment, or deployment log (e.g. `https://your-project-abc123-your-team.vercel.app`).

## 4. Run LIVE Test

1. Open: `https://<your-preview-url>/beauty?dev=1`
2. Scroll to the amber **"Dev: Live pipeline test"** section.
3. Click **"LIVE TEST RUN (save to blob)"**.
4. Wait for Preflight → Generating → Verifying → Done. You will be redirected to `/beauty/view?reportId=<reportId>`.

## 5. Confirm Full Cylinders

- **6 image generations:** 3 signatures + marketing_background + logo_mark + share_card
- **Keeper manifest:** Written to `ligs-keepers/{reportId}.json` on success

Check Vercel logs for: `keeper_manifest_saved`, `imageCallsAttempted: 6`, `llmCallsAttempted: 2` (report + E.V.E.).

## 6. URLs After Run

- **View report:**  
  `https://<your-preview-url>/beauty/view?reportId=<reportId>`

- **Keeper hero on landing:**  
  `https://<your-preview-url>/beauty?keeperReportId=<reportId>`

Replace `<reportId>` with the value returned from the LIVE test run (e.g. `r-abc123...`).
