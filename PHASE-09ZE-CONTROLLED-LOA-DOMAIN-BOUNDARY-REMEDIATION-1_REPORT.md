# PHASE-09ZE-CONTROLLED-LOA-DOMAIN-BOUNDARY-REMEDIATION-1 Report

## Purpose
Remediate the narrow Philippine tax-domain boundary gap found during PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 so safe LOA/eLA audit-procedure queries can reach the existing Step 12.65 controlled LOA /ask gate.

## Base State
Base commit: 30c1cbb.

09ZB failed because 4 of 8 mandated safe LOA/eLA staging smoke queries did not trigger the controlled LOA branch.

## Files Changed
- pipeline.js
- evaluation/fixtures/phase-09ze-controlled-loa-domain-boundary-remediation-1.fixture.json
- tests/phase-09ze-controlled-loa-domain-boundary-remediation-1.test.mjs
- PHASE-09ZE-CONTROLLED-LOA-DOMAIN-BOUNDARY-REMEDIATION-1_REPORT.md
- knowledge/CURRENT_STATE.md

## Remediation Type
Controlled LOA domain-boundary remediation.

## Root Cause
detectPhilippineTaxBoundary() ran before pipeline Step 12.65 and rejected narrow audit-procedure queries that did not contain literal BIR or LOA wording.

## Chosen Remediation
pipeline.js now wraps the imported Philippine tax boundary helper with a narrow /ask-only audit-procedure overlay for LOA/eLA procedural signals, including replacement eLA, consolidated eLA, notice for presentation/submission of documents, reminder before subpoena, pre-subpoena, subpoena duces tecum, TVN, mission order, audit checklist, document checklist, audit case, group supervisor, and revenue officer.

The wrapper only converts matching boundary rejects into Philippine tax audit-procedure ALLOW decisions. It does not generate an answer and does not decide that a query is safe for controlled LOA output. Step 12.65 remains responsible for safe, excluded, and unrelated classification.

## Why Narrow
The remediation is limited to pipeline.js and to /ask boundary recognition for audit-procedure phrasing. It does not move the controlled LOA gate, change ask-handler.js, change routes, change auth, change retrieval, change source cards, change package files, or activate production behavior.

## Safe Query Remediation Evidence
The 09ZE test validates that all 8 safe queries are boundary-eligible and controlled-gate eligible, including the four previously failing queries:
- I received a replacement eLA, what should I check first?
- I received a consolidated eLA, what should I do?
- I received a notice for presentation/submission of documents.
- I received a reminder before subpoena.

## Excluded Query Preservation Evidence
The 09ZE test validates that validity, voidness, ignore-notice, assessment-power, assessment-finality, CTA strategy, FAN/FDDA conclusion, outcome prediction, filing-ready protest, automatic submission, and final-legal-opinion requests do not receive the controlled safe LOA answer.

## Unrelated Query Non-Trigger Evidence
The 09ZE test validates that EWT, VAT, percentage tax, estate tax, withholding-tax professional-fee, and seafood VAT-exemption questions do not trigger the controlled LOA branch.

## Controlled LOA Gate Preservation Evidence
Step 12.65 remains in pipeline.js. evaluateControlledLoaAskGate remains feature-flagged by TINA_ENABLE_CONTROLLED_LOA_ASK_GATE and continues to perform supported/excluded/unrelated classification.

## Source-Card/Citation Discipline Evidence
The controlled LOA response metadata remains:
- sourceCards: []
- sourceCardVerification: not_performed
- legalCitationAllowed: false
- filingReadyDocumentGenerated: false
- automaticSubmission: false

## Runtime Scope Boundary Evidence
Runtime impact: Controlled domain-boundary remediation only.
Ask-handler impact: None.
Pipeline impact: Controlled domain-boundary remediation only.
Route impact: None.
Server impact: None.
Feature flag impact: None.

## External Operation Boundary Evidence
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.

## Privacy Boundary Evidence
No real taxpayer data was introduced.

## Legal-Safety Boundary Evidence
No final legal conclusions were introduced.
No filing-ready document generation was introduced.
No automatic BIR submission was introduced.
Human tax/legal review notice remains preserved by the controlled LOA answer scaffold.

Filing-ready document impact: None.
Automatic submission impact: None.

## Production Boundary Evidence
Production impact: None.

## Future 09ZB Rerun Boundary
09ZB remains required after 09ZE.
09ZC remains blocked until 09ZB passes.

## Future 09ZC Production Activation Gate Boundary
09ZC remains a separate controlled production activation gate and is not performed in 09ZE.

## Phase 10 Boundary
Phase 10 evaluation/fact-check/legal-tax QA remains a future alternative path.

## Authority Ingestion Boundary
Future authority ingestion/search/retrieval remains separately deferred and was not performed.

## Memory/Persistence Boundary
Memory impact: None.
Persistence impact: None.

## MCP Deferral Evidence
MCP remains deferred until after the final planned phase.

## Mobile App Deferral Evidence
Mobile app work remains deferred until after Phase 13.

## Validation Summary
Added a dedicated 09ZE test covering fixture metadata, pipeline markers, narrow boundary signals, all safe queries, all previously failing queries, excluded-query preservation, unrelated-query non-triggering, source-card metadata, external-operation static scan, diff scope, report statements, and CURRENT_STATE.md.

## Decision
PHASE 09ZE CONTROLLED LOA DOMAIN BOUNDARY REMEDIATION PASS WITH STRICT RECOMMENDATIONS

## Strict Recommendations
1. Rerun PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 after 09ZE.
2. Do not proceed to PHASE-09ZC until 09ZB passes live staging smoke.
3. Keep the added domain-boundary signals narrow to BIR audit/LOA/eLA procedural contexts.
4. Preserve excluded-query fallback for validity, voidness, finality, prescription, CTA strategy, protest strategy, filing-ready requests, automatic submission, and legal-opinion requests.
5. Preserve unrelated-query non-trigger behavior.
6. Preserve no final legal conclusion.
7. Preserve no filing-ready document generation.
8. Preserve no automatic BIR submission.
9. Preserve source-card discipline: no legal citation unless verified source cards are available.
10. If 09ZB still fails after this remediation, perform a pipeline ordering/debug patch before production activation.

## Next Task
PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN

## Alternative Next Phase
PHASE 10 — Evaluation / Fact-Check / Legal-Tax QA System
