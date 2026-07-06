# PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1

## 2. Purpose

Create pure output-schema scaffolds for the `client_advisory` and
`compliance_checklist` workflow modes designed in
PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered in
PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. The Client Advisory schema
defines plain-language, business-impact-driven output structure; the
Compliance Checklist schema defines task/status/priority-driven checklist
structure. Both carry source-card, missing-fact, assumption, and
human-review safeguards. This patch generates no live client advisories or
compliance checklists and is not wired into any runtime path.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `3a1f393 PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1 add BIR reply draft schema`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A COMPLETE; Phase 9B
  COMPLETE; Phase 9C COMPLETE; Phase 9D COMPLETE; Phase 9E COMPLETE; memory
  INACTIVE; production unchanged.
- `workflow/workflow-mode-registry.js`, `workflow/tax-memo-schema.js`,
  `workflow/audit-defense-matrix-schema.js`, and
  `workflow/bir-reply-draft-schema.js` were **not** modified by this patch.

## 4. Files changed

- `workflow/client-advisory-schema.js` (new)
- `workflow/compliance-checklist-schema.js` (new)
- `evaluation/fixtures/phase-09f-client-advisory-checklist-scaffold-1.fixture.json` (new)
- `tests/phase-09f-client-advisory-checklist-scaffold-1.test.mjs` (new)
- `PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No live client advisory or compliance checklist generation. Both
schema modules have zero imports, no network calls, no filesystem access, no
`process.env` reads, no `Date.now()`/randomness, and no side effects —
verified by the accompanying test's static source-scans.

## 6. Client Advisory schema exports

`PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION`, `CLIENT_ADVISORY_SCHEMA`,
`CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS`, `CLIENT_ADVISORY_REQUIRED_INPUTS`,
`CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS`, `CLIENT_ADVISORY_GOVERNANCE_RULES`,
`CLIENT_ADVISORY_PROHIBITED_BEHAVIORS`, `CLIENT_ADVISORY_AUDIENCE_TYPES`,
`createEmptyClientAdvisoryOutput()`, `getClientAdvisorySchema()`,
`getClientAdvisoryRequiredInputs()`, `getClientAdvisoryRequiredOutputSections()`,
`getClientAdvisoryGovernanceRules()`, `getClientAdvisoryAudienceTypes()`,
`getClientAdvisorySourceCardRequirement()`,
`validateClientAdvisoryOutputShape(output)`, `validateClientAdvisorySchema()`,
`normalizeClientAdvisoryIssues(issues)`,
`normalizeClientAdvisoryAudienceType(input)`. All accessors return defensive
deep-cloned copies; mutating a returned value never mutates the internal
schema (verified by test).

## 7. Client Advisory schema identity

`mode: "client_advisory"`, `schemaKey: "clientAdvisoryOutput"`, `phase: "09"`,
`status: "scaffolded"`, `runtimeWiring: false`, `featureFlagDefault: "off"`,
`humanReviewRequired: true`, `sourceCardsRequired: true`,
`missingFactsRequired: true`, `assumptionsRequired: true`,
`finalFiling: false`, `automaticSubmission: false`, `liveGeneration: false`,
`persistentStorage: false`.

## 8. Client Advisory required inputs

`issue`, `facts`, `taxpayerType`, `intendedAudience`, `urgency` (plus 12
recommended optional inputs).

Required output sections (stable order): `plainLanguageAnswer`,
`businessImpact`, `complianceAction`, `deadlinesIfKnown`, `risks`,
`documentsNeeded`, `assumptions`, `missingFacts`, `sourceCards`,
`humanReviewNotice`.

Audience types: `client`, `management`, `board`, `owner`, `accountant`,
`legal`, `operations`, `unknown`, with alias normalization (e.g.
"BOD"/"directors" → `board`; "shareholder"/"stockholder" → `owner`).

## 9. Compliance Checklist schema exports

`PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION`, `COMPLIANCE_CHECKLIST_SCHEMA`,
`COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS`,
`COMPLIANCE_CHECKLIST_REQUIRED_INPUTS`,
`COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS`,
`COMPLIANCE_CHECKLIST_GOVERNANCE_RULES`,
`COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS`, `COMPLIANCE_CHECKLIST_STATUS_VALUES`,
`COMPLIANCE_CHECKLIST_PRIORITY_VALUES`, `createEmptyComplianceChecklistOutput()`,
`createEmptyComplianceChecklistTask()`, `getComplianceChecklistSchema()`,
`getComplianceChecklistRequiredInputs()`,
`getComplianceChecklistRequiredOutputColumns()`,
`getComplianceChecklistGovernanceRules()`, `getComplianceChecklistStatusValues()`,
`getComplianceChecklistPriorityValues()`,
`getComplianceChecklistSourceCardRequirement()`,
`validateComplianceChecklistOutputShape(output)`,
`validateComplianceChecklistTaskShape(task)`,
`validateComplianceChecklistSchema()`,
`normalizeComplianceChecklistTopics(topics)`,
`normalizeComplianceChecklistStatus(status)`,
`normalizeComplianceChecklistPriority(priority)`. All accessors return
defensive deep-cloned copies; mutating a returned value never mutates the
internal schema (verified by test).

## 10. Compliance Checklist schema identity

`mode: "compliance_checklist"`, `schemaKey: "complianceChecklistOutput"`,
`phase: "09"`, `status: "scaffolded"`, `runtimeWiring: false`,
`featureFlagDefault: "off"`, `humanReviewRequired: true`,
`sourceCardsRequired: true`, `missingFactsRequired: true`,
`assumptionsRequired: true`, `finalFiling: false`,
`automaticSubmission: false`, `liveGeneration: false`,
`persistentStorage: false`.

## 11. Compliance Checklist required inputs

`complianceTopic`, `taxpayerType`, `taxPeriodOrDate`, `facts`, `intendedUse`
(plus 12 recommended optional inputs).

Required output columns (stable order, per checklist task): `task`,
`responsibleParty`, `requiredDocument`, `deadlineTiming`, `authoritySource`,
`status`, `priority`, `notes`, `assumptions`, `missingFacts`, `sourceCards`,
`humanReviewNotice`.

## 12. Compliance Checklist status values

`not_started`, `in_progress`, `pending_client`, `pending_bir`, `pending_sec`,
`pending_lgu`, `completed`, `blocked`, `not_applicable`, `unknown`, with alias
normalization (e.g. "open" → `not_started`; "ongoing" → `in_progress`;
"N/A" → `not_applicable`).

## 13. Compliance Checklist priority values

`low`, `normal`, `high`, `urgent`, `unknown`, with alias normalization (e.g.
"medium"/"med" → `normal`; "critical" → `urgent`).

## 14. Shared source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl` and
`canonicalSourceId` are **not** required in Phase 9; if `officialUrl` is
absent, output must not claim official URL verification. Future Phase 10 (not
implemented here): `officialUrl` primary, `archiveUrl` secondary,
`canonicalSourceId` internal source of truth, plus `fileHash`, `retrievedAt`,
`lastVerifiedAt`, `currentnessStatus`, `reviewStatus`, `sourceLineage`,
`supersedes`/`supersededBy`. Identical policy implemented in both schema
files.

## 15. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 16. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required; no guaranteed tax or compliance outcome.

## 17. Deadline boundary

A deadline may be included only if the user provides a date or a reliable
basis; no false timeliness assurance; if a deadline or currentness is
uncertain, that uncertainty must be disclosed; no automatic filing or
submission is implied or performed.

## 18. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence; no
memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 19. Prohibited behaviors

Shared category (both schemas): `fabricated_authority`,
`unsupported_legal_conclusion`, `final_filing_claim`, `automatic_submission`,
`live_web_search`, `new_authority_ingestion`, `unapproved_source_citation`,
`memory_write`, `client_matter_persistence`,
`generated_work_product_persistence`, `third_party_egress`,
`production_change`, `official_url_verification_claim_without_official_url`,
`currentness_claim_without_currentness_status`, `deadline_claim_without_date_basis`,
`false_timeliness_assurance`. Client Advisory adds `guaranteed_tax_outcome_claim`
and `business_impact_without_factual_basis`. Compliance Checklist adds
`guaranteed_compliance_outcome_claim`, `task_without_authority_or_assumption`,
and `automatic_filing_claim`.

## 20. Validation summary

```
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
  → GATE PASSED / 151 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 21. Decision

**PHASE 09F CLIENT ADVISORY CHECKLIST SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 22. Strict recommendations

1. Keep both schemas unwired — do not import them from ask-handler.js,
   pipeline.js, server.js, routes, or the frontend until PHASE-09H is
   explicitly approved.
2. Keep `runtimeWiring: false` and `featureFlagDefault: "off"` on both schemas
   until that approval.
3. Do not implement Phase 10 source-card upgrades or Phase 11 retrieval
   optimization inside this or any other Phase 9 scaffold patch.
4. Do not activate memory or persist client/matter data from either schema or
   any consumer of it.
5. Never claim official URL verification is complete when `officialUrl` is
   absent, never claim a guaranteed tax or compliance outcome, and never
   assert a deadline or timeliness without a disclosed date basis — enforced
   conceptually via each schema's `prohibitedBehaviors`.
6. Business-impact claims in Client Advisory output must be tied to disclosed
   facts (`business_impact_must_be_tied_to_facts`); checklist tasks in
   Compliance Checklist output must be tied to authority or a disclosed
   assumption (`task_must_be_tied_to_authority_or_assumption`).
7. Preserve the `sourceCardsRequired`/`missingFactsRequired`/
   `assumptionsRequired`/`humanReviewRequired` invariants established across
   all six Phase 9 mode schemas.
8. Do not claim live client advisory or compliance checklist generation is
   implemented — these are schema scaffolds only.

## 23. Next task

**PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1** — add tests/gates ensuring no
unsupported citations, no final-filing claims, and no missing source-card
disclosure across all six Phase 9 mode schemas.
