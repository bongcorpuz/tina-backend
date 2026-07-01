# PATCH-07B-013R - Adversarial Content-Safety and Risk-Language Policy

## 1. Objective

Create a centralized deterministic adversarial content-safety and risk-language policy module before any BIR/taxpayer position runtime helper is implemented.

## 2. Scope

This patch added a safety-policy module, focused tests, and this report. It did not implement BIR/taxpayer runtime positions, audit-risk scoring, settlement/protest strategy, authority conflict resolution, hierarchy resolution, supersession/effective-date resolution, live route wiring, prompt integration, retrieval changes, reranker changes, sourceAvailability changes, source-card changes, package/dependency changes, DB/vector/indexing/corpus changes, or ingestion behavior.

## 3. Gemini Review Carry-Forward

PATCH-07B-GEMINI-REVIEW-3 required this safety-policy patch before PATCH-07B-014. The carry-forward requirement was to centralize adversarial content-safety and risk-language guardrails before any BIR/taxpayer runtime position helper is added.

## 4. Claude Design Review Carry-Forward

PATCH-07B-013 design review identified the need for a centralized policy boundary before adversarial runtime implementation. PATCH-07B-013R implements that boundary without adding adversarial runtime generation.

## 5. Runtime Policy File Added

Added:

```text
adversarial-content-safety-policy.js
```

Exports:

```text
applyAdversarialContentSafetyPolicy
sanitizeAdversarialText
buildAdversarialProhibitedConclusions
assertAdversarialSafety
getAdversarialProhibitedFields
getAdversarialProhibitedPatterns
sanitizeAdversarialObject
```

All policy outputs use:

```text
implementationScope: "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY"
```

## 6. Tests Added

Added:

```text
tests/patch-07b-013r-adversarial-content-safety-risk-language-policy.test.mjs
```

The focused test covers exports, scope, sanitization, context-aware prohibitions, hidden weakness policy, numeric risk policy, settlement/protest policy, Phase 10 dependency policy, fixture activation, nested safety inspection, conditional future BIR/taxpayer framing fields, and regression boundaries.

## 7. Centralized Content-Safety Policy

The module centralizes prohibited fields, prohibited string-pattern labels, deterministic text sanitization, context-aware prohibited conclusions, and structured safety assertions.

## 8. Sanitization Behavior

`sanitizeAdversarialText` deterministically neutralizes unsafe phrasing including guaranteed outcomes, BIR/taxpayer win claims, numeric risk score or percentage chance language, settlement/protest instructions, CTA strategy instructions, supersession/currentness conclusions, final legal/tax opinions, unsupported controlling authority language, and unsupported BIR-binding language.

## 9. Context-Aware Prohibited Conclusions

`buildAdversarialProhibitedConclusions` always prohibits final conclusions, guaranteed outcomes, hidden weakness, fabricated authority, numeric scoring, exact exposure computation, settlement/protest/CTA strategy, hierarchy/conflict/supersession/effective-date conclusions, live source acquisition claims, and treating missing facts as known facts.

It also adds authority-state and mode-specific prohibitions for `NO_INDEXED_SOURCE`, `RELATED_AUTHORITY_ONLY`, `GENERAL_TAX`, `AUTHORITY_FOUND`, and `/audit`.

## 10. Hidden Weakness Policy

The module requires strongest-support framing to be paired with weaknesses. It flags strongest support without weakest facts/documents, BIR position framing without BIR-side weaknesses, and taxpayer position framing without taxpayer-side weaknesses.

## 11. Numeric Risk Policy

Numeric risk scoring remains prohibited. The module hard-codes:

```text
canScoreRisk: false
```

It prohibits `riskScore`, `riskLevel`, `winProbability`, `exposureComputation`, `compromiseAmount`, numeric/percentage risk claims, exact exposure computation, and exact win-probability language.

## 12. Settlement / Protest Policy

Settlement recommendations, protest strategy, CTA strategy, compromise computation, and letter drafting remain outside this helper. The module hard-codes:

```text
canRecommendSettlement: false
```

Procedural posture labels remain allowed only when non-recommendatory.

## 13. Phase 10 Dependency Policy

Phase 10 dependency flags remain flags only. The module blocks currentness, effectivity, supersession, hierarchy, ruling-status, case-status, and official-source metadata conclusions when relevant Phase 10 flags are present.

## 14. Fixture Activation Summary

The focused test loads:

```text
evaluation/fixtures/phase-7b-005-bir-vs-taxpayer-position.fixture.json
evaluation/fixtures/phase-7b-006-audit-defense-risk-language.fixture.json
evaluation/fixtures/phase-7b-007-reasoning-safety-source-state-guards.fixture.json
```

It confirms the centralized policy covers no-guarantee, no-hidden-weakness, no-fabricated-authority, numeric-risk prohibition, source-state guard behavior, and authority-state posture.

## 15. Integration Boundary

No existing helper was refactored in this patch. The new module is available for future use, but it is not wired into routes, prompts, retrieval, sourceAvailability, source cards, or any live answer path.

## 16. Explicit Non-Implementation of BIR/Taxpayer Runtime Helper

No `bir-vs-taxpayer-position-helper.js` was created. No BIR likely position runtime and no taxpayer defense runtime were implemented.

## 17. Explicit Non-Implementation of Audit Risk Runtime Scoring

No audit-risk runtime helper, risk level generator, numeric risk score, win probability, exact exposure computation, or compromise amount computation was implemented.

## 18. Explicit Non-Implementation of Settlement / Protest Strategy

No settlement recommendation helper, protest strategy helper, CTA strategy helper, letter drafting helper, or workflow generator was implemented.

## 19. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession / Effective-Date Runtime Engines

No authority conflict resolver, hierarchy engine, supersession engine, effective-date engine, source currentness resolver, or source governance behavior was implemented.

## 20. Validation Results

Pre-work:

```text
Branch: feature/source-availability-engine-v1
Remote sync: 0 0
Latest history included 3cf287c, 390e42e, 7d5fde7, f5dcae3, fb6f172, 8d68d41, d5ab11f, e35d8e4, 031cded, b2ef4c6, 3504b65, and 3786df8.
Pre-existing untracked files: .vscode/, evaluation/factcheck/, tests/TINA_Adversarial_Test_Set_PH_Tax.md, tests/TINA_Tax_FactCheck_Answer_Key_v2.md
```

Focused validation:

```text
node tests/patch-07b-013r-adversarial-content-safety-risk-language-policy.test.mjs - PASS, 41 passed / 0 failed
node tests/patch-07b-gate-1-narrow-runtime-safety-gate.test.mjs - PASS
node tests/patch-07b-012-reasoning-runtime-integration-guard-composition.test.mjs - PASS
node tests/patch-07b-011-narrow-authority-applicability-runtime-helper.test.mjs - PASS
node tests/patch-07b-010-client-fact-pattern-checklist-output-integration.test.mjs - PASS
node tests/patch-07b-009-narrow-fact-gap-runtime-helper.test.mjs - PASS
node tests/patch-07b-008-first-narrow-runtime-implementation.test.mjs - PASS
node tests/patch-07b-007-reasoning-safety-source-state-guards-fixture.test.mjs - PASS
node tests/patch-07b-006-audit-defense-risk-language-fixture.test.mjs - PASS
node tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs - PASS
node tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs - PASS
node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs - PASS
node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs - PASS
node tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs - PASS
node tests/patch-07a-007-response-safety-red-team-fixture.test.mjs - PASS
node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs - PASS
node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs - PASS
node tests/patch-07a-004-ask-conversational-formatting.test.mjs - PASS
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs - PASS
node tests/patch-06f-006-mode-format-evaluation.test.mjs - PASS
node tests/patch-019a-regression.test.mjs - PASS
npm test - PASS, 10 syntax checks, 97 suites, 0 failed
npm run guard:files - PASS
```

## 21. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt, retrieval, reranker, sourceAvailability, or source-card behavior files were changed.

## 22. Confirmation of No Route / Controller Integration

Confirmed. No route, controller, `/ask`, `/tax`, `/audit`, context-orchestration, or OpenAI call path was changed.

## 23. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, env, DB, indexing, vector, corpus, ingestion, or source acquisition files were changed.

## 24. Confirmation Deferred Phase 10 Assets Were Left Untouched

Confirmed. `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md` were left untouched and were not staged.

## 25. Risk Assessment

Low to moderate. The module is centralized policy infrastructure and is not wired into live routes. The main residual risk is future use: PATCH-07B-014 must integrate this policy without allowing BIR/taxpayer framing to become final legal conclusions, risk scoring, settlement/protest strategy, or authority-resolution behavior.

## 26. Gemini Review Recommendation

Gemini review is required after PATCH-07B-013R and before PATCH-07B-014 because PATCH-07B-014 would be the first BIR/taxpayer adversarial runtime helper.

Gemini should confirm that `adversarial-content-safety-policy.js` sufficiently closes content-safety and risk-language guardrails.

## 27. Recommended Next Task

```text
PATCH-07B-GEMINI-REVIEW-4 - Adversarial Content-Safety Policy Review Before BIR/Taxpayer Runtime
```

Recommended reviewer:

```text
Gemini
```

Purpose:

```text
Review PATCH-07B-013R before PATCH-07B-014.
```
