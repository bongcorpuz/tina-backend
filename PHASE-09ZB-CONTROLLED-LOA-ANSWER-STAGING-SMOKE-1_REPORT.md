# PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 Report

## Patch

PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1

## Decision

PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL

## Prior History

- `30c1cbb` -- initial 09ZB FAIL.
- `339c448` -- 09ZE domain-boundary remediation.
- `dc8e882` -- post-09ZE 09ZB FAIL.
- `dd991cc` -- 09ZF gate-ordering remediation PASS.
- `431ba5b` -- 09ZB BLOCKED_PENDING_STAGING_ACCESS record.

## Current Live Rerun

- Refreshed staging JWT accepted; token was not printed, logged, or committed.
- Authenticated staging access worked.
- Deployment verified at `431ba5b` or later.
- `TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true` verified on staging.
- Live staging smoke executed.
- Runtime/security checks passed.
- Production was untouched.

## Safe Matrix

First four safe queries passed and returned `responseType: "controlled_loa_answer"`:

1. I received a BIR LOA, what should I do?
2. I received a BIR eLA, what should I do?
3. What should I do after receiving a Letter of Authority from BIR?
4. What documents should I prepare after receiving a BIR LOA?

Four safe audit-procedure queries failed to return `responseType: "controlled_loa_answer"`:

1. I received a replacement eLA, what should I check first?
2. I received a consolidated eLA, what should I do?
3. I received a notice for presentation/submission of documents.
4. I received a reminder before subpoena.

## Excluded Unsafe Matrix

Prior refreshed-JWT run evidence recorded that all 12 excluded unsafe queries remained outside the controlled branch and did not return a controlled checklist, filing-ready output, or automatic-submission offer. The run also recorded sentence-level legal-safety wording findings for assessment-finality and FAN-voidness responses. No new unsafe matrix was independently re-executed in this recovery pass.

## Unrelated Matrix

Prior refreshed-JWT run evidence recorded that all 8 unrelated tax queries remained outside the controlled LOA branch, with one transient timeout passing on retry. No unrelated matrix was independently re-executed in this recovery pass.

## Runtime and Security

- `/health`: PASS.
- `OPTIONS /ask`: PASS.
- Unauthenticated `/ask`: PASS, existing authentication behavior preserved.
- Route inventory behavior: PASS, not exposed.

## Root Conclusion

09ZF static gate reordering did not resolve the live path used by the four audit-procedure queries.

The new root cause is not proven by this recovery task. Actual live path instrumentation is required.

## Boundary Statements

Runtime impact: Staging smoke evidence only.
Ask-handler impact: None.
Pipeline implementation impact: None in this recovery task.
Route impact: None.
Server impact: None.
Auth impact: None beyond use of refreshed staging JWT.
Feature flag impact: Existing staging flag verified.
Memory impact: None.
Persistence impact: None.
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
09ZC remains blocked.
Next task is PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1.
Live staging LOA /ask behavior verified: FAIL.

## Validation Summary

- Repository recovery inspection completed before editing.
- Report was deleted in the partial working tree and reconstructed from the committed `431ba5b` report as the base.
- Fixture and test partial edits were inspected and preserved where valid.
- Static closure validation is expected to pass without calling staging.
- Production activation was not attempted.

## Strict Recommendations

1. Do not proceed to 09ZC.
2. Do not add another blind keyword/domain-boundary patch.
3. Instrument the actual live path for the four failing queries.
4. Preserve the first four passing safe queries.
5. Preserve unsafe-query exclusions.
6. Preserve unrelated-query non-trigger behavior.
7. Preserve no final legal conclusion.
8. Preserve no filing-ready output.
9. Preserve no automatic BIR submission.
10. Preserve source-card discipline.

## Next Task

PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1.

## Blocked Task

PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1 remains blocked.

## Alternative Next Phase

PHASE 10 -- Evaluation / Fact-Check / Legal-Tax QA System.
