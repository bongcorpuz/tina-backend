# PATCH-07B-011 - Narrow Authority Applicability Runtime Helper

## 1. Objective

Implement a narrow deterministic authority applicability runtime helper for Phase 7B.

## 2. Scope

This patch adds posture-labeling only. It classifies authority applicability from already-known caller inputs, preserves missing applicability facts separately from source coverage needs, carries source-state caution, and flags Phase 10 dependencies without resolving them.

## 3. Claude Design Review Carry-Forward

PATCH-07B-011-DESIGN allowed implementation only under strict constraints. The helper remains a deterministic posture-labeling helper and does not implement authority conflict resolution, hierarchy analysis, effective-date computation, supersession/currentness decisions, BIR/taxpayer positions, audit-risk scoring, settlement/protest strategy, or legal conclusions.

## 4. Runtime File Added

Added:

```text
authority-applicability-helper.js
```

Exports:

```text
assessAuthorityApplicability(input)
buildAuthorityApplicabilityChecklist(input)
```

Every result uses:

```text
implementationScope: AUTHORITY_APPLICABILITY_HELPER_ONLY
```

## 5. Tests Added

Added:

```text
tests/patch-07b-011-narrow-authority-applicability-runtime-helper.test.mjs
```

The focused suite validates 18 grouped checks, including activation of all 35 PATCH-07B-004 fixture cases.

## 6. Authority Applicability Helper Behavior

The helper returns applicability level, mechanically derived applicability posture, authority/source states, required and missing applicability facts, source coverage needs, caution, prohibited conclusions, Phase 10 dependency flags, and conservative use flags.

## 7. Authority-State Hard Caps

`NO_INDEXED_SOURCE` forces `NO_INDEXED_AUTHORITY_AVAILABLE` and `NO_INDEXED_SOURCE_NO_LEGAL_POSITION`.

`RELATED_AUTHORITY_ONLY` remains supporting/background only and cannot become controlling support.

`GENERAL_TAX` remains orientation-only and cannot claim exact authority.

`AUTHORITY_FOUND` does not clear missing facts, prove facts match, or resolve Phase 10 dependencies.

## 8. Authority-Type Boundary Behavior

NIRC/statute/regulation authority remains fact-dependent unless facts are sufficient and authority state permits. RMC/RMO and BIR ruling use remains capped by source state and missing addressee/materially-identical facts. Court decisions preserve court-level, factual-similarity, procedural-posture, and status-metadata caution. Non-authority and unknown authority types are hard-capped.

## 9. Applicability Level and Posture Mapping

Applicability level uses exactly the seven PATCH-07B-004 fixture values. Applicability posture is derived mechanically from applicability level; no independent posture taxonomy was added.

## 10. Phase 10 Dependency Flags

The helper may set:

```text
EFFECTIVE_DATE_REVIEW_NEEDED
SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED
HIERARCHY_CONFLICT_REVIEW_NEEDED
SOURCE_CURRENTNESS_REVIEW_NEEDED
RULING_OR_CASE_STATUS_REVIEW_NEEDED
OFFICIAL_SOURCE_METADATA_REVIEW_NEEDED
```

The helper does not resolve these flags.

## 11. Source-State Caution Preservation

The helper imports and uses `applyReasoningSafetyPolicy` from `reasoning-safety-policy.js` and preserves `sourceStateCaution`, including `NO_INDEXED_SOURCE` caution.

## 12. User Fact Gap vs Source Coverage Gap Preservation

Missing applicability facts remain in `missingApplicabilityFacts`. Authority/source coverage needs remain in `sourceCoverageNeeds`. The helper does not treat source coverage as user-provided facts.

## 13. Mode Behavior

`/ask` remains conversational/orientation-only.

`/tax` remains memo-preparation only and does not produce a final senior tax conclusion.

`/audit` does not produce BIR/taxpayer positions, risk levels, settlement advice, protest strategy, or outcome guarantees.

## 14. Checklist Builder Behavior

`buildAuthorityApplicabilityChecklist` returns checklist-only output with questions, missing facts, source coverage needs, Phase 10 flags, caution, and prohibited conclusions. It does not produce legal conclusions or advisory strategy.

## 15. Integration with reasoning-safety-policy

The helper calls `applyReasoningSafetyPolicy` unless a caller supplies a `safetyPolicyResult`. It uses the result only for source-state caution, mode boundaries, and safety/prohibited-output wording.

## 16. Integration with fact-gap and issue-framing outputs

The helper accepts optional `factGapResult` and `issueFrameResult` inputs and preserves their already-computed missing facts/source caution without recomputing fact-gap or issue-framing work.

## 17. Explicit Non-Implementation of BIR/Taxpayer Runtime Positions

No BIR likely position engine or taxpayer position engine was implemented.

## 18. Explicit Non-Implementation of Audit Risk Runtime Scoring

No audit-risk runtime scoring, numeric risk language, percentage odds, or risk level engine was implemented.

## 19. Explicit Non-Implementation of Settlement / Protest Strategy

No settlement recommendation, protest strategy, CTA strategy, or workflow-generation logic was implemented.

## 20. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession / Effective-Date Runtime Engines

No authority conflict resolver, hierarchy engine, supersession engine, effective-date engine, currentness engine, source metadata registry lookup, or source governance behavior was implemented.

## 21. Validation Results

Preflight:

```text
git status before work: only known untracked deferred files present
branch: feature/source-availability-engine-v1
remote sync: 0 0
latest history included f5dcae3, fb6f172, 8d68d41, d5ab11f, e35d8e4, 031cded, b2ef4c6, 3504b65, 3786df8
```

Focused validation:

```text
node tests/patch-07b-011-narrow-authority-applicability-runtime-helper.test.mjs - PASS, 18 passed, 0 failed
```

Required regressions:

```text
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
```

Full validation:

```text
npm test - PASS, 10 syntax checks, 94 suites, 0 failures
npm run guard:files - PASS
```

## 22. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt files, retrieval files, reranker files, sourceAvailability behavior files, source-card files, route files, or live pipeline integrations were changed.

## 23. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No package/dependency, env, DB, indexing, vector, corpus, ingestion, source acquisition, or source governance files were changed.

## 24. Confirmation Deferred Phase 10 Assets Were Left Untouched

The deferred Phase 10 assets remained untouched:

```text
.vscode/
evaluation/factcheck/
tests/TINA_Adversarial_Test_Set_PH_Tax.md
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
```

## 25. Risk Assessment

Risk is low. The change is additive, deterministic, dependency-free, and explicitly scoped by implementationScope plus prohibited-output fields. Residual risk is future misuse as substantive legal analysis, which is guarded by Phase 10 dependency flags and prohibited conclusions.

## 26. Gemini Review Recommendation

Gemini review is not required after PATCH-07B-011 if implementation remained strictly posture-only and followed the Claude design constraints.

Gemini review is required if any implementation deviated into hierarchy comparison, effective-date/supersession decision, BIR/taxpayer position language, final legal conclusions, numeric/percentage risk language, or live authority/source currentness claims.

## 27. Recommended Next Task

If PATCH-07B-011 passes:

```text
PATCH-07B-012 - Reasoning Runtime Integration Guard and Composition Tests
```

Recommended agent:

```text
Codex
```

Gemini review:

```text
Not required if limited to composition tests and no BIR/taxpayer/risk/authority-conflict runtime logic is introduced.
```
