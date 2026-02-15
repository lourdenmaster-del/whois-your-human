# List Vercel deployments via API

This project’s Vercel IDs (from `.vercel/project.json`):

- **Project:** `ligs-frontend`
- **projectId:** `prj_SlTmSjvlWeynKLd1ijFVupKhtBIV`
- **teamId:** `team_QpDVRMI50nzdlFZ2A6BO2FpW`

## Request

**GET** `https://api.vercel.com/v6/deployments`

Query parameters:

| Parameter   | Value |
|------------|--------|
| `projectId`| `prj_SlTmSjvlWeynKLd1ijFVupKhtBIV` |
| `teamId`   | `team_QpDVRMI50nzdlFZ2A6BO2FpW` |
| `limit`    | `100` (optional; default 20) |

**Headers:**

- `Authorization: Bearer <VERCEL_TOKEN>`

Create a token: [Vercel Account → Tokens](https://vercel.com/account/tokens) (or Team Settings → Tokens).

## Example (curl)

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_SlTmSjvlWeynKLd1ijFVupKhtBIV&teamId=team_QpDVRMI50nzdlFZ2A6BO2FpW&limit=100"
```

## Response fields (per deployment)

| Field | Description |
|-------|-------------|
| `uid` | Deployment ID (e.g. `dpl_xxxx`) |
| `created` or `createdAt` | Timestamp (ms) when the deployment was created |
| `meta` | Git metadata; commit hash is typically `meta.githubCommitSha` or `meta.gitSource.sha` |
| `url` | Deployment URL (null if not ready) |
| `state` | e.g. `READY`, `BUILDING`, `ERROR` |
| `target` | `production` or `staging` (if set) |

To show **commit hash, deployment ID, and timestamp** for each deployment, use the JSON path:

- Commit: `deployment.meta.githubCommitSha` or from `meta.gitSource.sha` (depending on API version)
- Deployment ID: `deployment.uid`
- Timestamp: `deployment.created` or `deployment.createdAt` (convert from ms to ISO if needed)

## Pagination

Response includes `pagination.next` (timestamp). To fetch the next page, add `?until=<pagination.next>` to a subsequent request.
