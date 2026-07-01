# PATCH-07B-006 - Audit-Defense Risk-Language Fixture and Tests

## 1. Objective

Add local/static fixture coverage and focused tests for future audit-defense risk-language policy in Phase 7B.

## 2. Scope

This patch is fixture/test/report-only. It does not implement an audit-defense risk engine, risk-language engine, settlement strategy engine, exposure computation engine, numeric scoring engine, document sufficiency scoring engine, procedural defect decision engine, BIR-position engine, or taxpayer-position engine.

## 3. Basis from PATCH-07B-001, PATCH-07B-002, PATCH-07B-003, PATCH-07B-004, and PATCH-07B-005

PATCH-07B-001 set the fixture-first Phase 7B architecture. PATCH-07B-002 established issue framing. PATCH-07B-003 separated user fact gaps from source coverage gaps. PATCH-07B-004 added authority applicability discipline. PATCH-07B-005 separated BIR likely position, taxpayer position, documents, procedure, and settlement/protest posture. PATCH-07B-006 builds on those controls by making risk language conservative, authority-state aware, document-aware, fact-aware, and non-numeric.

## 4. Gemini Review Carry-Forward

Gemini review was not required because this patch remained fixture/test/report-only and did not expose material scaffold uncertainty, unsafe risk-language design, or Phase 7B scope uncertainty.

## 5. Fixture Added

Added `evaluation/fixtures/phase-7b-006-audit-defense-risk-language.fixture.json`.

The fixture contains 41 cases and remains `runtimeSafe: true`, `implementationReady: false`, and `runtimeImplementation: false`.

## 6. Test Added

Added `tests/patch-07b-006-audit-defense-risk-language-fixture.test.mjs`.

The focused test validates metadata, runtime safety, build dependencies, category coverage, mode coverage, authority-state coverage, enumerated risk-language values, required fields, fact/source gap separation, qualitative exposure language, prohibited numeric scoring, no guaranteed outcomes, no hidden weaknesses, settlement/protest posture, authority-state risk restrictions, Phase 10 deferral, Phase 7A safeguards, and no live-service requirements.

## 7. Audit-Defense Risk-Language Category Coverage

Coverage includes EWT/withholding deficiency, CWT/Form 2307 disallowance, VAT zero-rating, input VAT invoice mismatch, deductibility/substantiation, reimbursable/pass-through billing, LOA/PAN/FAN/FDDA procedure, prescription/assessment timing, NOLCO disallowance, authority-state behavior, settlement/protest posture, and policy-first/non-engine risk-language traps.

## 8. Mode Coverage

The fixture covers `/ask`, `/tax`, and `/audit`.

## 9. Authority-State Coverage

The fixture covers `AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, and `GENERAL_TAX`.

## 10. Authority Strength Coverage

The fixture uses the allowed authority-strength vocabulary only: direct authority, moderate direct authority, related/supporting only, general background, no indexed authority, and unknown pending source review.

## 11. Fact Strength Coverage

The fixture uses the allowed fact-strength vocabulary only and keeps unknown, weak, and partial fact support distinct.

## 12. Document Strength Coverage

The fixture uses the allowed document-strength vocabulary only and distinguishes unknown, weak, partial, and no document support.

## 13. Procedural Strength Coverage

The fixture uses the allowed procedural-strength vocabulary only and separates possible procedural defenses, weak procedural defenses, and unknown procedural posture.

## 14. Risk-Level Policy Coverage

The fixture uses allowed risk-level values only and avoids treating authority availability as automatically producing low risk.

## 15. Uncertainty-Level Policy Coverage

The fixture uses allowed uncertainty-level values only and raises uncertainty where facts, documents, procedure, or sources are incomplete.

## 16. Exposure Indicator Coverage

Exposure indicators remain qualitative. Numeric exposure scoring is explicitly prohibited or deferred.

## 17. Conditions That Lower / Increase / Make Risk Unknown

Every case separates conditions that may lower risk, conditions that may increase risk, and conditions that make risk unknown.

## 18. Settlement / Protest Posture Coverage

The fixture covers document-first posture, authority-review-first posture, procedural-review-first posture, protest/defense possible if documents support, settlement evaluation, and insufficient-facts posture. It prohibits ignoring BIR.

## 19. Prohibited Risk Language

Every case includes prohibited risk-language guidance, including no low-risk language from weak documents, no low-risk language from related authority alone, no low-risk language from client preference, and no strong-defense language under `NO_INDEXED_SOURCE`.

## 20. Prohibited Outcome Claim Policy

Every case prohibits guaranteed taxpayer win, guaranteed BIR win, guaranteed cancellation, guaranteed allowance, or guaranteed procedural invalidity.

## 21. Prohibited Numeric Scoring Policy

Every case populates `prohibitedNumericScoring`. Exact win probability, exact exposure score, numeric litigation odds, and risk scores are prohibited as fixture output.

## 22. No Guaranteed Outcome Policy

Every case includes a no-guaranteed-outcome policy.

## 23. No Hidden Weakness Policy

Every case requires weak facts, weak documents, source gaps, or procedural weaknesses to be disclosed.

## 24. Related Authority / No Indexed Source Treatment

`RELATED_AUTHORITY_ONLY` cases do not use strong direct authority or low-risk language. `NO_INDEXED_SOURCE` cases do not fabricate legal strength or low-risk support.

## 25. User Fact Gap vs Source Coverage Gap Separation

`missingUserFacts` remain separate from `authorityOrSourceCoverageNeeds`.

## 26. Phase 10 Dependency Policy

Effective-date, currentness, hierarchy, supersession, source-governance, and metadata issues remain deferred to Phase 10 where relevant.

## 27. Phase 7A Safeguard Preservation

Every case preserves Phase 7A format, authority-state, source-limitation, related-authority, no-indexed-source, caveat, no-guarantee, and documentary-support safeguards as applicable.

## 28. Policy-First / Fixture-First Confirmation

The patch remains policy-first and fixture-first. It does not activate runtime risk language or scoring.

## 29. Runtime-Safety Confirmation

The fixture requires no network, DB, secrets, vector store, OpenAI calls, staging environment, retrieval, source-card, sourceAvailability, or prompt changes.

## 30. Local Validation Results

```text
PATCH-07B-006 focused test: PASS - 25 passed, 0 failed
PATCH-07B-005 focused test: PASS - 25 passed, 0 failed
PATCH-07B-004 focused test: PASS - 24 passed, 0 failed
PATCH-07B-003 focused test: PASS - 22 passed, 0 failed
PATCH-07B-002 focused test: PASS - 21 passed, 0 failed
PATCH-07A-008 focused test: PASS - 23 passed, 0 failed
PATCH-07A-007 focused test: PASS - 23 passed, 0 failed on standalone rerun
PATCH-07A-006 focused test: PASS - 19 passed, 0 failed
PATCH-07A-005 focused test: PASS - 16 passed, 0 failed
PATCH-07A-004 focused test: PASS - 10 passed, 0 failed
PATCH-06F-005 exact-source limitation test: PASS - 10 passed, 0 failed
PATCH-06F-006 mode-format test: PASS - 12 passed, 0 failed
PATCH-019A applyVerifiedAuthorityGate regression: PASS - 87 passed, 0 failed
npm test: PASS - 10 syntax checks and 89 suites, 0 failed
npm run guard:files: PASS
```

## 31. Confirmation of No Runtime Behavior Change

No runtime behavior was changed.

## 32. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt, retrieval, reranker, sourceAvailability, or source-card files were changed.

## 33. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No dependency, package, DB, indexing, vector, corpus, or ingestion files were changed.

## 34. Confirmation Deferred Phase 10 Assets Were Left Untouched

The deferred Phase 10 Tax Accuracy Evaluation and Reliability QA assets were left untouched:

```text
tests/TINA_Adversarial_Test_Set_PH_Tax.md
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
evaluation/factcheck/
```

## 35. Gemini Review Recommendation

Gemini review is not required for PATCH-07B-006 because it is fixture/test/report-only.

Gemini review should be reconsidered before PATCH-07B-008, the first narrow runtime implementation, or earlier only if scaffold uncertainty remains.

## 36. Risk Assessment

Risk is low because this patch adds offline fixture and test coverage only. The main residual risk is future overinterpretation of qualitative risk-language scaffolds as numeric scoring or final strategy, controlled by `implementationReady: false`, `runtimeImplementation: false`, prohibited numeric scoring fields, and focused tests.

## 37. Recommended Next Task

PATCH-07B-007 - Reasoning Safety Policy and Source-State Guard Tests

Recommended agent: Codex

Gemini review for next task: Not required unless PATCH-07B-006 reveals material architecture uncertainty.
