# PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1

## 2. Purpose

Create the pure Audit Defense Matrix output-schema scaffold for the
`audit_defense_matrix` workflow mode designed in
PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered in
PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This defines the conceptual
structure, required fields, validation rules, source-card requirements,
missing-fact requirements, assumption requirements, risk-level structure,
evidence requirements, taxpayer-position mapping, and human-review safeguards
for future audit defense matrix output generation. This patch generates no live
audit defense matrices and is not wired into any runtime path.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `263d51a PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1 add tax memo schema`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A COMPLETE; Phase 9B
  COMPLETE; Phase 9C COMPLETE; memory INACTIVE; production unchanged.
- `workflow/workflow-mode-registry.js` and `workflow/tax-memo-schema.js` were
  **not** modified by this patch.

## 4. Files changed

- `workflow/audit-defense-matrix-schema.js` (new)
- `evaluation/fixtures/phase-09d-audit-defense-matrix-scaffold-1.fixture.json` (new)
- `tests/phase-09d-audit-defense-matrix-scaffold-1.test.mjs` (new)
- `PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No live audit defense matrix generation. The schema module has zero
imports, no network calls, no filesystem access, no `process.env` reads, no
`Date.now()`/randomness, and no side effects — verified by the accompanying
test's static source-scan.

## 6. Schema exports

`PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION`, `AUDIT_DEFENSE_MATRIX_SCHEMA`,
`AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS`,
`AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS`,
`AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS`,
`AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES`,
`AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS`, `AUDIT_DEFENSE_MATRIX_RISK_LEVELS`,
`createEmptyAuditDefenseMatrixOutput()`, `createEmptyAuditDefenseMatrixRow()`,
`getAuditDefenseMatrixSchema()`, `getAuditDefenseMatrixRequiredInputs()`,
`getAuditDefenseMatrixRequiredOutputColumns()`,
`getAuditDefenseMatrixGovernanceRules()`, `getAuditDefenseMatrixRiskLevels()`,
`getAuditDefenseMatrixSourceCardRequirement()`,
`validateAuditDefenseMatrixOutputShape(output)`,
`validateAuditDefenseMatrixRowShape(row)`, `validateAuditDefenseMatrixSchema()`,
`normalizeAuditDefenseMatrixIssues(issues)`,
`normalizeAuditDefenseRiskLevel(riskLevel)`.

All accessor functions return defensive deep-cloned copies; mutating a returned
value never mutates the internal schema (verified by test).

## 7. Audit defense matrix schema identity

`mode: "audit_defense_matrix"`, `schemaKey: "auditDefenseMatrixOutput"`,
`phase: "09"`, `status: "scaffolded"`, `runtimeWiring: false`,
`featureFlagDefault: "off"`, `humanReviewRequired: true`,
`sourceCardsRequired: true`, `missingFactsRequired: true`,
`assumptionsRequired: true`, `finalFiling: false`,
`automaticSubmission: false`, `liveGeneration: false`,
`persistentStorage: false`.

## 8. Required inputs

`issues`, `auditorPosition`, `facts`, `taxPeriod`, `availableDocuments`,
`intendedUse` (plus 17 recommended optional inputs: taxpayerType,
birDocumentType, assessmentStage, loaDate, panDate, fanDate, fddaDate,
amountInvolved, taxType, transactionType, knownAuthorities,
unavailableDocuments, deadline, intendedAudience, riskTolerance,
userAssumptions, desiredDepth).

## 9. Required output columns

Stable canonical order (per matrix row): `issue`, `birAuditorPosition`,
`taxpayerPosition`, `authority`, `evidenceNeeded`, `riskLevel`,
`recommendedAction`, `assumptions`, `missingFacts`, `sourceCards`,
`humanReviewNotice`.

## 10. Required top-level fields

`mode`, `schemaKey`, `matrixRows`, `summary`, `overallRisks`, `assumptions`,
`missingFacts`, `documentsNeeded`, `sourceCards`, `humanReviewNotice`,
`metadata` — where `metadata` conceptually carries `generatedBy`,
`workflowMode`, `schemaVersion`, `retrievalPolicy`, `authorityPolicy`,
`sourceCardPolicy`, `privacyPolicy`, `finalFiling`, `automaticSubmission`,
`runtimeWiring`, `featureFlagDefault`.

## 11. Risk levels

`low`, `moderate`, `high`, `critical`, `unknown`. `normalizeAuditDefenseRiskLevel()`
maps aliases (`medium`/`med` → `moderate`; `urgent` → `critical`) and defaults
any blank/null/unsupported input to `unknown`, never throwing.

## 12. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl` and
`canonicalSourceId` are **not** required in Phase 9; if `officialUrl` is absent,
output must not claim official URL verification. Future Phase 10 (not
implemented here): `officialUrl` primary, `archiveUrl` secondary,
`canonicalSourceId` internal source of truth, plus `fileHash`, `retrievedAt`,
`lastVerifiedAt`, `currentnessStatus`, `reviewStatus`, `sourceLineage`,
`supersedes`/`supersededBy`.

## 13. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 14. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required; evidence gaps disclosed; no guaranteed audit outcome.

## 15. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence; no
memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 16. Prohibited behaviors

`fabricated_authority`, `unsupported_legal_conclusion`, `final_filing_claim`,
`automatic_submission`, `live_web_search`, `new_authority_ingestion`,
`unapproved_source_citation`, `memory_write`, `client_matter_persistence`,
`generated_work_product_persistence`, `third_party_egress`,
`production_change`, `official_url_verification_claim_without_official_url`,
`currentness_claim_without_currentness_status`, `evidence_strength_overclaim`,
`guaranteed_audit_outcome_claim`, `taxpayer_position_without_factual_basis`,
`unlabeled_bir_auditor_position`.

## 17. Validation summary

```
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
  → GATE PASSED / 149 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 18. Decision

**PHASE 09D AUDIT DEFENSE MATRIX SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 19. Strict recommendations

1. Keep this schema unwired — do not import it from ask-handler.js, pipeline.js,
   server.js, routes, or the frontend until PHASE-09H is explicitly approved.
2. Keep `runtimeWiring: false` and `featureFlagDefault: "off"` on the schema
   until that approval.
3. Do not implement Phase 10 source-card upgrades or Phase 11 retrieval
   optimization inside this or any other Phase 9 scaffold patch.
4. Do not activate memory or persist client/matter data from this schema or any
   consumer of it.
5. Never claim official URL verification is complete when `officialUrl` is
   absent from a source card, and never claim a guaranteed audit outcome —
   both are enforced conceptually via `prohibitedBehaviors`
   (`official_url_verification_claim_without_official_url`,
   `guaranteed_audit_outcome_claim`).
6. Every taxpayer position must depend on disclosed facts
   (`taxpayer_position_must_depend_on_facts`); every BIR/auditor position must
   be clearly labeled as such (`bir_auditor_position_must_be_labeled`).
7. Preserve the `sourceCardsRequired`/`missingFactsRequired`/
   `assumptionsRequired`/`humanReviewRequired` invariants in every subsequent
   per-mode schema scaffold (Phase 9E–9F).
8. Do not claim live audit defense matrix generation is implemented — this is a
   schema scaffold only.

## 20. Next task

**PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1** — pure schema and fixture for the BIR
Reply / Protest Draft output.
