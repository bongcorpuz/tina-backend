# PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1 Report

## 1. Patch Name
PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1

## 2. Purpose
Diagnose and remediate why 4 of 8 mandated safe LOA/eLA audit-procedure queries still bypassed the controlled LOA answer branch in live staging after PHASE-09ZE, and restore them to the correct `responseType: "controlled_loa_answer"` behavior without broadening the gate or weakening any exclusion.

## 3. Base State
Base commit: dc8e882 (PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 post-09ZE rerun, recorded FAIL).
Branch: feature/source-availability-engine-v1, synced 0/0 with origin at the start of this patch.

## 4. Files Changed
- pipeline.js
- evaluation/fixtures/phase-09zf-controlled-loa-gate-ordering-remediation-1.fixture.json
- tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs
- PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1_REPORT.md
- knowledge/CURRENT_STATE.md

## 5. 09ZB Failure Summary
30c1cbb recorded PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL: 4 of 8 mandated safe LOA/eLA staging smoke queries (replacement eLA, consolidated eLA, notice for presentation/submission of documents, reminder before subpoena) did not trigger the controlled LOA branch and instead returned a generic Philippine-tax fallback.

## 6. 09ZE Remediation Summary
339c448 added a narrow `/ask`-only Philippine tax audit-procedure boundary overlay (`CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS` wrapping `detectPhilippineTaxBoundary()`) so the four affected queries would ALLOW at the defense-in-depth domain-boundary check instead of being rejected there, on the theory that the boundary check was the blocker.

## 7. Post-09ZE Failure Evidence
dc8e882 reran PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 against staging commit 339c448 with the feature flag verified enabled, and recorded the same result: the same 4 of 8 safe queries still did not trigger `controlled_loa_answer` and still returned the generic Philippine-tax fallback (recorded in `knowledge/CURRENT_STATE.md`, "Phase 9ZB Controlled LOA Answer Staging Smoke Rerun -- POST-09ZE FAIL").

## 8. Root Cause
In `pipeline.js`, Step 12.6 (the clarification route gate, `evaluateClarificationRouteGate`) executed and could early-exit with a generic clarification-only fallback answer **before** Step 12.65 (the controlled LOA gate, `evaluateControlledLoaAskGate`) ever ran. The 09ZE overlay correctly fixed the defense-in-depth domain-boundary ALLOW decision for the four queries, but did not change this later ordering. For the four affected queries, the clarification route gate's helper chain (`clarification-route-orchestrator-helper.js`, unmodified) evidently produced `answerAllowed: false` for their less-common procedural phrasing, so Step 12.6 returned its own generic fallback (`buildClarificationOnlyAnswer()`, "I need a few details before I can give a reliable sourced answer...") before Step 12.65 was ever reached. `evaluateControlledLoaAskGate()`, called in isolation, correctly classifies all four queries as `matched: true` / `controlled_loa_answer` — confirming the gate's own logic was never the problem, only its unreachability inside the live `runPipeline()` ordering.

## 9. Chosen Remediation
Reordered the two existing gate blocks in `pipeline.js` (Acceptable Pattern B) so the Step 12.65 controlled LOA gate now executes first, and the Step 12.6 clarification route gate now executes second, only if the controlled LOA gate did not already early-exit. No change was made to either gate's internal classification logic, to `evaluateControlledLoaAskGate`, to `buildControlledLoaAskEarlyExitResponse`, to `evaluateClarificationRouteGate`, or to `clarification-route-orchestrator-helper.js`.

## 10. Why Remediation Is Narrow
The change is a pure code-order swap of two already-existing, already-tested gate blocks within `pipeline.js`. No keyword lists were broadened, no new answer generator was created, no exclusion was weakened, and no other file was touched. A query the controlled LOA gate does not match (`matched: false`) — including every excluded/unsafe query and every unrelated tax query — falls through exactly as before to the unmodified Step 12.6 clarification gate and existing fallback/human-review behavior.

## 11. Runtime Ordering Evidence
Prior order: Step 12.6 (clarification route gate) → Step 12.65 (controlled LOA gate).
New order: Step 12.65 (controlled LOA gate) → Step 12.6 (clarification route gate).
A static scan in the 09ZF test confirms the "Step 12.65: Controlled LOA/eLA procedural-help /ask gate" marker now appears in `pipeline.js` before the "Step 12.6: Live clarification route gate" marker.

## 12. Safe Query Remediation Evidence
The 09ZF test validates that all 8 safe queries — including the four previously failing queries (replacement eLA, consolidated eLA, notice for presentation/submission, reminder before subpoena) — pass the domain boundary and match the controlled LOA gate with `responseType: "controlled_loa_answer"`.

## 13. Excluded Query Preservation Evidence
The 09ZF test validates, query by query, that all 12 excluded/unsafe queries (invalidity, voidness, ignore, assessment power, finality, CTA, FAN, FDDA, outcome prediction, draft protest, BIR submission, final legal opinion) continue to return `matched: false` and `earlyExitResponse: null` from the controlled LOA gate, unchanged by the reordering.

## 14. Unrelated Query Non-Trigger Evidence
The 09ZF test validates that EWT, VAT, percentage tax, estate tax, and the remaining unrelated queries continue to return `matched: false` from the controlled LOA gate.

## 15. Source-Card/Citation Discipline
The controlled LOA response metadata remains:
- sourceCards: []
- sourceCardVerification: not_performed
- legalCitationAllowed: false
- filingReadyDocumentGenerated: false
- automaticSubmission: false

## 16. Legal-Safety Boundary
No final legal conclusions were introduced. No claim that any LOA/eLA/PAN/FAN/FLD/FDDA/assessment/protest/BIR action is valid, invalid, void, cancelled, final, enforceable, or appealable. No filing-ready output. No automatic BIR submission. Human tax/legal review notice remains preserved by the controlled LOA answer scaffold.
Filing-ready document impact: None.
Automatic submission impact: None.

## 17. Runtime Scope Boundary
Runtime impact: Controlled LOA gate-ordering remediation only.
Ask-handler impact: None.
Route impact: None.
Server impact: None.
Auth impact: None.
Feature flag impact: Existing staging flag only.
Memory impact: None.
Persistence impact: None.

## 18. External Operation Boundary
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.

## 19. Privacy Boundary
No real taxpayer data was introduced. All fixture/test queries are synthetic procedural-help phrasing.

## 20. Production Boundary
Production impact: None.

## 21. Validation Summary
Added a dedicated 09ZF test covering fixture metadata, pipeline markers, the Step 12.65-before-Step-12.6 ordering assertion, all 8 safe queries (including the 4 previously-failing queries individually), all 12 excluded queries individually, unrelated-query non-triggering, source-card/legal-safety metadata, external-operation static scan, diff scope, report statements, and CURRENT_STATE.md. Ran node --check on pipeline.js and the full regression chain (09ZF, 09ZE, 09ZB static/local, 09ZA, 09Z, 09Y, 09X, 09 gate closure, guard:files, npm test).

## 22. Decision
PHASE 09ZF CONTROLLED LOA GATE ORDERING REMEDIATION PASS WITH STRICT RECOMMENDATIONS

## 23. Strict Recommendations
1. Rerun PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 after 09ZF.
2. Do not proceed to PHASE-09ZC until 09ZB passes.
3. Keep the earlier controlled LOA gate narrow.
4. Preserve excluded-query fallback for validity, voidness, finality, assessment power, CTA strategy, protest strategy, filing-ready requests, automatic submission, and legal-opinion requests.
5. Preserve unrelated-query non-trigger behavior.
6. Preserve no final legal conclusion.
7. Preserve no filing-ready document generation.
8. Preserve no automatic BIR submission.
9. Preserve source-card discipline: no legal citation unless verified source cards are available.
10. If 09ZB still fails after this remediation, perform live pipeline trace instrumentation before production activation.

## 24. Next Task
PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN

## 25. Alternative Next Phase
PHASE 10 — Evaluation / Fact-Check / Legal-Tax QA System

09ZB rerun remains required after 09ZF.
09ZC remains blocked until 09ZB passes.
