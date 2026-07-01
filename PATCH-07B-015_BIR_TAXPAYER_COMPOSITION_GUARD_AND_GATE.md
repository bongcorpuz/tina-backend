# PATCH-07B-015 - BIR Taxpayer Composition Guard and Gate

## 1. Objective

Validate that the full Phase 7B reasoning helper chain composes safely after adding `bir-vs-taxpayer-position-helper.js`.

## 2. Scope

This patch adds a test-only composition guard and formal gate report. It does not add production runtime behavior.

## 3. Gemini Review 5 Carry-Forward

PATCH-07B-GEMINI-REVIEW-5 returned PASS WITH STRICT RECOMMENDATIONS and directed the project to run a composition guard and gate before starting any new adversarial workstream.

## 4. Runtime Helpers Covered

The gate covers:

- `issue-framing-engine.js`
- `reasoning-safety-policy.js`
- `fact-gap-helper.js`
- `client-fact-checklist-output.js`
- `authority-applicability-helper.js`
- `adversarial-content-safety-policy.js`
- `bir-vs-taxpayer-position-helper.js`

## 5. Composition Chain Tested

The test-only chain composes:

1. `frameTaxIssue`
2. `applyReasoningSafetyPolicy`
3. `identifyFactGaps`
4. `buildClientFactChecklistOutput`
5. `assessAuthorityApplicability`
6. `applyAdversarialContentSafetyPolicy`
7. `assessBirTaxpayerPositions`
8. `buildPositionFramingChecklist`

No production orchestrator was created.

## 6. Test File Added

Added `tests/patch-07b-015-bir-taxpayer-composition-guard-gate.test.mjs`.

## 7. Scenario Coverage

The new test covers 12 direct composition scenarios:

- `/ask` + `GENERAL_TAX`
- `/ask` + `NO_INDEXED_SOURCE`
- `/tax` + `AUTHORITY_FOUND` with sufficient facts
- `/tax` + `AUTHORITY_FOUND` with missing facts/documents
- `/tax` + `RELATED_AUTHORITY_ONLY`
- `/audit` + `NO_INDEXED_SOURCE`
- `/audit` + `AUTHORITY_FOUND` with missing LOA/PAN/FAN/FDDA stage
- `/audit` + `AUTHORITY_FOUND` with sufficient procedural facts
- VAT zero-rating with missing PEZA/export/customer facts
- CWT/Form 2307 with missing reconciliation/document facts
- BIR audit procedure with missing assessment-stage facts
- NOLCO with missing taxable period, ownership, ITR/AFS facts

## 8. Authority-State Gate Coverage

The gate asserts:

- `NO_INDEXED_SOURCE` blocks BIR/taxpayer framing.
- `GENERAL_TAX` remains orientation only.
- `RELATED_AUTHORITY_ONLY` remains limited, illustrative, and non-controlling.
- `AUTHORITY_FOUND` keeps missing facts/documents visible and does not become a final conclusion.

## 9. Source-State Coverage

Source-state boundaries are preserved through the full helper chain. `NO_INDEXED_SOURCE`, `GENERAL_TAX`, `RELATED_AUTHORITY_ONLY`, and `AUTHORITY_FOUND` remain distinct.

## 10. Fact / Document / Source Coverage Separation

The gate asserts source coverage needs remain separate from user fact gaps, document gaps remain separate from source coverage needs, and authority-applicability gaps remain separate from source coverage needs.

## 11. Audit / Procedural Boundary Coverage

The gate blocks or limits `/audit` position framing where LOA, PAN/FAN/FDDA, taxable period, tax type covered, or assessment-stage facts are missing. It does not allow voidness, no-case, taxpayer-win, settlement, protest, or risk conclusions.

## 12. BIR Position Framing Coverage

When BIR framing exists, the gate requires conditional language, `possibleBirTheory`, non-empty `weaknessesInBirPosition`, sanitization, and no guaranteed outcome.

## 13. Taxpayer Position Framing Coverage

When taxpayer framing exists, the gate requires conditional language, `possibleTaxpayerDefense`, non-empty `weaknessesInTaxpayerPosition`, sanitization, and no guaranteed outcome.

## 14. Strongest Support / Weakest Facts Coverage

The gate asserts strongest support and weakest facts/documents are populated together or both empty.

## 15. Risk / Settlement / Protest Prohibition Coverage

The gate rejects prohibited runtime fields such as `riskScore`, `riskLevel`, `winProbability`, `exposureComputation`, `settlementRecommendation`, `protestStrategy`, `ctaStrategy`, `compromiseAmount`, and strategy/conclusion fields.

## 16. Phase 10 Dependency Flag Coverage

Phase 10 dependency flags remain flags only. The gate does not allow hierarchy, effectivity, supersession, currentness, ruling/case status, or metadata conclusions.

## 17. Fixture Activation Summary

The test loads representative cases from:

- `evaluation/fixtures/phase-7b-005-bir-vs-taxpayer-position.fixture.json`
- `evaluation/fixtures/phase-7b-006-audit-defense-risk-language.fixture.json`
- `evaluation/fixtures/phase-7b-007-reasoning-safety-source-state-guards.fixture.json`

Deferred Phase 10 assets were not used.

## 18. Full Regression Summary

Required validation passed:

- `node tests/patch-07b-015-bir-taxpayer-composition-guard-gate.test.mjs` - PASS, 16 passed, 0 failed
- `node tests/patch-07b-014-bir-vs-taxpayer-position-runtime-helper.test.mjs` - PASS
- `node tests/patch-07b-013r-adversarial-content-safety-risk-language-policy.test.mjs` - PASS
- `node tests/patch-07b-gate-1-narrow-runtime-safety-gate.test.mjs` - PASS
- `node tests/patch-07b-012-reasoning-runtime-integration-guard-composition.test.mjs` - PASS
- `node tests/patch-07b-011-narrow-authority-applicability-runtime-helper.test.mjs` - PASS
- `node tests/patch-07b-010-client-fact-pattern-checklist-output-integration.test.mjs` - PASS
- `node tests/patch-07b-009-narrow-fact-gap-runtime-helper.test.mjs` - PASS
- `node tests/patch-07b-008-first-narrow-runtime-implementation.test.mjs` - PASS
- `node tests/patch-07b-007-reasoning-safety-source-state-guards-fixture.test.mjs` - PASS
- `node tests/patch-07b-006-audit-defense-risk-language-fixture.test.mjs` - PASS
- `node tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs` - PASS
- `node tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs` - PASS
- `node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs` - PASS
- `node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs` - PASS
- Required Phase 7A focused tests - PASS
- `node tests/patch-06f-005-exact-source-limitation-wording.test.mjs` - PASS
- `node tests/patch-06f-006-mode-format-evaluation.test.mjs` - PASS
- `node tests/patch-019a-regression.test.mjs` - PASS on direct rerun after a sandbox setup hiccup in the parallel runner
- `npm test` - PASS, 99 suites, 0 failed
- `npm run guard:files` - PASS

## 19. Integration Boundary

No production helper, route, controller, prompt, retrieval, reranker, sourceAvailability, source-card, DB, indexing, vector, corpus, ingestion, env, dependency, frontend, or streaming code was changed.

## 20. Explicit Non-Implementation of Audit-Risk Runtime

No audit-risk runtime helper, scoring engine, risk level, risk score, or exposure computation was implemented.

## 21. Explicit Non-Implementation of Settlement / Protest Runtime

No settlement, protest, CTA, compromise, forum, or remedy workflow runtime was implemented.

## 22. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession / Effective-Date Runtime Engines

No authority conflict resolver, hierarchy engine, supersession engine, effective-date engine, currentness engine, ruling-status engine, case-status engine, or source metadata engine was implemented.

## 23. Explicit Non-Implementation of Live Route / Prompt Integration

No `/ask`, `/tax`, `/audit`, route/controller, prompt, or streaming integration was added.

## 24. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt, retrieval, reranker, sourceAvailability, or source-card behavior file was changed.

## 25. Confirmation of No Route / Controller Integration

No route or controller file was changed.

## 26. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No dependency, package, env, DB, indexing, vector, corpus, ingestion, or source acquisition change was made.

## 27. Confirmation Deferred Phase 10 Assets Were Left Untouched

Deferred Phase 10 assets remained untouched:

- `tests/TINA_Adversarial_Test_Set_PH_Tax.md`
- `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`
- `evaluation/factcheck/`

## 28. Validation Results

Initial state confirmed:

- Branch: `feature/source-availability-engine-v1`
- Remote sync: `0 0`
- Latest history includes `80475cb PATCH-07B-014 add BIR vs taxpayer position helper`
- Pre-existing untracked files were present and left untouched: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`

All required focused and full regression validations passed.

## 29. Gate Decision

PASS WITH RECOMMENDATIONS

Reason: The Phase 7B adversarial runtime block is now composition-gated, but Gemini should review it before the next workstream is selected.

## 30. Risk Assessment

Residual risk is low and limited to test coverage interpretation. The test explicitly distinguishes prohibited generated output from allowed policy/caution metadata that quotes prohibited language as a boundary.

## 31. Gemini Review Recommendation

Gemini review is required after PATCH-07B-015 as PATCH-07B-GEMINI-REVIEW-6.

Gemini should decide whether the Phase 7B adversarial reasoning block is complete enough to proceed to:

1. audit-risk runtime design;
2. live clarification integration design;
3. Phase 7B final gate/closure;
4. another coverage addendum if needed.

## 32. Recommended Next Task

If PATCH-07B-015 passes:

`PATCH-07B-GEMINI-REVIEW-6 - Phase 7B Adversarial Runtime Composition Gate Review`

Recommended reviewer: Gemini

Purpose: Review PATCH-07B-015 and decide the safest next workstream.

Do not proceed immediately to audit-risk runtime implementation, settlement/protest runtime, live route integration, prompt integration, or Phase 8/9/10/11 work.
