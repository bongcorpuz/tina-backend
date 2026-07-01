# PATCH-07B-002 - Analytical Reasoning Fixture and Issue-Framing Test Scaffold

## 1. Objective

Create the first Phase 7B analytical reasoning fixture and issue-framing test scaffold before any runtime reasoning implementation.

## 2. Scope

Fixture/test/report-only. No runtime reasoning logic, engines, prompts, retrieval, reranker, authority-normalization, sourceAvailability, source-card, issue-classification, route/controller, package/dependency, DB, vector, corpus, ingestion, frontend, streaming, memory, observability, source-governance, or external-tool work was implemented.

## 3. Basis from PATCH-07B-001

PATCH-07B-001 established that Phase 7B must reason inside the Phase 7A response containers, not around them. It also established fixture-first sequencing: PATCH-07B-002 through PATCH-07B-007 must pass before PATCH-07B-008 can begin the first narrow runtime implementation.

## 4. Gemini Review Carry-Forward

PATCH-07B-001 received Gemini PASS WITH RECOMMENDATIONS. This scaffold carries those recommendations forward by keeping Phase 7B policy-first and fixture-first, deferring runtime implementation, keeping authority conflict/hierarchy and supersession/effective-date handling placeholder-only until Phase 10 metadata/source governance exists, separating user fact gaps from source coverage gaps, preserving Phase 7A safeguards, and avoiding source governance, memory, observability, workflow generation, frontend cleanup, and streaming UX.

## 5. Fixture Added

Created:

```text
evaluation/fixtures/phase-7b-002-analytical-reasoning-issue-framing.fixture.json
```

The fixture has 31 local/static scaffold cases and the required top-level values:

```text
patch: PATCH-07B-002
phase: Phase 7B
scaffoldType: analytical_reasoning_issue_framing
runtimeSafe: true
requiresNetwork: false
requiresDb: false
requiresSecrets: false
implementationReady: false
runtimeImplementation: false
```

## 6. Test Added

Created:

```text
tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs
```

The test validates fixture metadata, local evaluation runner compatibility, required issue-family coverage, mode coverage, authority-state coverage, case field completeness, fact-gap/source-coverage separation, Phase 10 deferrals, hierarchy/conflict placeholders, supersession/effective-date deferrals, numeric risk scoring deferral, policy-first non-engine safeguards, Phase 7A safeguard preservation, and no live service requirements.

## 7. Issue-Family Coverage

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
authority-state reasoning posture
policy-first/non-engine scaffold
```

## 8. Mode Coverage

Covered:

```text
/ask
/tax
/audit
```

The fixture preserves `/ask` conversational format, `/tax` senior memo format, and `/audit` advisory format as Phase 7A boundaries underneath Phase 7B reasoning.

## 9. Authority-State Coverage

Covered:

```text
AUTHORITY_FOUND
RELATED_AUTHORITY_ONLY
NO_INDEXED_SOURCE
GENERAL_TAX
```

The fixture requires direct but non-overclaiming posture under `AUTHORITY_FOUND`, related/supporting-only posture under `RELATED_AUTHORITY_ONLY`, no-fabrication posture under `NO_INDEXED_SOURCE`, and generic non-promotion under `GENERAL_TAX`.

## 10. User Fact Gap vs Source Coverage Gap Separation

Every case has separate `missingUserFacts` and `sourceCoverageNeeds` arrays. The test verifies they are present, non-identical, and not conflated. User fact gaps include facts such as taxpayer status, payment type, tax period, documents, assessment stage, invoice details, and contract terms. Source coverage needs include authority/source needs such as NIRC provisions, regulations, case authority, source metadata, and Phase 10 currentness support.

## 11. Phase 7A Safeguard Preservation

Every case includes `phase7aSafeguardsToPreserve`. Covered safeguards include:

```text
ask_conversational_format
tax_senior_memo_format
audit_advisory_format
authority_state_discipline
source_limitation_wording
related_authority_caution
no_indexed_source_non_fabrication
generic_query_non_promotion
no_guaranteed_outcome
caveats_missing_facts
documentary_support_needed
source_card_scope_limits
```

## 12. Policy-First / Fixture-First Confirmation

Confirmed. The fixture has `implementationReady: false` and `runtimeImplementation: false`. It does not create or assume `issue-framing-engine.js`, `fact-gap-detector.js`, authority-applicability engines, BIR/taxpayer position engines, audit-defense engines, documentary-support engines, or procedural engines.

## 13. Authority Conflict / Hierarchy Placeholder Treatment

Authority conflict and hierarchy items are placeholder/deferred only. The fixture routes hierarchy and currentness needs to later metadata/source-governance work where required, especially Phase 10.

## 14. Supersession / Effective-Date Deferred Treatment

Supersession, effective-date, effective-period, currentness, and temporal source conclusions are marked as deferred to Phase 10 metadata/source governance where relevant. The fixture may identify date or period as a user fact gap, but it does not implement temporal authority logic.

## 15. Risk Language / Numeric Scoring Deferred Treatment

Numeric risk scoring is deferred. Cases require qualitative risk posture only, such as cautious, unknown, insufficient-facts, or qualitative procedural risk. No case assigns a numeric risk score.

## 16. Validator False-Positive Placement Notes

Form 2307/CWT cases are included as issue-framing diagnostics. The fixture distinguishes possible reasoning/applicability placement from source coverage or metadata gaps. It does not implement validator false-positive fixes and does not modify issue-classification behavior.

## 17. Runtime-Safety Confirmation

Confirmed. The fixture and test are offline/local. They do not call live retrieval, DB/vector store, OpenAI, staging, external services, sourceAvailability execution, source-card selection, network, or secrets.

## 18. Local Validation Results

Passed:

```text
node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs
PATCH-07B-002 analytical reasoning issue-framing scaffold tests: 21 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs
PATCH-07A-008 source limitation and mode-boundary hardening tests: 23 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-007-response-safety-red-team-fixture.test.mjs
PATCH-07A-007 response-safety red-team fixture tests: 23 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs
PATCH-07A-006 audit advisory formatting protection tests: 19 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs
PATCH-07A-005 tax senior memo formatting protection tests: 16 passed, 0 failed
```

Passed after sequential rerun:

```text
node tests/patch-07a-004-ask-conversational-formatting.test.mjs
PATCH-07A-004 ask conversational formatting tests: 10 passed, 0 failed
```

Note: the first parallel execution slot for PATCH-07A-004 returned a sandbox helper error before test output; the sequential rerun passed cleanly.

Passed:

```text
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PATCH-06F-005 exact-source limitation wording tests: 10 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-006-mode-format-evaluation.test.mjs
PATCH-06F-006 mode-format evaluation tests: 12 passed, 0 failed
```

Passed:

```text
node tests/patch-019a-regression.test.mjs
PATCH-019A Regression: 87 passed, 0 failed
```

Passed:

```text
npm test
Syntax checks: 10 run, 0 failed
Test suites: 85 run, 0 failed
GATE PASSED
```

Passed:

```text
npm run guard:files
PASS: No protected files modified
```

## 19. Confirmation of No Runtime Behavior Change

Confirmed. No runtime behavior was changed.

## 20. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt files, retrieval files, reranker files, sourceAvailability behavior, source-card behavior, answer renderer, context orchestration, ask handler, rag answer handler, routes/controllers, or issue-classification behavior were changed.

## 21. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, DB, indexing, vector, corpus, ingestion, environment, secret, Google Drive, n8n, Crawlee, Apify, B2, frontend, streaming, memory, observability, or source-governance changes were made.

## 22. Gemini Review Recommendation

Gemini review is not required for PATCH-07B-002 because it is fixture/test/report-only and incorporates the PATCH-07B-001 Gemini recommendations.

Gemini review should be reconsidered before PATCH-07B-008, the first narrow runtime implementation, or earlier only if scaffold uncertainty remains.

## 23. Risk Assessment

Low. This patch only adds local/static scaffold coverage and a focused local test. Residual risk is confined to future runtime implementation: Phase 7B reasoning could overclaim if later implementation bypasses these policies. The scaffold mitigates that by locking issue framing, fact-gap/source-gap separation, authority-state posture, Phase 7A safeguards, and deferral boundaries before implementation.

## 24. Recommended Next Task

Recommended next task:

```text
PATCH-07B-003 - Fact-gap detector fixture and tests
```

Recommended agent:

```text
Codex
```

Gemini review for next task:

```text
Not required unless PATCH-07B-002 reveals material architecture uncertainty.
```

Reason: after the issue-framing scaffold, Phase 7B should deepen fact-gap detector fixture/test coverage before authority-applicability or runtime implementation. Do not proceed to PATCH-07B-008 yet.
