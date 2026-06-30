# PATCH-06H-001 - Retrieval / Reranker / Authority Normalization Baseline Map

Status: COMPLETE / DIAGNOSTIC ONLY

Branch: feature/source-availability-engine-v1

Scope:

```text
Map the current retrieval, reranker, authority-normalization, exact-authority, bare-citation, sourceAvailability, and source-card selection boundaries before any Phase 6H implementation.
No runtime behavior changes.
No test changes.
No package/dependency changes.
No DB/indexing/RAG/vector/corpus changes.
```

## Executive Summary

The current retrieval stack is layered and already contains multiple exact-authority and fallback paths:

```text
issue/exact-authority detection
-> retrieval-engine orchestration
-> vector-store exact / normalized / title / provision / semantic paths
-> reranker scoring and issue/authority weighting
-> authority annotation
-> sourceAvailability classification in pipeline.js
-> source-authority selector and source-card sanitization
```

Phase 6H should not begin by changing vector storage, external reranker providers, or source-card selection. The first implementation task should be regression-test coverage for bare citation normalization, because the known live failure points to query-shape classification / exact-authority recognition before it points to a vector-store defect.

Recommended next task:

```text
PATCH-06H-002 - Bare citation normalization regression tests
```

## Current Retrieval Entry Points

Primary files:

```text
pipeline.js
retrieval-engine.js
vector-store.js
issue-classification-engine.js
issue-exact-authority-detector.js
authority-alias-registry.js
authority-utils.js
```

Observed pipeline flow:

```text
pipeline.js
  imports retrieveRelevantSources from retrieval-engine.js
  imports vector-store direct lookup helpers for selected exact lookup paths
  calls retrieveRelevantSources before reranking
  calls rerankForTina from reranker-engine.js
  calls annotateAuthorityCandidates from authority-utils.js
  calls classifySourceAvailability inside pipeline.js
  later resolves source-card selection and click targets through source-card/source-authority helpers
```

`retrieval-engine.js` is the main retrieval orchestrator. It exports the primary `retrieveRelevantSources` function plus compatibility aliases including:

```text
retrieveSources
runRetrieval
retrieveForTina
retrieveForQuestion
runRetrievalEngine
getRelevantSources
searchRelevantSources
retrievalEngine
```

Observed retrieval layers include:

```text
exact authority lookup
exact provision lookup
normalized citation lookup
title / path metadata lookup
semantic vector lookup
Supabase fallback lookup
semantic-only warning and fallback handling
court authority recovery
candidate collection and deduplication
supersession filtering
query intent analysis
```

## Vector Store Baseline

Primary file:

```text
vector-store.js
```

Key exported lookup/search paths:

```text
exactAuthoritySearch
exactProvisionSearch
normalizedCitationSearch
titleMetadataSearch
searchSimilar
semanticVectorSearch
searchBySourceName
searchIndexedSources
smartSearch
getQuizSourceChunksLight
getQuizSourceChunks
getReviewSourceChunks
getVectorStoreStats
vectorStoreHealthCheck
```

Important internal/reference helpers:

```text
buildNormalizedRefVariants
fastRefLookup
buildExplicitAuthorityRefGroups
fastRefLookupByExplicitAuthority
fastAuthorityReferenceLookup
metadataSearch
Republic Act / RA 10963 bridge helpers
embedding-backed semantic lookup
```

Vector-store status:

```text
No Phase 6H baseline evidence supports a vector-store mutation.
No indexing, corpus, embedding, or RAG storage update should occur in PATCH-06H-001 or PATCH-06H-002.
If bare citation tests later show retrieval misses after exact-authority recognition succeeds, then a later narrow patch can inspect exactAuthoritySearch / normalizedCitationSearch variants.
```

## Reranker Baseline

Primary files:

```text
reranker-engine.js
reranker-normalizers.js
reranker-issue-signals.js
```

`reranker-engine.js` responsibilities:

```text
deduplicate candidate documents
extract issue classification
normalize candidate text and authority metadata
score authority type and authority precedence
apply domain and issue bonuses/penalties
apply exact-reference bonuses
apply controlling-authority boosts
apply semantic score contribution
apply adaptive mode bonus
penalize weak case authority where appropriate
compute authority match tiers
filter superseded authorities
select controlling authorities
select issue-relevant cases
```

Extracted helper modules:

```text
reranker-normalizers.js
  RESPONSE_MODE
  normalizeText
  lower
  unique
  arrayify
  normalizeMode
  normalizeAuthority

reranker-issue-signals.js
  ISSUE_TYPE
  detectIssueTypes
  normalizeIssue
  normalizeDomain
  issueOverlap
  issueMismatch
```

Reranker status:

```text
No Phase 6H baseline evidence supports adding an external reranker provider before local baseline tests.
Cohere or any other reranker comparison should remain deferred until after current reranker behavior is locked by focused regression tests and evaluation output.
```

## Authority Normalization Baseline

Primary files:

```text
authority-utils.js
authority-alias-registry.js
issue-exact-authority-detector.js
vector-authority-reference-registry.js
vector-authority-keyword-builders.js
authority-engine.js
authority-constants.js
authority-restoration-engine.js
```

`authority-utils.js` is the central authority annotation and normalization module. Its relevant responsibilities include:

```text
document path/source extraction
authority type normalization
legal reference normalization
authority metadata construction
authority candidate annotation
authority level / score / controlling precedence derivation
issue match bonus computation
authority priority bonus computation
court / BIR / secondary authority classification
authority safety flag construction
```

`authority-alias-registry.js` handles administrative authority recognition:

```text
ADMINISTRATIVE_AUTHORITY_TYPES
EXACT_ADMINISTRATIVE_AUTHORITY_TYPES
ADMINISTRATIVE_AUTHORITY_PATTERNS
normalizeAdministrativeAuthorityReference
detectAdministrativeAuthorityReference
isExactAdministrativeAuthorityLookup
```

`issue-exact-authority-detector.js` handles exact-authority detection for:

```text
CREATE / TRAIN aliases
administrative issuances
Republic Acts
NIRC sections
G.R. citations
CTA EB citations
CTA Case citations
```

`vector-authority-reference-registry.js` and `vector-authority-keyword-builders.js` provide normalized citation and keyword variants used by vector/retrieval paths.

Baseline conclusion:

```text
Bare citation defects are most likely to start in exact-authority detection, administrative authority alias recognition, or issue classification query-shape handling.
Vector-store lookup should be treated as the second suspect only after tests prove normalized exact-authority intent is being emitted correctly.
```

## SourceAvailability and Source-Card Boundaries

Primary files:

```text
pipeline.js
source-visibility-engine.js
source-card-engine.js
services/source-authority-selector.js
services/source-authority-selector-eligibility.js
services/source-authority-selector-card-sanitizer.js
```

Current Phase 6G boundary findings remain valid:

```text
classifySourceAvailability is exported from pipeline.js and imported by tests.
computeSourceAvailability is private in pipeline.js.
source-visibility-engine.js is a utility/display module, not the SAE classifier destination.
Future classifier extraction should use a dedicated source-availability-classifier.js, not source-visibility-engine.js.
```

`services/source-authority-selector.js` responsibilities:

```text
visible source-card candidate selection
source-card eligibility gating
target-safe reference resolution
NIRC card plan handling
source-card priority sorting
source-card sanitization and deduplication
```

`services/source-authority-selector-eligibility.js` defines card eligibility and suppression status boundaries:

```text
CARD_ELIGIBLE_SAE_STATUSES
CARD_SUPPRESSED_SAE_STATUSES
REQUIRED_CARD_FIELDS
PATCH_021F_COURT_TYPES
normalizeStatus
resolveSaeStatus
normalizedEligibilityFields
patch021fCourtSourceType
patch021fCourtRef
validateSourceCardEligibility
```

Source-card conclusion:

```text
Source-card selection should not be modified until bare citation tests prove whether the failure is classification, retrieval, reranking, sourceAvailability, or selector eligibility.
The known bare RR 2-98 issue currently points earlier than card selection because sourceAvailability becomes RELATED_AUTHORITY_ONLY with zero cards.
```

## Known Bare Citation Finding

Finding:

```text
FINDING-028A-F1
Bare citation query "RR 2-98" routes as GENERAL_TAX -> RELATED_AUTHORITY_ONLY with 0 source cards.
```

Expected direction:

```text
For a bare exact administrative citation that exists in the corpus, TINA should recognize the exact-source intent and preserve source-card eligibility.
```

Likely root area:

```text
issue-classification-engine.js
issue-exact-authority-detector.js
authority-alias-registry.js
authority-utils.js
retrieval-engine.js exact retrieval paths
vector-store.js exactAuthoritySearch / normalizedCitationSearch only if upstream exact intent is confirmed
pipeline.js sourceAvailability bridges only if retrieval/reranker candidates are correct but SAE still suppresses
```

Not recommended as first fix:

```text
Do not start by changing source-card rendering.
Do not start by changing vector corpus/indexing.
Do not add an external reranker.
Do not loosen generic-query guards.
```

## Current Test / Evaluation Coverage

Relevant extraction and unit coverage:

```text
tests/patch-06e-004-reranker-normalizers-extraction.test.mjs
tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs
tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
tests/patch-06e-007-vector-authority-keyword-builders-extraction.test.mjs
tests/patch-06e-008-source-authority-selector-eligibility-extraction.test.mjs
tests/patch-034f-2-vector-authority-reference-registry-extraction.test.mjs
```

Relevant authority/source-card regression coverage:

```text
tests/patch-027j-r1-exact-admin-authority-governing.test.mjs
tests/patch-027m-exact-admin-query-shape.test.mjs
tests/patch-027n-exact-admin-response-shape.test.mjs
tests/patch-027o-exact-admin-source-card.test.mjs
tests/patch-027s-source-card-rr-12-2018.test.mjs
tests/patch-030a-generic-republic-act-query-guard.test.mjs
tests/patch-035b-train-source-card.test.mjs
tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
```

Relevant Phase 6F evaluation coverage:

```text
tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
tests/patch-06f-003-case-click-target-integrity.test.mjs
tests/patch-06f-004-generic-query-guard-regression.test.mjs
tests/patch-06f-005-exact-source-limitation-wording.test.mjs
tests/patch-06f-006-mode-format-evaluation.test.mjs
tests/patch-06f-007-domain-source-card-coverage.test.mjs
tests/patch-06f-008-staging-evaluation-report-generator.test.mjs
```

Coverage gap:

```text
Existing tests cover exact administrative query shapes and several named/regulatory source-card behaviors.
The current baseline did not identify a dedicated regression test for the bare citation query "RR 2-98" by itself.
Phase 6F fixture coverage includes a richer prompt, "What does RR 2-98 provide on expanded withholding tax?", but that does not lock bare-citation-only routing.
```

## External Tool / Dependency Baseline

Current dependency observations:

```text
zod exists in package.json.
langfuse exists in package.json.
cohere-ai is not present.
Vercel AI SDK is not present.
zustand is not present.
```

Recommendation:

```text
Do not add dependencies in Phase 6H baseline work.
Do not adopt Cohere reranking before local reranker baseline and regression tests.
Do not expand Langfuse usage as part of PATCH-06H-001 or PATCH-06H-002.
Do not add zod validation refactors here.
Frontend state libraries such as zustand are unrelated to this backend retrieval baseline.
```

Possible later routing:

```text
Cohere / external reranker comparison: later Phase 6H only after baseline tests and comparison criteria.
Zod runtime schemas: Phase 7B / 8 / 10 when schema hardening is explicitly scoped.
Langfuse broader tracing/evaluation: Phase 7C or Phase 11 unless narrowly approved earlier.
Vercel AI SDK: Phase 7A / 11 if streaming/model orchestration is needed.
Zustand: frontend phase only.
```

## Recommended Phase 6H Patch Order

Recommended next patch:

```text
PATCH-06H-002 - Bare citation normalization regression tests
```

Suggested test scope:

```text
Bare administrative citations:
- RR 2-98
- RR 12-2018
- RMC 65-2012
- RMO 20-2013 or RMO 24-2013

Bare statute/provision citations where already supported:
- RA 10963
- NIRC Sec. 57
- NIRC Sec. 58

Bare case citations where already supported:
- G.R. No. 187485
- CTA Case No. 9369

Controls:
- generic EWT / WHT query must not over-promote authority
- generic Republic Act query must remain guarded
- unavailable BIR Ruling DA-489-03 must remain unavailable and must not expose substitute G.R./NIRC cards
```

Expected assertion layers:

```text
exact authority detection result
issue classification shape
retrieval candidate presence where fixture-safe
sourceAvailability status where existing test harness supports it
source-card eligibility / suppression where existing fixtures support it
generic guard preservation
```

Potential implementation patch after tests:

```text
PATCH-06H-003 - Bare citation normalization fix
```

Likely implementation areas, to be confirmed by PATCH-06H-002:

```text
issue-classification-engine.js
issue-exact-authority-detector.js
authority-alias-registry.js
authority-utils.js
```

Only if tests prove upstream exact authority intent already succeeds:

```text
retrieval-engine.js
vector-store.js
pipeline.js sourceAvailability bridge logic
services/source-authority-selector.js
```

## Validation Plan for This Patch

PATCH-06H-001 is diagnostic-only. Required validation:

```text
npm test
npm run guard:files
git diff review confirming only markdown / continuity documentation changed
```

Expected changed files:

```text
PATCH-06H-001_RETRIEVAL_RERANKER_AUTHORITY_NORMALIZATION_BASELINE_MAP.md
knowledge/CURRENT_STATE.md
```

Explicit non-changes:

```text
No pipeline.js changes.
No retrieval-engine.js changes.
No reranker-engine.js changes.
No authority-utils.js changes.
No tests changed.
No package.json / package-lock.json changes.
No DB/indexing/RAG/vector/corpus/ingestion changes.
```
