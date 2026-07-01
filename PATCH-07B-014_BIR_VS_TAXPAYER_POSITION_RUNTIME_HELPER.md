# PATCH-07B-014 - BIR vs Taxpayer Position Runtime Helper

## 1. Objective

Create the first narrow BIR vs taxpayer position runtime helper for cautious, structured, non-conclusive position framing from already-known inputs and existing Phase 7B helper outputs.

## 2. Scope

Added `bir-vs-taxpayer-position-helper.js` with deterministic exports:

- `assessBirTaxpayerPositions(input)`
- `buildPositionFramingChecklist(input)`

The helper is limited to `implementationScope: "BIR_TAXPAYER_POSITION_HELPER_ONLY"`.

## 3. Gemini Review 4 Carry-Forward

PATCH-07B-GEMINI-REVIEW-4 required strict use of adversarial content-safety boundaries before creating any BIR/taxpayer runtime helper. This patch preserves those constraints and requires another Gemini review before further adversarial runtime work.

## 4. Claude Design Review Carry-Forward

The helper follows the PATCH-07B-013 design boundary: no live route integration, no prompt integration, no scoring, no settlement/protest advice, and no authority hierarchy/currentness resolution.

## 5. Runtime Helper File Added

Added `bir-vs-taxpayer-position-helper.js`.

It imports existing Phase 7B helpers only for optional recomputation when precomputed helper outputs are absent.

## 6. Tests Added

Added `tests/patch-07b-014-bir-vs-taxpayer-position-runtime-helper.test.mjs`.

The test covers exports, scope, safety integration, authority-state behavior, audit procedural blocking, BIR/taxpayer framing shape, strongest-support/weakness pairing, Phase 10 flags, fixture activation, checklist behavior, and prohibited runtime fields.

## 7. Safety Policy Integration

The helper directly imports and uses:

- `applyAdversarialContentSafetyPolicy`
- `sanitizeAdversarialText`
- `assertAdversarialSafety`

Generated strings are sanitized and final outputs are safety-asserted. Because the inherited assertion helper treats null position placeholders as prohibited under some states, the runtime asserts an internal safety projection while preserving the required public output shape with null framing fields.

## 8. Authority-State Behavior

- `NO_INDEXED_SOURCE` blocks BIR/taxpayer framing.
- `GENERAL_TAX` returns orientation-only posture.
- `RELATED_AUTHORITY_ONLY` allows only limited illustrative framing.
- `AUTHORITY_FOUND` does not override missing facts, missing documents, or Phase 10 dependency flags.

## 9. Source-State Behavior

Source coverage needs remain separate from missing user facts. No source acquisition, source governance, sourceAvailability, or source-card behavior was changed.

## 10. Audit / Procedural Boundary

For `/audit`, missing LOA, tax type covered, taxable period, PAN/FAN/FDDA status, or assessment-stage facts produce procedural blocking or limitation. The helper does not say an assessment is void, BIR has no case, or taxpayer will win.

## 11. BIR Position Framing Behavior

When allowed, `birPositionFraming` includes conditional `possibleBirTheory`, `basisType`, required facts, likely requested documents, weaknesses, and cautions. Weaknesses are mandatory.

## 12. Taxpayer Position Framing Behavior

When allowed, `taxpayerPositionFraming` includes conditional `possibleTaxpayerDefense`, `basisType`, required facts, supporting documents, weaknesses, and cautions. Weaknesses are mandatory.

## 13. Strongest Support / Weakest Facts Policy

Strongest support is never surfaced without weakest facts/documents. If support is supplied without weakness, the helper adds a weakness instead of hiding the gap.

## 14. Required Documents Policy

Required documents are listed as needed to evaluate or support position. Provided documents are described as provided but not yet verified.

## 15. Numeric Risk Prohibition

The helper hard-codes:

- `canScoreRisk: false`
- no `riskScore`
- no `riskLevel`
- no `winProbability`
- no `exposureComputation`

## 16. Settlement / Protest Prohibition

The helper hard-codes `canRecommendSettlement: false` and does not emit settlement recommendation, protest strategy, CTA strategy, compromise amount, or forum strategy fields.

## 17. Phase 10 Dependency Flag Handling

Phase 10 dependency flags pass through from input or authority-applicability output. The helper does not resolve effective date, supersession, hierarchy/conflict, currentness, ruling/case status, or official-source metadata.

## 18. Fixture Activation Summary

The focused 014 test loads and activates:

- PATCH-07B-005 BIR vs taxpayer position fixture
- PATCH-07B-006 audit-defense risk-language fixture
- PATCH-07B-007 reasoning-safety source-state guard fixture

Outputs preserve no guaranteed outcomes, no numeric risk, no settlement/protest recommendation, and authority-state hard caps.

## 19. Checklist Builder Behavior

`buildPositionFramingChecklist` returns checklist-oriented facts needed, documents needed, authority cautions, source coverage needs, prohibited conclusions, and deferred items. It does not give conclusions, scores, or strategy.

## 20. Integration Boundary

No production orchestrator was created. Existing helper behavior was not changed.

## 21. Explicit Non-Implementation of Audit Risk Runtime Scoring

No audit-risk runtime helper, scoring, qualitative risk classification engine, or exposure computation was implemented.

## 22. Explicit Non-Implementation of Settlement / Protest Strategy

No settlement, protest, CTA, compromise, remedy workflow, or letter drafting runtime was implemented.

## 23. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession / Effective-Date Runtime Engines

No authority conflict resolver, hierarchy engine, supersession engine, effective-date engine, currentness engine, ruling-status engine, or case-status engine was implemented.

## 24. Explicit Non-Implementation of Live Route / Prompt Integration

No `/ask`, `/tax`, `/audit`, route/controller, prompt, streaming, or frontend integration was added.

## 25. Validation Results

Initial checks:

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync confirmed: `0 0`
- Latest history confirmed through `2ad5b64 PATCH-07B-013R add adversarial content safety policy`
- Pre-existing untracked files confirmed and left untouched: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`

Focused and regression validation:

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
- `node tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs` - PASS after single rerun; a parallel run had a transient CLI JSON parse failure while direct validation passed
- `node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs` - PASS
- `node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs` - PASS
- Required Phase 7A focused tests - PASS
- `node tests/patch-06f-005-exact-source-limitation-wording.test.mjs` - PASS
- `node tests/patch-06f-006-mode-format-evaluation.test.mjs` - PASS
- `node tests/patch-019a-regression.test.mjs` - PASS
- `npm test` - PASS, 98 suites, 0 failed
- `npm run guard:files` - PASS

## 26. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt, retrieval, reranker, sourceAvailability, or source-card behavior file was changed.

## 27. Confirmation of No Route / Controller Integration

No route or controller file was changed.

## 28. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No package/dependency, env, DB, indexing, vector, corpus, ingestion, or source acquisition change was made.

## 29. Confirmation Deferred Phase 10 Assets Were Left Untouched

Deferred Phase 10 assets were not read as patch input, edited, staged, moved, deleted, or committed:

- `tests/TINA_Adversarial_Test_Set_PH_Tax.md`
- `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`
- `evaluation/factcheck/`

## 30. Risk Assessment

Residual risk is low and bounded to the new helper. The main subtlety is the required public output shape versus the inherited safety assertion's null-field handling; this was handled by an internal assertion projection and covered by tests.

## 31. Gemini Review Recommendation

Gemini review is required after PATCH-07B-014 because this is the first runtime helper capable of generating BIR-side and taxpayer-side position framing.

Gemini should review whether the helper correctly integrates `adversarial-content-safety-policy.js` and preserves all strict boundaries.

## 32. Recommended Next Task

If PATCH-07B-014 passes:

`PATCH-07B-GEMINI-REVIEW-5 - BIR vs Taxpayer Position Runtime Helper Review`

Recommended reviewer: Gemini

Purpose: Review PATCH-07B-014 before any further adversarial runtime work.

Do not proceed immediately to audit-risk runtime, settlement/protest runtime, authority conflict resolver runtime, live route integration, or Phase 8/9/10/11 work.
