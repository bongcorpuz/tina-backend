# PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1

## 2. Purpose

Implement a controlled, non-live runtime-wiring scaffold for the narrow
LOA/eLA live-answer query family "I received a BIR LOA, what should I
do?". This patch turns the completed 09X design into a pure, callable
module that can classify narrow LOA/eLA procedural-help intent, reject or
downgrade validity/finality/CTA/protest/filing-ready/automatic-submission
requests, and generate a procedural-safe LOA answer preview drawing on
09L/09M/09S/09P/09O/09Q concepts — without wiring anything to `/ask`,
`ask-handler.js`, `pipeline.js`, server routes, auth, retrieval, or
source-card engines. Live `/ask` behavior remains unchanged until a
separately approved future runtime activation patch
(PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1 or equivalent).

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `1324061 PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1 design controlled loa answer wiring`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 9 formally CLOSED, scaffold-complete, governance-safe,
  non-runtime-active. Phase 9X controlled LOA runtime-wiring design
  complete. Internal LOA answer modeling: PASS. Runtime wiring design:
  PASS. Live `/ask` implementation: NOT YET.
- No existing Phase 9 workflow file, route file, server file, or runtime
  file required modification for this scaffold.

## 4. Files changed

- `workflow/controlled-loa-answer-runtime-scaffold.js` (new)
- `evaluation/fixtures/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.fixture.json` (new)
- `tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs` (new)
- `PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

No existing Phase 9 workflow file, route file, server file, or runtime
file was created or modified by this patch.

## 5. Scaffold type

Controlled, pure, non-live runtime-wiring scaffold. No `/ask` activation,
no production deployment, no DB migration, no external authority
retrieval.

## 6. Controlled LOA answer scaffold behavior

`workflow/controlled-loa-answer-runtime-scaffold.js` exports a mode id,
version constant, supported/excluded intent lists, supported response
mode and safety gate lists, an input normalizer, an intent classifier, an
input validator, a result builder
(`createControlledLoaAnswerRuntimeScaffoldResult`), and a result
validator. It accepts a `userQuery`, an optional `context` object of
detection hints, `options` (all forced to their safe values regardless of
caller input), and `sourceCards`. It classifies the query into either a
supported procedural-help intent or an excluded intent requiring human
review, then builds a `controlledAnswer` object, a `phase9ScaffoldUsePlan`,
`safetyGateResults`, a `sourceCardPolicy`, and a `safeResponsePreview` —
all with `runtimeActive: false` and `liveAskWired: false` fixed.

## 7. Supported LOA intents

11 total: `BIR_LOA_RECEIVED_WHAT_TO_DO`, `BIR_ELA_RECEIVED_WHAT_TO_DO`,
`LETTER_OF_AUTHORITY_FIRST_STEPS`, `BIR_LOA_DOCUMENTS_TO_PREPARE`,
`BIR_ELA_DETAILS_TO_CHECK`, `REPLACEMENT_ELA_RECEIVED_PROCEDURAL_REVIEW`,
`CONSOLIDATED_ELA_RECEIVED_PROCEDURAL_REVIEW`, `LOA_CHECKLIST_RECEIVED`,
`NOTICE_FOR_PRESENTATION_SUBMISSION_RECEIVED`,
`PRE_SUBPOENA_REMINDER_RECEIVED`, `UNKNOWN_SAFE_LOA_HELP`.

## 8. Excluded LOA intents

13 total: `LOA_VALIDITY_CONCLUSION_REQUEST`,
`ELA_VOIDNESS_CONCLUSION_REQUEST`, `IGNORE_LOA_REQUEST`,
`BIR_ASSESSMENT_POWER_CONCLUSION_REQUEST`, `ASSESSMENT_FINALITY_REQUEST`,
`CTA_STRATEGY_REQUEST`, `FAN_VOIDNESS_REQUEST`,
`FDDA_APPEALABILITY_CONCLUSION_REQUEST`, `OUTCOME_PREDICTION_REQUEST`,
`FILING_READY_PROTEST_REQUEST`, `AUTOMATIC_BIR_SUBMISSION_REQUEST`,
`LEGAL_OPINION_REQUEST`, `UNKNOWN_UNSAFE_REQUEST`.

## 9. Supported response modes

8 total: `SAFE_BASIC_LOA_GUIDANCE`, `REPLACEMENT_ELA_REVIEW_GUIDANCE`,
`CONSOLIDATED_ELA_REVIEW_GUIDANCE`, `DOCUMENT_CHECKLIST_GUIDANCE`,
`PRE_SUBPOENA_ESCALATION_GUIDANCE`, `UNKNOWN_BIR_NOTICE_GUIDANCE`,
`HUMAN_REVIEW_REQUIRED`, `AUTHORITY_FALLBACK_REQUIRED`.

## 10. Supported safety gates

12 total: `NARROW_LOA_INTENT_GUARD`, `SCOPE_GUARD`,
`NO_VALIDITY_CONCLUSION_GATE`, `NO_FINALITY_CONCLUSION_GATE`,
`NO_PRESCRIPTION_CONCLUSION_GATE`, `NO_CTA_STRATEGY_CONCLUSION_GATE`,
`NO_FILING_READY_OUTPUT_GATE`, `NO_AUTOMATIC_SUBMISSION_GATE`,
`NO_REAL_TAXPAYER_DATA_GATE`, `SOURCE_CARD_DISCIPLINE_GATE`,
`HUMAN_REVIEW_NOTICE_GATE`, `RUNTIME_NOT_WIRED_GATE`.

## 11. Input normalization evidence

`normalizeControlledLoaAnswerInput` trims `userQuery`, defaults missing
`context`/`options`/`sourceCards`, and always forces `scaffoldOnly: true`,
`runtimeActive: false`, `liveAskWired: false`, `allowLegalConclusion:
false`, `allowLiveRetrieval: false`, `allowRealTaxpayerData: false`,
`generateFilingReadyDocument: false`, and `automaticSubmission: false`
regardless of caller input. It never infers a final legal status and
never marks live `/ask` wiring as active.

## 12. Intent classification evidence

`classifyControlledLoaIntent` checks excluded patterns first (filing-ready
requests, automatic-submission requests, legal-opinion requests,
ignore-the-notice requests, BIR-assessment-power questions, finality
questions, CTA-strategy questions, FAN-voidness questions,
FDDA-appealability questions, outcome-prediction questions, and validity/
voidness questions) before checking supported procedural-help patterns
(pre-subpoena, checklist, notice-for-presentation, replacement eLA,
consolidated eLA, documents-to-prepare, eLA-basic, LOA-basic), so a query
that merely mentions "LOA" alongside a validity/finality/strategy demand
is never misclassified as safe guidance. All 12 fixture sample queries
(8 supported, 4 excluded) classify exactly as expected, verified by test.

## 13. Controlled answer output evidence

For every supported intent, `controlledAnswer` includes
`proceduralGuidance` (preserve date/manner of receipt; keep a copy;
verify via the BIR REVIE / LOA Verifier process under RMC No. 5-2026 where
relevant; classify as original/replacement/consolidated eLA, TVN, Mission
Order, checklist, notice for presentation/submission, or pre-subpoena
reminder; avoid unnecessary admissions; human review closing statement),
`detailsToCheck` (11 items: taxpayer name, TIN, taxable period, tax types,
issuing office, LOA/eLA number, audit case number, RO, GS, signatory,
documents requested), `documentComplianceSteps` (document compliance
matrix, status classification, controlled transmittal),
`receivingProofSteps` (BIR receiving stamp/email acknowledgement/courier
proof), `substituteProofWarnings` (never fabricate; use substitute proof),
`auditStageWatch` (additional document request through CTA appeal-watch),
`authorityVerificationNotice`, and `humanReviewNotice`. For excluded
intents, `controlledAnswer` instead returns a fallback/human-review
framing with no procedural-detail content.

## 14. Phase 9 scaffold use plan evidence

`phase9ScaffoldUsePlan` always sets `use09LProceduralFallback`,
`use09MNoticeTriage`, `use09S2026BaselineSignals`,
`use09PDocumentCompliance`, `use09OAuditDefenseMatrix`, and
`use09QAuthorityCorpusRequirement` all `true`, and `runtimeWiredNow`
always `false`.

## 15. Safety gate results evidence

`safetyGateResults` always sets all 12 fields (`narrowLoaIntentGuard`,
`scopeGuard`, `noValidityConclusion`, `noFinalityConclusion`,
`noPrescriptionConclusion`, `noCtaStrategyConclusion`,
`noFilingReadyOutput`, `noAutomaticSubmission`, `noRealTaxpayerData`,
`sourceCardDiscipline`, `humanReviewNoticePresent`, `runtimeNotWired`)
`true` — verified by test across all classification outcomes.

## 16. Source-card policy evidence

`sourceCardPolicy.verifiedSourceCardsAvailable` and `.legalCitationAllowed`
are always `false` (this scaffold performs no live retrieval and cannot
verify any source card). `requiredFutureAuthorityCategories` lists all 8
required categories: RMC No. 5-2026, RMO No. 1-2026, RMO No. 6-2026, RMC
No. 14-2026, RR No. 18-2013, NIRC Sec. 228, RR No. 12-99 as amended, and
CTA rules (appeal-watch only).

## 17. Safe response preview evidence

`safeResponsePreview` always includes the literal phrases "This is
procedural guidance only." and "Human tax/legal review remains required
...", and never contains any of the 18 documented prohibited legal-
conclusion phrases (validity/invalidity/voidness claims, "BIR cannot
assess" claims, "ignore it" claims, guaranteed-outcome claims,
"assessment is cancelled" claims, final-legal-opinion/official-legal-
advice claims, filing-ready claims, or automatic-submission claims) —
verified by test for both the supported and excluded response variants.

## 18. Unsupported/excluded query behavior evidence

Validity, voidness, ignore-the-notice, BIR-assessment-power, finality,
CTA-strategy, FAN-voidness, FDDA-appealability, outcome-prediction,
filing-ready, automatic-submission, and legal-opinion queries all classify
as excluded with `responseMode` set to `HUMAN_REVIEW_REQUIRED` (or
`AUTHORITY_FALLBACK_REQUIRED` for validity/voidness questions
specifically) and receive the fallback `controlledAnswer` framing with no
procedural-detail content, never a final conclusion.

## 19. Non-runtime boundary evidence

`runtimeActive` and `liveAskWired` are `false` in every result and in the
module's own `metadata`. This module is not imported by `ask-handler.js`,
`pipeline.js`, `server.js`, or any route, and has no dependency on
authentication or the Express/server runtime. Live LOA `/ask` behavior is
unchanged by the mere existence of this module. This patch states each of
the following required exact statements:

Runtime impact: None.
Ask-handler impact: None.
Route impact: None.
Server impact: None.
Pipeline impact: None.
Feature flag impact: None.
Memory impact: None.
Persistence impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
/ask impact: None.
Runtime implementation impact: Scaffold only.
Live LOA /ask behavior changed: No.

## 20. External operation boundary evidence

This patch states each of the following:

External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.

No live retrieval, external search, scraping, download, OCR, ingestion,
embedding, database writes, OpenAI/Supabase/Google Drive/n8n/Firecrawl/
Crawlee/MCP calls, external HTTP calls, or environment secret access are
implemented anywhere in this module — verified by static source scan
(zero imports, zero matches for any forbidden call-syntax pattern).

## 21. Privacy boundary evidence

All fixture sample queries and generated sample outputs use generic,
non-taxpayer-specific phrasing. No real taxpayer names, TINs, LOA/eLA
numbers, audit case numbers, BIR officer names, or exact assessment
amounts from the user's private reference materials appear anywhere in
this patch — the module additionally rejects any of these known real
fragments on input, verified by test.

## 22. Legal-safety boundary evidence

Neither the module's own self-check (`validateControlledLoaAnswerResult`)
nor any fixture/report content permits any of the 18 documented prohibited
legal-conclusion phrases. No result ever claims that any LOA, eLA,
replacement eLA, consolidated eLA, PAN, FAN, FLD, FDDA, assessment,
protest, or BIR action is valid, invalid, void, cancelled, final,
enforceable, appealable, or legally conclusive. `humanReviewNotice` is
preserved in every result.

## 23. Runtime governance boundary

This patch is a controlled scaffold only and does not activate `/ask`
behavior. Calling this module from a live request path requires a
separately approved future wiring gate
(PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1 or equivalent). Runtime
activation remains not approved by this patch.

## 24. Future 09Z implementation boundary

PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1 is the next expected
task if controlled live LOA answering remains the immediate priority. It
must wire this scaffold (or an equivalent) into `/ask` behind an
explicitly approved gate, preserving every safety gate and boundary
established by this patch.

## 25. Phase 10 boundary

Not implemented by this patch. Phase 10 — Evaluation / Fact-Check /
Legal-Tax QA System — remains an alternative next phase if broader
reliability work is preferred before runtime activation.

## 26. Authority ingestion boundary

No live authority ingestion, search, or retrieval is implemented or
performed by this patch. 09Q's authority corpus research design remains
the design-only prerequisite for any future, separately approved authority
ingestion phase.

## 27. Memory/persistence boundary

Memory remains inactive; no persistence, client/matter storage, or
generated-work-product storage is introduced by this patch. Any future
memory/persistence phase requires separate approval.

## 28. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced by this patch. No MCP runtime integration
exists. No MCP test calls were made by this patch's test.

## 29. Mobile app deferral evidence

Mobile app work remains deferred until after Phase 13. No mobile app
artifacts were introduced by this patch.

## 30. Validation summary

```
node tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs
  → PASS / 30 passed / 0 failed / 629 assertions

node tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 180 assertions

node tests/phase-09-gate-closure-1.test.mjs
  → PASS / 29 passed / 0 failed / 1504 assertions

node tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs
  → PASS / 76 passed / 0 failed / 363 assertions

node tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 467 assertions

node tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs
  → PASS / 36 passed / 0 failed / 333 assertions

node tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 605 assertions

node tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs
  → PASS / 35 passed / 0 failed / 336 assertions

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
  → GATE PASSED / 167 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 31. Decision

**PHASE 09Y CONTROLLED LOA ANSWER RUNTIME WIRING SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 32. Strict recommendations

1. Proceed to PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1 only if
   controlled live LOA answering remains the immediate priority.
2. Do not activate the 09Y scaffold in `/ask` without a separate wiring
   gate.
3. Keep the LOA intent guard narrow.
4. Preserve fallback/human-review behavior for validity, finality,
   prescription, CTA strategy, protest strategy, filing-ready output, and
   automatic submission requests.
5. Preserve source-card discipline: no legal citation unless verified
   source cards are available.
6. Preserve no final legal conclusion.
7. Preserve no filing-ready document generation.
8. Preserve no automatic BIR submission.
9. If broader reliability is preferred before runtime activation, proceed
   to Phase 10 first.

## 33. Next task

**PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1**, if controlled live
LOA answering remains the immediate priority.

## 34. Alternative next phase

**PHASE 10 — Evaluation / Fact-Check / Legal-Tax QA System**.
