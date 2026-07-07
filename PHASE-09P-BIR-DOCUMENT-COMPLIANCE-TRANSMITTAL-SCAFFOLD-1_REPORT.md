# PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1

## 2. Purpose

Implement a design-only, non-runtime-active scaffold structuring BIR
document submission responses (LOA checklists, notices for presentation/
submission, additional document requests, pre-subpoena/subpoena document
organization, NOD/DOD/PAN/FAN/FLD/reinvestigation/FDDA supporting
documents, termination supporting documents) into a controlled document
compliance and transmittal plan. This patch creates a structured
compliance/transmittal object only — it does not decide legal validity,
does not draft final submissions, and generates no filing-ready
transmittal letter, affidavit, certification, email, protest, CTA
pleading, tax opinion, or legal opinion.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `8d76c1d PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 add audit defense matrix scaffold`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; Phase 9L procedural fallback scaffold
  COMPLETE; Phase 9M BIR notice/LOA triage intent scaffold COMPLETE; Phase
  9N PAN/FAN/FLD/protest workflow scaffold COMPLETE; Phase 9O BIR audit
  defense matrix scaffold COMPLETE; memory INACTIVE; production unchanged;
  MCP deferred until after the final planned phase (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/bir-document-compliance-transmittal.js` (new)
- `evaluation/fixtures/phase-09p-bir-document-compliance-transmittal-scaffold-1.fixture.json` (new)
- `tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs` (new)
- `PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

No existing Phase 9 workflow file, route file, or runtime file was created
or modified by this patch.

## 5. Non-runtime declaration

Runtime impact: None.
Ask-handler impact: None.
Route impact: None.
Server impact: None.
Pipeline impact: None.
Feature flag impact: None.
Memory impact: None.
Persistence impact: None.
External search impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
/ask impact: None.

The scaffold module has zero imports (fully standalone), performs no I/O, no
network calls, no OCR, reads no `process.env`, uses no `Date.now()`/
randomness, and has no side effects — verified by static source scan.

## 6. Scaffold behavior summary

`workflow/bir-document-compliance-transmittal.js` exports a mode id,
version constant, supported item-status/request-type/response-type/route
lists, an input normalizer, an input validator, a result builder
(`createBirDocumentComplianceTransmittalResult`), and a result validator. It
accepts a `requestType`, a `workflowContext`, and a caller-supplied
`requestedDocuments` array (never fabricated — defaults to a single
`unknown`-status placeholder only when no documents are supplied), builds a
per-item `documentMatrix` row for each requested document, and aggregates a
`transmittalPlan`, `substituteProofPlan`, `receivingProofTracker`, and
`scopeAndAuthorityChecks` across the whole matrix. A conservative,
deterministic prohibited-claim phrase scanner
(`detectProhibitedBirDocumentComplianceClaims`) and a real-reference-data
leak scanner are both run by the result validator, and input validation
additionally rejects requests for filing-ready output or automatic BIR
submission phrased in natural language.

## 7. Supported item statuses

11 total: `provided`, `to_follow`, `not_applicable`, `unavailable`,
`non_existent`, `substitute_proof_available`, `requires_reconciliation`,
`requires_certified_copy`, `requires_on_premise_review`,
`requires_bir_clarification`, `unknown`.

## 8. Supported request types

13 total: `LOA_INITIAL_CHECKLIST`, `NOTICE_FOR_PRESENTATION_SUBMISSION`,
`CHECKLIST_OF_REQUIREMENTS`, `ADDITIONAL_DOCUMENT_REQUEST`,
`PRE_SUBPOENA_REMINDER`, `SUBPOENA_DUCES_TECUM`,
`NOD_DOD_SUPPORTING_DOCUMENTS`, `PAN_REPLY_SUPPORTING_DOCUMENTS`,
`FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS`,
`REINVESTIGATION_SUPPORTING_DOCUMENTS`, `FDDA_APPEAL_SUPPORTING_DOCUMENTS`,
`TERMINATION_LETTER_SUPPORTING_DOCUMENTS`, `UNKNOWN_DOCUMENT_REQUEST`.

## 9. Supported response types

12 total: `DOCUMENT_TRANSMITTAL_MATRIX`, `ITEMIZED_STATUS_RESPONSE`,
`NON_APPLICABILITY_EXPLANATION`, `UNAVAILABLE_DOCUMENT_EXPLANATION`,
`NON_EXISTENT_DOCUMENT_EXPLANATION`, `SUBSTITUTE_PROOF_PLAN`,
`AFFIDAVIT_OR_CERTIFICATION_PLAN`, `REQUEST_FOR_CLARIFICATION`,
`REQUEST_FOR_EXTENSION`, `RECEIVING_PROOF_TRACKER`, `CLIENT_STATUS_UPDATE`,
`HUMAN_REVIEW_REQUIRED`.

## 10. Supported routes

7 total: `AUTHORITY_SAFE_PROCEDURAL_FALLBACK`, `BIR_NOTICE_TRIAGE`,
`BIR_AUDIT_DEFENSE_MATRIX`, `PAN_FAN_FLD_PROTEST_WORKFLOW`,
`DOCUMENT_COMPLIANCE_TRANSMITTAL`, `AUTHORITY_CORPUS_RESEARCH`,
`HUMAN_TAX_LEGAL_REVIEW`.

## 11. Output shape evidence

Every generated result has the required shape: `phase: "09P"`,
`mode: "bir_document_compliance_transmittal"`, `version`,
`runtimeActive: false`, `complianceSummary` (15 fields, always
`humanReviewRequired: true`), `documentMatrix[]` (never empty, 20 fields per
row, always `humanReviewRequired: true`), `transmittalPlan` (12 fields),
`substituteProofPlan` (6 fields), `receivingProofTracker` (8 fields),
`scopeAndAuthorityChecks` (11 fields), `safeWarnings[]`,
`recommendedNextActions[]`, `prohibitedConclusions[]`, `sourceCards[]`
(never empty), `humanReviewNotice`, and `metadata` (all eight safety flags
always scaffold-safe). Validated for all 13 supported request types.

## 12. LOA checklist / notice submission evidence

`LOA_INITIAL_CHECKLIST`, `NOTICE_FOR_PRESENTATION_SUBMISSION`, and
`CHECKLIST_OF_REQUIREMENTS` all use `responseType:
DOCUMENT_TRANSMITTAL_MATRIX`, requiring an itemized schedule, receiving
proof, BIR-stamped copy, and standardized-checklist/audit-scope review.

## 13. Additional document request evidence

`ADDITIONAL_DOCUMENT_REQUEST` sets `relevanceCheckNeeded`,
`necessityCheckNeeded`, `auditScopeCheckNeeded`,
`additionalRequestLimitCheckNeeded`, and
`explanationDocumentationCheckNeeded` all true, and uses
`REQUEST_FOR_CLARIFICATION` or `ITEMIZED_STATUS_RESPONSE` depending on
whether any item needs BIR clarification.

## 14. Pre-subpoena reminder evidence

`PRE_SUBPOENA_REMINDER` sets `preSubpoenaEscalationRisk` true and uses
`responseType: ITEMIZED_STATUS_RESPONSE`. Warnings state this is an
escalation risk and not to disregard the reminder, without using the exact
prohibited phrase.

## 15. Subpoena evidence

`SUBPOENA_DUCES_TECUM` sets `subpoenaEscalationRisk` true and uses
`responseType: HUMAN_REVIEW_REQUIRED`, with an immediate-professional-
review warning while still producing a full document matrix.

## 16. PAN/FAN/FLD/reinvestigation supporting document evidence

`PAN_REPLY_SUPPORTING_DOCUMENTS`, `FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS`,
`REINVESTIGATION_SUPPORTING_DOCUMENTS`, `NOD_DOD_SUPPORTING_DOCUMENTS`, and
`FDDA_APPEAL_SUPPORTING_DOCUMENTS` all use `DOCUMENT_TRANSMITTAL_MATRIX`
with `deadlineTrackingNeeded` forced true and proof-of-filing emphasis.

## 17. Termination supporting document evidence

`TERMINATION_LETTER_SUPPORTING_DOCUMENTS` uses `responseType:
RECEIVING_PROOF_TRACKER` with `withoutPrejudiceLanguageNeeded` forced true,
focused on payment proof and closure scope; never claims blanket or
permanent clearance.

## 18. Provided item evidence

`provided` items set `receivingProofNeeded: true` and recommend inclusion
in the itemized schedule with preserved BIR-stamped/email proof; never
claims BIR acceptance is guaranteed.

## 19. To-follow item evidence

`to_follow` items set `explanationType: to_follow`, contribute to
`deadlineTrackingNeeded`/`extensionRequestPotential`, and recommend
preserving proof of later submission without promising BIR acceptance of
delayed submission.

## 20. Not-applicable item evidence

`not_applicable` items set `explanationType: not_applicable`,
`explanationNeeded: true`, and `withoutPrejudiceLanguageNeeded: true`,
recommending factual support (AFS note, tax return, registration date,
activity status, or official record).

## 21. Unavailable item evidence

`unavailable` items set `explanationType: unavailable` and
`withoutPrejudiceLanguageNeeded: true`, recommending a factual explanation
and substitute-proof options, escalated to professional review.

## 22. Non-existent item evidence

`non_existent` items set `explanationType: non_existent`, never fabricate
the document, and recommend an affidavit/certification/substitute-proof
plan plus asking BIR to identify the specific document and basis if
insisted upon.

## 23. Substitute proof evidence

`substitute_proof_available` items feed the aggregated
`substituteProofPlan`, bucketed into affidavit, management-certification,
AFS-note, tax-return-support, official-record, and third-party-confirmation
categories based on the caller-supplied `substituteProofOptions` text.

## 24. Reconciliation evidence

`requires_reconciliation` items set `reconciliationNeeded: true` and
recommend reconciling per-books vs. per-return vs. attachment vs.
third-party support before submission.

## 25. Certified-copy evidence

`requires_certified_copy` items set `certifiedCopyNeeded: true` and
`receivingProofNeeded: true`, and feed
`scopeAndAuthorityChecks.certifiedCopySubmissionPotential`.

## 26. On-premise review evidence

`requires_on_premise_review` items set `onPremiseReviewNeeded: true` and
`scopeAndAuthorityChecks.voluminousRecordsCheckNeeded: true`; never claims
records need not be brought to the BIR.

## 27. Clarification request evidence

`requires_bir_clarification` items set `birClarificationNeeded: true` and
`transmittalPlan.clarificationRequestNeeded: true`, recommending BIR
identify the specific document, issue, relevance, necessity, scope, and
basis — never refusing compliance outright.

## 28. Transmittal plan evidence

Always includes an `itemizedScheduleNeeded`, `receivingProofRequired`, and
`birStampedCopyRequired` baseline, with `responseType` varying by request
type per the rules above.

## 29. Substitute proof plan evidence

Aggregates potential substitute-proof categories across all
unavailable/non-existent/substitute-proof-available/not-applicable matrix
rows without fabricating any taxpayer-specific fact.

## 30. Receiving proof tracker evidence

Reflects `workflowContext` proof-availability flags and raises a
`proofGapWarnings` entry whenever any matrix row needs receiving proof but
no BIR-stamped submission, email trail, or other receiving proof has been
confirmed.

## 31. Scope and authority check evidence

Sets `standardizedChecklistCheckNeeded` for checklist-family request types,
`additionalRequestLimitCheckNeeded`/`relevanceCheckNeeded`/
`necessityCheckNeeded`/`auditScopeCheckNeeded` for additional document
requests, and `voluminousRecordsCheckNeeded`/`onPremiseExaminationPotential`/
`certifiedCopySubmissionPotential` from either `workflowContext` flags or
matrix-row signals.

## 32. Source-card boundary

Source cards are design/reference cards only, restricted to the four
allowed authority tiers. Every result includes the six required baseline
design source cards (RMO No. 1-2026 checklist/document safeguards, RMO No.
1-2026 voluminous records/certified copy, RMC No. 14-2026 prior notices/
checklists/subpoenas, RMC No. 5-2026 LOA/eLA verification, and the two
uploaded-reference-pattern cards). No source card claims live authority
verification is complete — verified across all 13 supported request types
by test.

## 33. Authority boundary

No live search, scraping, browsing, OCR, or authority retrieval is
performed. Future official authority sources are noted as future
verification targets only. Phase 10 (Authority Search and Research Engine)
is not implemented here.

## 34. Privacy boundary

All fixture examples use sanitized, synthetic identifiers and placeholder-
style numbers/amounts. No real taxpayer names, TINs, LOA/eLA numbers, audit
case numbers, addresses, BIR officer names, client names, or exact
assessment amounts from the user's private reference materials appear
anywhere in this patch — the module additionally rejects any of these known
real fragments on input and scans its own output for leakage, verified by
test.

## 35. Runtime boundary

`runtimeActive`, `allowLegalConclusion`, `allowLiveRetrieval`,
`allowRealTaxpayerData`, `generateFilingReadyDocument`, and
`automaticSubmission` are all forced to their safe values in every result
regardless of caller input. This module is not imported by
`ask-handler.js`, `pipeline.js`, `server.js`, or any route, and has no
dependency on authentication or the Express/server runtime.

## 36. Phase 10 boundary

Not implemented by this patch.

## 37. Phase 11 boundary

Not implemented by this patch.

## 38. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced. No MCP runtime integration exists. No MCP
test calls were made by this patch's test.

## 39. Validation summary

```
node tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs
  → PASS / 36 passed / 0 failed / 332 assertions

node tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 604 assertions

node tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs
  → PASS / 35 passed / 0 failed / 335 assertions

node tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs
  → PASS / 47 passed / 0 failed / 398 assertions

node tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 184 assertions

node tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs
  → PASS / 36 passed / 0 failed / 179 assertions

node tests/phase-09r-tax-memo-runtime-wiring-integration-design-1.test.mjs
  → PASS / 54 passed / 0 failed / 202 assertions

node tests/phase-09r-tax-memo-runtime-wiring-scaffold-1.test.mjs
  → PASS / 113 passed / 0 failed / 212 assertions

node tests/phase-09i-requirements-request-letter-schema-scaffold-1.test.mjs
  → PASS / 56 passed / 0 failed / 333 assertions

node tests/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.test.mjs
  → PASS / 69 passed / 0 failed / 172 assertions

node tests/phase-09g-workflow-output-governance-gate-1.test.mjs
  → PASS / 73 passed / 0 failed / 213 assertions

node tests/phase-09f-client-advisory-checklist-scaffold-1.test.mjs
  → PASS / 75 passed / 0 failed / 404 assertions

node tests/phase-09e-bir-reply-draft-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 243 assertions

node tests/phase-09d-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 203 assertions

node tests/phase-09c-tax-memo-schema-scaffold-1.test.mjs
  → PASS / 47 passed / 0 failed / 149 assertions

node tests/phase-09b-workflow-mode-registry-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 363 assertions

node tests/phase-09a-professional-workflow-copilot-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 75 assertions

node tests/patch-08s-followup-index-secret-header-auth-staging-smoke-1.test.mjs
  → PASS / 23 passed / 0 failed / 92 assertions

node tests/patch-08x-chat-context-carryover-final-gate-1.test.mjs
  → PASS / 17 passed / 0 failed / 127 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
  → PASS / 22 passed / 0 failed / 203 assertions

npm run guard:files
  → PASS: No protected files modified

npm test
  → GATE PASSED / 162 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 40. Decision

**PHASE 09P BIR DOCUMENT COMPLIANCE TRANSMITTAL SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 41. Strict recommendations

1. Proceed to PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1.
2. Do not wire document compliance/transmittal workflow to `/ask` until
   workflow governance and runtime gates approve it.
3. Keep real taxpayer data out of fixtures.
4. Require authority verification before legal conclusions.
5. Preserve 2026 audit-framework flags but do not convert them into
   validity conclusions.
6. Add authority-corpus research design before any claim of current
   official legal support.
7. Keep generated transmittal letters, affidavits, certifications, emails,
   and protest documents behind later governance gates.
8. Preserve human review notices for subpoena, unavailable documents,
   non-existent documents, substitute proof, and deadline-sensitive
   submissions.

## 42. Next task

**PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1**

Future required task: **PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1**.
