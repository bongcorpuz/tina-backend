# PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1

## 2. Purpose

Create the pure Tax Memo output-schema scaffold for the `tax_memo` workflow mode
designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered in
PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This defines the conceptual
structure, required fields, validation rules, source-card requirements,
missing-fact requirements, assumption requirements, and human-review safeguards
for future tax memo output generation. This patch generates no live tax memos
and is not wired into any runtime path.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `c2738ad PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1 add workflow mode registry`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A COMPLETE; Phase 9B
  COMPLETE; memory INACTIVE; production unchanged.
- `workflow/workflow-mode-registry.js` was **not** modified by this patch.

## 4. Files changed

- `workflow/tax-memo-schema.js` (new)
- `evaluation/fixtures/phase-09c-tax-memo-schema-scaffold-1.fixture.json` (new)
- `tests/phase-09c-tax-memo-schema-scaffold-1.test.mjs` (new)
- `PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No live tax memo generation. The schema module has zero imports, no
network calls, no filesystem access, no `process.env` reads, no
`Date.now()`/randomness, and no side effects — verified by the accompanying
test's static source-scan.

## 6. Schema exports

`PHASE_09C_TAX_MEMO_SCHEMA_VERSION`, `TAX_MEMO_SCHEMA`,
`TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS`, `TAX_MEMO_REQUIRED_INPUTS`,
`TAX_MEMO_REQUIRED_OUTPUT_SECTIONS`, `TAX_MEMO_GOVERNANCE_RULES`,
`TAX_MEMO_PROHIBITED_BEHAVIORS`, `createEmptyTaxMemoOutput()`,
`getTaxMemoSchema()`, `getTaxMemoRequiredInputs()`,
`getTaxMemoRequiredOutputSections()`, `getTaxMemoGovernanceRules()`,
`getTaxMemoSourceCardRequirement()`, `validateTaxMemoOutputShape(output)`,
`validateTaxMemoSchema()`, `normalizeTaxMemoIssueList(issues)`.

All accessor functions return defensive deep-cloned copies; mutating a returned
value never mutates the internal schema (verified by test).

## 7. Tax memo schema identity

`mode: "tax_memo"`, `schemaKey: "taxMemoOutput"`, `phase: "09"`,
`status: "scaffolded"`, `runtimeWiring: false`, `featureFlagDefault: "off"`,
`humanReviewRequired: true`, `sourceCardsRequired: true`,
`missingFactsRequired: true`, `assumptionsRequired: true`,
`finalFiling: false`, `automaticSubmission: false`, `liveGeneration: false`,
`persistentStorage: false`.

## 8. Required inputs

`facts`, `issue`, `taxpayerType`, `taxPeriod`, `intendedAudience` (plus 13
recommended optional inputs: jurisdiction, transactionType, taxType,
assessmentStage, amountsInvolved, availableDocuments, desiredDepth, urgency,
clientName, matterReference, outputTone, knownAuthorities, userAssumptions).

## 9. Required output sections

Stable canonical order: `factsProvided`, `issues`, `applicableAuthorities`,
`analysis`, `conclusion`, `risksLimitations`, `assumptions`, `missingFacts`,
`documentsNeeded`, `sourceCards`, `humanReviewNotice`.

## 10. Required top-level fields

`mode`, `schemaKey`, `factsProvided`, `issues`, `applicableAuthorities`,
`analysis`, `conclusion`, `risksLimitations`, `assumptions`, `missingFacts`,
`documentsNeeded`, `sourceCards`, `humanReviewNotice`, `metadata` — where
`metadata` conceptually carries `generatedBy`, `workflowMode`, `schemaVersion`,
`retrievalPolicy`, `authorityPolicy`, `sourceCardPolicy`, `privacyPolicy`,
`finalFiling`, `automaticSubmission`, `runtimeWiring`, `featureFlagDefault`.

## 11. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl` and
`canonicalSourceId` are **not** required in Phase 9; if `officialUrl` is absent,
output must not claim official URL verification. Future Phase 10 (not
implemented here): `officialUrl` primary, `archiveUrl` secondary,
`canonicalSourceId` internal source of truth, plus `fileHash`, `retrievedAt`,
`lastVerifiedAt`, `currentnessStatus`, `reviewStatus`, `sourceLineage`,
`supersedes`/`supersededBy`.

## 12. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 13. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required.

## 14. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence; no
memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 15. Prohibited behaviors

`fabricated_authority`, `unsupported_legal_conclusion`, `final_filing_claim`,
`automatic_submission`, `live_web_search`, `new_authority_ingestion`,
`unapproved_source_citation`, `memory_write`, `client_matter_persistence`,
`generated_work_product_persistence`, `third_party_egress`,
`production_change`, `official_url_verification_claim_without_official_url`,
`currentness_claim_without_currentness_status`.

## 16. Validation summary

```
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
  → GATE PASSED / 148 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 17. Decision

**PHASE 09C TAX MEMO SCHEMA SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 18. Strict recommendations

1. Keep this schema unwired — do not import it from ask-handler.js, pipeline.js,
   server.js, routes, or the frontend until PHASE-09H is explicitly approved.
2. Keep `runtimeWiring: false` and `featureFlagDefault: "off"` on the schema
   until that approval.
3. Do not implement Phase 10 source-card upgrades or Phase 11 retrieval
   optimization inside this or any other Phase 9 scaffold patch.
4. Do not activate memory or persist client/matter data from this schema or any
   consumer of it.
5. Never claim official URL verification is complete when `officialUrl` is
   absent from a source card — enforced conceptually via the
   `official_url_verification_claim_without_official_url` prohibited behavior.
6. Preserve the `sourceCardsRequired`/`missingFactsRequired`/
   `assumptionsRequired`/`humanReviewRequired` invariants in every subsequent
   per-mode schema scaffold (Phase 9D–9F).
7. Do not claim live tax memo generation is implemented — this is a schema
   scaffold only.

## 19. Next task

**PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1** — pure schema and fixture for the
Audit Defense Matrix output.
