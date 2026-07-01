# PATCH-07B-007 - Reasoning Safety Policy and Source-State Guard Tests

## 1. Objective

Create offline fixture and test scaffolding for Phase 7B reasoning-safety policy and source-state guardrails before any runtime reasoning implementation.

## 2. Scope

This patch is fixture/test/report-only. It does not implement runtime reasoning logic, source-state guard logic, risk scoring, settlement strategy, BIR/taxpayer position engines, authority applicability engines, memory, workflow generation, retrieval changes, prompt changes, source-card changes, or sourceAvailability changes.

## 3. Basis from PATCH-07B-001 through PATCH-07B-006

PATCH-07B-001 established the policy-first architecture. PATCH-07B-002 through PATCH-07B-006 established issue framing, fact-gap discipline, authority applicability caution, BIR-versus-taxpayer position balance, and audit-defense risk-language limits. PATCH-07B-007 consolidates those guardrails into a shared reasoning-safety/source-state scaffold.

## 4. Gemini Review Carry-Forward

The fixture keeps Phase 7B policy-first and fixture-first, defers authority hierarchy/currentness/supersession metadata to Phase 10, keeps Phase 7A safeguards underneath reasoning, separates missing user facts from source coverage gaps, and rejects numeric risk scoring or guaranteed outcomes.

## 5. Fixture Added

Added `evaluation/fixtures/phase-7b-007-reasoning-safety-source-state-guards.fixture.json`.

The fixture contains 44 cases and remains `runtimeSafe: true`, `implementationReady: false`, and `runtimeImplementation: false`.

## 6. Test Added

Added `tests/patch-07b-007-reasoning-safety-source-state-guards-fixture.test.mjs`.

The test validates top-level metadata, runtime safety, `buildsOn`, required case count, required category coverage, mode coverage, authority-state coverage, allowed safety postures, allowed source-card states, required fields, fact/source gap separation, related-authority caution, no-indexed-source non-fabrication, general-tax non-promotion, AUTHORITY_FOUND non-overclaiming, source-card discipline, Phase 10 deferral, Phase 7A safeguards, and no live-service requirements.

## 7. Reasoning Safety Category Coverage

Coverage includes authority-state guards, source-card guards, fact-gap guards, source-coverage gap guards, authority applicability guards, BIR-vs-taxpayer reasoning guards, audit risk-language guards, settlement/protest guards, mode-boundary guards, Phase 10 boundary guards, and policy-first/non-engine guards.

## 8. Mode Coverage

The fixture covers `/ask`, `/tax`, and `/audit`.

## 9. Authority-State Coverage

The fixture covers `AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, and `GENERAL_TAX`.

## 10. Source-Card Guard Coverage

The fixture covers direct source cards, related source cards, no source card, unclear source-card status, and not-applicable source-card states. Source cards never override `sourceAvailabilityState`.

## 11. Fact-Gap Guard Coverage

The fixture blocks final conclusions where taxpayer type, period, documents, stage, amount, or other material facts are missing. User-favorable assumptions cannot be converted into facts.

## 12. Source-Coverage Gap Guard Coverage

The fixture separates missing indexed authority/source coverage from missing user facts and prohibits fabricated sources, uncited authority, ignored source gaps, and claimed source acquisition.

## 13. Authority Applicability Guard Coverage

The fixture preserves cautious treatment for effective dates, supersession, hierarchy, taxpayer-specific BIR rulings, and CTA/Supreme Court hierarchy distinctions. Phase 10 metadata dependency remains explicit.

## 14. BIR vs Taxpayer Guard Coverage

The fixture requires balanced BIR and taxpayer posture, strongest support plus weakest facts/documents, no hidden weakness, and no guaranteed taxpayer or BIR outcome.

## 15. Audit Risk-Language Guard Coverage

The fixture prohibits exact win probability, exact exposure scoring, numeric risk scoring, low-risk overclaim from related authority, and low-risk overclaim despite weak documents.

## 16. Settlement / Protest Guard Coverage

The fixture prohibits settlement/protest recommendations without facts, documents, stage, amount, and authority review. CTA posture requires dates/deadlines, and ignoring BIR is prohibited.

## 17. Mode-Boundary Guard Coverage

The fixture preserves `/ask`, `/tax`, and `/audit` boundaries and rejects prompt-injection attempts to ignore mode-specific safeguards or source-limitation wording.

## 18. Phase 10 Boundary Guard Coverage

The fixture defers live BIR website checks, new PDF ingestion, supersession/currentness decisions without metadata, and Phase 10 fact-check QA assets.

## 19. Policy-First / Non-Engine Guard Coverage

The fixture rejects enabling a reasoning engine, adding schema dependencies, creating memory-based tax advice, or generating full protest workflows during this scaffold patch.

## 20. Prohibited Authority / Source / Outcome / Risk Claims

The fixture prohibits fabricated authority, related authority as controlling authority, generic tax explanation as exact authority, source-card overclaiming, live acquisition claims, hidden weak facts/documents, guaranteed results, and final strategy language without facts and authority review.

## 21. Prohibited Numeric Scoring Policy

Every case prohibits numeric risk scores, exact exposure scores, win percentages, litigation odds, and probabilities.

## 22. User Fact Gap vs Source Coverage Gap Separation

Every case keeps `missingUserFacts` separate from `authorityOrSourceCoverageNeeds`.

## 23. Phase 10 Dependency Policy

Effective-date, supersession, hierarchy, currentness, metadata, source governance, source acquisition, ingestion, and Tax Accuracy Evaluation/QA remain Phase 10 dependencies.

## 24. Phase 7A Safeguard Preservation

Every case preserves Phase 7A authority-state discipline, source-limitation wording, related-authority caution, no-indexed-source non-fabrication, generic-query non-promotion, no-guarantee policy, missing-fact caveats, documentary-support warnings, and source-card scope limits.

## 25. Runtime-Safety Confirmation

The fixture requires no network, DB, secrets, vector store, OpenAI call, staging environment, retrieval, reranker, prompt, source-card, or sourceAvailability change.

## 26. Local Validation Results

```text
PATCH-07B-007 focused test: PASS - 25 passed, 0 failed
PATCH-07B-006 focused test: PASS - 25 passed, 0 failed
PATCH-07B-005 focused test: PASS - 25 passed, 0 failed
PATCH-07B-004 focused test: PASS - 24 passed, 0 failed
PATCH-07B-003 focused test: PASS - 22 passed, 0 failed
PATCH-07B-002 focused test: PASS - 21 passed, 0 failed
PATCH-07A-008 focused test: PASS - 23 passed, 0 failed on standalone rerun
PATCH-07A-007 focused test: PASS - 23 passed, 0 failed
PATCH-07A-006 focused test: PASS - 19 passed, 0 failed
PATCH-07A-005 focused test: PASS - 16 passed, 0 failed
PATCH-07A-004 focused test: PASS - 10 passed, 0 failed
PATCH-06F-005 exact-source limitation test: PASS - 10 passed, 0 failed
PATCH-06F-006 mode-format test: PASS - 12 passed, 0 failed
PATCH-019A applyVerifiedAuthorityGate regression: PASS - 87 passed, 0 failed
npm test: PASS - 10 syntax checks and 90 suites, 0 failed
npm run guard:files: PASS
```

## 27. Confirmation of No Runtime Behavior Change

No runtime behavior was changed.

## 28. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt, retrieval, reranker, sourceAvailability, or source-card files were changed.

## 29. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No dependency, package, DB, indexing, vector, corpus, or ingestion files were changed.

## 30. Confirmation Deferred Phase 10 Assets Were Left Untouched

The deferred Phase 10 Tax Accuracy Evaluation and Reliability QA assets were left untouched:

```text
tests/TINA_Adversarial_Test_Set_PH_Tax.md
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
evaluation/factcheck/
```

## 31. Gemini Review Recommendation

Gemini review is not required for PATCH-07B-007 because it is fixture/test/report-only.

Gemini review is recommended before PATCH-07B-008 because PATCH-07B-008 is expected to be the first narrow runtime implementation and should be reviewed against the completed Phase 7B scaffold.

## 32. Risk Assessment

Risk is low because this patch adds offline fixture/test/report coverage only. The main residual risk is future overinterpretation of scaffold policy as active runtime behavior, controlled by `implementationReady: false`, `runtimeImplementation: false`, explicit deferred items, and focused tests.

## 33. Recommended Next Task

PATCH-07B-GEMINI-REVIEW-1 - Phase 7B Pre-Implementation Scaffold Review

Recommended reviewer: Gemini

Reason: PATCH-07B-002 through PATCH-07B-007 complete the Phase 7B pre-implementation scaffold. Before PATCH-07B-008 first narrow runtime implementation, Gemini should review the complete scaffold for reasoning-safety gaps, source-state gaps, audit-defense overconfidence risk, authority applicability risk, and mode-boundary risk.

Do not recommend PATCH-07B-008 immediately until Gemini review is completed or user expressly waives it.
