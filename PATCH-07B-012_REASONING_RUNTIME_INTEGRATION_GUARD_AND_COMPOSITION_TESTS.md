# PATCH-07B-012 - Reasoning Runtime Integration Guard and Composition Tests

## 1. Objective

Create narrow composition/integration guard tests for the Phase 7B runtime helpers before adding any broader reasoning behavior.

## 2. Scope

This patch added a test-only composition chain and did not add a production orchestrator, live route wiring, prompt integration, retrieval changes, reranker changes, sourceAvailability changes, source-card changes, package changes, DB/vector/indexing/corpus changes, or ingestion behavior.

## 3. Basis from PATCH-07B-008 through PATCH-07B-011

PATCH-07B-008 introduced issue framing and reasoning-safety helpers. PATCH-07B-009 added the narrow fact-gap helper. PATCH-07B-010 added client fact checklist output. PATCH-07B-011 added authority applicability posture and checklist output. PATCH-07B-012 verifies those helpers compose without expanding scope.

## 4. Composition Helpers Covered

- `frameTaxIssue`
- `applyReasoningSafetyPolicy`
- `identifyFactGaps`
- `buildClientFactChecklistOutput`
- `assessAuthorityApplicability`
- `buildAuthorityApplicabilityChecklist`

## 5. Test File Added

Added:

```text
tests/patch-07b-012-reasoning-runtime-integration-guard-composition.test.mjs
```

No fixture was added; the scenarios are inline and test-only.

## 6. Scenario Coverage

The new test covers 12 required composition scenarios:

- `/ask` + `GENERAL_TAX` + general orientation
- `/ask` + `NO_INDEXED_SOURCE` + missing facts
- `/tax` + `AUTHORITY_FOUND` + missing facts
- `/tax` + `RELATED_AUTHORITY_ONLY` + related authority caution
- `/tax` + `NO_INDEXED_SOURCE` + source coverage need
- `/audit` + `AUTHORITY_FOUND` + missing documents
- `/audit` + `RELATED_AUTHORITY_ONLY` + no controlling authority
- `/audit` + `NO_INDEXED_SOURCE` + no BIR/taxpayer positions
- VAT zero-rating with missing PEZA/export/customer facts
- CWT/Form 2307 with missing reconciliation/document facts
- BIR audit procedure with missing LOA/PAN/FAN/FDDA/protest-stage facts
- NOLCO with missing taxable year/ownership/ITR/AFS facts

## 7. Authority-State Composition Coverage

The test confirms `NO_INDEXED_SOURCE` remains unavailable, `RELATED_AUTHORITY_ONLY` remains non-controlling, `GENERAL_TAX` remains orientation-only, and `AUTHORITY_FOUND` does not erase missing facts or permit final conclusions.

## 8. Mode Composition Coverage

The test confirms `/ask` remains orientation/checklist only, `/tax` remains memo-preparation/checklist only without final legal opinion, and `/audit` remains audit-preparation/checklist only without BIR/taxpayer positions, risk scoring, settlement/protest advice, or CTA strategy.

## 9. User Fact Gap vs Source Coverage Gap Preservation

The composed output preserves missing user facts, known facts, source coverage needs, checklist questions, and authority applicability source needs as distinct data.

## 10. Source-State Caution Preservation

`NO_INDEXED_SOURCE` source-state caution is preserved through issue framing, safety policy, fact gaps, client checklist output, and authority applicability output.

## 11. Authority Applicability Posture Preservation

Authority applicability remains posture-only. It does not create legal positions, controlling conclusions, final opinions, hierarchy resolution, supersession resolution, or effective-date conclusions.

## 12. Phase 10 Dependency Flag Preservation

Phase 10 dependency flags remain flags only. The composed output preserves them for later review and does not resolve currentness, source metadata, hierarchy/conflict, supersession, or effective-date issues.

## 13. Prohibited Field Guard Coverage

The new composition test recursively rejects prohibited broad-runtime fields including BIR/taxpayer position fields, risk fields, settlement/protest fields, final opinion fields, authority-conflict fields, supersession/effective-date fields, CTA strategy, audit-defense conclusion, and guaranteed outcome fields.

## 14. Prohibited String Guard Coverage

The test rejects affirmative unsafe overclaim phrases such as guaranteed outcomes, win-probability claims, immediate settlement language, ignoring BIR, supersession/current-effectivity assertions, and final opinion/conclusion claims. Existing explicit "Do not ..." guardrail warnings remain permitted as safety warnings, not as overclaims.

## 15. Explicit Non-Implementation of Live Route / Prompt Integration

No live route, `/ask`, `/tax`, `/audit`, controller, prompt, context-orchestration, or OpenAI integration was added or changed.

## 16. Explicit Non-Implementation of BIR/Taxpayer Runtime Positions

No BIR/taxpayer runtime position engine or position-generating behavior was implemented.

## 17. Explicit Non-Implementation of Audit Risk Runtime Scoring

No audit-risk runtime scoring, risk level, numeric score, odds, percentage, or exposure engine was implemented.

## 18. Explicit Non-Implementation of Settlement / Protest Strategy

No settlement recommendation, protest strategy, CTA strategy, or audit-defense conclusion runtime behavior was implemented.

## 19. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession / Effective-Date Runtime Engines

No authority conflict resolver, hierarchy engine, supersession engine, effective-date engine, source currentness resolver, or source governance behavior was implemented.

## 20. Validation Results

Pre-work validation:

```text
Branch: feature/source-availability-engine-v1
Remote sync: 0 0
Latest history included PATCH-07B-011 through PATCH-07B-002 commits as required.
Pre-existing untracked files: .vscode/, evaluation/factcheck/, tests/TINA_Adversarial_Test_Set_PH_Tax.md, tests/TINA_Tax_FactCheck_Answer_Key_v2.md
```

Focused and regression validation:

```text
node tests/patch-07b-012-reasoning-runtime-integration-guard-composition.test.mjs - PASS, 16 passed / 0 failed
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
npm test - PASS, 10 syntax checks, 95 suites, 0 failed
npm run guard:files - PASS
```

## 21. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt, retrieval, reranker, sourceAvailability, or source-card behavior files were changed.

## 22. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, env, DB, indexing, vector, corpus, or ingestion files were changed.

## 23. Confirmation Deferred Phase 10 Assets Were Left Untouched

Confirmed. `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md` were left untouched and were not staged.

## 24. Risk Assessment

Low. The patch is test-only plus report and continuity update. It does not change runtime behavior. The main residual risk is that future runtime integration could bypass the helper composition pattern; PATCH-07B-GATE-1 should lock that boundary before broader behavior begins.

## 25. Gemini Review Recommendation

Gemini review is not required after PATCH-07B-012 if the patch remained limited to composition tests and no live route/prompt/retrieval integration or BIR/taxpayer/risk/authority-conflict runtime behavior was introduced.

Gemini review is recommended before introducing BIR/taxpayer runtime positions, audit-defense runtime risk language, authority conflict resolution, live route wiring of the reasoning chain, or broader reasoning behavior.

## 26. Recommended Next Task

If PATCH-07B-012 passes:

```text
PATCH-07B-GATE-1 - Phase 7B Narrow Runtime Safety Gate
```

Recommended agent:

```text
Codex
```

Gemini review:

```text
Suggested after gate if preparing to move into BIR/taxpayer position runtime or audit-risk runtime.
```
