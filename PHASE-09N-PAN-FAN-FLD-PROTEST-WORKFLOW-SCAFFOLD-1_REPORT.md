# PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1

## 2. Purpose

Implement a design-only, non-runtime-active scaffold modeling the
Philippine BIR administrative assessment-defense workflow (PAN, consolidated
PAN, FAN, consolidated FAN, FLD, FAN/FLD, FDDA, protest — reconsideration or
reinvestigation, action on protest, CTA appeal-watch) after the Phase 9M BIR
notice triage layer detects an assessment notice. This patch models
workflow only — it does not decide, generates no final legal conclusion,
generates no filing-ready protest document, and performs no live authority
retrieval.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `6119ddd PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1 add BIR notice/LOA triage intent scaffold`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; Phase 9L procedural fallback scaffold
  COMPLETE; Phase 9M BIR notice/LOA triage intent scaffold COMPLETE; memory
  INACTIVE; production unchanged; MCP deferred until after the final
  planned phase (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/pan-fan-fld-protest-workflow.js` (new)
- `evaluation/fixtures/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.fixture.json` (new)
- `tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs` (new)
- `PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1_REPORT.md` (new)
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

`workflow/pan-fan-fld-protest-workflow.js` exports a mode id, version
constant, supported assessment notice types/protest paths/workflow stages/
issue types, an input normalizer, an input validator, a result builder
(`createPanFanFldProtestWorkflowResult`), and a result validator. Notice-type
resolution prefers an explicit `noticeType` (high confidence), falls back to
`triageResult.noticeType` from the Phase 9M output (medium confidence), and
defaults to `UNKNOWN_ASSESSMENT_NOTICE` (low confidence) otherwise. A
`ctaInactionScenario` fact independently overrides the workflow stage and
protest path to the CTA-inaction-appeal-watch path regardless of notice
type. Every result includes `workflow`, `deadlineSignals`,
`assessmentIssueMatrix`, `protestStrategy`, `proceduralSafeguards`,
`authorityNeeds`, `safeWarnings`, `recommendedNextActions`,
`prohibitedConclusions`, `sourceCards`, `humanReviewNotice`, and a
`metadata` block that is always scaffold-only-safe. A conservative,
deterministic prohibited-claim phrase scanner
(`detectProhibitedPanFanFldProtestClaims`) and a real-reference-data leak
scanner are both run by the result validator.

## 7. Supported assessment notice types

11 total: `BIR_PAN`, `BIR_CONSOLIDATED_PAN`, `BIR_FAN`, `BIR_CONSOLIDATED_FAN`,
`BIR_FLD`, `BIR_FAN_FLD`, `BIR_FDDA`, `BIR_PROTEST_REQUEST_RECONSIDERATION`,
`BIR_PROTEST_REQUEST_REINVESTIGATION`, `BIR_ACTION_ON_PROTEST`,
`UNKNOWN_ASSESSMENT_NOTICE`.

## 8. Supported protest paths

8 total: `PAN_REPLY`, `REQUEST_FOR_RECONSIDERATION`,
`REQUEST_FOR_REINVESTIGATION`, `FDDA_CTA_APPEAL_WATCH`,
`CTA_INACTION_APPEAL_WATCH`, `POST_PROTEST_REEVALUATION_MONITORING`,
`NO_PROTEST_PATH_YET`, `HUMAN_REVIEW_REQUIRED`.

## 9. Supported workflow stages

10 total: `PAN_REPLY_STAGE`, `FAN_FLD_PROTEST_STAGE`,
`REINVESTIGATION_DOCUMENT_SUBMISSION_STAGE`, `PROTEST_PENDING_STAGE`,
`FDDA_RECEIVED_STAGE`, `CTA_APPEAL_WATCH_STAGE`, `ACTION_ON_PROTEST_STAGE`,
`POST_PROTEST_REEVALUATION_STAGE`, `FINALITY_RISK_STAGE`, `UNKNOWN_STAGE`.

## 10. Supported assessment issue types

24 total, including `VAT_EXEMPT_VS_ZERO_RATED`, `CWT_SUBSTANTIATION`,
`WITHHOLDING_TAX_DEDUCTIBILITY`, `INPUT_VAT_SUBSTANTIATION`, `DIVIDEND_FWT`,
`LOA_OR_ELA_AUTHORITY`, `REPLACEMENT_ELA`, `CONSOLIDATED_NOTICE`, and 16
others (income tax, VAT, EWT/FWT, PEZA zero-rating, output VAT, unsupported
sales/expenses, related-party, compromise penalty, surcharge, interest,
prescription, due process, proper service, and an unknown-issue fallback).

## 11. Output shape evidence

Every generated result has the required shape: `phase: "09N"`,
`mode: "pan_fan_fld_protest_workflow"`, `version`, `runtimeActive: false`,
`workflow` (`noticeType`, `workflowStage`, `protestPath`, `confidence`,
`reasonCodes`), `deadlineSignals` (12 fields), `assessmentIssueMatrix[]`,
`protestStrategy` (7 fields), `proceduralSafeguards` (9 fields),
`authorityNeeds` (5 fields), `safeWarnings[]`, `recommendedNextActions[]`,
`prohibitedConclusions[]`, `sourceCards[]` (never empty), `humanReviewNotice`,
and `metadata` (all eight safety flags always scaffold-safe). Validated for
all 11 supported notice types.

## 12. PAN workflow evidence

Stage `PAN_REPLY_STAGE`, path `PAN_REPLY`, sets `panReply15DayPotential`
true. Recommends recording date of receipt, building an issue-by-issue
reply matrix, matching findings to documents, and never ignoring the PAN.
Warns this scaffold does not determine the final deadline or legal
sufficiency of the PAN.

## 13. Consolidated PAN workflow evidence

Same stage/path as PAN, additionally sets `freshPanResponsePeriodPotential`
true and requires `consolidatedNoticeCheckNeeded`, `properServiceCheckNeeded`,
and `noRegressionRuleCheckNeeded`. References RMO No. 6-2026 and RMO No.
1-2026 in authority needs.

## 14. FAN workflow evidence

Stage `FAN_FLD_PROTEST_STAGE`, sets `fanFldProtest30DayPotential`,
`reinvestigation60DayPotential`, `inaction180DayPotential`,
`fddaAppeal30DayPotential`, and `ctaInactionAppealPotential` all true.
Includes guidance on deciding between reconsideration and reinvestigation.
Warns this scaffold does not determine whether the FAN/FLD is valid, final,
void, or appealable.

## 15. FLD / FAN-FLD workflow evidence

FLD and the combined FAN/FLD notice type share the same workflow behavior
as FAN, both validated to provide no final legal conclusion
(`metadata.legalConclusionProvided: false`).

## 16. Consolidated FAN workflow evidence

Adds `freshFanProtestPeriodPotential`, `noRegressionRuleCheckNeeded`, and
`consolidatedNoticeCheckNeeded` on top of the base FAN/FLD signals,
referencing RMO No. 6-2026 FAN-level consolidation safeguards and CTA
appeal rules.

## 17. FDDA workflow evidence

Stage `FDDA_RECEIVED_STAGE`, path `FDDA_CTA_APPEAL_WATCH`, sets
`fddaAppeal30DayPotential` true. Never computes or asserts a definite final
appeal deadline.

## 18. Request for reconsideration evidence

Path `REQUEST_FOR_RECONSIDERATION`. Strategy guidance states reconsideration
generally fits when the protest relies on existing records already
submitted or legal arguments alone, without requiring a new investigation
of facts.

## 19. Request for reinvestigation evidence

Stage `REINVESTIGATION_DOCUMENT_SUBMISSION_STAGE`, path
`REQUEST_FOR_REINVESTIGATION`, sets `reinvestigation60DayPotential` true.
Strategy guidance references additional evidence, newly submitted
documents, and further factual examination.

## 20. Action-on-protest evidence

Stage `ACTION_ON_PROTEST_STAGE`, path `POST_PROTEST_REEVALUATION_MONITORING`.
Distinguishes procedural acceptance from substantive cancellation and never
claims the assessment is cancelled.

## 21. CTA inaction appeal-watch evidence

A `ctaInactionScenario` fact overrides the workflow stage to
`CTA_APPEAL_WATCH_STAGE` and the protest path to
`CTA_INACTION_APPEAL_WATCH` regardless of the underlying notice type,
setting `inaction180DayPotential` and `ctaInactionAppealPotential` true.

## 22. Assessment issue matrix evidence

Built from caller-supplied `assessmentIssues`; when none are provided, a
single `UNKNOWN_ISSUE` placeholder is created rather than fabricating
issue-specific facts. Each matrix entry preserves caller-supplied
`documentsAvailable`/`documentsMissing` verbatim while adding generic,
non-fact-specific `substituteProofOptions` and authority-need guidance by
issue type.

## 23. VAT exempt vs zero-rated issue evidence

Adds NIRC VAT provisions, BIR VAT zero-rating rules, PEZA/export rules, VAT
invoicing/substantiation rules, and CTA/Supreme Court jurisprudence to
authority needs, plus sales invoices, contracts, and export/PEZA support to
substitute-proof options. Warns that accounting-system tagging alone is not
conclusive tax treatment.

## 24. CWT substantiation issue evidence

Adds RR No. 2-98, BIR Form 2307 rules, and NIRC income tax credit
provisions to authority needs, plus BIR Form 2307, SAWT, and reconciliation
schedule to substitute-proof options. Warns that unsupported CWT claims
require documentary matching.

## 25. Withholding/deductibility issue evidence

Adds NIRC Sec. 34(K), RR No. 2-98, and withholding tax regulations to
authority needs, plus expense schedule, supplier invoices, and proof of
remittance to substitute-proof options.

## 26. Input VAT substantiation issue evidence

Adds NIRC Sec. 110, VAT invoicing requirements, and input VAT
substantiation rules to authority needs, plus supplier invoices, purchase
journal, and input VAT schedule to substitute-proof options.

## 27. Dividend FWT issue evidence

Adds NIRC final withholding tax provisions and dividend tax rules to
authority needs, plus board resolution, dividend declaration records, and
shareholder ledger to substitute-proof options.

## 28. LOA/eLA authority issue evidence

Both `LOA_OR_ELA_AUTHORITY` and `REPLACEMENT_ELA` add RMC No. 5-2026, RMO
No. 1-2026, RMO No. 6-2026, and RMC No. 14-2026 to authority needs, and warn
not to conclude invalidity from the scaffold alone.

## 29. Consolidated notice issue evidence

Adds RMO No. 1-2026, RMO No. 6-2026, RMC No. 14-2026, NIRC Sec. 228, and RR
No. 18-2013 to authority needs, and warns that consolidated notices require
stage, service, prior-notice, and deadline review.

## 30. Source-card boundary

Source cards are design/reference cards only, restricted to the four
allowed authority tiers. Every result includes the five required baseline
design source cards (RR No. 18-2013, NIRC Sec. 228, RMO No. 6-2026, RMC No.
14-2026, and the uploaded-reference-pattern card). No source card claims
live authority verification is complete — verified across all 11 supported
types by test.

## 31. Authority boundary

No live search, scraping, browsing, OCR, or authority retrieval is
performed. Future official authority sources are noted as future
verification targets only. Phase 10 (Authority Search and Research Engine)
is not implemented here.

## 32. Privacy boundary

All fixture examples use sanitized, synthetic identifiers and placeholder-
style numbers/amounts. No real taxpayer names, TINs, LOA/eLA numbers, audit
case numbers, addresses, BIR officer names, client names, or exact
assessment amounts from the user's private reference materials appear
anywhere in this patch — the module additionally rejects any of these known
real fragments on input and scans its own output for leakage, verified by
test.

## 33. Runtime boundary

Runtime impact: None. `runtimeActive`, `allowLegalConclusion`,
`allowLiveRetrieval`, `allowRealTaxpayerData`, `generateFilingReadyDocument`,
and `automaticSubmission` are all forced to their safe values in every
result regardless of caller input.

/ask impact: None. This module is not imported by `ask-handler.js`,
`pipeline.js`, `server.js`, or any route, and has no dependency on
authentication or the Express/server runtime.

## 34. Phase 10 boundary

Not implemented by this patch.

## 35. Phase 11 boundary

Not implemented by this patch.

## 36. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced. No MCP runtime integration exists. No MCP
test calls were made by this patch's test.

## 37. Validation summary

```
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
  → GATE PASSED / 160 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 38. Decision

**PHASE 09N PAN FAN FLD PROTEST WORKFLOW SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 39. Strict recommendations

1. Proceed to PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1.
2. Do not wire PAN/FAN/FLD protest workflow to `/ask` until workflow
   governance and runtime gates approve it.
3. Keep real taxpayer data out of fixtures.
4. Require authority verification before legal conclusions.
5. Preserve 2026 audit-framework flags but do not convert them into
   validity conclusions.
6. Add deeper BIR audit defense matrix next.
7. Add document compliance/transmittal generator after audit defense
   matrix.
8. Add authority-corpus research design before any claim of current
   official legal support.
9. Preserve human review notices for PAN/FAN/FLD/FDDA/CTA workflows.

## 40. Next task

**PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1**

Future plan also includes **PHASE-09-GATE-CLOSURE-1**.
