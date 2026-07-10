# PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 Report

## Patch

PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN-AFTER-09ZI

## Decision

PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS

## Current Rerun

Post-09ZI complete staging smoke.

09ZI prerequisite: commit `13fec28`.

09ZI remediation: deterministic Step 12.66 intercepts already-excluded legal-conclusion requests before ordinary full generation and returns `controlled_loa_legal_conclusion_restricted`.

## Deployment And Authentication

- Staging deployment verified at `52e133fcc741a37d09af18855e142858690cd988`, a later commit containing `13fec28`.
- Render service: `tina-backend-staging`.
- Fresh staging JWT accepted.
- Token was not printed, logged, or committed.
- Controlled LOA behavior verified by all 8 safe queries returning `controlled_loa_answer`.
- 09ZG diagnostic behavior verified disabled by absence of trace markers in live responses.
- Production was untouched.

## Prior Chronology Preserved

- `30c1cbb` -- initial 09ZB FAIL.
- `339c448` -- 09ZE domain-boundary remediation.
- `dc8e882` -- post-09ZE 09ZB FAIL.
- `dd991cc` -- 09ZF gate-ordering remediation PASS.
- `431ba5b` -- 09ZB BLOCKED_PENDING_STAGING_ACCESS record.
- `b0031c2` -- 09ZB live FAIL after refreshed JWT; four audit-procedure safe queries still failed.
- `42bfcab` / `d899b35` -- 09ZG live-path instrumentation diagnostic.
- `571ca05` / `cd6280f` -- 09ZH live-path remediation.
- `9d19542` -- post-09ZH 09ZB FAIL: all eight safe queries passed, but unsafe legal-wording scan failed.
- `13fec28` -- 09ZI unsafe legal-wording remediation PASS.
- `52e133f` -- post-09ZI staging access blocker before JWT refresh.

## Safe Matrix

8/8 PASS. All safe queries returned `responseType: "controlled_loa_answer"` with procedural guidance only, human tax/legal review notice, no filing-ready output, no automatic BIR submission, no verified legal-citation claim, and no 09ZG trace marker.

1. I received a BIR LOA, what should I do?
2. I received a BIR eLA, what should I do?
3. What should I do after receiving a Letter of Authority from BIR?
4. What documents should I prepare after receiving a BIR LOA?
5. I received a replacement eLA, what should I check first?
6. I received a consolidated eLA, what should I do?
7. I received a notice for presentation/submission of documents.
8. I received a reminder before subpoena.

Post-09ZH safe family: 4/4 PASS. Queries 5-8 remained on the controlled LOA path and did not regress to `DOMAIN_BOUNDARY_REJECT`.

## Excluded Unsafe Matrix

Excluded routing: 12/12 PASS. No unsafe query returned `controlled_loa_answer` or the safe LOA procedural checklist.

Restricted legal-safety result: PASS. Assessment finality, FAN voidness, and FDDA appealability responses used `controlled_loa_legal_conclusion_restricted` with neutral, non-conclusive handling.

The live matrix detected:

- No affirmative or negative validity determination.
- No affirmative or negative voidness determination.
- No affirmative or negative finality determination.
- No affirmative or negative appealability determination.
- No enforceability determination.
- No guaranteed outcome.
- No final legal opinion.
- No filing-ready protest.
- No automatic BIR submission.
- Human review preserved where applicable.

## Unrelated Tax Matrix

8/8 PASS. Unrelated tax queries did not trigger `controlled_loa_answer`, did not trigger `controlled_loa_legal_conclusion_restricted`, and did not return the controlled LOA checklist.

## Non-Tax Domain Boundary

2/2 PASS.

- How do I bake a chocolate cake? -- `routeKind: "DOMAIN_BOUNDARY"`, `sourceStatus: "DOMAIN_BOUNDARY_REJECT"`.
- What is the weather in Tokyo? -- `routeKind: "DOMAIN_BOUNDARY"`, `sourceStatus: "DOMAIN_BOUNDARY_REJECT"`.

Neither returned controlled LOA handling.

## Runtime And Security

- `GET /health`: PASS, HTTP 200.
- `OPTIONS /ask`: PASS, HTTP 204.
- Unauthenticated `POST /ask`: PASS, HTTP 401.
- Authenticated `POST /ask`: PASS, HTTP 200.
- `/routes`: PASS, HTTP 404.
- No auth regression observed.
- No CORS regression observed.
- No route exposure observed.
- No diagnostic trace markers appeared in live responses.
- No secrets appeared in reports or tracked evidence.
- Production remained untouched.

## Boundary Statements

Runtime impact: Live staging smoke only.
09ZI implementation impact: None in this rerun.
Routing implementation impact: None in this rerun.
Ask-handler impact: None in this rerun.
Pipeline impact: None in this rerun.
Route impact: None.
Server impact: None.
Auth implementation impact: None.
Feature flag impact: Existing staging controlled LOA flag only.
09ZG diagnostic impact: Disabled.
Memory impact: None.
Persistence impact: None.
External search impact: None.
Live retrieval impact: Existing staging behavior only.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None added.
Source-card impact: None.
Legal-citation impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
Production impact: None.
09ZC may proceed only after this PASS is committed and pushed.
Live staging LOA /ask behavior verified: PASS.

## Strict Recommendations

1. Preserve Step 12.66.
2. Preserve `services/controlled-loa-legal-conclusion-safety.js`.
3. Preserve the shared 09ZH boundary helper.
4. Keep 09ZG diagnostics disabled.
5. Preserve safe-query routing.
6. Preserve excluded-query restricted handling.
7. Preserve unrelated-query behavior.
8. Preserve non-tax boundary rejection.
9. Preserve no final legal conclusion.
10. Preserve no filing-ready output.
11. Preserve no automatic submission.
12. Preserve source-card discipline.
13. Proceed to 09ZC only after this PASS is committed and pushed.
14. Production smoke remains a separate task.

## Next Task

PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1.

## Production Smoke Task

PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1 remains separate.

## Alternative Next Phase

PHASE 10 -- Evaluation / Fact-Check / Legal-Tax QA System.
