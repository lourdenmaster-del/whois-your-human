# Report persistence: verification and alerting

## 1. Quick local verification (port 3006)

**Terminal 1 — start dev server (foreground)**

```bash
rm -rf .next
npm run dev -- -p 3006
```

**Terminal 2 — run verify script**

```bash
node scripts/verify-report-persistence.mjs http://localhost:3006
```

**Optional — capture logs and grep for correlation**

```bash
npm run dev -- -p 3006 2>&1 | tee dev.log &
node scripts/verify-report-persistence.mjs http://localhost:3006
grep -E "saveReportAndConfirm ok|report_blob_written|report_blob_write_failed" dev.log -n -C 2
```

## 2. Run verify flow (dry-run + GET) and watch logs

With the dev server running (`npm run dev -- -p 3006`), run the verify flow and watch engine logs.

**Option A — script**

```bash
node scripts/verify-report-persistence.mjs http://localhost:3006
```

**Option B — curl dry-run + GET**

```bash
# 1) Generate (dry run), capture reportId
REPORT_ID=$(curl -s -X POST http://localhost:3006/api/engine/generate \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","birthDate":"1990-01-15","birthTime":"14:30","birthLocation":"NY","email":"t@t.com","dryRun":true}' \
  | jq -r '.data.reportId')

# 2) Read report by that ID (confirm no 404 / REPORT_NOT_FOUND)
curl -s "http://localhost:3006/api/report/$REPORT_ID" | jq .
```

**What to watch in engine logs**

- Look for **`saveReportAndConfirm ok`** with `{ requestId, reportId }` after each successful generate.
- Correlate that `reportId` with any **404** / **`REPORT_NOT_FOUND`** from `GET /api/report/{reportId}`.
- If a **gap** appears (we logged ok for a `reportId` but that same `reportId` returns 404 from the report API):
  1. **Blob token/permissions** — confirm `BLOB_READ_WRITE_TOKEN` scope and that report-store write/head/fetch succeed.
  2. **Key format** — engine and GET use the same key via `reportBlobPathname(reportId)` (e.g. `ligs-reports/{reportId}.json`); no mismatch.
  3. **Read-after-write** — `saveReportAndConfirm` already does a short read-after-write retry (see `VERIFY_READ_MAX_RETRIES` / `VERIFY_READ_DELAY_MS` in report-store) for eventual consistency; if gaps persist, consider increasing delays or retries.
  4. **Alerting** — ensure alerting on **`REPORT_NOT_FOUND`** (log or 404 + `code: "REPORT_NOT_FOUND"`) is enabled so persistence gaps are caught quickly (see §3).

## 3. Enable alerting on REPORT_NOT_FOUND

To catch persistence gaps and missing reports in production:

### Option A: Vercel (log drain or dashboard)

- In **Vercel → Project → Logs**, filter by:
  - **Message contains:** `REPORT_NOT_FOUND`
- Configure a **log drain** (e.g. to Datadog, Axiom, Better Stack) and add an alert rule:
  - Trigger when a log line matches `REPORT_NOT_FOUND` (or `"code":"REPORT_NOT_FOUND"` in response bodies if you log responses).

### Option B: HTTP response code

- GET `/api/report/[reportId]` returns **404** with body `{ "error": "Report not found", "code": "REPORT_NOT_FOUND" }`.
- If you use an API gateway or monitoring that inspects responses, alert when:
  - Status is **404** and body contains **`REPORT_NOT_FOUND`**.

### Option C: Structured log query (generic)

- Engine and report routes use `lib/log` and output JSON lines.
- Alert when:
  - `message == "REPORT_NOT_FOUND"` (report GET 404), or
  - `message == "report_blob_write_failed"` (Blob write failed), or
  - `message == "Report storage failed; not returning reportId"` (engine write failed).

**Suggested alert message:** “Report persistence gap: REPORT_NOT_FOUND or engine storage failure. Check report-store and Blob/config.”

## 4. Alerts and metrics

### Alert 1: Report Write Failure

| Field | Value |
|-------|-------|
| **Trigger** | Log contains `report_blob_write_failed` |
| **Payload** | `{ requestId, reportId, error, timestamp }` |
| **Severity** | P1 |

### Alert 2: Report Read Missing After Write

| Field | Value |
|-------|-------|
| **Trigger** | `REPORT_NOT_FOUND` and no `report_blob_written` for same `reportId` in last 60s |
| **Payload** | `{ requestId, reportId, blobKey, timestamp }` |
| **Severity** | P1 |

### Metric: reports.persistence.success_rate

| Field | Value |
|-------|-------|
| **Definition** | Ratio of `report_blob_written` to `saveReportAndConfirm ok` over 5m |
| **Alert** | If &lt; 99.5% |

### Datadog monitor templates

Paste into Datadog UI as log alert templates:

**A: Write failure monitor**

```json
{
  "name": "Report Blob Write Failed",
  "type": "log alert",
  "query": "logs(\"report_blob_write_failed\").index(\"*\").rollup(\"count\").last(\"5m\") > 0",
  "message": "P1: report_blob_write_failed detected. {{logs.sample}} \nRunbook: docs/REPORT-PERSISTENCE-ALERTING.md",
  "options": { "require_full_window": true }
}
```

**B: REPORT_NOT_FOUND monitor**

```json
{
  "name": "Report Read Missing (REPORT_NOT_FOUND)",
  "type": "log alert",
  "query": "logs(\"REPORT_NOT_FOUND\").index(\"*\").rollup(\"count\").last(\"5m\") > 0",
  "message": "REPORT_NOT_FOUND detected. Check provider UI for blobKey and recent write logs. Runbook: docs/REPORT-PERSISTENCE-ALERTING.md",
  "options": { "require_full_window": true }
}
```

**C: No recent writes monitor**

```json
{
  "name": "No Recent Report Blob Writes",
  "type": "log alert",
  "query": "logs(\"report_blob_written\").index(\"*\").rollup(\"count\").last(\"5m\") < 1",
  "message": "No report_blob_written logs in the last 5m. If REPORT_NOT_FOUND is present, this indicates write failures or token/permission issues.",
  "options": { "require_full_window": true }
}
```

## 5. Engine invariant

The engine **must never return success** until `saveReportAndConfirm` verifies the write. If the write fails, it returns **503** and does **not** return a `reportId`. Success responses only occur after the log line **`saveReportAndConfirm ok`** `{ requestId, reportId }`.

## 6. In-memory vs Blob and troubleshooting

**In-memory storage is per process.** Local dev may run multiple Node processes; writes to the in-memory store are not visible to other processes. For reliable persistence across instances, set `BLOB_READ_WRITE_TOKEN` and restart the server so the app uses Vercel Blob (or your configured provider).

If you see `REPORT_NOT_FOUND` while `saveReportAndConfirm ok` is present in logs, check:

1. **Write log** — Does the engine log include `report_blob_written` with `blobKey`? If not, the write may have used in-memory storage (Blob token missing) or the log was not emitted.
2. **Provider UI** — In the Blob storage UI, confirm the object exists at `ligs-reports/{reportId}.json` for the reported `reportId`.
3. **Token permissions** — Ensure `BLOB_READ_WRITE_TOKEN` has read and write scope. Rotate tokens if they were exposed.

## 7. Quick checklist

- [ ] Run verify flow (dry-run + GET): `node scripts/verify-report-persistence.mjs http://localhost:3006` or the curl flow above — **with dev server up** (`npm run dev`).
- [ ] Watch engine logs for **`saveReportAndConfirm ok`** `{ requestId, reportId }`; correlate that `reportId` with any 404s from GET report.
- [ ] If a gap appears: check Blob token/permissions, key format (`reportBlobPathname`), and that read-after-write retry is in place; enable alerting on **`REPORT_NOT_FOUND`** (see §3).
- [ ] For local dev: use `BLOB_READ_WRITE_TOKEN` so persistence works across processes; see §6 for in-memory vs Blob and troubleshooting.
