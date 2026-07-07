# PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1

## 2. Purpose

Implement a design-only, non-runtime-active scaffold structuring Philippine
BIR audit-defense issues into a professional matrix connecting BIR
findings, taxpayer facts, documents, missing evidence, substitute proof,
procedural defenses, substantive defenses, authority needs, risk level, and
recommended safe next actions. This patch models defense strategy — it does
not decide the defense, generates no final legal opinion, no filing-ready
protest/BIR submission/CTA pleading/tax memo, and performs no live
authority retrieval.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `c27a1e3 PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1 add PAN/FAN/FLD/protest workflow scaffold`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; Phase 9L procedural fallback scaffold
  COMPLETE; Phase 9M BIR notice/LOA triage intent scaffold COMPLETE; Phase
  9N PAN/FAN/FLD/protest workflow scaffold COMPLETE; memory INACTIVE;
  production unchanged; MCP deferred until after the final planned phase
  (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/bir-audit-defense-matrix.js` (new)
- `evaluation/fixtures/phase-09o-bir-audit-defense-matrix-scaffold-1.fixture.json` (new)
- `tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs` (new)
- `PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1_REPORT.md` (new)
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

The scaffold module has zero imports (fully standalone), performs no I/O, no
network calls, no OCR, reads no `process.env`, uses no `Date.now()`/
randomness, and has no side effects — verified by static source scan.

## 6. Scaffold behavior summary

`workflow/bir-audit-defense-matrix.js` exports a mode id, version constant,
supported issue/risk/evidence-status/route lists, an input normalizer, an
input validator, a result builder (`createBirAuditDefenseMatrixResult`), and
a result validator. It accepts a `workflowContext` (notice type/stage
hints) and a `findings` array (never fabricated — caller-supplied facts
only), builds a per-issue `defenseMatrix` row for each finding (defaulting
to a single `UNKNOWN_ISSUE` placeholder when no findings are provided), and
aggregates an `evidencePlan`, `proceduralDefensePlan`,
`substantiveDefensePlan`, and `authorityNeeds` across the whole matrix. A
conservative, deterministic prohibited-claim phrase scanner
(`detectProhibitedBirAuditDefenseMatrixClaims`) and a real-reference-data
leak scanner are both run by the result validator.

## 7. Supported issue/risk/evidence/route types

- **Issue types (31):** `INCOME_TAX`, `VALUE_ADDED_TAX`,
  `EXPANDED_WITHHOLDING_TAX`, `FINAL_WITHHOLDING_TAX`,
  `WITHHOLDING_TAX_DEDUCTIBILITY`, `CWT_SUBSTANTIATION`,
  `INPUT_VAT_SUBSTANTIATION`, `VAT_EXEMPT_VS_ZERO_RATED`,
  `PEZA_ZERO_RATING`, `OUTPUT_VAT`, `UNSUPPORTED_SALES_CLASSIFICATION`,
  `UNSUPPORTED_EXPENSES`, `RELATED_PARTY_OR_INTERCOMPANY`, `DIVIDEND_FWT`,
  `COMPROMISE_PENALTY`, `SURCHARGE`, `INTEREST`, `PRESCRIPTION`,
  `LOA_OR_ELA_AUTHORITY`, `REPLACEMENT_ELA`, `CONSOLIDATED_NOTICE`,
  `DUE_PROCESS`, `PROPER_SERVICE`, `DOCUMENT_REQUEST_SCOPE`,
  `SUBPOENA_OR_PRE_SUBPOENA`, `NOD_DOD_PROCESS`, `PAN_REPLY`,
  `FAN_FLD_PROTEST`, `FDDA_APPEAL_WATCH`, `TERMINATION_LETTER_SCOPE`,
  `UNKNOWN_ISSUE`.
- **Risk levels (5):** `low`, `medium`, `high`, `critical`, `unknown`.
- **Evidence statuses (8):** `available`, `partial`, `missing`,
  `not_applicable`, `non_existent`, `substitute_available`,
  `requires_reconciliation`, `unknown`.
- **Routes (6):** `AUTHORITY_SAFE_PROCEDURAL_FALLBACK`,
  `BIR_NOTICE_TRIAGE`, `PAN_FAN_FLD_PROTEST_WORKFLOW`,
  `DOCUMENT_COMPLIANCE_TRANSMITTAL`, `AUTHORITY_CORPUS_RESEARCH`,
  `HUMAN_TAX_LEGAL_REVIEW`.

## 8. Output shape evidence

Every generated result has the required shape: `phase: "09O"`,
`mode: "bir_audit_defense_matrix"`, `version`, `runtimeActive: false`,
`matrixSummary` (8 fields, always `humanReviewRequired: true`),
`defenseMatrix[]` (17 fields per row, always `humanReviewRequired: true`),
`evidencePlan` (6 fields), `proceduralDefensePlan` (10 booleans),
`substantiveDefensePlan` (7 booleans), `authorityNeeds` (5 fields),
`riskWarnings[]`, `recommendedNextActions[]`, `prohibitedConclusions[]`,
`sourceCards[]` (never empty), `humanReviewNotice`, and `metadata` (all
eight safety flags always scaffold-safe). Validated for all 31 supported
issue types.

## 9. Matrix evidence

The matrix row builder preserves caller-supplied `documentsAvailable`/
`documentsMissing` verbatim (never fabricated) while adding generic,
non-fact-specific `substituteProofOptions`, `authorityNeeded`, procedural
and substantive defense topics, a `riskReason`, and `recommendedSafeAction`
per issue type. `reconciliationNeeded` is populated only when
`evidenceStatus` indicates partial/missing/requires-reconciliation
evidence.

## 10-22. Issue-specific evidence

- **VAT exempt vs. zero-rated / PEZA zero-rating:** adds NIRC VAT
  provisions, BIR VAT zero-rating rules, PEZA/export rules, and CTA/Supreme
  Court jurisprudence to authority needs; warns that accounting-system
  tagging alone is not conclusive tax treatment.
- **CWT substantiation:** adds RR No. 2-98, BIR Form 2307 rules, and NIRC
  income tax credit provisions; requires BIR Form 2307, SAWT, and
  reconciliation schedule; warns that timing/receipt of certificates
  requires review.
- **Withholding/deductibility (including expanded withholding tax):** adds
  NIRC Sec. 34(K), RR No. 2-98, and withholding regulations; requires
  expense schedule, supplier invoices, and proof of remittance.
- **Input VAT substantiation:** adds NIRC Sec. 110 and VAT invoicing
  requirements; requires supplier invoices, purchase journal, and input VAT
  schedule.
- **Dividend FWT:** adds NIRC final withholding tax and dividend tax rules;
  requires board resolution, dividend declaration records, and shareholder
  ledger.
- **LOA/eLA authority and replacement eLA:** add RMC No. 5-2026, RMO No.
  1-2026, RMO No. 6-2026, and RMC No. 14-2026; warn not to conclude
  invalidity from the scaffold alone.
- **Consolidated notice:** adds RMO No. 1-2026, RMO No. 6-2026, RMC No.
  14-2026, NIRC Sec. 228, and RR No. 18-2013; requires proper-service,
  stage, prior-notice-consistency, and no-regression-rule checks.
- **Document request scope:** requires standardized-checklist/request-limit
  review; warns not every additional request is automatically within audit
  scope.
- **PAN reply:** requires 15-day reply period review and prior NOD/DOD
  consistency.
- **FAN/FLD protest:** requires 30-day protest period review,
  reconsideration-vs-reinvestigation path, 60-day reinvestigation document
  period, 180-day inaction watch, and FDDA/CTA watch.
- **FDDA appeal watch:** requires CTA appeal-watch, proper service,
  statement of facts and law, and jurisdictional deadline review.
- **Termination letter scope:** requires matching closure to the covered
  LOA/eLA, taxable period, and tax types; warns against blanket-clearance
  claims for unrelated periods/tax types/fraud/false returns/refund issues.

## 23. Evidence plan

Aggregates `documentsToSubmit` (union of caller-supplied available
documents), `documentsToReconcile` (union of reconciliation hints where
needed), `substituteProofToPrepare` (union of substitute-proof options for
rows with missing/partial/non-existent evidence), `nonApplicableItemsToExplain`,
a baseline `receivingProofNeeded` requirement, and `gapsToEscalate` (issue
types with missing/non-existent evidence or high/critical risk).

## 24. Procedural defense plan

10 boolean checks derived from both `workflowContext` flags
(`loaAuthorityIssue`, `replacementElaIssue`, `consolidatedNotice`) and which
issue types appear in the matrix; `dueProcessCheckNeeded` and
`statementOfFactsAndLawCheckNeeded` are always `true` as a baseline NIRC
Sec. 228 safeguard.

## 25. Substantive defense plan

7 boolean checks derived from which issue types appear in the matrix (VAT
classification, CWT substantiation, withholding deductibility, input VAT
support, dividend FWT, related-party, and income-tax/expense support).

## 26. Source-card boundary

Source cards are design/reference cards only, restricted to the four
allowed authority tiers. Every result includes the seven required baseline
design source cards (RR No. 18-2013, NIRC Sec. 228, RMO No. 1-2026, RMO No.
6-2026, RMC No. 14-2026, RMC No. 5-2026, and the uploaded-reference-pattern
card). No source card claims live authority verification is complete —
verified across all 31 supported issue types by test.

## 27. Authority boundary

No live search, scraping, browsing, OCR, or authority retrieval is
performed. Future official authority sources are noted as future
verification targets only. Phase 10 (Authority Search and Research Engine)
is not implemented here.

## 28. Privacy boundary

All fixture examples use sanitized, synthetic identifiers and placeholder-
style numbers/amounts. No real taxpayer names, TINs, LOA/eLA numbers, audit
case numbers, addresses, BIR officer names, client names, or exact
assessment amounts from the user's private reference materials appear
anywhere in this patch — the module additionally rejects any of these known
real fragments on input and scans its own output for leakage, verified by
test.

## 29. Runtime boundary

`runtimeActive`, `allowLegalConclusion`, `allowLiveRetrieval`,
`allowRealTaxpayerData`, `generateFilingReadyDocument`, and
`automaticSubmission` are all forced to their safe values in every result
regardless of caller input.

/ask impact: None. This module is not imported by `ask-handler.js`,
`pipeline.js`, `server.js`, or any route, and has no dependency on
authentication or the Express/server runtime.

## 30. Phase 10 boundary

Not implemented by this patch.

## 31. Phase 11 boundary

Not implemented by this patch.

## 32. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced. No MCP runtime integration exists. No MCP
test calls were made by this patch's test.

## 33. Validation summary

```
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
  → GATE PASSED / 161 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 34. Decision

**PHASE 09O BIR AUDIT DEFENSE MATRIX SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 35. Strict recommendations

1. Proceed to PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1.
2. Do not wire the BIR audit defense matrix to `/ask` until workflow
   governance and runtime gates approve it.
3. Keep real taxpayer data out of fixtures.
4. Require authority verification before legal conclusions.
5. Preserve 2026 audit-framework flags but do not convert them into
   validity conclusions.
6. Add the document compliance/transmittal generator next.
7. Add authority-corpus research design before any claim of current
   official legal support.
8. Preserve human review notices for every defense matrix result.

## 36. Next task

**PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1**

Future plan also includes **PHASE-09-GATE-CLOSURE-1**.
