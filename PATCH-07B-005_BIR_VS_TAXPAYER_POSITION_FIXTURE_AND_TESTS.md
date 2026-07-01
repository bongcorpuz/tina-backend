# PATCH-07B-005 - BIR vs Taxpayer Position Fixture and Tests

## 1. Objective

Add local/static fixture coverage and focused tests for future BIR-versus-taxpayer position framing in Phase 7B.

## 2. Scope

This patch is fixture/test/report-only. It does not implement a BIR-position engine, taxpayer-position engine, audit-defense engine, settlement engine, exposure scoring engine, document sufficiency scoring engine, or procedural defect decision engine.

## 3. Basis from PATCH-07B-001, PATCH-07B-002, PATCH-07B-003, and PATCH-07B-004

PATCH-07B-001 set the fixture-first Phase 7B sequence. PATCH-07B-002 created issue-framing scaffolds. PATCH-07B-003 separated user fact gaps from source coverage gaps. PATCH-07B-004 added authority applicability policy coverage. PATCH-07B-005 builds on those artifacts by separating likely BIR positions, taxpayer defenses, strongest support, weakest facts/documents, required documents, procedure, exposure indicators, and settlement/protest posture.

## 4. Gemini Review Carry-Forward

Gemini review was not required for this continuation unless material scaffold uncertainty, audit-defense reasoning risk, or Phase 7B scope uncertainty appeared. The work remained fixture/test/report-only.

## 5. Fixture Added

The fixture is `evaluation/fixtures/phase-7b-005-bir-vs-taxpayer-position.fixture.json`.

It contains 40 cases and remains marked `runtimeSafe: true`, `implementationReady: false`, and `runtimeImplementation: false`.

## 6. Test Added

The focused test is `tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs`.

It validates top-level metadata, runtime safety, build dependencies, category coverage, mode coverage, authority-state coverage, enumerated policy values, required fields, fact/source gap separation, position distinction, document coverage, qualitative exposure treatment, no guaranteed outcomes, authority-state discipline, Phase 10 deferral, Phase 7A safeguards, and no live-service requirements.

## 7. BIR vs Taxpayer Position Category Coverage

Coverage includes EWT/withholding deficiency, CWT/Form 2307 disallowance, VAT zero-rating disallowance, input VAT invoice mismatch, deductibility/substantiation, reimbursable/pass-through billing, LOA/PAN/FAN/FDDA procedure, prescription/assessment timing, NOLCO disallowance, authority-state behavior, settlement/protest posture, and policy-first/non-engine scaffold cases.

## 8. Mode Coverage

The fixture covers `/ask`, `/tax`, and `/audit`.

## 9. Authority-State Coverage

The fixture covers `AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, and `GENERAL_TAX`.

## 10. BIR Likely Position Coverage

Each case includes a `birLikelyPosition` field framed as a likely assessment, disallowance, procedural, or source-state position without guaranteeing that BIR wins.

## 11. Taxpayer Position / Defense Coverage

Each case includes a `taxpayerPosition` field framed conditionally around facts, documents, procedure, and authority support without guaranteeing that the taxpayer wins.

## 12. Strongest Support vs Weakest Facts/Documents

Each case separates `strongestTaxpayerSupport` from `weakestTaxpayerFactsOrDocuments` so the scaffold preserves both defense support and weaknesses.

## 13. Required Documents Coverage

Each `/tax` and `/audit` case includes required documents. The fixture also includes required-document lists for `/ask` orientation cases where useful.

## 14. Procedural Issue Coverage

The fixture covers LOA, PAN, FAN, FDDA, protest posture, CTA/remedy posture, response deadlines, prescription/timing, and notice-stage review as scaffolded procedural issues.

## 15. Exposure Indicator Coverage

Exposure indicators remain qualitative. Numeric exposure scoring is explicitly deferred and not required as an output.

## 16. Risk-Level Policy Coverage

The fixture uses allowed `riskLevelPolicy` values only. Current cases exercise `UNKNOWN_INSUFFICIENT_FACTS`, `HIGH`, and `CRITICAL` where appropriate.

## 17. Settlement / Protest Posture Coverage

The fixture uses allowed `settlementOrProtestPosture` values only, including document-first, protest/defense possible if documents support, settlement evaluation, procedural review first, authority review first, and insufficient-facts posture.

## 18. No Guaranteed Outcome Policy

Every case includes `noGuaranteedOutcomePolicy` and prohibits guaranteed taxpayer or BIR outcomes.

## 19. No Hidden Weakness Policy

Policy-first cases require weak documents and weak facts to be surfaced, not hidden.

## 20. Authority Support Level Policy

The fixture uses allowed authority-support levels only and keeps direct, related-only, general/background, no-indexed-source, and insufficient-support postures distinct.

## 21. Related Authority / No Indexed Source Treatment

`RELATED_AUTHORITY_ONLY` cases do not use direct authority support. `NO_INDEXED_SOURCE` cases do not fabricate legal support.

## 22. User Fact Gap vs Source Coverage Gap Separation

`missingUserFacts` remain separate from `authorityOrSourceCoverageNeeds`. The focused test checks for this separation.

## 23. Phase 10 Dependency Policy

Effective-date, supersession, currentness, metadata, hierarchy, and source-governance issues remain deferred to Phase 10 where relevant.

## 24. Phase 7A Safeguard Preservation

Every case preserves Phase 7A format, authority-state, source-limitation, related-authority, no-indexed-source, caveat, no-guarantee, and documentary-support safeguards as applicable.

## 25. Policy-First / Fixture-First Confirmation

The patch remains policy-first and fixture-first. It does not activate runtime reasoning.

## 26. Runtime-Safety Confirmation

The fixture requires no network, DB, secrets, vector store, OpenAI calls, staging environment, retrieval, source-card, or sourceAvailability changes.

## 27. Local Validation Results

Focused validation:

```text
node tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs
PASS - 25 passed, 0 failed
```

Full regression validation was run before commit and push.

Required validation summary:

```text
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
npm test: PASS - 10 syntax checks and 88 suites, 0 failed
npm run guard:files: PASS
```

## 28. Confirmation of No Runtime Behavior Change

No runtime behavior was changed.

## 29. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

No prompt, retrieval, reranker, sourceAvailability, or source-card files were changed.

## 30. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

No dependency, package, DB, indexing, vector, corpus, or ingestion files were changed.

## 31. Gemini Review Recommendation

Gemini review is not required for PATCH-07B-005 because it is fixture/test/report-only.

Gemini review should be reconsidered before PATCH-07B-008, the first narrow runtime implementation, or earlier only if scaffold uncertainty remains.

## 32. Risk Assessment

Risk is low because the patch adds offline fixture and test coverage only. The main residual risk is future overinterpretation of the scaffold as implementation-ready, which is controlled by `implementationReady: false`, `runtimeImplementation: false`, deferred item fields, and focused tests.

## 33. Recommended Next Task

PATCH-07B-006 - Audit-Defense Risk-Language Fixture and Tests

Recommended agent: Codex

Gemini review for next task: Not required unless PATCH-07B-005 reveals material architecture uncertainty.
