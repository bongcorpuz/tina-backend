# PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1

## 2. Purpose

Create the pure Workflow Mode Registry scaffold for Phase 9 Professional Workflow
Co-Pilot, implementing the six professional modes designed in
PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 as a non-runtime, deterministic,
side-effect-free registry. This patch does not wire the registry into
ask-handler.js, pipeline.js, server.js, routes, the frontend, memory, external
search, n8n, Firecrawl, Crawlee, or any live service.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `f2cf292 PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 add design foundation`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A COMPLETE; memory INACTIVE;
  production unchanged.

## 4. Files changed

- `workflow/workflow-mode-registry.js` (new; `workflow/` directory created)
- `evaluation/fixtures/phase-09b-workflow-mode-registry-scaffold-1.fixture.json` (new)
- `tests/phase-09b-workflow-mode-registry-scaffold-1.test.mjs` (new)
- `PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime wiring. No route changes. No server.js, ask-handler.js, or pipeline.js
changes. No security helper, classifier, retrieval, source-card, source-availability,
or authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. The registry module itself has zero imports, no network calls, no
filesystem access, no `process.env` reads, no `Date.now()`/randomness, and no
side effects — verified by the accompanying test's static source-scan of the
registry file.

## 6. Registry exports

`PHASE_09B_WORKFLOW_REGISTRY_VERSION`, `WORKFLOW_MODE_IDS`,
`WORKFLOW_MODE_REGISTRY`, `getWorkflowMode(modeId)`, `listWorkflowModes()`,
`isSupportedWorkflowMode(modeId)`, `normalizeWorkflowModeId(input)`,
`getWorkflowModeOutputSchema(modeId)`, `getWorkflowModeRequiredInputs(modeId)`,
`getWorkflowModeSourceCardRequirement(modeId)`, `validateWorkflowModeRegistry()`.

All accessor functions return defensive deep-cloned copies; mutating a returned
mode object or array never mutates the internal registry (verified by test).

## 7. Six modes scaffolded

All six canonical modes from Phase 9A are scaffolded with the full common field
set (`phase: "09"`, `status: "scaffolded"`, `runtimeWiring: false`,
`featureFlagDefault: "off"`, `humanReviewRequired: true`,
`missingFactsRequired: true`, `assumptionsRequired: true`,
`sourceCardsRequired: true`, plus retrieval/authority/source-card/privacy
policies and prohibited-behaviors list) and mode-specific `outputSections`,
`requiredInputs`, `optionalInputs`, `schemaKey`, and `nextScaffoldPatch`.

## 8. Mode IDs

`tax_memo`, `bir_reply_protest_draft`, `audit_defense_matrix`, `client_advisory`,
`compliance_checklist`, `requirements_request_letter`.

## 9. Mode summaries

| Mode ID | Label | Schema key | Next scaffold patch |
|---|---|---|---|
| tax_memo | Tax Memo | taxMemoOutput | PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1 |
| bir_reply_protest_draft | BIR Reply / Protest Draft | birReplyDraftOutput | PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1 |
| audit_defense_matrix | Audit Defense Matrix | auditDefenseMatrixOutput | PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 |
| client_advisory | Client Advisory | clientAdvisoryOutput | PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1 |
| compliance_checklist | Compliance Checklist | complianceChecklistOutput | PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1 |
| requirements_request_letter | Requirements Request Letter | requirementsRequestLetterOutput | PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1 |

`normalizeWorkflowModeId()` resolves common aliases (e.g. "tax memo"/"memo" →
`tax_memo`; "BIR reply"/"protest" → `bir_reply_protest_draft`; "audit
defense"/"defense matrix" → `audit_defense_matrix`; "advisory" →
`client_advisory`; "checklist" → `compliance_checklist`; "requirements
letter"/"request letter" → `requirements_request_letter`) and returns `null` for
unsupported input.

## 10. Retrieval boundary

Every mode declares `retrievalPolicy`: `existing_retrieval_only`,
`no_live_web_search`, `no_new_authority_ingestion`, `no_unapproved_sources`,
`source_cards_required`, `if_authority_unavailable_disclose`.

## 11. Authority boundary

Every mode declares `authorityPolicy`: `no_fabricated_citations`,
`controlling_authority_prioritized`, `related_authority_disclosed_as_related`,
`currentness_unknown_disclosed`, `authority_type_label_required`.

## 12. Source-card boundary

Every mode declares `sourceCardPolicy`:
`current_phase9_gdrive_archive_acceptable`,
`phase10_official_url_archive_url_canonical_source_id_future`,
`source_cards_required_for_professional_outputs`. The Phase 10 source-card
upgrade is referenced as a future target only and is **not** implemented in this
patch.

## 13. Privacy/security boundary

Every mode declares `privacyPolicy`: `no_persistent_client_matter_storage`,
`no_generated_work_product_persistence`, `no_memory_activation`,
`no_third_party_egress`, `no_n8n_firecrawl_crawlee`, `no_production_change`. Every
mode's `prohibitedBehaviors` includes `final_filing_claim`,
`automatic_submission`, `fabricated_authority`, `unsupported_legal_conclusion`,
`live_web_search`, `new_authority_ingestion`, `memory_write`,
`client_matter_persistence`, `third_party_egress`, `production_change`.

## 14. Excluded scope

Runtime wiring; route changes; frontend changes; DB migrations; memory;
client/matter persistence; production deployment; external web search; n8n;
Firecrawl; Crawlee; Phase 10 authority intake; Phase 11 retrieval optimization.

## 15. Validation summary

```
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
  → GATE PASSED / 147 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 16. Decision

**PHASE 09B WORKFLOW MODE REGISTRY SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 17. Strict recommendations

1. Keep this registry unwired — do not import it from ask-handler.js, pipeline.js,
   server.js, routes, or the frontend until a controlled runtime-wiring patch
   (PHASE-09H) is explicitly approved.
2. Keep `runtimeWiring: false` and `featureFlagDefault: "off"` on every mode until
   that approval.
3. Do not implement Phase 10 source-card upgrades or Phase 11 retrieval
   optimization inside any Phase 9 scaffold patch.
4. Do not activate memory or persist client/matter data from this registry or any
   consumer of it.
5. Preserve the `sourceCardsRequired`/`missingFactsRequired`/`assumptionsRequired`/
   `humanReviewRequired` invariants in every subsequent per-mode schema scaffold
   (Phase 9C–9F).
6. Do not claim Phase 9 runtime is implemented — this is a scaffold only.

## 18. Next task

**PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1** — pure schema and fixture for the Tax
Memo output.
