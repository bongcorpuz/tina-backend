# PATCH-07B-003 - Fact-Gap Detector Fixture and Tests

## 1. Objective

Add offline Phase 7B fact-gap detector fixture coverage and a focused fixture test before any runtime fact-gap detection implementation.

## 2. Scope

Fixture/test/report-only. No runtime fact-gap detector, reasoning engine, prompts, retrieval, reranker, authority-normalization, sourceAvailability, source-card, issue-classification, route/controller, package/dependency, DB, vector, corpus, ingestion, frontend, streaming, memory, observability, source-governance, or external-tool work was implemented.

## 3. Basis from PATCH-07B-001 and PATCH-07B-002

PATCH-07B-001 established Phase 7B fixture-first sequencing and required reasoning to feed into Phase 7A response containers rather than bypassing them.

PATCH-07B-002 added issue-framing scaffold coverage and locked key boundaries: user fact gaps must remain separate from source coverage gaps, authority-state posture must be preserved, Phase 10 metadata/source governance must remain deferred, numeric risk scoring must not be introduced, and Phase 7A safeguards must stay intact.

## 4. Gemini Review Carry-Forward

PATCH-07B-001 Gemini recommendations are carried forward by keeping this patch policy-first and fixture-first, deferring runtime implementation, preserving Phase 7A formatting and source-limitation safeguards, and treating authority hierarchy/conflict, supersession, effective-date, source metadata, source governance, and numeric scoring as deferred or placeholder-only.

## 5. Fixture Added

Created:

```text
evaluation/fixtures/phase-7b-003-fact-gap-detector.fixture.json
```

The fixture has 36 local/static scaffold cases and the required top-level values:

```text
patch: PATCH-07B-003
phase: Phase 7B
scaffoldType: fact_gap_detector
runtimeSafe: true
requiresNetwork: false
requiresDb: false
requiresSecrets: false
implementationReady: false
runtimeImplementation: false
buildsOn: PATCH-07B-001, PATCH-07B-002
```

## 6. Test Added

Created:

```text
tests/patch-07b-003-fact-gap-detector-fixture.test.mjs
```

The test validates fixture metadata, local evaluation runner compatibility, runtime-safety fields, PATCH-07B-002 lineage, minimum case count, required fact-gap category coverage, mode coverage, authority-state coverage, case field completeness, severity and risk-policy enumerations, source coverage gap separation, Phase 10 deferrals, authority hierarchy/conflict placeholders, supersession/effective-date deferrals, numeric risk-scoring deferral, policy-first safeguards, client checklist scaffold behavior, Phase 7A safeguards, and absence of live service requirements.

## 7. Fact-Gap Category Coverage

Covered:

```text
withholding/EWT
VAT/zero-rating
NOLCO
deductibility/substantiation
CWT/Form 2307
BIR audit procedure
invoice mismatch/VAT input
reimbursable/pass-through billing
authority-state fact-gap behavior
client fact-pattern checklist scaffold
policy-first/non-engine scaffold
```

## 8. Mode Coverage

Covered:

```text
/ask
/tax
/audit
```

The fixture preserves `/ask` conversational format, `/tax` senior memo format, and `/audit` advisory format as Phase 7A boundaries.

## 9. Authority-State Coverage

Covered:

```text
AUTHORITY_FOUND
RELATED_AUTHORITY_ONLY
NO_INDEXED_SOURCE
GENERAL_TAX
```

The fixture keeps exact authority, related-only authority, no-indexed-source, and general-tax postures separate from missing user facts.

## 10. Critical vs Helpful Missing Facts

Every case separates `criticalMissingUserFacts` from `helpfulMissingUserFacts`. Critical facts block or materially limit conclusions, while helpful facts improve analysis without being treated as established inputs.

## 11. Assumptions Not Allowed

Every case includes `assumptionsNotAllowed`. The fixture blocks assumptions about withholding rates, VAT zero-rating eligibility, NOLCO carryover, deductibility, CWT/Form 2307 claimability, audit defenses, document sufficiency, taxpayer status, authority applicability, and favorable facts.

## 12. Document Gap Coverage

Every case includes `documentGaps`, including contracts, invoices, returns, payment proof, Form 2307, VAT invoices, export/PEZA documents, BIR notices, schedules, and other issue-specific support.

## 13. Timing / Period / Effective-Date Gap Coverage

Every case includes `timingOrPeriodGaps`. User-side timing facts such as tax period, payment date, sale date, notice receipt date, claim year, loss year, carryover period, and protest deadline are treated as fact gaps. Effective-date, currentness, and supersession conclusions remain deferred to Phase 10 metadata/source governance where source metadata is required.

## 14. Taxpayer Status Gap Coverage

Every case includes `taxpayerStatusGaps`, including payor/payee status, VAT registration, PEZA/export/foreign status, corporate status, ownership changes, registration status, withholding-agent status, and assessed taxpayer/tax type.

## 15. Transaction Character Gap Coverage

Every case includes `transactionCharacterGaps`, covering payment classification, goods versus services, domestic versus export treatment, operating loss character, reimbursable versus pass-through character, invoice mismatch character, audit issue character, and procedural versus substantive issue framing.

## 16. Assessment Stage Gap Coverage

Every case includes `assessmentStageGaps`, including planning, filing, audit, LOA, PAN, FAN/FLD, FDDA, protest, and collection stages where relevant.

## 17. User Fact Gap vs Source Coverage Gap Separation

Every case separately defines `authorityOrSourceCoverageNeeds`. The focused test verifies this field is not conflated with `criticalMissingUserFacts`, `helpfulMissingUserFacts`, `documentGaps`, `timingOrPeriodGaps`, `taxpayerStatusGaps`, `transactionCharacterGaps`, or `assessmentStageGaps`.

## 18. Client Fact-Pattern Checklist Scaffold

Client checklist cases are fact-gathering only. They do not create runtime checklist engines and do not produce final tax advice, final audit defenses, claim allowance conclusions, zero-rating conclusions, or rate conclusions.

## 19. Policy-First / Fixture-First Confirmation

Confirmed. The fixture has `implementationReady: false` and `runtimeImplementation: false`. It does not create or assume `fact-gap-detector.js` or any Phase 7B runtime engine.

## 20. Authority Conflict / Hierarchy Placeholder Treatment

Authority conflict and hierarchy items are placeholder/deferred only. Where hierarchy, conflict, or source metadata matters, the fixture routes that work to later metadata/source-governance support, especially Phase 10.

## 21. Supersession / Effective-Date Deferred Treatment

Supersession, effective-date, effective-period, currentness, and temporal source conclusions remain deferred to Phase 10 metadata/source governance where relevant. The fixture may identify dates or periods as user fact gaps, but it does not implement temporal authority logic.

## 22. Risk Language / Numeric Scoring Deferred Treatment

Risk language remains qualitative and policy-level. Allowed `riskLevelPolicy` values are enumerated, and the focused test confirms no case assigns or requires a full numeric risk score.

## 23. Validator False-Positive Placement Notes

CWT/Form 2307 and invoice mismatch/VAT input cases are represented as fact-gap and reasoning scaffold coverage. This patch does not implement validator false-positive fixes and does not modify issue classification, retrieval, sourceAvailability, source-card, or prompt behavior.

## 24. Runtime-Safety Confirmation

Confirmed. The fixture and test are offline/local. They do not call live retrieval, DB/vector store, OpenAI, staging, external services, sourceAvailability execution, source-card selection, network, or secrets.

## 25. Local Validation Results

Passed:

```text
node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs
PATCH-07B-003 fact-gap detector fixture tests: 22 passed, 0 failed
```

Additional required validation was run before commit and push:

```text
node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs
node tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs
node tests/patch-07a-007-response-safety-red-team-fixture.test.mjs
node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs
node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs
node tests/patch-07a-004-ask-conversational-formatting.test.mjs
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
node tests/patch-06f-006-mode-format-evaluation.test.mjs
node tests/patch-019a-regression.test.mjs
npm test
npm run guard:files
```

## 26. Confirmation of No Runtime Behavior Change

Confirmed. No runtime behavior was changed.

## 27. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt files, retrieval files, reranker files, sourceAvailability behavior, source-card behavior, answer renderer, context orchestration, ask handler, rag answer handler, routes/controllers, authority normalization, or issue-classification behavior were changed.

## 28. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, DB, indexing, vector, corpus, ingestion, environment, secret, Google Drive, n8n, Crawlee, Apify, B2, frontend, streaming, memory, observability, or source-governance changes were made.

## 29. Gemini Review Recommendation

Gemini review is not required for PATCH-07B-003 because it is fixture/test/report-only.

Gemini review should be reconsidered before PATCH-07B-008, the first narrow runtime implementation, or earlier only if scaffold uncertainty remains.

## 30. Risk Assessment

Low. This patch adds local/static fixture coverage and a focused local test only. Residual risk is confined to future runtime implementation: a later fact-gap detector could overclaim, conflate user facts with source coverage, or bypass Phase 7A safeguards if it ignores these fixtures.

## 31. Recommended Next Task

Recommended next task:

```text
PATCH-07B-004 - Authority applicability policy fixture and tests
```

Recommended agent:

```text
Codex
```

Gemini review for next task:

```text
Not required unless PATCH-07B-003 reveals material architecture uncertainty.
```
