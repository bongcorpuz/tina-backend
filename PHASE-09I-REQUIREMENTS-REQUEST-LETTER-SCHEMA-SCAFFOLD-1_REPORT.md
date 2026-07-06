# PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1

## 2. Purpose

Create the pure Requirements Request Letter output-schema scaffold for the
`requirements_request_letter` workflow mode designed in
PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered in
PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1, closing the dedicated-schema gap
acknowledged as registry-only/pending in PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1
and PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1. This defines the
conceptual structure, required fields, validation rules, recipient/context
structure, required-document request structure, deadline/timing cautions,
professional-tone safeguards, source-card requirements, missing-fact
requirements, assumption requirements, and human-review safeguards for future
requirements request letter output generation. This patch generates no live
requirements request letters, does not activate runtime wiring for this mode,
and does not modify the Phase 9G governance gate or the Phase 9H runtime
policy.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `6418f82 PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1 add runtime wiring policy`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A–9H COMPLETE; memory
  INACTIVE; production unchanged.
- All eight existing Phase 9 workflow files
  (`workflow-mode-registry.js`, `tax-memo-schema.js`,
  `audit-defense-matrix-schema.js`, `bir-reply-draft-schema.js`,
  `client-advisory-schema.js`, `compliance-checklist-schema.js`,
  `workflow-output-governance-gate.js`, `workflow-runtime-wiring-policy.js`)
  were **not** modified by this patch.

## 4. Files changed

- `workflow/requirements-request-letter-schema.js` (new)
- `evaluation/fixtures/phase-09i-requirements-request-letter-schema-scaffold-1.fixture.json` (new)
- `tests/phase-09i-requirements-request-letter-schema-scaffold-1.test.mjs` (new)
- `PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No live requirements request letter generation. The Phase 9G
governance gate and the Phase 9H runtime-wiring policy were **not** modified —
this patch is schema-only. The schema module has zero imports, no network
calls, no filesystem access, no `process.env` reads, no `Date.now()`/
randomness, and no side effects — verified by the accompanying test's static
source-scan.

## 6. Schema exports

`PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION`,
`REQUIREMENTS_REQUEST_LETTER_SCHEMA`,
`REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS`,
`REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS`,
`REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS`,
`REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES`,
`REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS`,
`REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES`,
`REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS`,
`REQUIREMENTS_REQUEST_LETTER_TONE_VALUES`,
`createEmptyRequirementsRequestLetterOutput()`,
`createEmptyRequirementsRequestItem()`, `getRequirementsRequestLetterSchema()`,
`getRequirementsRequestLetterRequiredInputs()`,
`getRequirementsRequestLetterRequiredOutputSections()`,
`getRequirementsRequestLetterGovernanceRules()`,
`getRequirementsRequestLetterAudienceTypes()`,
`getRequirementsRequestLetterRequestContexts()`,
`getRequirementsRequestLetterToneValues()`,
`getRequirementsRequestLetterSourceCardRequirement()`,
`validateRequirementsRequestLetterOutputShape(output)`,
`validateRequirementsRequestItemShape(item)`,
`validateRequirementsRequestLetterSchema()`,
`normalizeRequirementsRequestTopics(topics)`,
`normalizeRequirementsRequestAudienceType(input)`,
`normalizeRequirementsRequestContext(input)`,
`normalizeRequirementsRequestTone(input)`. All accessor functions return
defensive deep-cloned copies; mutating a returned value never mutates the
internal schema (verified by test).

## 7. Requirements Request Letter schema identity

`mode: "requirements_request_letter"`,
`schemaKey: "requirementsRequestLetterOutput"`, `phase: "09"`,
`status: "scaffolded"`, `runtimeWiring: false`, `featureFlagDefault: "off"`,
`humanReviewRequired: true`, `sourceCardsRequired: true`,
`missingFactsRequired: true`, `assumptionsRequired: true`,
`finalFiling: false`, `automaticSubmission: false`, `liveGeneration: false`,
`persistentStorage: false`.

## 8. Required inputs

`requestContext`, `recipientType`, `purpose`, `facts`,
`requestedDocumentsOrInformation`, `intendedUse` (plus 16 recommended optional
inputs: taxpayerType, taxPeriod, deadline, senderRole, recipientName,
recipientOrganization, communicationChannel, desiredTone, urgency,
availableDocuments, missingDocuments, knownAuthorities, engagementContext,
matterReference, userAssumptions, requestedFormat).

## 9. Required output sections

Stable canonical order: `subject`, `salutation`, `openingContext`,
`purposeOfRequest`, `requirementsRequested`, `deadlineOrTiming`,
`submissionInstructions`, `closingStatement`, `assumptions`, `missingFacts`,
`sourceCards`, `humanReviewNotice`.

## 10. Required top-level fields

`mode`, `schemaKey`, plus the 12 output sections above, plus `metadata` —
where `metadata` conceptually carries `generatedBy`, `workflowMode`,
`schemaVersion`, `requestContext`, `recipientType`, `tone`, `retrievalPolicy`,
`authorityPolicy`, `sourceCardPolicy`, `privacyPolicy`, `finalFiling`,
`automaticSubmission`, `runtimeWiring`, `featureFlagDefault`.

## 11. Audience types

`client`, `management`, `board`, `owner`, `accountant`, `employee`, `vendor`,
`counterparty`, `government_office`, `legal`, `auditor`, `internal_team`,
`unknown` — with alias normalization (e.g. "BOD"/"directors" → `board`;
"BIR"/"SEC"/"LGU" → `government_office`).

## 12. Request contexts

`tax_compliance`, `tax_audit`, `bir_assessment`, `accounting`, `audit`,
`business_registration`, `business_closure`, `sec_compliance`, `lgu_permit`,
`payroll`, `bookkeeping`, `engagement_requirements`, `due_diligence`, `other`,
`unknown` — with alias normalization (e.g. "mayor's permit"/"business permit"
→ `lgu_permit`).

## 13. Tone values

`professional`, `formal`, `concise`, `firm`, `polite`, `urgent`, `neutral`,
`unknown` — with alias normalization (e.g. "brief"/"short" → `concise`;
"rush" → `urgent`).

## 14. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl` and
`canonicalSourceId` are **not** required in Phase 9; if `officialUrl` is
absent, output must not claim official URL verification. Future Phase 10 (not
implemented here): `officialUrl` primary, `archiveUrl` secondary,
`canonicalSourceId` internal source of truth, plus `fileHash`, `retrievedAt`,
`lastVerifiedAt`, `currentnessStatus`, `reviewStatus`, `sourceLineage`,
`supersedes`/`supersededBy`.

## 15. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 16. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required; no guaranteed tax/compliance outcome.

## 17. Deadline boundary

A deadline may be included only if the user provides a date or a reliable
basis; no false timeliness assurance; if a deadline or currentness is
uncertain, that uncertainty must be disclosed; no automatic filing,
submission, or sending is implied or performed.

## 18. Runtime boundary

Schema only — no runtime wiring in this patch. Does not change the Phase 9H
runtime-wiring policy. Does not enable a `requirements_request_letter` runtime
mode. The feature flag remains off.

## 19. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence;
no memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 20. Governance gate note

Phase 9G currently recognized `requirements_request_letter` as a registry-only,
pending-schema mode. This patch adds the dedicated schema file but does **not**
modify `workflow/workflow-output-governance-gate.js`. A later, separately
approved governance-coverage refresh (optional
`PHASE-09J-WORKFLOW-GOVERNANCE-COVERAGE-REFRESH-1`) may update coverage to
recognize this mode as dedicated, if desired.

## 21. Prohibited behaviors

`fabricated_authority`, `unsupported_legal_conclusion`, `final_filing_claim`,
`automatic_submission`, `live_web_search`, `new_authority_ingestion`,
`unapproved_source_citation`, `memory_write`, `client_matter_persistence`,
`generated_work_product_persistence`, `third_party_egress`,
`production_change`, `official_url_verification_claim_without_official_url`,
`currentness_claim_without_currentness_status`, `guaranteed_tax_outcome_claim`,
`guaranteed_compliance_outcome_claim`, `deadline_claim_without_date_basis`,
`false_timeliness_assurance`, `automatic_filing_claim`,
`final_correspondence_claim`, `sending_claim_without_user_approval`,
`recipient_type_unlabeled`, `request_context_unlabeled`.

## 22. Runtime policy note

Phase 9H blocked `requirements_request_letter` from first runtime wiring
because a dedicated schema was pending. This patch adds the schema only and
does **not** modify `workflow/workflow-runtime-wiring-policy.js`. A later,
separately approved runtime-policy refresh (optional
`PHASE-09K-WORKFLOW-RUNTIME-POLICY-COVERAGE-REFRESH-1`) may move this mode out
of the blocked list only after explicit approval — this patch does not do so.

## 23. Validation summary

```
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
  → GATE PASSED / 154 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 24. Decision

**PHASE 09I REQUIREMENTS REQUEST LETTER SCHEMA SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 25. Strict recommendations

1. Keep this schema unwired — do not import it from ask-handler.js,
   pipeline.js, server.js, routes, or the frontend.
2. Do not update the Phase 9G governance gate or the Phase 9H runtime-wiring
   policy in this patch's scope — either refresh is a separate, later,
   explicitly approved patch (optional `PHASE-09J`/`PHASE-09K`).
3. `requirements_request_letter` remains blocked for runtime wiring per
   Phase 9H until that separate approval is granted; this patch does not
   change that.
4. Never claim official URL verification is complete when `officialUrl` is
   absent, never claim a guaranteed tax or compliance outcome, never assert a
   deadline or timeliness without a disclosed date basis, and never imply the
   letter has been sent or filed without explicit user approval — all
   enforced conceptually via `prohibitedBehaviors`.
5. Every request item must be tied to disclosed facts or authority
   (`request_must_be_tied_to_facts_or_authority`); every output must clearly
   label the recipient type and request context
   (`recipient_type_must_be_labeled`, `request_context_must_be_labeled`).
6. Every output is a draft only, never final correspondence
   (`draft_only_not_final_correspondence`) — no automatic sending is implied.
7. Preserve the `sourceCardsRequired`/`missingFactsRequired`/
   `assumptionsRequired`/`humanReviewRequired` invariants established across
   all six Phase 9 mode schemas.
8. Do not claim live requirements request letter generation is implemented,
   and do not claim this mode's runtime is enabled — this is a schema
   scaffold only.

## 26. Next task

**PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1** — controlled runtime
implementation for `tax_memo` behind the feature flag (still defaulting off).

## 27. Optional later recommendations

- **PHASE-09J-WORKFLOW-GOVERNANCE-COVERAGE-REFRESH-1** — update the Phase 9G
  governance gate's schema-coverage classification to recognize
  `requirements_request_letter` as dedicated, if desired.
- **PHASE-09K-WORKFLOW-RUNTIME-POLICY-COVERAGE-REFRESH-1** — reconsider
  whether `requirements_request_letter` may be unblocked in the Phase 9H
  runtime-wiring policy, only after explicit approval.
