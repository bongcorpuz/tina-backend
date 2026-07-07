# PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1

## 2. Purpose

Implement a design-only, non-runtime-active scaffold that integrates the
2026 BIR audit-procedure baseline (RMO No. 1-2026, RMO No. 6-2026, RMC No.
14-2026, RMC No. 8-2026, RMC No. 5-2026, RMC No. 107-2025, RR No. 18-2013,
RR No. 12-99 as amended, NIRC Sec. 203/222/228/232, CTA rules, LOA/eLA
jurisprudence, assessment due-process jurisprudence, and prescription
jurisprudence) into TINA's Phase 9 BIR Audit Defense workflow layer as
design-level review signals only. This patch does not decide legal
validity — it never determines that any LOA, eLA, replacement eLA,
consolidated eLA, PAN, FAN, FLD, FDDA, assessment, protest, document
request, or BIR action is valid, invalid, void, cancelled, final,
enforceable, appealable, or legally conclusive.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `4d88ee6 PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1 add authority corpus research design`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; Phase 9L procedural fallback scaffold
  COMPLETE; Phase 9M BIR notice/LOA triage intent scaffold COMPLETE; Phase
  9N PAN/FAN/FLD/protest workflow scaffold COMPLETE; Phase 9O BIR audit
  defense matrix scaffold COMPLETE; Phase 9P BIR document compliance/
  transmittal scaffold COMPLETE; Phase 9Q BIR authority corpus research
  design COMPLETE; memory INACTIVE; production unchanged; MCP deferred
  until after the final planned phase (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/bir-2026-audit-baseline-integration.js` (new)
- `evaluation/fixtures/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.fixture.json` (new)
- `tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs` (new)
- `PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1_REPORT.md` (new)
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
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
/ask impact: None. This module is not imported by `ask-handler.js`,
`pipeline.js`, `server.js`, or any route, and is not reachable from the
`/ask` request path in any way.

The scaffold module has zero imports (fully standalone), performs no I/O, no
network calls, no OCR, reads no `process.env`, uses no `Date.now()`/
randomness, and has no side effects — verified by static source scan.

## 6. Scaffold behavior summary

`workflow/bir-2026-audit-baseline-integration.js` exports a mode id,
version constant, supported topic/authority-reference/signal-type/route/
risk-level lists, an input normalizer, an input validator, a result builder
(`createBir2026AuditBaselineIntegrationResult`), and a result validator. It
accepts a `userQuery`, a `scenarioFacts` object (notice type/dates,
replacement-eLA facts, consolidation facts, VAT/VATAS-LTVAU facts, TVN
facts, document-request facts, waiver/conformity facts), an optional
`targetTopics` list, and `sourceCards`, and builds `baselineSignals` (one
per triggered 2026 baseline topic) plus dedicated `replacementElaReview`,
`consolidationReview`, `vatTransitionReview`, `documentRequestReview`,
`tvnReview`, `proceduralSafeguards`, and `integrationRoutes` sections. Every
runtime/legal/live/real-data/filing/submission option flag is always
forced to its safe value regardless of caller input, and topics not
explicitly requested are still auto-derived from scenario facts so the
scaffold never silently misses a review signal.

## 7. Supported baseline topics

35 total (excluding `UNKNOWN_2026_BASELINE_TOPIC`, 36 including it):
`SINGLE_INSTANCE_AUDIT_FRAMEWORK`, `ONE_ELA_PER_TAXABLE_YEAR`,
`ALL_TAX_TYPES_IN_ONE_ELA`, `CONSOLIDATION_OF_PENDING_ELAS`,
`REPLACEMENT_ELA_FOR_CONSOLIDATION`, `REPLACEMENT_ELA_FOR_CONTINUITY`,
`PRIOR_LOA_ELA_VALIDITY`, `PROSPECTIVE_APPLICATION_OF_RMO_1_2026`,
`MULTIPLE_ELAS_SAME_TAXPAYER_YEAR`, `VAT_NON_CONSOLIDATION_REQUEST`,
`VATAS_LTVAU_TRANSITION`, `VAT_REFUND_TRANSITION`, `MISSION_ORDER`,
`TAX_VERIFICATION_NOTICE`, `TVN_LIMITED_SCOPE`,
`TVN_SCOPE_EXPANSION_RISK`, `STANDARDIZED_CHECKLIST`,
`ADDITIONAL_DOCUMENT_REQUEST_LIMITS`,
`DOCUMENT_REQUEST_RELEVANCE_NECESSITY_SCOPE`, `VOLUMINOUS_RECORDS`,
`ON_PREMISE_EXAMINATION`, `CERTIFIED_COPY_SUBMISSION`,
`NOD_DOD_DOCUMENTATION`, `PAN_CONSOLIDATION_SAFEGUARDS`,
`CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD`, `FAN_CONSOLIDATION_SAFEGUARDS`,
`CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD`, `FDDA_NO_CONSOLIDATION`,
`FINAL_EXECUTORY_FAN_NO_CONSOLIDATION`, `PROPER_SERVICE`,
`WRITTEN_CONFORMITY_TO_CONSOLIDATION`, `WAIVER_OF_PRESCRIPTION`,
`NO_REGRESSION_RULE`,
`PRIOR_NOTICES_CHECKLISTS_SUBPOENAS_UNDER_REPLACEMENT_ELA`,
`AUDIT_SAFEGUARDS`, `UNKNOWN_2026_BASELINE_TOPIC`.

## 8. Supported authority references

17 total: `RMO_NO_1_2026`, `RMO_NO_6_2026`, `RMC_NO_14_2026`,
`RMC_NO_8_2026`, `RMC_NO_5_2026`, `RMC_NO_107_2025`, `RR_NO_18_2013`,
`RR_NO_12_99_AS_AMENDED`, `NIRC_SEC_203`, `NIRC_SEC_222`, `NIRC_SEC_228`,
`NIRC_SEC_232`, `CTA_RULES`, `LOA_ELA_JURISPRUDENCE`,
`ASSESSMENT_DUE_PROCESS_JURISPRUDENCE`, `PRESCRIPTION_JURISPRUDENCE`,
`UNKNOWN_AUTHORITY_REFERENCE`.

## 9. Supported signal types

13 total: `authority_timing_signal`, `replacement_ela_signal`,
`consolidation_signal`, `vat_transition_signal`,
`document_request_signal`, `notice_stage_signal`, `deadline_signal`,
`service_signal`, `prescription_signal`, `scope_signal`,
`safeguard_signal`, `human_review_signal`, `unknown_signal`.

## 10. Supported routes

8 total: `AUTHORITY_SAFE_PROCEDURAL_FALLBACK`, `BIR_NOTICE_TRIAGE`,
`PAN_FAN_FLD_PROTEST_WORKFLOW`, `BIR_AUDIT_DEFENSE_MATRIX`,
`DOCUMENT_COMPLIANCE_TRANSMITTAL`, `AUTHORITY_CORPUS_RESEARCH`,
`HUMAN_TAX_LEGAL_REVIEW`, `PHASE_09_GATE_CLOSURE_REVIEW`.

## 11. Supported risk levels

5 total: `low`, `medium`, `high`, `critical`, `unknown`.

## 12. Baseline summary evidence

`baselineSummary` always reports `totalTopics`, `triggeredTopics`,
`authorityReferencesNeeded` (deduplicated across all triggered signals),
`liveAuthorityVerificationPerformed: false`, `legalConclusionProvided:
false`, `humanReviewRequired: true`, and a `confidence` tier ("high" when
`scenarioFacts.noticeType` is supplied, otherwise "medium"/"low" by topic
count). `AUDIT_SAFEGUARDS` is always included so `triggeredTopics` is
never empty.

## 13. Baseline signals evidence

Every triggered topic produces one `baselineSignals` entry with `topic`,
`signalType`, `riskLevel`, `authorityReferencesNeeded`, `factsConsidered`,
a validity-neutral `safeInterpretation`, a topic-specific
`prohibitedConclusion` label set, `recommendedRoute`, and
`humanReviewRequired: true`.

## 14. Replacement eLA review evidence

`replacementElaReview` sets `replacementElaSignal`,
`continuityReasonPresent` (true when `replacementReason` indicates
continuity/reassignment/restructuring/substitution), tri-state
`sameTaxpayer`/`sameTaxablePeriod`/`sameScope`, `scopeExpansionRisk`/
`taxablePeriodExpansionRisk` (true when the corresponding fact is false or
unknown), and always checks `properServiceCheckNeeded`/
`rmc14ReviewNeeded`/`rmo1ReviewNeeded`/`rmo6ReviewNeeded` when a
replacement eLA is present.

## 15. Consolidation review evidence

`consolidationReview` always sets `consolidationRequiredCannotBeConcluded:
true` and `consolidationProhibitedCannotBeConcluded: true`, and derives
`consolidationPotential`, `freshPanResponsePeriodPotential`,
`freshFanProtestPeriodPotential`, `noRegressionRuleCheckNeeded`,
`properServiceCheckNeeded`, `writtenConformityCheckNeeded`, and
`waiverCheckNeeded` from the underlying scenario facts, without deciding
whether consolidation is required or prohibited.

## 16. VAT transition review evidence

`vatTransitionReview` reflects `vatAuditInvolved`, `vatasOrLtvauInvolved`,
`vatRefundTransitionPotential`, and derives
`vatNonConsolidationPotential`/`vatNonConsolidationDeadlineRelevant` when
a VAT audit and either multiple same-year authorities or VATAS/LTVAU
involvement are both present.

## 17. Document request review evidence

`documentRequestReview` derives `standardizedChecklistCheckNeeded`,
`additionalRequestLimitCheckNeeded`/`relevanceCheckNeeded`/
`necessityCheckNeeded`/`auditScopeCheckNeeded`/
`explanationDocumentationCheckNeeded` from additional-document-request
facts, and `voluminousRecordsCheckNeeded`/`onPremiseExaminationPotential`/
`certifiedCopySubmissionPotential` from voluminous-records facts.

## 18. TVN review evidence

`tvnReview` sets `tvnLimitedScopeCheckNeeded` when a TVN is involved,
`tvnScopeExpansionRisk` when scope expansion is indicated, and always sets
`separateElaMayBeNeededForBroaderAuditCannotBeConcluded: true`.

## 19. Procedural safeguards evidence

`proceduralSafeguards` always sets `properServiceCheckNeeded`,
`dueProcessCheckNeeded`, `statementOfFactsAndLawCheckNeeded`,
`prescriptionCheckNeeded`, and `humanReviewRequired` true, and derives
`priorNoticeConsistencyCheckNeeded`/`noRegressionRuleCheckNeeded` from
replacement-eLA and consolidation signals.

## 20. Integration routes evidence

`integrationRoutes` always sets `authoritySafeFallback`,
`authorityCorpusResearch`, and `humanReview` true; sets `noticeTriage` when
a notice type is supplied; sets `protestWorkflow` when PAN/FAN/FDDA/
finality facts are present; sets `documentComplianceTransmittal` when
document-request/voluminous-records/checklist facts or a notice type are
present; and sets `gateClosureReview` true as a standing Phase 9 closure
checkpoint.

## 21. Source-card boundary

Source cards are design/reference cards only, restricted to the allowed
authority tiers. Every result includes the six required baseline design
source cards (RMO No. 1-2026 single-instance audit baseline, RMO No.
6-2026 consolidation safeguards, RMC No. 14-2026 replacement eLA and
transition clarification, RMC No. 5-2026 LOA/eLA verification reference,
RR No. 18-2013/NIRC Sec. 228 assessment procedure reference, and the
private 2026 audit workflow reference pattern). No source card claims
completed authority verification — verified by test.

## 22. Authority boundary

No live search, scraping, browsing, OCR, downloading, ingestion,
embedding, or database write is performed. 2026 audit-baseline authorities
are referenced as design/review checkpoints only. Phase 10 (Authority
Search and Research Engine) is not implemented here.

## 23. Privacy boundary

All fixture examples use synthetic taxpayer names and placeholder-style
numbers/amounts/dates. No real taxpayer names, TINs, LOA/eLA numbers,
audit case numbers, addresses, BIR officer names, client names, or exact
assessment amounts from the user's private reference materials appear
anywhere in this patch — the module additionally rejects any of these
known real fragments on input and scans its own output for leakage,
verified by test.

## 24. Runtime boundary

`runtimeActive`, `allowLegalConclusion`, `allowLiveRetrieval`,
`allowRealTaxpayerData`, `generateFilingReadyDocument`, and
`automaticSubmission` are all forced to their safe values in every result
regardless of caller input. This module is not imported by
`ask-handler.js`, `pipeline.js`, `server.js`, or any route, and has no
dependency on authentication or the Express/server runtime.

## 25. Phase 10 boundary

Not implemented by this patch.

## 26. Phase 11 boundary

Not implemented by this patch.

## 27. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced. No MCP runtime integration exists. No MCP
test calls were made by this patch's test.

## 28. Validation summary

```
node tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs
  → PASS / 76 passed / 0 failed / 362 assertions

node tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 466 assertions

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
  → GATE PASSED / 164 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 29. Decision

**PHASE 09S 2026 BIR AUDIT BASELINE INTEGRATION SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 30. Strict recommendations

1. Proceed to PHASE-09-GATE-CLOSURE-1.
2. Do not wire 2026 audit baseline integration to `/ask` until governance
   and runtime gates approve it.
3. Preserve scaffold-only behavior until Phase 9 closure gate passes.
4. Require official-source verification before legal conclusions.
5. Treat 2026 baseline signals as review triggers, not validity
   conclusions.
6. Keep real taxpayer data out of fixtures.
7. Before runtime activation, test one controlled LOA question end-to-end
   using synthetic data.

## 31. Next task

**PHASE-09-GATE-CLOSURE-1**
