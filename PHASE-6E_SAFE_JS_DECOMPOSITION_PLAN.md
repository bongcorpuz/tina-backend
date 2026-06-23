# Phase 6E Safe JS Decomposition Plan

Date: 2026-06-23

Branch: `feature/source-availability-engine-v1`

Baseline HEAD: `55acf9d6d1eed4b64c64d95481372e80337b93ff`

Scope: planning only.

Final planning verdict: **Proceed only with narrow, one-module extraction patches after review.**

## Explicit Safety Confirmation

This report is the only intended change.

No backend source code was modified. No JS extraction, refactor, behavior change, DB/indexing update, RAG/vector-store update, source-corpus update, or Google Drive PDF ingestion was performed.

## Files Analyzed

The requested `source-authority-selector.js` exists in this repo as `services/source-authority-selector.js`; that implementation was analyzed.

Analyzed files:

- `issue-classification-engine.js`
- `vector-store.js`
- `retrieval-engine.js`
- `reranker-engine.js`
- `services/source-authority-selector.js`
- `authority-utils.js`
- `pipeline.js`
- `ask-handler.js`
- `services/philippine-tax-domain-boundary.js`

## Current Responsibility Map

| File | Current responsibility | Extraction risk |
|---|---|---|
| `issue-classification-engine.js` | Classifies tax domain, primary issue, sub-issue, exact authorities, retrieval strategy, orchestration hints, source intent, and authority target sets. | High |
| `vector-store.js` | Owns Supabase/OpenAI vector-store access, embeddings, chunking, source row mapping, metadata search, exact authority lookup, RA 10963 source bridge, indexing/removal/lock operations, and vector stats. | Critical |
| `retrieval-engine.js` | Orchestrates layered retrieval, query expansion, exact authority search, fallback search, source scoring, candidate annotation, diagnostics, and jurisprudence slot recovery. | Critical |
| `reranker-engine.js` | Reranks retrieved documents by authority hierarchy, issue overlap, exact reference match, domain, supersession, confidence, and mode signals. | Medium |
| `services/source-authority-selector.js` | Active source-card selector. Applies source-card eligibility, contamination, semantic no-match, label/link consistency, issue relevance, card sanitization, dedupe, priority sorting, and diagnostics. | High |
| `authority-utils.js` | Shared authority metadata utilities: document path/source extraction, authority type/level/score, reference normalization, parsed/indexed flags, direct-governance annotation, and safety flags. | High |
| `pipeline.js` | Central runtime orchestrator. Enforces domain boundary, classification, retrieval, reranking, SAE classification, bridge logic, OpenAI generation, final compliance, source-card finalization, diagnostics, and response assembly. | Critical |
| `ask-handler.js` | Route/controller layer. Handles auth-derived context, hook config, mode state, route timeout fallback, pipeline invocation, public response shaping, source-card sanitization, and persistence. | Critical |
| `services/philippine-tax-domain-boundary.js` | Synchronous fail-closed pre-retrieval boundary classifier for Philippine tax scope. | Low |

## Import / Export Map

### `issue-classification-engine.js`

Imports:

- `enrichIssueClassification` from `main-tax-engine-classification.js`
- `DEFINITION_AUTHORITY_MAP`, `DOMAIN_DETECTORS`, `ISSUE_SPECIFIC_TARGETS` from `doctrine-authority-map.js`
- `detectSourcePattern` from `source-intent-registry.js`
- taxpayer-definition helpers from `taxpayer-definition-registry.js`
- administrative authority alias helpers from `authority-alias-registry.js`

Exports:

- Constants: `ENGINE_VERSION`, `PRIMARY_ISSUE`, `LEGACY_PRIMARY_ISSUE`, `QUERY_INTENT`, `COMPLEXITY`, `FACT_SENSITIVITY`, `RETRIEVAL_STRATEGY`, `LEGAL_DIMENSION`, `AUTHORITY_TYPE`
- Helpers: `normalizeIssue`, `normalizeAuthority`, `normalizeDimension`, `normalizeQuery`, `detectExactAuthority`, `detectTaxDomain`, `detectPrimaryIssue`, `detectSubIssue`, `detectLegalDimensions`
- Runtime APIs: `classifyTaxIssue`, aliases, `buildIssueClassificationSearchQueries`, `isIssueClassificationCompatibleWithDoc`, `isEwtBridgeEligible`, `sourceMaterialTermsMatchAuthority`, `hasSemanticNoMatchGuard`, `isVatDefinitionQuery`, `isCaseLawIntent`, `classifyWithOpenAI`, health check, default export

Inbound dependencies:

- `retrieval-engine.js` imports classification and compatibility APIs.
- `services/source-authority-selector.js` imports semantic no-match/EWT helpers.
- Tests import classification behavior directly.

### `vector-store.js`

Imports:

- `randomBytes`, `OpenAI`, `createClient`, `dotenv/config`
- authority metadata from `authority-engine.js`
- concept aliases from `services/tax-concept-aliases.js`
- authority reference registry from `vector-authority-reference-registry.js`

Exports:

- Instance/lock constants
- Source/reference helpers: `normalizeSourceName`, `normalizeAuthorityReference`, `COURT_AUTHORITY_TYPES`, `isStatuteShapedReference`, `extractCourtCaseIdentifier`
- Mutating/admin APIs: `clearVectorStore`, `acquireReindexLock`, `releaseReindexLock`, `heartbeatReindexLock`, `removeSourceFromVectorStore`, `removeSourceByPatternFromVectorStore`, `countSourceRows`, `addDocumentToVectorStore`
- Search APIs: `exactProvisionSearch`, `exactAuthoritySearch`, `normalizedCitationSearch`, `titleMetadataSearch`, `searchSimilar`, `semanticVectorSearch`, `searchBySourceName`, `searchIndexedSources`, `smartSearch`
- Review/quiz source APIs and health check

Inbound dependencies:

- `server.js` and `reindex-service.js` use lock/admin/stats APIs.
- Retrieval layers depend on exact/search APIs.
- Tests and diagnostics may import helper/search APIs.

### `retrieval-engine.js`

Imports:

- Authority hierarchy helpers from `authority-engine.js`
- `applySupersessionFilter`
- `analyzeQueryIntent`
- classification helpers from `issue-classification-engine.js`
- `rerankForTina`

Exports:

- Constants: `ENGINE_VERSION`, `DEFAULT_TOP_K`, `DEFAULT_POOL_K`, `RETRIEVAL_LAYER`
- Pure-ish helpers: mode/issue/authority normalization, authority variants, target-authority normalization, tax domain hints, retrieval query sets, issue detection, score computation, source sanitization, search query build, safe classification
- Runtime APIs: `retrieveRelevantSources` and aliases, jurisprudence slot helpers, default export

Inbound dependencies:

- `pipeline.js` calls `retrieveRelevantSources`.
- `ask-handler.js` contains deprecated route-level retrieval wrappers.
- Regression suites assert retrieval layer behavior.

### `reranker-engine.js`

Imports:

- Authority hierarchy helpers from `authority-engine.js`
- `applySupersessionFilter`
- `analyzeQueryIntent`

Exports:

- Constants: `ENGINE_VERSION`, `CONFIDENCE_NORMALIZATION_CEILING`, `ISSUE_TYPE`, `RESPONSE_MODE`
- Helpers: `normalizeMode`, `normalizeConfidence`, `detectIssueTypes`, `extractIssueClassification`, `computeTinaRerankScore`
- Runtime APIs: `rerankForTina`, `selectControllingAuthorities`, `selectIssueRelevantCases`, health check, default export

Inbound dependencies:

- `pipeline.js` imports `rerankForTina`.
- `retrieval-engine.js` imports `rerankForTina`.

### `services/source-authority-selector.js`

Imports:

- `canonicalSourceKey`, `inferIssuanceNumber` from `source-visibility-engine.js`
- `hasSemanticNoMatchGuard`, `sourceMaterialTermsMatchAuthority`, `isEwtBridgeEligible` from `issue-classification-engine.js`

Exports:

- `selectSourceAuthorities`
- default export with `selectSourceAuthorities` and `SELECTOR_VERSION`

Inbound dependencies:

- `pipeline.js` calls `selectSourceAuthorities` during final source-card selection.
- Several source-card regression suites import it directly.

### `authority-utils.js`

Imports:

- Authority constants from `authority-constants.js`
- `sourceMaterialTermsMatchAuthority` from `issue-classification-engine.js`

Exports:

- Text/path helpers, authority annotation APIs, authority classification, legal reference normalization, authority metadata builders, hierarchy getters, issue/priority bonuses, authority type predicates, safety flags, default export

Inbound dependency note:

- This module is high-leverage and close to `authority-engine.js`. Any extraction must preserve import direction to avoid cycles.

### `pipeline.js`

Imports:

- Observability helpers, classification, planning, mode, supersession, retrieval, reranker, doctrinal/conflict/legal/final compliance engines, OpenAI orchestration, source card/visibility/authority selector, domain boundary, and multiple fact/evidence/risk engines.

Exports:

- `runPipeline`
- `fourPartDoctrineTest`
- WHT/EWT guard helpers
- `classifySourceAvailability`
- `pipelineHealthCheck`
- default export

Inbound dependencies:

- `ask-handler.js` calls only `runPipeline` for normal RAG.
- Tests statically assert many pipeline markers, ordering, and guard conditions.

### `ask-handler.js`

Imports:

- Conversation memory, feedback, ask helpers, assessment/learning/session hooks, command resolver, mode route config, mode state, `runPipeline`, verified authority gate, and domain boundary service.

Exports:

- `createAskHandler`
- `askHandlerHealthCheck`
- default export

Inbound dependencies:

- `server.js` creates the route handler and health check.
- Route modules receive the handler through dependency injection.

### `services/philippine-tax-domain-boundary.js`

Imports:

- `isTaxRelated` from `tax-keywords.js`

Exports:

- `BOUNDARY_REJECTION_MESSAGE`
- `BOUNDARY_CLARIFY_MESSAGE`
- `detectPhilippineTaxBoundary`
- `checkPhilippineTaxBoundary`

Inbound dependencies:

- `ask-handler.js` pre-checks route queries.
- `pipeline.js` defense-in-depth checks direct pipeline calls.
- Regression tests import boundary behavior.

## Dependency And Call-Flow Risk Map

High-level runtime flow:

```text
server.js
  -> ask-handler.createAskHandler()
  -> route handler
  -> detectPhilippineTaxBoundary()
  -> runPipeline()
     -> detectPhilippineTaxBoundary()
     -> classifyTaxIssue()
     -> retrieveRelevantSources()
        -> vector-store search APIs
        -> rerankForTina()
     -> rerankForTina()
     -> classifySourceAvailability()
     -> selectSourceAuthorities()
     -> OpenAI orchestration
     -> final compliance/rendering
  -> ask-handler public response shaping
```

Critical coupling points:

- `ask-handler.js -> pipeline.js`: timeout fallback, diagnostics, public payload fields, and mode-state persistence.
- `pipeline.js -> retrieval-engine.js`: retrieval diagnostics, source availability, exact authority matches, and layer counts.
- `retrieval-engine.js -> vector-store.js`: exact authority lookup, semantic search, fallback search, and search result shape.
- `pipeline.js -> services/source-authority-selector.js`: final visible source-card behavior.
- `services/source-authority-selector.js -> issue-classification-engine.js`: semantic no-match and EWT bridge behavior.
- `authority-utils.js <-> classification/retrieval/authority-engine concepts`: shared authority semantics, with cycle risk if moved casually.

## Safe Extraction Candidates

| Candidate | Source file | Proposed module | Risk | Why it is safer |
|---|---|---|---|---|
| Source-card selector pure card formatting helpers: `publicCardText`, `publicCardUrl`, `stripInternalCardFields`, `sanitizePublicSelectorCard`, `sanitizeSelectorCards` | `services/source-authority-selector.js` | `services/source-authority-selector-card-sanitizer.js` | Low | Pure helpers, no DB/OpenAI, no selection ordering if moved exactly with snapshot tests. |
| Source-card selector eligibility helpers: `normalizeStatus`, `resolveSaeStatus`, `normalizedEligibilityFields`, `validateSourceCardEligibility` | `services/source-authority-selector.js` | `services/source-authority-selector-eligibility.js` | Medium | Still pure, but directly affects source-card suppression and must be gated by source-card tests. |
| Philippine tax boundary pattern constants | `services/philippine-tax-domain-boundary.js` | `services/philippine-tax-boundary-patterns.js` | Low | Static registry extraction, no decision-order change if arrays and bypass hooks remain ordered. |
| Reranker normalization helpers: `normalizeText`, `lower`, `unique`, `arrayify`, `normalizeMode`, `normalizeAuthority` | `reranker-engine.js` | `services/reranker-normalizers.js` | Low | Pure helper extraction, covered by reranker tests and syntax checks. |
| Reranker issue-signal helpers: `detectIssueTypes`, `normalizeIssue`, `normalizeDomain`, `issueOverlap`, `issueMismatch` | `reranker-engine.js` | `services/reranker-issue-signals.js` | Medium | Pure but affects score behavior; requires score snapshot tests. |
| Vector authority reference keyword builders: `normalizeAuthorityReference`, `buildIssuanceKeywords`, `buildRepublicActKeywords`, `buildCourtKeywords`, `buildNircSectionKeywords`, `buildPossibleSourceKeywords` | `vector-store.js` | `services/vector-authority-keyword-builder.js` | Medium | Pure search expansion logic, but directly affects exact source retrieval; no DB write APIs included. |
| Issue classification exact authority alias helpers: `isCreateActAuthorityAlias`, `isTrainLawAuthorityAlias`, `detectExactAuthority` | `issue-classification-engine.js` | `services/issue-exact-authority-detector.js` | Medium | Pure classification helper, but recent RA 10963 behavior makes it sensitive. |
| Ask-handler public source-card sanitizer helpers | `ask-handler.js` | `services/route-public-source-sanitizer.js` | Medium | Pure response shaping, but front-end source card payloads depend on field shape. |

## Unsafe Extraction Candidates

| Section | File | Risk | Reason |
|---|---|---|---|
| `runPipeline` body and its decision order | `pipeline.js` | Critical | Central behavior chain; many patches depend on exact ordering and diagnostic markers. |
| SAE classification and bridge ordering around `classifySourceAvailability`, WHT/EWT guards, and RA/NIRC bridge sync | `pipeline.js` | Critical | Authority-visible behavior recently stabilized. |
| Final source-card assembly after SAS and direct-support filtering | `pipeline.js` | Critical | UI-visible source cards and click targets depend on exact finalization semantics. |
| Vector-store mutating APIs: `clearVectorStore`, `addDocumentToVectorStore`, remove-source APIs, reindex locks | `vector-store.js` | Critical | Any mistake can affect corpus/indexing data. No extraction before a controlled ingestion/indexing phase. |
| `searchRa10963IndexedTaxCodeSource` and RA 10963 bridge filter/aliases | `vector-store.js` | High | Newly stabilized authority behavior. Park until after additional stabilization. |
| `retrieveRelevantSources`, `collectCandidateDocs`, layered retrieval orchestration | `retrieval-engine.js` | Critical | Exact authority, fallback, vector, and diagnostics ordering are coupled. |
| `selectSourceAuthorities` main loop | `services/source-authority-selector.js` | High | Active source-card selector; loop order and bypasses affect visible cards. |
| `createAskHandler` route handler body and mode-state persistence | `ask-handler.js` | Critical | Public API behavior, timeout fallback, persistence, and response shape are coupled. |
| Authority annotation core: `directlyGovernsIssue`, `getAuthorityRole`, `buildAuthorityAnnotation` | `authority-utils.js` | High | Affects source availability and authority safety. |

## Recommended Patch Sequence

1. **PATCH-06E-002: Extract source-authority selector card sanitizer helpers.**
   - Module: `services/source-authority-selector-card-sanitizer.js`
   - Risk: Low
   - Reason: pure helper extraction, source-card tests already exist, no ordering change.

2. **PATCH-06E-003: Extract Philippine tax boundary pattern registry.**
   - Module: `services/philippine-tax-boundary-patterns.js`
   - Risk: Low
   - Reason: fail-closed function remains in place; only ordered constants move.

3. **PATCH-06E-004: Extract reranker normalizers.**
   - Module: `services/reranker-normalizers.js`
   - Risk: Low
   - Reason: pure string/list helpers; no retrieval or source-card behavior.

4. **PATCH-06E-005: Extract reranker issue-signal helpers.**
   - Module: `services/reranker-issue-signals.js`
   - Risk: Medium
   - Reason: scoring inputs move, but `computeTinaRerankScore` remains in place.

5. **PATCH-06E-006: Extract issue exact-authority detector.**
   - Module: `services/issue-exact-authority-detector.js`
   - Risk: Medium
   - Reason: CREATE/TRAIN/RA/NIRC exact authority detection can move only after RA 10963 regression gate is included.

6. **PATCH-06E-007: Extract vector authority keyword builders.**
   - Module: `services/vector-authority-keyword-builder.js`
   - Risk: Medium
   - Reason: pure helpers only; no Supabase/OpenAI clients and no indexing functions.

7. **PATCH-06E-008: Extract source-authority selector eligibility helpers.**
   - Module: `services/source-authority-selector-eligibility.js`
   - Risk: Medium
   - Reason: should follow sanitizer extraction after source-card tests prove no field-shape drift.

8. **PATCH-06E-009: Extract ask-handler public source sanitizer helpers.**
   - Module: `services/route-public-source-sanitizer.js`
   - Risk: Medium
   - Reason: public payload shape sensitive; defer until selector card sanitizer is stable.

9. **PATCH-06E-010+: Retrieval/vector deeper decomposition planning gate.**
   - Do not extract retrieval orchestration yet. Reassess after the earlier pure helper modules are stable.

10. **Pipeline extraction: last or near-last only.**
    - No `pipeline.js` extraction in the first Phase 6E wave.

## Required Tests Before Each Extraction

Baseline before every patch:

```text
git status --short
npm test
npm run guard:files
```

Patch-specific minimums:

| Patch group | Required targeted suites |
|---|---|
| Source-authority selector sanitizer/eligibility | `patch-021f-jurisprudence-naming-and-cards`, `patch-023b-source-card-url-and-label`, `patch-027r-source-card-field-preservation`, `patch-027y-source-card-finalization`, `patch-033d-r1-source-card-integrity`, `patch-035b-ra10963-bridge` |
| Boundary patterns | `patch-033d-r3-source-pattern-income-source-guard`, `patch-033d-r4-taxpayer-definition-sec22`, plus generic `Republic Act` / `TRAIN` staging checks |
| Reranker helpers | `patch-027n-wht-jurisprudence-sae-guard`, `patch-027o-generic-ewt-acronym-guard`, `patch-030a-exact-jurisprudence-authority-integrity`, full `npm test` |
| Issue exact-authority detector | `patch-026a-r2-create-act-canonicalization`, `patch-026a-r3-train-law-canonicalization`, `patch-035b-ra10963-bridge`, plus staging CREATE/RA 11534/RA 10963 matrix |
| Vector keyword builders | `patch-027m-exact-admin-query-shape`, `patch-027p-r1-nirc-section-continuation-scope`, `patch-033d-r2-admin-issuance-year-variants`, `patch-035b-ra10963-bridge`, staging exact-authority matrix |
| Ask-handler public sanitizer | `patch-023b-source-card-url-and-label`, `patch-025a-rev3-ask-handler-mapper`, `patch-027r-source-card-field-preservation`, `patch-027y-source-card-finalization` |

Staging checks after any extraction affecting source cards, classification, retrieval, or route payload:

```text
What is RA 10963?
What is the TRAIN Law?
What is RA 11534?
What is NIRC Section 23?
What does NIRC Section 57 provide?
What does RR 2-98 provide on expanded withholding tax?
What is CTA Case No. 9369?
What is BIR Ruling DA-489-03?
What is a Republic Act?
What is TRAIN?
Show me the source for NIRC Section 23.
```

## No-Touch Zones

Do not touch in Phase 6E first wave:

- `pipeline.js` main `runPipeline` decision order
- RA 10963 / TRAIN bridge logic
- source corpus, source metadata, embeddings, Supabase rows, vector table, or indexing scripts
- vector-store write/remove/indexing/lock APIs
- retrieval `collectCandidateDocs` or layered retrieval order
- SAS main selection loop ordering
- final source-card direct-support filtering and fallback rules
- `ask-handler.js` timeout fallback and public response schema
- OpenAI orchestration paths
- auth/session persistence
- environment files and secrets

## Rollback Strategy

For each extraction patch:

1. Keep the old function body behavior byte-for-byte equivalent where practical.
2. Add the new module and import it into the original owner file.
3. Preserve all existing named exports from the original owner file.
4. Run targeted tests, then full `npm test`, then `npm run guard:files`.
5. If any local or staging regression appears, revert only that extraction patch.
6. Do not patch behavior inside the same extraction patch. Classify the issue first.
7. For staging-only failure, stop and classify as deployment, test/query, source corpus mismatch, or extraction regression before any fix.

## Stabilization Gates

After patches 06E-002 through 06E-004:

- Run full local regression gate.
- Run source-card mini staging matrix.
- Confirm staging deployed commit before matrix.

After patches 06E-005 through 06E-007:

- Run full local regression gate.
- Run authority/retrieval mini staging matrix.
- Include RA 10963/TRAIN/CREATE/NIRC/RR/RMC/RMO checks.

After patches 06E-008 through 06E-009:

- Run full local regression gate.
- Run source-card and `/source` staging checks.
- Confirm CTA 9369 click target and NIRC Sec. 23 source lookup.

Before any `pipeline.js` extraction:

- Create a separate architecture plan.
- Require explicit approval.
- Run a full stabilization gate equivalent to PATCH-035D before and after.

## Recommended First Extraction Candidate

Recommended first candidate: **source-authority selector card sanitizer helpers** from `services/source-authority-selector.js`.

Candidate functions:

- `stripInternalCardFields`
- `publicCardText`
- `publicCardUrl`
- `sanitizePublicSelectorCard`
- `sanitizeSelectorCards`

Target module:

```text
services/source-authority-selector-card-sanitizer.js
```

Why first:

- Pure, synchronous, no external clients.
- No DB, OpenAI, vector, indexing, or corpus access.
- Does not alter selection order if imported back exactly.
- Directly covered by existing source-card field preservation and URL/label tests.

Risk score: **Low**

## Final Recommendation

Phase 6E should start with low-risk pure helper extraction from the active source-card selector, then move through boundary constants and reranker normalizers. Retrieval, vector-store search orchestration, ask-handler route execution, authority annotation, and especially `pipeline.js` should remain untouched until the low-risk wave is stabilized.

Recommended order:

```text
source-authority selector sanitizer
philippine tax boundary patterns
reranker normalizers
reranker issue signals
issue exact-authority detector
vector authority keyword builders
source-authority selector eligibility helpers
ask-handler public source sanitizer
retrieval/vector deeper planning gate
pipeline planning gate
```
