# PATCH-07B-010 - Client Fact-Pattern Checklist Output Integration

## 1. Objective

Implement a narrow deterministic client fact-pattern checklist output integration for Phase 7B.

## 2. Scope

This patch adds checklist output formatting only. It converts existing fact-gap helper output into structured client-facing checklist buckets for `/ask`, `/tax`, and `/audit` modes before final advice.

## 3. Basis from PATCH-07B-003, PATCH-07B-008, and PATCH-07B-009

PATCH-07B-003 established fact-gap checklist expectations and separation of user fact gaps from source coverage needs. PATCH-07B-008 added narrow issue framing and source-state safety posture. PATCH-07B-009 added the deterministic fact-gap runtime helper used as the primary checklist input.

## 4. Runtime File Added

Added:

```text
client-fact-checklist-output.js
```

The file exports:

```text
buildClientFactChecklistOutput(input)
formatChecklistForMode(checklistResult, mode)
buildModeBoundaryCaution(mode)
buildProhibitedNextSteps(inputOrChecklistResult)
```

## 5. Tests Added

Added:

```text
tests/patch-07b-010-client-fact-pattern-checklist-output-integration.test.mjs
```

The focused suite validates 34 checklist, mode, source-state, integration, and prohibited-output checks.

## 6. Checklist Output Behavior

The helper returns:

```text
checklistType: CLIENT_FACT_PATTERN_CHECKLIST
implementationScope: CLIENT_FACT_CHECKLIST_OUTPUT_ONLY
```

It preserves:

```text
knownFactsSummary
criticalQuestions
helpfulQuestions
documentRequests
timingAndPeriodQuestions
taxpayerStatusQuestions
transactionCharacterQuestions
assessmentStageQuestions
sourceCoverageNeeds
sourceStateCaution
modeBoundaryCaution
mustAnswerBeforeFinalAdvice
prohibitedNextSteps
```

## 7. Mode Behavior

`/ask` uses plain, concise checklist questions.

`/tax` uses professional memo-preparation wording and preserves the need for taxpayer type, period, transaction, amount/materiality, and document support before tax conclusions.

`/audit` uses audit-document and procedural-stage wording and preserves LOA/PAN/FAN/FDDA/protest deadline/document support fact gathering.

## 8. Authority / Source-State Behavior

`AUTHORITY_FOUND` does not remove missing facts.

`RELATED_AUTHORITY_ONLY` adds a prohibited next step against treating related authority as controlling authority.

`NO_INDEXED_SOURCE` adds prohibited next steps against claiming indexed authority exists or forming a legal position from unavailable indexed sources.

`GENERAL_TAX` remains general orientation.

## 9. NO_INDEXED_SOURCE /audit Preservation

Under `/audit` plus `NO_INDEXED_SOURCE`, the helper preserves source-state caution and prohibits BIR/taxpayer legal-position formation. It remains checklist-only.

## 10. User Fact Gap vs Source Coverage Gap Preservation

Source coverage needs remain in `sourceCoverageNeeds` and are not merged into missing user fact questions.

## 11. Document Request Handling

Document gaps from the fact-gap helper are formatted into `documentRequests` and remain distinct from critical/helpful fact questions.

## 12. Assessment / Procedural Stage Handling

Assessment-stage and procedural-stage gaps are formatted into `assessmentStageQuestions`, including audit-stage, notice, and protest-deadline prompts where applicable.

## 13. Integration with issue-framing-engine

The helper can accept an `issueFrameResult` or call `frameTaxIssue(input)` when needed. It uses the result only to preserve issue family, tax type, known facts, source coverage needs, and source-state caution.

## 14. Integration with reasoning-safety-policy

The helper can accept a `safetyPolicyResult` or call `applyReasoningSafetyPolicy(input)` when needed. It uses the result only to preserve source-state caution and mode/source-state guardrails.

## 15. Integration with fact-gap-helper

The helper can accept a `factGapResult` or call `identifyFactGaps(input)` when needed. Checklist buckets are derived from fact-gap helper buckets.

## 16. Explicit Non-Implementation of BIR/Taxpayer Runtime Positions

This patch does not implement BIR likely legal position generation or taxpayer position generation.

## 17. Explicit Non-Implementation of Audit Risk Runtime Scoring

This patch does not implement audit-risk runtime scoring, risk levels, numeric risk scores, or exposure scoring.

## 18. Explicit Non-Implementation of Settlement / Protest Strategy

This patch does not implement settlement recommendations, protest strategy, CTA strategy, or workflow generation.

## 19. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession Runtime Engines

This patch does not implement authority conflict resolution, authority hierarchy, authority applicability conclusions, supersession conclusions, effective-date conclusions, or source currentness logic.

## 20. Validation Results

Preflight:

```text
git status before work: only known untracked files present
branch: feature/source-availability-engine-v1
remote sync: 0 0
latest history included fb6f172, 8d68d41, d5ab11f, e35d8e4, 031cded, b2ef4c6, 3504b65, 3786df8
```

Focused validation:

```text
node tests/patch-07b-010-client-fact-pattern-checklist-output-integration.test.mjs
PASS - 34 passed, 0 failed
```

Required regressions:

```text
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
```

Full validation:

```text
npm test - PASS, 10 syntax checks, 93 suites, 0 failures
npm run guard:files - PASS
```

## 21. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt files, retrieval files, reranker files, sourceAvailability classifier behavior files, or source-card behavior files were changed.

## 22. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No dependency, package, env, DB, indexing, vector, corpus, ingestion, or source acquisition files were changed.

## 23. Confirmation Deferred Phase 10 Assets Were Left Untouched

The deferred Phase 10 assets remained untouched:

```text
.vscode/
evaluation/factcheck/
tests/TINA_Adversarial_Test_Set_PH_Tax.md
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
```

## 24. Risk Assessment

Risk is low. The change is additive, deterministic, dependency-free, and covered by focused and full regression validation. The main residual risk is future misuse of checklist output as substantive advice; `implementationScope`, `modeBoundaryCaution`, and `prohibitedNextSteps` explicitly guard against that.

## 25. Gemini Review Recommendation

Gemini review is not required after PATCH-07B-010 if scope remains exactly client fact-pattern checklist output integration and all tests pass.

Gemini review is recommended before implementing BIR/taxpayer runtime positions, audit-defense runtime risk language, authority conflict resolution, authority applicability runtime, or broader reasoning behavior.

## 26. Recommended Next Task

If PATCH-07B-010 passes:

```text
PATCH-07B-011 - Narrow Authority Applicability Runtime Helper
```

Recommended agent:

```text
Claude Code first if design uncertainty exists; otherwise Codex for narrow helper.
```

Gemini review:

```text
Suggested before or after PATCH-07B-011 if the helper goes beyond placeholder labels into effectivity, hierarchy, supersession, or legal applicability conclusions.
```
