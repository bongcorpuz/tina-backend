# PATCH-07B-009 - Narrow Fact-Gap Runtime Helper

## 1. Objective

Implement a narrow deterministic fact-gap helper and checklist builder so TINA can identify missing facts before any final advice.

## 2. Scope

This patch adds only a local helper module and focused tests. It does not integrate the helper into the live answer pipeline, prompts, retrieval, reranker, sourceAvailability, source-card behavior, DB/vector/corpus/ingestion, memory, workflow generation, frontend, streaming, observability, or dependency graph.

## 3. Basis from PATCH-07B-003 and PATCH-07B-008

PATCH-07B-003 established fact-gap fixture expectations: critical/helpful facts, document gaps, timing/period gaps, taxpayer-status gaps, transaction-character gaps, assessment/procedural gaps, and strict separation from source coverage needs. PATCH-07B-008 added deterministic issue framing and reasoning-safety policy helpers. PATCH-07B-009 builds a narrow fact-gap helper on those boundaries.

## 4. Runtime File Added

Added:

```text
fact-gap-helper.js
```

The file is deterministic, dependency-free, and exports `identifyFactGaps(input)` and `buildFactChecklist(inputOrFactGapResult)`.

## 5. Tests Added

Added:

```text
tests/patch-07b-009-narrow-fact-gap-runtime-helper.test.mjs
```

The test validates core behavior, issue-family coverage, mode behavior, authority/source-state behavior, integration with PATCH-07B-008, and prohibited output fields.

## 6. Fact-Gap Helper Behavior

`identifyFactGaps(input)` returns issue family, tax type, preserved known facts, critical missing facts, helpful missing facts, document gaps, timing/period gaps, taxpayer-status gaps, transaction-character gaps, assessment-stage gaps, separate source coverage needs, checklist questions, reasoning posture, source-state caution, and `implementationScope: "FACT_GAP_HELPER_ONLY"`.

## 7. Checklist Builder Behavior

`buildFactChecklist(inputOrFactGapResult)` returns checklist questions, must-answer-before-final-advice items, and `canProceedWithGeneralOrientation: true`. It never marks missing facts as known and never converts source coverage needs into user fact gaps.

## 8. Issue-Family Coverage

Coverage includes `WITHHOLDING_EWT`, `VAT_ZERO_RATING`, `NOLCO`, `DEDUCTIBILITY_SUBSTANTIATION`, `CWT_FORM_2307`, `BIR_AUDIT_PROCEDURE`, `INPUT_VAT_INVOICE_MISMATCH`, `REIMBURSABLE_PASS_THROUGH`, `GENERAL_TAX_ORIENTATION`, and `UNKNOWN_NEEDS_MORE_FACTS`.

## 9. Mode Behavior

`/ask` checklists are concise and user-readable. `/tax` checklists include taxpayer, period, and transaction facts. `/audit` checklists include assessment-stage, document, notice-date, and procedural facts.

## 10. Authority / Source-State Behavior

The helper respects `AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, and `GENERAL_TAX` postures by using PATCH-07B-008 `reasoning-safety-policy.js`.

## 11. NO_INDEXED_SOURCE /audit Preservation

For `/audit` with `NO_INDEXED_SOURCE`, the helper keeps the source-state caution and does not generate BIR legal positions, taxpayer legal positions, controlling authority, direct legal support, or legal conclusions.

## 12. User Fact Gap vs Source Coverage Gap Preservation

`authorityOrSourceCoverageNeeds` are preserved as `sourceCoverageNeeds`. They are not merged into critical missing facts, helpful missing facts, document gaps, timing gaps, taxpayer-status gaps, transaction-character gaps, or assessment-stage gaps.

## 13. Document Gap Handling

`providedDocuments` reduces matching document gaps. The helper does not say documents exist unless they are included in `providedDocuments` or `knownFacts`.

## 14. Assessment / Procedural Stage Handling

`/audit` and `BIR_AUDIT_PROCEDURE` outputs require assessment/procedural-stage details such as LOA date, PAN/FAN/FDDA status, notice dates, assessment amount, protest deadline, documents received, and documents submitted.

## 15. Explicit Non-Implementation of BIR/Taxpayer Runtime Positions

No BIR likely position engine, taxpayer position engine, or legal-position generator was implemented.

## 16. Explicit Non-Implementation of Audit Risk Runtime Scoring

No audit-defense risk engine, risk level, numeric risk score, exposure score, win percentage, probability, or risk scoring was implemented.

## 17. Explicit Non-Implementation of Settlement / Protest Strategy

No settlement recommendation, protest strategy, CTA strategy, or workflow generation was implemented.

## 18. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession Runtime Engines

No authority conflict resolver, hierarchy engine, authority applicability runtime, supersession engine, effective-date engine, currentness engine, metadata registry, source governance, or source acquisition logic was implemented.

## 19. Integration with PATCH-07B-008

The helper can consume output from `frameTaxIssue(input)` and calls `applyReasoningSafetyPolicy(input)` to preserve source-state caution and mode-boundary posture.

## 20. Validation Results

```text
node tests/patch-07b-009-narrow-fact-gap-runtime-helper.test.mjs
PASS - 34 passed, 0 failed

node tests/patch-07b-008-first-narrow-runtime-implementation.test.mjs
PASS - 28 passed, 0 failed

node tests/patch-07b-007-reasoning-safety-source-state-guards-fixture.test.mjs
PASS - 25 passed, 0 failed

node tests/patch-07b-006-audit-defense-risk-language-fixture.test.mjs
PASS - 25 passed, 0 failed

node tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs
PASS - 25 passed, 0 failed

node tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs
PASS - 24 passed, 0 failed

node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs
PASS - 22 passed, 0 failed

node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs
PASS - 21 passed, 0 failed

node tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs
PASS - 23 passed, 0 failed

node tests/patch-07a-007-response-safety-red-team-fixture.test.mjs
PASS - 23 passed, 0 failed on sequential rerun

node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs
PASS - 19 passed, 0 failed

node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs
PASS - 16 passed, 0 failed

node tests/patch-07a-004-ask-conversational-formatting.test.mjs
PASS - 10 passed, 0 failed on sequential rerun

node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PASS - 10 passed, 0 failed

node tests/patch-06f-006-mode-format-evaluation.test.mjs
PASS - 12 passed, 0 failed

node tests/patch-019a-regression.test.mjs
PASS - 87 passed, 0 failed

npm test
PASS - 10 syntax checks and 92 suites, 0 failed

npm run guard:files
PASS - No protected files modified
```

Note: one parallel Phase 7A validation slot produced transient helper/CLI output noise; sequential reruns of the affected tests passed cleanly.

## 21. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt, retrieval, reranker, sourceAvailability, source-card, answer-renderer, ask-handler, pipeline, or route behavior files were changed.

## 22. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No dependency, package, DB, indexing, vector, corpus, ingestion, environment, secret, Google Drive, B2, n8n, Crawlee, Apify, or source-governance files were changed.

## 23. Confirmation Deferred Phase 10 Assets Were Left Untouched

Confirmed. Deferred Phase 10 assets were not read as patch input, edited, staged, or committed:

```text
tests/TINA_Adversarial_Test_Set_PH_Tax.md
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
evaluation/factcheck/
```

## 24. Risk Assessment

Risk is low. The helper is deterministic, dependency-free, and not integrated into live response generation. The main residual risk is future misuse as a reasoning engine, mitigated by `implementationScope: "FACT_GAP_HELPER_ONLY"` and tests forbidding broad runtime output fields.

## 25. Gemini Review Recommendation

Gemini review is not required after PATCH-07B-009 if scope remains exactly narrow fact-gap helper/checklist behavior and all tests pass.

Gemini review is recommended before implementing BIR/taxpayer runtime positions, audit-defense runtime risk language, authority conflict resolution, authority applicability runtime, or broader reasoning behavior.

## 26. Recommended Next Task

```text
PATCH-07B-010 - Client Fact-Pattern Checklist Output Integration
```

Recommended agent:

```text
Codex
```

Gemini review:

```text
Not required if limited to exposing checklist output safely and no BIR/taxpayer/risk/authority-conflict runtime logic is introduced.
```
