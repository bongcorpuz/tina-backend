# PATCH-07B-004 - Authority Applicability Policy Fixture and Tests

## 1. Objective

Add offline Phase 7B authority applicability policy fixture coverage and a focused fixture test before any runtime authority applicability implementation.

## 2. Scope

Fixture/test/report-only. No runtime authority-applicability engine, authority conflict resolver, hierarchy engine, fact-gap detector, prompts, retrieval, reranker, authority-normalization, sourceAvailability, source-card, issue-classification, route/controller, package/dependency, DB, vector, corpus, ingestion, frontend, streaming, memory, observability, source-governance, or external-tool work was implemented.

## 3. Basis from PATCH-07B-001, PATCH-07B-002, and PATCH-07B-003

PATCH-07B-001 established Phase 7B fixture-first sequencing, required reasoning to feed into Phase 7A response containers, and placed authority applicability as design/fixture work before any runtime implementation.

PATCH-07B-002 locked issue-framing boundaries, authority-state discipline, user fact gap vs source coverage gap separation, Phase 10 deferrals, and Phase 7A safeguard preservation.

PATCH-07B-003 added fact-gap coverage and validated missing fact, document, timing, taxpayer-status, transaction-character, assessment-stage, source-coverage, and policy-first boundaries.

## 4. Gemini Review Carry-Forward

PATCH-07B-001 Gemini recommendations are carried forward by keeping this patch policy-first and fixture-first, deferring runtime implementation, preserving authority-state and Phase 7A safeguards, and treating hierarchy/conflict, effective-date, supersession, currentness, and source metadata as Phase 10-dependent where needed.

## 5. Fixture Added

Created:

```text
evaluation/fixtures/phase-7b-004-authority-applicability-policy.fixture.json
```

The fixture has 35 local/static scaffold cases and the required top-level values:

```text
patch: PATCH-07B-004
phase: Phase 7B
scaffoldType: authority_applicability_policy
runtimeSafe: true
requiresNetwork: false
requiresDb: false
requiresSecrets: false
implementationReady: false
runtimeImplementation: false
buildsOn: PATCH-07B-001, PATCH-07B-002, PATCH-07B-003
```

## 6. Test Added

Created:

```text
tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs
```

The test validates fixture metadata, local evaluation runner compatibility, runtime-safety fields, PATCH-07B-002 and PATCH-07B-003 lineage, minimum case count, category coverage, mode coverage, authority-state coverage, authority type enumeration, applicability classification enumeration, required field completeness, user fact gap vs source coverage separation, checklist inputs, hierarchy/effective-date/supersession deferrals, source-state behavior, BIR ruling limits, court decision posture limits, Phase 10 dependency policy, policy-first safeguards, Phase 7A safeguards, and absence of live service requirements.

## 7. Authority Applicability Category Coverage

Covered:

```text
statutory applicability / NIRC sections
regulation applicability / Revenue Regulations
RMC/RMO applicability
BIR ruling applicability
court decision applicability
effective-date / transition placeholder
supersession / amendment placeholder
taxpayer-type / transaction-type applicability
procedural posture applicability
authority-state applicability behavior
policy-first / non-engine scaffold
```

## 8. Mode Coverage

Covered:

```text
/ask
/tax
/audit
```

## 9. Authority-State Coverage

Covered:

```text
AUTHORITY_FOUND
RELATED_AUTHORITY_ONLY
NO_INDEXED_SOURCE
GENERAL_TAX
```

## 10. Authority Type Coverage

Covered:

```text
STATUTE
REGULATION
REVENUE_MEMORANDUM_CIRCULAR
REVENUE_MEMORANDUM_ORDER
BIR_RULING
COURT_DECISION
PROCEDURAL_NOTICE
GENERAL_TAX_ORIENTATION
UNKNOWN_OR_UNAVAILABLE
```

## 11. Applicability Classification Coverage

Covered:

```text
DIRECTLY_APPLICABLE_IF_FACTS_MATCH
FACT_DEPENDENT_APPLICABILITY
RELATED_SUPPORTING_ONLY
BACKGROUND_OR_ORIENTATION_ONLY
NOT_APPLICABLE_ON_GIVEN_FACTS
NO_INDEXED_AUTHORITY_AVAILABLE
DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW
```

## 12. Controlling vs Related Authority Policy

The fixture distinguishes source availability from applicability. `AUTHORITY_FOUND` does not override missing taxpayer, transaction, period, document, or procedural facts. `RELATED_AUTHORITY_ONLY` remains related/supporting or background only and cannot be promoted to direct applicability.

## 13. No Indexed Source Applicability Policy

`NO_INDEXED_SOURCE` cases use `NO_INDEXED_AUTHORITY_AVAILABLE` and prohibit fabricated applicability, fabricated source content, invented effective dates, invented amendment history, and controlling authority claims.

## 14. General Tax / Generic Query Policy

`GENERAL_TAX` cases are background or orientation only. They do not claim exact authority, direct applicability, governing source status, case holdings, currentness, or final conclusions.

## 15. Taxpayer-Type / Transaction-Type Applicability

The fixture covers taxpayer class, VAT/PEZA/export status, buyer/seller status, goods versus services, domestic versus export treatment, registration status, and transaction character. Broad rules cannot be generalized beyond their taxpayer and transaction scope.

## 16. Procedural Posture Applicability

Procedural cases require notice stage, dates, defect type, remedy posture, protest/collection stage, and supporting authority before applicability can be concluded. Audit mode preserves qualitative risk and no-guaranteed-outcome language.

## 17. Court Decision Applicability Treatment

Court decision cases require court level, doctrine, factual similarity, finality/status where relevant, and procedural posture. CTA and Supreme Court treatment is cautious, and no case guarantees taxpayer success or assessment invalidation.

## 18. BIR Ruling Applicability Treatment

BIR ruling cases require ruling number/source, addressee, taxpayer identity, factual similarity, transaction details, period, and ruling status/currentness where relevant. The fixture prohibits assuming binding applicability to non-addressee taxpayers.

## 19. RMC / RMO Applicability Treatment

RMC/RMO cases treat administrative issuances as interpretive, procedural, or supporting depending on content, issue, taxpayer facts, procedural posture, and hierarchy. Full hierarchy/binding-effect analysis remains deferred.

## 20. Effective-Date / Transition Placeholder Treatment

Effective-date and transition cases identify period facts and temporal source needs but defer final temporal applicability to Phase 10 metadata/source governance when effective-date support is required.

## 21. Supersession / Amendment Placeholder Treatment

Supersession and amendment cases may flag currentness concerns but do not state an authority is active, repealed, revoked, amended, or superseded unless indexed source status supports the claim. Robust status determination remains Phase 10 work.

## 22. Authority Conflict / Hierarchy Placeholder Treatment

Hierarchy and conflict handling is cautious and placeholder-only. Regulations do not override statutes by assumption; administrative issuances are not elevated by fixture; related cases are not treated as controlling; and full hierarchy resolution is deferred.

## 23. User Fact Gap vs Source Coverage Gap Separation

Every case separates `missingUserFacts` from `authorityOrSourceCoverageNeeds`. The focused test verifies those arrays are present, non-identical, and not conflated.

## 24. Phase 10 Dependency Policy

Phase 10 dependency is explicit for source currentness, hierarchy metadata, court finality/status, BIR ruling status, effective-date metadata, amendment/supersession registry, and source governance. No case implies live acquisition or ingestion.

## 25. Phase 7A Safeguard Preservation

Every case includes `phase7aSafeguardsToPreserve`, preserving `/ask` conversational format, `/tax` senior memo format, `/audit` advisory format, authority-state discipline, source limitation wording, related-authority caution, no-indexed-source non-fabrication, generic-query non-promotion, no guaranteed outcomes, missing-fact caveats, documentary support, and source-card scope limits.

## 26. Policy-First / Fixture-First Confirmation

Confirmed. The fixture has `implementationReady: false` and `runtimeImplementation: false`. It does not create or assume `authority-applicability-engine.js`, `authority-conflict-resolver.js`, `authority-hierarchy-engine.js`, or any Phase 7B runtime engine.

## 27. Runtime-Safety Confirmation

Confirmed. The fixture and test are offline/local. They do not call live retrieval, DB/vector store, OpenAI, staging, external services, sourceAvailability execution, source-card selection, network, or secrets.

## 28. Local Validation Results

Passed:

```text
node tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs
PATCH-07B-004 authority applicability policy fixture tests: 24 passed, 0 failed
```

Additional required validation was run before commit and push:

```text
node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs
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

## 29. Confirmation of No Runtime Behavior Change

Confirmed. No runtime behavior was changed.

## 30. Confirmation of No Prompt / Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. No prompt files, retrieval files, reranker files, sourceAvailability behavior, source-card behavior, answer renderer, context orchestration, ask handler, rag answer handler, routes/controllers, authority normalization, or issue-classification behavior were changed.

## 31. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, DB, indexing, vector, corpus, ingestion, environment, secret, Google Drive, n8n, Crawlee, Apify, B2, frontend, streaming, memory, observability, or source-governance changes were made.

## 32. Gemini Review Recommendation

Gemini review is not required for PATCH-07B-004 because it is fixture/test/report-only.

Gemini review should be reconsidered before PATCH-07B-008, the first narrow runtime implementation, or earlier only if scaffold uncertainty remains.

## 33. Risk Assessment

Low. This patch adds local/static fixture coverage and a focused local test only. Residual risk is confined to future runtime implementation: a later applicability engine could overclaim authority, conflate source state with applicability, or bypass Phase 10 metadata boundaries if it ignores these fixtures.

## 34. Recommended Next Task

Recommended next task:

```text
PATCH-07B-005 - BIR vs Taxpayer Position Fixture and Tests
```

Recommended agent:

```text
Codex
```

Gemini review for next task:

```text
Not required unless PATCH-07B-004 reveals material architecture uncertainty.
```

Reason: after issue-framing, fact-gap, and authority applicability policy scaffolds, Phase 7B should add BIR likely position vs taxpayer position fixture/test coverage before any runtime implementation.
