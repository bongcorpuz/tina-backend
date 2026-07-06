# PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1 — Report

## 1. Patch name

PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1

## 2. Purpose

Create a pure, deterministic, side-effect-free governance gate that validates
Phase 9's five dedicated professional workflow schemas (and registry-level
coverage of the sixth, pending mode) against cross-cutting governance
requirements: source-card discipline, missing-fact/assumption disclosure,
human-review-first drafting, no final-filing or automatic-submission claims,
no fabricated authority, no unsupported currentness/official-URL claims, and
no memory/persistence/egress/production/Phase-10/Phase-11 behavior. This
patch generates no live professional outputs and is not wired into any
runtime path.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `228fb5a PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1 add advisory checklist schemas`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A–9F COMPLETE; memory
  INACTIVE; production unchanged.
- All six existing Phase 9 workflow files
  (`workflow-mode-registry.js`, `tax-memo-schema.js`,
  `audit-defense-matrix-schema.js`, `bir-reply-draft-schema.js`,
  `client-advisory-schema.js`, `compliance-checklist-schema.js`) were **not**
  modified by this patch — the gate only imports from them.

## 4. Files changed

- `workflow/workflow-output-governance-gate.js` (new)
- `evaluation/fixtures/phase-09g-workflow-output-governance-gate-1.fixture.json` (new)
- `tests/phase-09g-workflow-output-governance-gate-1.test.mjs` (new)
- `PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No live professional output generation. The gate module imports only
from the six existing pure Phase 9 workflow files, has no network calls, no
filesystem access, no `process.env` reads, no `Date.now()`/randomness, and no
side effects — verified by the accompanying test's static source-scan and
import-allowlist check.

## 6. Governance gate exports

`PHASE_09G_WORKFLOW_OUTPUT_GOVERNANCE_GATE_VERSION`,
`WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS`,
`WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES`,
`WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS`,
`WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS`,
`WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE`,
`createWorkflowGovernanceResult()`, `validateWorkflowSchemaGovernance(modeId)`,
`validateAllWorkflowSchemaGovernance()`,
`validateWorkflowOutputGovernance(output, options)`,
`validateWorkflowSourceCards(sourceCards, options)`,
`validateWorkflowMetadataGovernance(metadata)`,
`detectProhibitedWorkflowClaims(value, options)`,
`normalizeGovernanceModeId(modeId)`, `getWorkflowGovernanceRequirements()`,
`getWorkflowGovernanceSchemaCoverage()`, `validateWorkflowGovernanceGate()`.
All accessor functions return defensive deep-cloned copies; mutating a
returned value never mutates the internal gate state (verified by test).

## 7. Required flags

`runtimeWiringFalse`, `featureFlagDefaultOff`, `humanReviewRequired`,
`sourceCardsRequired`, `missingFactsRequired`, `assumptionsRequired`,
`finalFilingFalse`, `automaticSubmissionFalse`, `liveGenerationFalse`,
`persistentStorageFalse`, `memoryInactive`, `productionUnchanged`.

## 8. Required policies

`existing_retrieval_only`, `no_live_web_search`, `no_new_authority_ingestion`,
`no_unapproved_sources`, `source_cards_required`, `missing_facts_required`,
`assumptions_required`, `human_review_required`, `no_fabricated_citations`,
`controlling_authority_prioritized`, `related_authority_disclosed_as_related`,
`currentness_unknown_disclosed`, `authority_type_label_required`,
`unsupported_authority_disclosure_required`, `no_memory_activation`,
`no_persistent_client_matter_storage`,
`no_generated_work_product_persistence`, `no_third_party_egress`,
`no_production_change`. Verified present in all five dedicated schemas'
`governanceRules` lists.

## 9. Prohibited claims

19 claim IDs with conservative, deterministic, lowercased-substring phrase
definitions: `final_filing_claim`, `automatic_submission_claim`,
`production_ready_claim`, `memory_enabled_claim`,
`client_matter_persistence_claim`,
`generated_work_product_persistence_claim`,
`external_search_implemented_claim`, `n8n_implemented_claim`,
`firecrawl_implemented_claim`, `crawlee_implemented_claim`,
`phase10_source_governance_implemented_claim`,
`phase11_retrieval_optimization_implemented_claim`,
`official_url_verification_without_official_url_claim`,
`currentness_fully_verified_claim`, `guaranteed_tax_outcome_claim`,
`guaranteed_bir_outcome_claim`, `guaranteed_audit_outcome_claim`,
`guaranteed_compliance_outcome_claim`, `automatic_filing_implemented_claim`.
Detection (`detectProhibitedWorkflowClaims`) recursively scans strings inside
objects/arrays, never mutates input, calls no AI model or network, and caps
`matchedText` to 120 characters.

## 10. Prohibited behaviors

20 behaviors aggregated across all six modes: `fabricated_authority`,
`unsupported_legal_conclusion`, `final_filing_claim`, `automatic_submission`,
`live_web_search`, `new_authority_ingestion`, `unapproved_source_citation`,
`memory_write`, `client_matter_persistence`,
`generated_work_product_persistence`, `third_party_egress`,
`production_change`, `official_url_verification_claim_without_official_url`,
`currentness_claim_without_currentness_status`, `guaranteed_tax_outcome_claim`,
`guaranteed_bir_outcome_claim`, `guaranteed_audit_outcome_claim`,
`guaranteed_compliance_outcome_claim`, `deadline_claim_without_date_basis`,
`false_timeliness_assurance`, `automatic_filing_claim`.

## 11. Schema coverage

Recorded as `{ dedicated: [...], registryOnlyPending: [...] }` — see below.

## 12. Dedicated schema coverage

`tax_memo`, `bir_reply_protest_draft`, `audit_defense_matrix`,
`client_advisory`, `compliance_checklist` — each validated against its own
schema constant, governance rules, prohibited behaviors, and source-card
requirement via `validateWorkflowSchemaGovernance()`.

## 13. Registry-only pending schema coverage

`requirements_request_letter` — no dedicated schema file exists yet. The gate
does **not** claim a dedicated schema exists for this mode; it validates only
registry-level governance (runtimeWiring false, featureFlagDefault off,
humanReviewRequired/sourceCardsRequired/missingFactsRequired/
assumptionsRequired true, and prohibition of live_web_search/
new_authority_ingestion/memory_write/production_change) and always returns a
`dedicated_schema_pending` warning.

## 14. Output governance rules

A candidate professional output must have: `sourceCards` (array),
`missingFacts` (array), `assumptions` (array), `humanReviewNotice` (string),
a valid mode/schemaKey pairing, passing metadata governance, passing
source-card governance, and no detected prohibited claims. Empty arrays or an
empty `humanReviewNotice` produce warnings, not failures — only their absence
(wrong type / missing) fails validation.

## 15. Source-card governance rules

Each source card must be an object with at least one identifying field
(`sourceCardId`/`title`/`archiveUrl`/`gdriveFileId`/`excerpt`).
`officialUrl`/`canonicalSourceId` are **not** required in Phase 9. A card that
claims official URL verification without an `officialUrl`, or claims
currentness is fully verified without a non-`"unknown"` `currentnessStatus`,
fails validation.

## 16. Metadata governance rules

`metadata` must be an object with `finalFiling: false`,
`automaticSubmission: false`, `runtimeWiring: false`, and
`featureFlagDefault: "off"` (hard failures if violated). If present,
`retrievalPolicy` must include `existing_retrieval_only` and `authorityPolicy`
must include `no_fabricated_citations`; if present, `privacyPolicy` must
include both `no_memory_activation` and `no_third_party_egress`. Missing
policy arrays produce warnings, not failures.

## 17. Prohibited claim detection

Conservative, deterministic, lowercased-substring phrase matching; recursively
scans strings inside objects/arrays; calls no AI model; performs no network
I/O; never mutates its input; caps `matchedText` to a 120-character sanitized
snippet.

## 18. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 19. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required; no guaranteed tax/BIR/audit/compliance outcome.

## 20. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl`/
`canonicalSourceId` not required. Future Phase 10 (not implemented here):
`officialUrl` primary, `archiveUrl` secondary, `canonicalSourceId` internal
source of truth. Official-URL-verification and currentness-fully-verified
claims are gated on the corresponding field actually being present.

## 21. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence;
no memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 22. Deadline boundary

A deadline may be included only if the user provides a date or a reliable
basis; no false timeliness assurance; uncertainty must be disclosed if
unknown; no automatic filing or submission.

## 23. Validation summary

```
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
  → GATE PASSED / 152 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 24. Decision

**PHASE 09G WORKFLOW OUTPUT GOVERNANCE GATE PASS WITH STRICT RECOMMENDATIONS**

## 25. Strict recommendations

1. Keep this gate unwired — do not import it from ask-handler.js,
   pipeline.js, server.js, routes, or the frontend until PHASE-09H is
   explicitly approved.
2. Run `validateWorkflowGovernanceGate()` (or `validateAllWorkflowSchemaGovernance()`)
   as a required check in any future patch that adds or modifies a Phase 9
   schema, so cross-cutting governance regressions are caught immediately.
3. Do not implement Phase 10 source-card upgrades or Phase 11 retrieval
   optimization inside this or any other Phase 9 patch.
4. Do not activate memory or persist client/matter data from this gate or any
   consumer of it.
5. Treat `requirements_request_letter`'s `dedicated_schema_pending` warning as
   a standing reminder — do not claim it has a dedicated schema until
   PHASE-09I (or equivalent) actually creates one.
6. Prohibited-claim phrase lists are conservative and deterministic, not
   exhaustive — do not treat a clean `detectProhibitedWorkflowClaims()` result
   as a substitute for human review before any professional output is used.
7. Do not claim live professional workflow output generation is implemented —
   this is a pure governance gate over static schemas, not a runtime.

## 26. Next task

**PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1** — design or
scaffold controlled runtime wiring for one Phase 9 mode behind a feature flag
OFF by default, only after this governance gate is committed.

Optional later recommendation (not the next task):
**PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1** — dedicated schema
scaffold for the `requirements_request_letter` mode.
