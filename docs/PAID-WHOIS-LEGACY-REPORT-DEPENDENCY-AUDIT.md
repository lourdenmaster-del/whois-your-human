# Paid WHOIS vs Legacy 14-Section Report — Read-Only Dependency Audit

**Date:** 2026-03-15  
**Scope:** Determine whether the paid WHOIS flow still depends on the legacy 14-section full report generator and its validators. No code modified.

---

## 1. When `buildPaidWhoisReport(...)` runs, where do its fields come from?

**Function:** `buildPaidWhoisReport` in `lib/free-whois-report.ts` (lines 371–525).

**Data sources:**

| Source | Fields / usage |
|--------|-----------------|
| **BeautyProfileV1** (`profile`) | `subjectName`, `birthDate`, `birthTime`, `birthLocation`, `originCoordinatesDisplay`, `light_signature.raw_signal` → `lightSignatureDisplay`, `vector_zero` (if storedReport has no vector_zero), `solarSeasonProfile` → solar segment, archetype, sun longitude, anchor type, polarity, `dominantArchetype`. |
| **StoredReport** (`getReport(reportId)`) | `full_report` (string), `vector_zero` (preferred over profile for addendum), `createdAt` (for registry id seed). |
| **Section parsing (legacy 14-section)** | `parseSectionBody(fullReport, 1)`, `(2)`, `(6)`, `(7)`, `(11)` and `parseSectionRange(fullReport, 12, 14)`, `parseSectionRange(fullReport, 2, 5)` in `lib/free-whois-report.ts` (lines 489–495). Used to set: `identityArchitectureBody` (s1+s2), `fieldConditionsBody` (s2–5), `cosmicTwinBody` (s11), `archetypeExpressionBody` (s6+s7), `interpretiveNotesBody` (s12–14). |
| **Fallback/composed helpers** | `composeCosmicTwin()` when s11 is null; `composeArchetypeSummary()` when s6/s7 are null; `approximateSunLongitudeFromDate()` when `solarSeasonProfile` is missing but `birthDateStr` is set; `getCosmicAnalogue()`, `getSolarSeasonByIndex()`, `resolveChronoImprintDisplay()`, `formatVectorZeroThreeVoice()`, `formatOriginCoordinatesDisplay()`. |

**Summary:** Base WHOIS fields (name, birth, registry id, solar segment, archetype, cosmic twin, chrono, origin coords, light signature) come from **profile** and **storedReport** (including `vector_zero`). Optional **paid prose bodies** come from **section parsing** of `full_report` (sections 1, 2, 2–5, 6, 7, 11, 12–14); where parsing returns null, **fallbacks** (compose helpers or undefined) are used. So the legacy 14-section format is used only for these optional bodies; it is not required for the function to run or for the report to render.

---

## 2. Is a valid legacy full_report with all 14 sections currently REQUIRED for paid WHOIS to succeed?

**Short answer: No.** A report that **passes** the legacy validators (INITIATION anchor, citation keys, ORACLE, etc.) is **not** required for `buildPaidWhoisReport` to succeed.

**What is required:**

- **Stored report exists:** `getReport(reportId)` must return a `StoredReport` (with `full_report` and optionally `vector_zero`). If `full_report` is empty or minimal, section parsing returns null for those sections; fallbacks or undefined are used.
- **Profile exists:** `loadBeautyProfileV1(reportId)` must return a `BeautyProfileV1`.

**Why validators look required in practice:**

- **Live report path:** In `app/api/engine/generate/route.ts`, when `dryRun` is **false**, the flow is: generate report → inject deterministic blocks → run `validateReport()` (and related checks, e.g. INITIATION anchor, citations). If validation fails and repair fails, the route returns **500** and **does not save** the report or return a reportId. So for the **live** path, you only get a reportId (and thus paid WHOIS) if the report **passes** (or is repaired to pass) the legacy validators. That is a **pipeline requirement**, not a requirement of `buildPaidWhoisReport` itself.
- **Dry-run path:** When `dryRun` is **true**, `engine/generate` returns a **fixture mock** (lines 152–321), never calls OpenAI and **never runs** `validateReport()`. The mock is saved via `saveReportAndConfirm`; `/api/beauty/dry-run` then builds and saves a minimal `BeautyProfileV1`. So a **WHOIS-capable** reportId can be produced **without** the legacy report passing (or even running) validators.

**Conclusion:**  
- **Structurally:** Paid WHOIS does **not** require a “valid” (validator-passing) 14-section report; it only needs a stored report + profile; section parsing is best-effort with fallbacks.  
- **In the live flow:** A passing (or repaired) legacy report is required only because the **engine pipeline** refuses to save and return a reportId when validation fails. So the dependency is in the **engine route**, not in `buildPaidWhoisReport`.

---

## 3. Studio dry-run specifically

**3.1 Which endpoint/path produces the failing ORACLE / INITIATION / citation validation errors?**

- **Endpoint:** `POST /api/engine/generate`  
- **When:** When the request is **not** in dry-run (`dryRun === false`), i.e. when the **live** report path is used (e.g. Studio “Generate Report” with **DRY RUN** off, or `/api/beauty/create` / `/api/beauty/submit` calling the engine).
- **Where in code:** `app/api/engine/generate/route.ts`: INITIATION anchor check (lines 467–486), then later `validateReport()` (lines 665–669, 698, 724) and the repair/error path that returns `Report failed validation: ${top.message}` (lines 750–754). Citation key errors come from `validateCitations()` in `lib/engine/reportValidators.ts` (e.g. `CITATION_KEY_FORBIDDEN`).

**Studio dry-run** calls `POST /api/beauty/dry-run`, which calls `POST /api/engine/generate` with **`dryRun: true`**. In that branch the handler returns the **mock** report immediately (lines 152–396) and **never** runs `validateReport()` or the INITIATION/citation validators. So **Studio dry-run does not run the code that produces those validation errors**. The errors you see come from the **live** path (DRY RUN off or another caller with `dryRun: false`).

**3.2 Does that path generate a legacy full report before the WHOIS layer?**

- **Live path (`dryRun === false`):** Yes. It generates a full report via OpenAI, injects deterministic blocks, runs the legacy validators (and optionally repair), and only then creates a reportId and saves. WHOIS is used later (e.g. `send-beauty-profile` or view) when `buildPaidWhoisReport(reportId)` is called. So the legacy full report is generated (and must pass validation) **before** any WHOIS use of that reportId.
- **Dry-run path:** It “generates” only the **mock** full report (no OpenAI, no validators). That mock is a 14-section fixture; it is saved, and the dry-run route builds a minimal profile. WHOIS can then use that reportId without the legacy generator or validators ever having run on real LLM output.

**3.3 Is there already another path that can produce a WHOIS-capable test record without requiring the full legacy report to pass all old validations?**

- **Yes.** **Studio dry-run** with **DRY RUN** on: user clicks “Generate Report” while the Studio **DRY RUN** checkbox is on → `components/LigsStudio.tsx` calls `POST /api/beauty/dry-run` → that route calls `POST /api/engine/generate` with `dryRun: true` → engine returns the fixture mock (no validation), saves it, dry-run builds and saves `BeautyProfileV1` → returns `reportId`. That `reportId` works with `buildPaidWhoisReport(...)` and with send-beauty-profile. So there is already a path that produces a WHOIS-capable test record **without** the full legacy report (or its validators) being involved.

---

## 4. Recommended next move

**4.1 If the goal is Studio WHOIS testing only (no live OpenAI reports):**

- **Use the existing dry-run path:** Keep DRY RUN on in Studio; use “Generate Report” → you get a reportId that works with `buildPaidWhoisReport` and paid WHOIS. No need to fix the legacy validators for this path.

**4.2 If the goal is live paid WHOIS (real OpenAI-generated reports):**

- **Keep fixing the legacy report generator/validators.** The live flow only returns (and saves) a reportId when the report passes (or is repaired by) the current validator stack. So for real paid WHOIS from live runs, the legacy generator and validators are still in the critical path; the safest approach is to continue hardening the spec and relaxing the parser (as done for INITIATION/citations) so that real model output passes more reliably.

**4.3 If you want WHOIS to be independent of the 14-section report in the long term:**

- **Bypass or reduce dependency:** You could introduce a path that builds a WHOIS-capable profile (and optionally a minimal stored report) **without** going through the full 14-section generator and validators—e.g. a “WHOIS-only” dry-run that writes a minimal `full_report` and profile and never runs `validateReport()`. That would be an additional, parallel path; the current dry-run already achieves “WHOIS-capable without legacy validation” for the **mock** case.

**Concrete recommendation:**

- **For Studio testing:** Rely on **Studio dry-run** (DRY RUN on → `/api/beauty/dry-run`). No code change required; ensure users use DRY RUN when they want a WHOIS-capable test record without hitting validators.
- **For production live paid WHOIS:** **Continue fixing the legacy report generator and validators** (prompt/spec + parser tolerance), because the live pipeline will not produce a reportId until validation passes.

---

## File and function reference

| Item | Location |
|------|----------|
| `buildPaidWhoisReport` | `lib/free-whois-report.ts` (lines 371–525) |
| Section parsing for WHOIS | `parseSectionBody`, `parseSectionRange` in `lib/free-whois-report.ts` (lines 127–157) |
| Report validation (INITIATION, citations, etc.) | `validateReport`, `validateCitations` in `lib/engine/reportValidators.ts`; used in `app/api/engine/generate/route.ts` (lines 665–669, 698, 724) |
| INITIATION anchor check | `subjectNamePresentInInitiation`, `injectInitiationAnchor` from `lib/engine/initiation-anchor.ts`; called in `app/api/engine/generate/route.ts` (lines 467–486, 704–721) |
| Dry-run mock (no validation) | `app/api/engine/generate/route.ts` (lines 152–396, `if (dryRun)`) |
| Studio dry-run entry | `POST /api/beauty/dry-run` in `app/api/beauty/dry-run/route.ts`; calls `fetch(engineUrl)` with `dryRun: true` (lines 97–108) |
| Studio “Generate Report” with DRY RUN on | `components/LigsStudio.tsx` → `POST /api/beauty/dry-run` |
| Studio “Generate Report” with DRY RUN off | `components/LigsStudio.tsx` → `POST /api/engine/generate` (live path; validators run) |
