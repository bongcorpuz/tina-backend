# PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1

## 2. Purpose

Implement a design-only, non-runtime-active scaffold classifying Philippine
BIR audit-related documents/notices (LOA/eLA, replacement eLA, consolidated
eLA, Mission Order, TVN, document checklist/requests, pre-subpoena/subpoena,
NOD/DOD, PAN, FAN/FLD, FDDA, protest, action on protest, termination letter,
VAT non-consolidation, written conformity, waiver of prescription,
VATAS/LTVAU and VAT-refund transition) into safe workflow intent classes:
notice type, procedural stage, and routing targets. This patch classifies
and routes; it does not decide. It performs no live authority retrieval, is
not wired into `/ask`, and produces no final legal conclusions.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `e60f42d PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1 add procedural fallback scaffold`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; Phase 9L procedural fallback scaffold
  COMPLETE; memory INACTIVE; production unchanged; MCP deferred until after
  the final planned phase (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/bir-notice-loa-triage-intent.js` (new)
- `evaluation/fixtures/phase-09m-bir-notice-loa-triage-intent-scaffold-1.fixture.json` (new)
- `tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs` (new)
- `PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1_REPORT.md` (new)
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

The scaffold module has zero imports (fully standalone), performs no I/O, no
network calls, no OCR, reads no `process.env`, uses no `Date.now()`/
randomness, and has no side effects — verified by static source scan.

## 6. Scaffold behavior summary

`workflow/bir-notice-loa-triage-intent.js` exports a mode id, version
constant, supported notice types/stages/routing targets, an input
normalizer, an input validator, a result builder
(`createBirNoticeLoaTriageIntentResult`), and a result validator. Notice-type
classification prefers an explicit `userSelectedNoticeType` (high
confidence) and falls back to deterministic keyword-pattern matching over
the combined query/notice text (medium confidence, or low/`UNKNOWN_BIR_NOTICE`
if no pattern matches). Every result includes `triage`, `extractedFields`
(derived from caller-supplied `knownFacts`), `audit2026Signals`,
`deadlineSignals`, `safeWarnings`, `recommendedNextActions`,
`prohibitedConclusions`, `sourceCards`, `humanReviewNotice`, and a `metadata`
block that is always scaffold-only-safe. A conservative, deterministic
prohibited-claim phrase scanner (`detectProhibitedBirNoticeClaims`) and a
real-reference-data leak scanner are both run by the result validator.

## 7. Supported notice types

30 total: `BIR_LOA_FULL_EXAMINATION`, `BIR_ELECTRONIC_LOA`,
`BIR_REPLACEMENT_ELA`, `BIR_CONSOLIDATED_ELA`, `BIR_MISSION_ORDER`,
`BIR_TAX_VERIFICATION_NOTICE`, `BIR_NOTICE_PRESENTATION_SUBMISSION_DOCUMENTS`,
`BIR_CHECKLIST_REQUIREMENTS_PRESENTATION_SUBMISSION`,
`BIR_INITIAL_DOCUMENT_REQUEST`, `BIR_ADDITIONAL_DOCUMENT_REQUEST`,
`BIR_PRE_SUBPOENA_DUCES_TECUM_REMINDER`, `BIR_SUBPOENA_DUCES_TECUM`,
`BIR_NOD`, `BIR_DOD`, `BIR_PAN`, `BIR_CONSOLIDATED_PAN`, `BIR_FAN`,
`BIR_CONSOLIDATED_FAN`, `BIR_FLD`, `BIR_FDDA`,
`BIR_PROTEST_REQUEST_RECONSIDERATION`, `BIR_PROTEST_REQUEST_REINVESTIGATION`,
`BIR_ACTION_ON_PROTEST`, `BIR_AUDIT_TERMINATION_LETTER`,
`BIR_REQUEST_FOR_NON_CONSOLIDATION_VAT`,
`BIR_WRITTEN_CONFORMITY_TO_CONSOLIDATION`, `BIR_WAIVER_OF_PRESCRIPTION`,
`BIR_VATAS_LTVAU_TRANSITION_NOTICE`, `BIR_VAT_REFUND_TRANSITION_NOTICE`,
`UNKNOWN_BIR_NOTICE`.

## 8. Supported notice stages

14 total: `AUDIT_AUTHORITY`, `DOCUMENT_REQUEST`, `DOCUMENT_ESCALATION`,
`DISCREPANCY_DISCUSSION`, `PRE_ASSESSMENT`, `FINAL_ASSESSMENT`,
`ADMINISTRATIVE_PROTEST`, `POST_PROTEST`, `APPEAL_WATCH`, `AUDIT_CLOSURE`,
`CONSOLIDATION`, `PRESCRIPTION`, `VAT_TRANSITION`, `UNKNOWN_STAGE`.

## 9. Supported routing targets

11 total: `AUTHORITY_SAFE_PROCEDURAL_FALLBACK`, `LOA_AUTHENTICITY_CHECK`,
`RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW`,
`RMC_14_2026_REPLACEMENT_ELA_REVIEW`, `RMO_6_2026_CONSOLIDATION_REVIEW`,
`DOCUMENT_COMPLIANCE_MATRIX`, `PAN_REPLY_WORKFLOW`,
`FAN_FLD_PROTEST_WORKFLOW`, `FDDA_CTA_APPEAL_WATCH`,
`AUDIT_TERMINATION_REVIEW`, `HUMAN_TAX_LEGAL_REVIEW`.

## 10. Output shape evidence

Every generated result has the required shape: `phase: "09M"`,
`mode: "bir_notice_loa_triage_intent"`, `version`, `runtimeActive: false`,
`triage` (`noticeType`, `noticeStage`, `confidence`, `routingTargets`,
`reasonCodes`), `extractedFields` (32 fields derived from `knownFacts`),
`audit2026Signals` (33 fields), `deadlineSignals` (7 fields), `safeWarnings[]`,
`recommendedNextActions[]`, `prohibitedConclusions[]`, `sourceCards[]`
(never empty), `humanReviewNotice`, and `metadata` (all seven safety flags
always scaffold-safe). Validated for all 30 supported types.

## 11. LOA/eLA triage evidence

Classifies as `BIR_LOA_FULL_EXAMINATION` or `BIR_ELECTRONIC_LOA`, stage
`AUDIT_AUTHORITY`, routes to `AUTHORITY_SAFE_PROCEDURAL_FALLBACK`,
`LOA_AUTHENTICITY_CHECK`, `DOCUMENT_COMPLIANCE_MATRIX`, and
`HUMAN_TAX_LEGAL_REVIEW` (plus `RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW`
when 2026 indicators are present). Warns not to conclude validity/invalidity
from the scaffold alone and to verify authenticity, scope, dates, taxable
period, tax types, RO/GS, signatory, and issuing office. Includes the RMC
No. 5-2026 source-card reference.

## 12. Replacement eLA triage evidence

Classifies as `BIR_REPLACEMENT_ELA`, stage `AUDIT_AUTHORITY`, routes
unconditionally to `RMC_14_2026_REPLACEMENT_ELA_REVIEW` and
`RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW`. Sets
`rmc14_2026PotentiallyApplies` and `properServiceRequired` true; detects
`replacementForContinuity` from reassignment/restructuring/transfer/
continuation wording; flags `replacementExpandsScope` and
`replacementExpandsTaxablePeriod` when text indicates broader scope or a new
taxable period. Never concludes the replacement eLA is invalid.

## 13. Consolidated eLA triage evidence

Classifies as `BIR_CONSOLIDATED_ELA`, stage `CONSOLIDATION`, routes to
`RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW` and
`RMO_6_2026_CONSOLIDATION_REVIEW`. Sets `consolidationPotential` and, when
indicated, `multipleAuthoritiesSameYear`.

## 14. TVN triage evidence

Classifies as `BIR_TAX_VERIFICATION_NOTICE`, stage `AUDIT_AUTHORITY`. Sets
`tvnLimitedScope` true and flags `tvnPotentialScopeExpansion` when the text
indicates a broader issue beyond the stated transaction.

## 15. Checklist/document request triage evidence

Checklist, notice-for-presentation, and initial-document-request all
classify to stage `DOCUMENT_REQUEST`, routing to
`DOCUMENT_COMPLIANCE_MATRIX` (plus the 2026 review route when indicators are
present). Sets `additionalRequestLimitCheckNeeded` true, detects
`standardizedChecklistPresent` from checklist wording, and detects
`voluminousRecordsIssue`/`onPremiseExaminationPotential`/
`certifiedCopySubmissionPotential` when books/CAS/CBA/GL/ledger wording is
present. A separate additional-document-request type always routes to
`RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW`.

## 16. Pre-subpoena/subpoena triage evidence

Pre-subpoena reminder and subpoena duces tecum both classify to stage
`DOCUMENT_ESCALATION` and route to `HUMAN_TAX_LEGAL_REVIEW`. The reminder
warns to treat it as an escalation risk and not disregard it; the subpoena
warns that immediate professional review is recommended before any
response.

## 17. NOD/DOD triage evidence

Classifies to stage `DISCREPANCY_DISCUSSION`, adding
`RMO_6_2026_CONSOLIDATION_REVIEW` when consolidation is indicated. Warns to
track discussion dates, minutes, and unresolved issues.

## 18. PAN/consolidated PAN triage evidence

Classifies to stage `PRE_ASSESSMENT`, routes to `PAN_REPLY_WORKFLOW`, sets
`panReply15DayPotential` true. A consolidated PAN additionally routes to
`RMO_6_2026_CONSOLIDATION_REVIEW` and sets `freshResponsePeriodPotential`
and `properServiceRequired` true.

## 19. FAN/FLD/consolidated FAN triage evidence

Classifies to stage `FINAL_ASSESSMENT`, routes to `FAN_FLD_PROTEST_WORKFLOW`,
sets `fanFldProtest30DayPotential`, `reinvestigation60DayPotential`,
`inaction180DayPotential`, and `ctaAppeal30DayPotential` true. A consolidated
FAN additionally routes to `RMO_6_2026_CONSOLIDATION_REVIEW` and sets
`freshProtestPeriodPotential`, `properServiceRequired`, and
`noRegressionRulePotential` true.

## 20. FDDA triage evidence

Classifies to stage `APPEAL_WATCH`, routes to `FDDA_CTA_APPEAL_WATCH`, sets
`consolidationProhibited` and `ctaAppeal30DayPotential` true. States that
FDDA-stage cases should proceed independently for consolidation purposes
under RMO No. 6-2026.

## 21. Protest/action-on-protest triage evidence

Requests for reconsideration and reinvestigation both classify to stage
`ADMINISTRATIVE_PROTEST` and route to `FAN_FLD_PROTEST_WORKFLOW`;
reinvestigation additionally sets `reinvestigation60DayPotential` true.
Action on protest classifies to stage `POST_PROTEST` and states that
acceptance for re-evaluation does not, by itself, mean the assessment was
resolved in the taxpayer's favor — never claiming the assessment is
cancelled.

## 22. Termination-letter triage evidence

Classifies to stage `AUDIT_CLOSURE`, routes to `AUDIT_TERMINATION_REVIEW`.
States closure is scoped to the covered LOA/eLA, taxable period, and tax
types, without prejudice to future action on fraud, false returns, refund
issues, or other legally recognized grounds — never claiming permanent
clearance.

## 23. VAT non-consolidation / written conformity / waiver triage evidence

VAT non-consolidation request classifies to stage `CONSOLIDATION`, sets
`vatNonConsolidationPotential` and `vatNonConsolidationDeadlineRelevant`
true. Written conformity to consolidation sets `writtenConformityNeeded`
true and warns it must not be treated as an admission of liability or a
waiver of substantive defenses. Waiver of prescription sets
`waiverOfPrescriptionPresent` true and warns that a replacement eLA does not
automatically require a new waiver if the existing one remains valid.

## 24. VATAS/LTVAU and VAT refund transition triage evidence

Both classify to stage `VAT_TRANSITION` and set `vatasOrLtvauInvolved` and
`vatasLtvauTransitionRelevant` true. VATAS/LTVAU routes to both 2026 review
routes; VAT refund transition routes to `RMO_6_2026_CONSOLIDATION_REVIEW`.

## 25. 2026 audit-framework signal evidence

`audit2026Signals` covers RMO No. 1-2026 (single-instance audit baseline),
RMO No. 6-2026 (consolidation safeguards, FAN-level consolidation, written
conformity, waiver of prescription, proper service, no-regression rule), and
RMC No. 14-2026 (replacement eLA continuity, TVN scope, VATAS/LTVAU
transition) as distinct, independently-settable boolean/nullable flags,
verified across all relevant triage paths by test.

## 26. Source-card boundary

Source cards are design/reference cards only, restricted to the four
allowed authority tiers. Every result includes the five required baseline
design source cards (RMC No. 5-2026, RMO No. 1-2026, RMO No. 6-2026, RMC
No. 14-2026, and the uploaded-reference-pattern card). No source card
claims live authority verification is complete or a final legal conclusion
— verified across all 30 supported types by test.

## 27. Authority boundary

No live search, scraping, browsing, OCR, or authority retrieval is
performed. Future official authority sources (bir.gov.ph, lawphil.net,
sc.judiciary.gov.ph, cta.judiciary.gov.ph, officialgazette.gov.ph,
dof.gov.ph, peza.gov.ph, sec.gov.ph, boi.gov.ph) are noted as future
verification targets only. Phase 10 (Authority Search and Research Engine)
is not implemented here.

## 28. Privacy boundary

All fixture examples use sanitized, synthetic identifiers (`SAMPLE
TAXPAYER INC.`, `DEMO LOGISTICS CORP.`, `SYNTHETIC HOLDINGS INC.`, `MODEL
VAT TAXPAYER CORP.`) and placeholder-style numbers. No real taxpayer names,
TINs, LOA/eLA numbers, audit case numbers, addresses, BIR officer names,
client names, or assessment amounts from the user's private reference
materials appear anywhere in this patch — the module additionally rejects
any of these known real fragments on input and scans its own output for
leakage, verified by test.

## 29. Runtime impact

Runtime impact: None. `runtimeActive` is forced `false` in every result;
`scaffoldOnly` is forced `true`; `allowLegalConclusion`,
`allowLiveRetrieval`, and `allowRealTaxpayerData` are forced `false`.

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
  → GATE PASSED / 159 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 34. Decision

**PHASE 09M BIR NOTICE LOA TRIAGE INTENT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 35. Strict recommendations

1. Proceed to PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1.
2. Do not wire BIR notice triage to `/ask` until workflow governance and
   runtime gates approve it.
3. Keep real taxpayer data out of fixtures.
4. Require authority verification before legal conclusions.
5. Preserve 2026 audit-framework flags but do not convert them into
   validity conclusions.
6. Add deeper PAN/FAN/FLD protest workflow next.
7. Add authority-corpus research design before any claim of current
   official legal support.

## 36. Next task

**PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1**

Future plan also includes **PHASE-09-GATE-CLOSURE-1**.
