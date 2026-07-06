# PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1

## 2. Purpose

Create the pure BIR Reply / Protest Draft output-schema scaffold for the
`bir_reply_protest_draft` workflow mode designed in
PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered in
PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This defines the conceptual
structure, required fields, validation rules, BIR document/stage
classification, legal/factual basis structure, attachments/evidence checklist,
source-card requirements, missing-fact requirements, assumption requirements,
taxpayer-position safeguards, and human-review safeguards for future BIR
reply/protest draft output generation. This patch generates no live BIR
replies, protests, position papers, or filings and is not wired into any
runtime path.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `7ec444c PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 add audit defense matrix schema`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A COMPLETE; Phase 9B
  COMPLETE; Phase 9C COMPLETE; Phase 9D COMPLETE; memory INACTIVE; production
  unchanged.
- `workflow/workflow-mode-registry.js`, `workflow/tax-memo-schema.js`, and
  `workflow/audit-defense-matrix-schema.js` were **not** modified by this patch.

## 4. Files changed

- `workflow/bir-reply-draft-schema.js` (new)
- `evaluation/fixtures/phase-09e-bir-reply-draft-scaffold-1.fixture.json` (new)
- `tests/phase-09e-bir-reply-draft-scaffold-1.test.mjs` (new)
- `PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No live BIR reply/protest generation. The schema module has zero
imports, no network calls, no filesystem access, no `process.env` reads, no
`Date.now()`/randomness, and no side effects — verified by the accompanying
test's static source-scan.

## 6. Schema exports

`PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION`, `BIR_REPLY_DRAFT_SCHEMA`,
`BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS`, `BIR_REPLY_DRAFT_REQUIRED_INPUTS`,
`BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS`, `BIR_REPLY_DRAFT_GOVERNANCE_RULES`,
`BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS`, `BIR_REPLY_DRAFT_DOCUMENT_TYPES`,
`BIR_REPLY_DRAFT_ASSESSMENT_STAGES`, `createEmptyBirReplyDraftOutput()`,
`getBirReplyDraftSchema()`, `getBirReplyDraftRequiredInputs()`,
`getBirReplyDraftRequiredOutputSections()`, `getBirReplyDraftGovernanceRules()`,
`getBirReplyDraftDocumentTypes()`, `getBirReplyDraftAssessmentStages()`,
`getBirReplyDraftSourceCardRequirement()`,
`validateBirReplyDraftOutputShape(output)`, `validateBirReplyDraftSchema()`,
`normalizeBirDocumentType(input)`, `normalizeBirAssessmentStage(input)`,
`normalizeBirReplyIssues(issues)`.

All accessor functions return defensive deep-cloned copies; mutating a returned
value never mutates the internal schema (verified by test).

## 7. BIR reply/protest draft schema identity

`mode: "bir_reply_protest_draft"`, `schemaKey: "birReplyDraftOutput"`,
`phase: "09"`, `status: "scaffolded"`, `runtimeWiring: false`,
`featureFlagDefault: "off"`, `humanReviewRequired: true`,
`sourceCardsRequired: true`, `missingFactsRequired: true`,
`assumptionsRequired: true`, `finalFiling: false`,
`automaticSubmission: false`, `liveGeneration: false`,
`persistentStorage: false`.

## 8. Required inputs

`birDocumentType`, `assessmentStage`, `facts`, `issue`, `taxPeriod`,
`amountInvolved`, `availableDocuments` (plus 23 recommended optional inputs:
taxpayerType, rdoOrOffice, letterDate, receivedDate, deadline, loaDate,
panDate, fanDate, fddaDate, nodDate, subpoenaDate, taxType, transactionType,
deficiencyTaxType, assessmentNumber, docketOrReferenceNumber, birFindings,
taxpayerPosition, knownAuthorities, unavailableDocuments, intendedAudience,
requestedRelief, desiredTone, userAssumptions).

## 9. Required output sections

Stable canonical order: `background`, `assessmentIssue`, `taxpayerPosition`,
`legalBasis`, `factualDocumentaryBasis`, `requestedAction`,
`attachmentsEvidenceChecklist`, `caveats`, `assumptions`, `missingFacts`,
`sourceCards`, `humanReviewNotice`.

## 10. Required top-level fields

`mode`, `schemaKey`, plus the 12 output sections above, plus `metadata` — where
`metadata` conceptually carries `generatedBy`, `workflowMode`,
`schemaVersion`, `birDocumentType`, `assessmentStage`, `retrievalPolicy`,
`authorityPolicy`, `sourceCardPolicy`, `privacyPolicy`, `finalFiling`,
`automaticSubmission`, `runtimeWiring`, `featureFlagDefault`.

## 11. BIR document types

`loa`, `pan`, `fan`, `fdda`, `nod`, `subpoena`, `notice`, `assessment_notice`,
`letter_notice`, `request_for_documents`, `other`, `unknown`.
`normalizeBirDocumentType()` maps aliases (e.g. "LOA"/"letter of authority" →
`loa`; "FAN"/"formal assessment notice"/"FLD"/"formal letter of demand" →
`fan`; "FDDA"/"final decision on disputed assessment" → `fdda`) and defaults
any blank/null/unsupported input to `unknown`, never throwing.

## 12. Assessment stages

`audit`, `loa`, `pan_reply`, `fan_protest`, `reinvestigation`,
`reconsideration`, `fdda_appeal`, `nod_response`, `subpoena_response`,
`document_submission`, `administrative_response`, `court_litigation`, `other`,
`unknown`. `normalizeBirAssessmentStage()` maps aliases (e.g. "protest"/"FAN
protest" → `fan_protest`; "court"/"litigation"/"CTA" → `court_litigation`) and
defaults any blank/null/unsupported input to `unknown`, never throwing.

## 13. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl` and
`canonicalSourceId` are **not** required in Phase 9; if `officialUrl` is absent,
output must not claim official URL verification. Future Phase 10 (not
implemented here): `officialUrl` primary, `archiveUrl` secondary,
`canonicalSourceId` internal source of truth, plus `fileHash`, `retrievedAt`,
`lastVerifiedAt`, `currentnessStatus`, `reviewStatus`, `sourceLineage`,
`supersedes`/`supersededBy`.

## 14. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 15. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required; evidence gaps disclosed; no guaranteed BIR outcome.

## 16. Deadline boundary

A deadline may be included only if the user provides a date or a reliable
basis; no false timeliness assurance; if a deadline or currentness is
uncertain, that uncertainty must be disclosed; no automatic filing or
submission is implied or performed.

## 17. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence; no
memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 18. Prohibited behaviors

`fabricated_authority`, `unsupported_legal_conclusion`, `final_filing_claim`,
`automatic_submission`, `live_web_search`, `new_authority_ingestion`,
`unapproved_source_citation`, `memory_write`, `client_matter_persistence`,
`generated_work_product_persistence`, `third_party_egress`,
`production_change`, `official_url_verification_claim_without_official_url`,
`currentness_claim_without_currentness_status`, `guaranteed_bir_outcome_claim`,
`taxpayer_position_without_factual_basis`, `unlabeled_bir_document_type`,
`unlabeled_assessment_stage`, `deadline_claim_without_date_basis`,
`false_timeliness_assurance`.

## 19. Validation summary

```
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
  → GATE PASSED / 150 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 20. Decision

**PHASE 09E BIR REPLY DRAFT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 21. Strict recommendations

1. Keep this schema unwired — do not import it from ask-handler.js, pipeline.js,
   server.js, routes, or the frontend until PHASE-09H is explicitly approved.
2. Keep `runtimeWiring: false` and `featureFlagDefault: "off"` on the schema
   until that approval.
3. Do not implement Phase 10 source-card upgrades or Phase 11 retrieval
   optimization inside this or any other Phase 9 scaffold patch.
4. Do not activate memory or persist client/matter data from this schema or any
   consumer of it.
5. Never claim official URL verification is complete when `officialUrl` is
   absent, never claim a guaranteed BIR outcome, and never assert a deadline or
   timeliness without a disclosed date basis — all enforced conceptually via
   `prohibitedBehaviors` (`official_url_verification_claim_without_official_url`,
   `guaranteed_bir_outcome_claim`, `deadline_claim_without_date_basis`,
   `false_timeliness_assurance`).
6. Every taxpayer position must depend on disclosed facts
   (`taxpayer_position_must_depend_on_facts`); every output must clearly label
   the BIR document type and assessment stage
   (`bir_document_type_must_be_labeled`, `assessment_stage_must_be_labeled`).
7. Every output is a draft only, never a final filing
   (`draft_only_not_final_filing`) — no automatic submission is implied.
8. Preserve the `sourceCardsRequired`/`missingFactsRequired`/
   `assumptionsRequired`/`humanReviewRequired` invariants in every subsequent
   per-mode schema scaffold (Phase 9F).
9. Do not claim live BIR reply/protest generation is implemented — this is a
   schema scaffold only.

## 22. Next task

**PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1** — pure schema and fixture
for the Client Advisory and Compliance Checklist outputs.
