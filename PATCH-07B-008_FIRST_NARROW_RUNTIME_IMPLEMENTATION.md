# PATCH-07B-008 - First Narrow Runtime Implementation

## 1. Objective

Implement the first narrow Phase 7B runtime components: deterministic issue framing and reasoning-safety policy.

## 2. Scope

This patch adds only narrow helper modules and focused tests. It does not integrate these helpers into the live pipeline, prompts, retrieval, reranker, sourceAvailability, source-card behavior, DB/vector/corpus/ingestion, memory, workflow generation, frontend, streaming, observability, or dependency graph.

## 3. Basis from PATCH-07B-001 through PATCH-07B-007

PATCH-07B-001 established policy-first reasoning architecture. PATCH-07B-002 through PATCH-07B-007 established fixture coverage for issue framing, fact gaps, authority applicability, BIR/taxpayer balance, audit risk-language limits, and reasoning-safety/source-state guardrails. PATCH-07B-008 implements only the first narrow deterministic helpers supported by those fixtures.

## 4. Gemini Review Carry-Forward

PATCH-07B-GEMINI-REVIEW-1 returned PASS WITH RECOMMENDATIONS and approved proceeding to a narrow runtime implementation. The material carry-forward is strengthened `NO_INDEXED_SOURCE` posture for `/audit`: the helper does not form BIR/taxpayer legal positions, controlling authority, direct authority support, or legal conclusions when indexed authority is unavailable.

## 5. Runtime Files Added

Added:

```text
issue-framing-engine.js
reasoning-safety-policy.js
```

Both files are deterministic, local, dependency-free ES modules.

## 6. Tests Added

Added:

```text
tests/patch-07b-008-first-narrow-runtime-implementation.test.mjs
```

The test covers issue-family classification, fact/source gap separation, issue-framing-only scope, authority-state safety posture, source-card discipline, unsafe instruction rejection, mode boundaries, and integration between issue framing and safety policy.

## 7. Issue-Framing Engine Behavior

`frameTaxIssue(input)` returns issue family, tax type, issue statement, known facts, missing facts, source coverage needs, reasoning posture, prohibited conclusions, mode boundary, source-state caution, and `implementationScope: "ISSUE_FRAMING_ONLY"`.

Controlled issue families include WHT/EWT, VAT zero-rating, NOLCO, deductibility/substantiation, CWT/Form 2307, BIR audit procedure, input VAT invoice mismatch, reimbursable/pass-through, general tax orientation, and unknown-needs-more-facts.

## 8. Reasoning-Safety Policy Behavior

`applyReasoningSafetyPolicy(input)` returns allow/reasoning posture, required cautions, prohibited behaviors, mode boundary, and source-state caution. It keeps `AUTHORITY_FOUND` fact-sensitive, treats `RELATED_AUTHORITY_ONLY` as supporting only, treats `NO_INDEXED_SOURCE` as general-orientation-only, and treats `GENERAL_TAX` as non-promotional.

## 9. NO_INDEXED_SOURCE /audit Hardening

For `/audit` with `NO_INDEXED_SOURCE`, the policy prohibits BIR legal-position generation and taxpayer legal-position generation, and uses this caution:

```text
Indexed authority is not available, so a legal position cannot be formed from indexed sources. General issue orientation may be provided, but legal support must be verified from authority.
```

## 10. Source-State Discipline

Source state controls caution posture. Source gaps remain source coverage needs and do not become user fact gaps. No indexed source means no fabricated authority, no direct legal support, and no legal conclusion from unavailable indexed authority.

## 11. Source-Card Discipline

Direct source cards do not override missing facts, weak documents, or sourceAvailability limits. Related source cards remain related/supporting and cannot become direct authority. No source card means no cited legal basis can be claimed.

## 12. User Fact Gap vs Source Coverage Gap Preservation

The issue-framing helper preserves `missingFacts` separately from `sourceCoverageNeeds`, and the focused test asserts they remain distinct.

## 13. Mode Boundary Preservation

The policy preserves `/ask`, `/tax`, and `/audit` boundaries. It does not render final answers or inject Phase 7B sections into Phase 7A output formats.

## 14. Explicit Non-Implementation of BIR/Taxpayer Runtime Positions

No BIR likely position engine, taxpayer position engine, or legal-position generator was implemented.

## 15. Explicit Non-Implementation of Audit Risk Runtime Scoring

No audit-defense risk engine, numeric risk score, exposure score, win percentage, probability, or settlement recommendation was implemented.

## 16. Explicit Non-Implementation of Authority Conflict / Hierarchy / Supersession Runtime Engines

No authority conflict resolver, hierarchy engine, supersession engine, effective-date engine, currentness engine, metadata registry, source governance, or source acquisition logic was implemented.

## 17. Optional HierarchyPolicy Test Hardening

No additional hardening was needed. The existing PATCH-07B-004 test already asserts that `hierarchyPolicy` contains cautious, deferred, placeholder, not-reached, not-evaluated, or Phase 10 language.

## 18. Validation Results

```text
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
PASS - 23 passed, 0 failed

node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs
PASS - 19 passed, 0 failed

node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs
PASS - 16 passed, 0 failed

node tests/patch-07a-004-ask-conversational-formatting.test.mjs
PASS - 10 passed, 0 failed

node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PASS - 10 passed, 0 failed

node tests/patch-06f-006-mode-format-evaluation.test.mjs
PASS - 12 passed, 0 failed

node tests/patch-019a-regression.test.mjs
PASS - 87 passed, 0 failed

npm test
PASS - 10 syntax checks and 91 suites, 0 failed

npm run guard:files
PASS - No protected files modified
```

## 19. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt, retrieval, reranker, sourceAvailability, source-card, answer-renderer, ask-handler, pipeline, or route behavior files were changed.

## 20. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No dependency, package, DB, indexing, vector, corpus, ingestion, environment, secret, Google Drive, B2, n8n, Crawlee, Apify, or source-governance files were changed.

## 21. Confirmation Deferred Phase 10 Assets Were Left Untouched

Confirmed. Deferred Phase 10 assets were not read as patch input, edited, staged, or committed:

```text
tests/TINA_Adversarial_Test_Set_PH_Tax.md
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
evaluation/factcheck/
```

## 22. Risk Assessment

Risk is low. The helpers are deterministic, dependency-free, and not integrated into the live response pipeline. The main residual risk is future overuse of these helpers as full reasoning engines; this is mitigated by `implementationScope: "ISSUE_FRAMING_ONLY"` and explicit prohibited behavior lists.

## 23. Gemini Review Recommendation

Gemini review is not required after PATCH-07B-008 if scope remains exactly narrow issue-framing plus reasoning-safety policy and all tests pass.

Gemini review is recommended before implementing BIR/taxpayer runtime positions, audit-defense runtime risk language, authority conflict resolution, or broader reasoning behavior.

## 24. Recommended Next Task

```text
PATCH-07B-009 - Narrow Fact-Gap Runtime Helper
```

Recommended agent:

```text
Codex
```

Gemini review:

```text
Not required if limited to fact-gap extraction/helper only and no BIR/taxpayer/risk/authority-conflict runtime logic is introduced.
```
