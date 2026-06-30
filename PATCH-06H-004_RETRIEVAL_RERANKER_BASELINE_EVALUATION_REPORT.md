# PATCH-06H-004 - Retrieval / Reranker Baseline Evaluation Report

Status: COMPLETE / DIAGNOSTIC ONLY / LOCAL PASS

Branch: feature/source-availability-engine-v1

## 1. Objective

Create the Phase 6H retrieval/reranker baseline evaluation after PATCH-06H-003 and before any retrieval, reranker, sourceAvailability, authority-normalization, source-card, dependency, corpus, vector-store, or ingestion change.

## 2. Scope

This patch is report-only.

Confirmed out of scope:

```text
runtime behavior changes
retrieval behavior changes
reranker behavior changes
authority-normalization behavior changes
source-card behavior changes
sourceAvailability behavior changes
ask/tax/audit behavior changes
prompts/routes/controllers/DB/indexing/RAG/vector/corpus/ingestion changes
package/dependency/env/secrets changes
external reranker experiments
```

## 3. Current Branch / Commit Baseline

Branch:

```text
feature/source-availability-engine-v1
```

Pre-work git status:

```text
## feature/source-availability-engine-v1...origin/feature/source-availability-engine-v1
?? .vscode/
```

The untracked `.vscode/` directory was pre-existing and left untouched.

Recent history confirmed:

```text
d671a85 PATCH-06H-003 fix bare citation normalization
1c0a689 PATCH-06H-002 add bare citation normalization regression tests
95036d1 PATCH-06H-001 add retrieval reranker authority baseline map
ed0af67 PATCH-06G-GATE-1 close Phase 6G
```

## 4. Baseline Inputs Reviewed

Reviewed:

```text
PATCH-06H-001_RETRIEVAL_RERANKER_AUTHORITY_NORMALIZATION_BASELINE_MAP.md
PATCH-06H-002_BARE_CITATION_NORMALIZATION_REGRESSION_TESTS.md
PATCH-06H-003_BARE_CITATION_NORMALIZATION_FIX.md
evaluation/fixtures/phase-6h-002-bare-citation-normalization-regression.fixture.json
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
retrieval-engine.js
reranker-engine.js
issue-exact-authority-detector.js
source-card-engine.js
pipeline.js
services/source-authority-selector.js
services/source-authority-selector-eligibility.js
Phase 6F evaluation fixtures/tests
source-card, authority, and generic-guard regression tests
```

## 5. Retrieval Baseline Findings

Current retrieval entry point:

```text
retrieval-engine.js -> retrieveRelevantSources(options)
```

Compatibility aliases remain present:

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

Current retrieval helper responsibilities include:

```text
query intent analysis
issue classification normalization
authority citation normalization
target authority variant generation
authority-aware query-set construction
exact/normalized authority retrieval layers
citation variant retrieval layers
semantic vector retrieval layers
Supabase fallback paths
authority sufficiency gating
candidate scoring and annotation
supersession and reviewer-only filtering
court authority recovery
final dedupe and compact diagnostics
```

Authority-aware handoff:

```text
pipeline.js classifies/normalizes issue intent.
retrieveRelevantSources receives issueClassification, queryIntent, authorityFilter, and search callables.
retrieval-engine.js builds targetAuthorities, authoritySearchTerms, normalizedAuthorityKeys, and generatedAuthorityVariants.
Retrieved docs receive issueClassificationMatch, targetAuthorityMatch, exactAuthorityMatch, authorityMatchTier, retrieval layer, and score metadata.
pipeline.js later reranks and passes candidates into sourceAvailability and source-card selection.
```

Indexed source lookup dependencies:

```text
vector-store exact authority / normalized citation / title metadata / semantic search helpers
Supabase fallback search when callables are absent or insufficient
source-card-engine indexed target lookup for late exact card restoration
```

Query normalization dependencies:

```text
issue-classification-engine.js
issue-exact-authority-detector.js
authority-alias-registry.js
authority-utils.js
vector-authority-reference-registry.js
vector-authority-keyword-builders.js
query-intent-engine.js
```

Interaction with source cards and sourceAvailability:

```text
Retrieval does not itself decide final public source cards.
It supplies annotated candidates used by reranker, classifySourceAvailability, pipeline source-card construction, and services/source-authority-selector.js.
AUTHORITY_FOUND requires visible final cards; accepted/reranked candidates without visible cards produce RELATED_AUTHORITY_ONLY.
```

Retrieval risk level for future modification:

```text
Medium to high.
Reason: retrieval feeds multiple downstream invariants: exact authority promotion, generic guard discipline, sourceAvailability state, and click-target selection.
```

## 6. Reranker Baseline Findings

Current reranker entry point:

```text
reranker-engine.js -> rerankForTina({ query, sources, issueClassification, ... })
```

Related public helpers:

```text
computeTinaRerankScore
selectControllingAuthorities
selectIssueRelevantCases
rerankerHealthCheck
normalizeMode
normalizeConfidence
```

Current scoring/normalization responsibilities:

```text
deduplicate candidate docs
normalize authority type and mode
extract issue classification from direct input, query intent, adaptive context, and candidate metadata
apply authority hierarchy weight
apply exact reference bonus
apply issue/domain bonus and issue mismatch penalty
apply controlling authority boost
apply semantic score contribution
apply adaptive mode bonus
penalize weak case authority where appropriate
exclude or suppress superseded authorities
compute confidence
compute authorityMatchTier
sort by authority specificity, exact match, target match, score, and authority priority
```

Issue signal handling:

```text
reranker-issue-signals.js provides ISSUE_TYPE, detectIssueTypes, normalizeIssue, normalizeDomain, issueOverlap, and issueMismatch.
tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs confirms extracted issue-signal behavior and reranker ordering remain issue-aware.
```

Near-match / relevance behavior:

```text
The reranker supports issue overlap and mismatch, target-authority matching, exact-reference signals, authorityMatchTier, and weak case penalties.
There is no external semantic reranker provider in the current baseline.
Near-match rejection is implicit through score penalties, issueMismatch filtering, supersession filtering, and source-card selector gates rather than a separately measured metric.
```

Exact authority relevance behavior:

```text
Exact references and targetAuthorities are matched against normalized_reference, citation, title, source, and metadata variants.
authorityMatchTier separates exact provision/reference matches from range, family, and no-match candidates.
This is a key protection against generic STATUTE/RR matches outranking exact named authorities.
```

Generic-query guard interaction:

```text
Generic guard protection begins upstream in exact-authority detection and issue classification.
The reranker should not be used to compensate for false exact promotion.
Current generic guard tests remain passing after PATCH-06H-003.
```

Reranker risk level for future modification:

```text
High.
Reason: reranker order affects source-card precision, related-only disclosure, exact authority surfacing, and generic false promotion risk.
```

## 7. Authority-Normalization Baseline After PATCH-06H-003

PATCH-06H-002/003 now cover active exact-authority recognition for:

```text
RR 2-98 / RR No. 2-98 / Revenue Regulations No. 2-98
RMC 65-2012 variants
RMO 20-2013 variants
RMO 24-2013
NIRC Sec. 57 / Section 57 variants
NIRC Sec. 58
NIRC Section 23
RA 10963 / Republic Act No. 10963 / TRAIN Law
RA 11534 / CREATE Act
CTA Case No. 9369 / CTA Case 9369
G.R. No. 153866
CIR v. Seagate / Seagate case
```

CTA Case 9369 normalization:

```text
CTA Case 9369 -> CTA Case No. 9369
CTA Case No. 9369 -> CTA Case No. 9369
```

CIR v. Seagate mapping:

```text
CIR v. Seagate -> G.R. No. 153866
Seagate case -> G.R. No. 153866
```

Generic guard controls remain protected for:

```text
tax law
BIR issuance
court case
VAT case
withholding tax case
explain EWT
what is withholding tax
```

Remaining bare citation gap:

```text
Classifier recognition is active and passing.
Runtime source-card/sourceAvailability outcomes for those bare authorities remain pending future live/source-card evaluation and should not be inferred from classifier tests alone.
```

## 8. Bare Citation Regression Status

Focused command:

```text
node tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
```

Result:

```text
PASS - 14 passed, 0 failed
```

Meaning:

```text
Bare and named authority fixture queries are active exact-authority/classifier assertions.
Generic controls remain non-exact authority lookups.
Future runtime assertions remain pending and non-failing by design.
```

## 9. Generic Guard Status

Focused command:

```text
node tests/patch-06f-004-generic-query-guard-regression.test.mjs
```

Result:

```text
PASS - 9 passed, 0 failed
```

Full regression gate also passed, including generic guard and related authority suites.

## 10. Source-Card / Retrieval Interaction Baseline

How retrieval results become source cards:

```text
retrieveRelevantSources returns sanitized, scored, annotated candidates.
pipeline.js reranks candidates through rerankForTina.
pipeline.js computes sourceAvailability from displayed/accepted/reranked counts and classifier context.
pipeline.js builds source-card candidates and invokes selectSourceAuthorities.
services/source-authority-selector.js selects, gates, orders, sanitizes, dedupes, and caps visible cards.
source-card-engine.js provides public card construction, URL sanitization, exact indexed target lookup, and final card merge helpers.
```

Exact authorities are surfaced through:

```text
issueClassification.targetAuthorities
retrieval exact/normalized authority layers
retrieval exactAuthorityMatch and authorityMatchTier annotations
reranker exact-reference and authority-tier ordering
source-authority-selector exact target and controlling-authority priority
late indexed target restoration when source cards are otherwise missing
```

Related-only authorities are disclosed through:

```text
RELATED_AUTHORITY_ONLY when retrieved/reranked/accepted authority candidates exist but no visible source card survives filtering.
source-card eligibility requires coherent governing/supporting fields and compatible sourceAvailability status.
```

Known source-card click-target risks:

```text
generic authority over-promotion can expose unrelated exact cards
label/type mismatch can create wrong click targets
case citation aliases can resolve to the wrong case if normalization is too loose
related-only candidates can be mistaken for governing cards if SAE/card eligibility boundaries weaken
```

Current source-card integrity coverage:

```text
tests/patch-023b-source-card-url-and-label.test.mjs
tests/patch-027r-source-card-field-preservation.test.mjs
tests/patch-027y-source-card-finalization.test.mjs
tests/patch-030a-exact-jurisprudence-authority-integrity.test.mjs
tests/patch-033d-r1-source-card-integrity.test.mjs
tests/patch-034a-source-card-engine-extraction.test.mjs
tests/patch-034b-indexed-source-card-target-extraction.test.mjs
tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
tests/patch-06f-003-case-click-target-integrity.test.mjs
tests/patch-06f-007-domain-source-card-coverage.test.mjs
```

Parked for Phase 7C / 6F-LIVE:

```text
CTA 9711 / CTA 9369 / Seagate answer-grounding and citation-faithfulness evaluation
live source-card outcome verification for bare citations
```

## 11. Existing Test Coverage

Retrieval behavior currently has indirect and focused coverage through:

```text
tests/patch-024b-residual-q2-retrieval-shield.test.mjs
tests/patch-027s-r1-explicit-authority-starvation.test.mjs
tests/patch-035b-ra10963-bridge.test.mjs
tests/patch-06e-007-vector-authority-keyword-builders-extraction.test.mjs
tests/patch-034f-2-vector-authority-reference-registry-extraction.test.mjs
tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
tests/patch-06f-007-domain-source-card-coverage.test.mjs
```

Reranker behavior currently has coverage through:

```text
tests/patch-06e-004-reranker-normalizers-extraction.test.mjs
tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs
npm test syntax check for reranker-engine.js
downstream source-card/authority regression suites
```

Authority normalization currently has coverage through:

```text
tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
tests/patch-027m-exact-admin-query-shape.test.mjs
tests/patch-030a-exact-jurisprudence-authority-integrity.test.mjs
tests/patch-034f-1-authority-alias-registry-extraction.test.mjs
tests/patch-034f-2-vector-authority-reference-registry-extraction.test.mjs
```

Source-card/sourceAvailability interaction currently has coverage through:

```text
tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
tests/patch-06f-003-case-click-target-integrity.test.mjs
tests/patch-06f-004-generic-query-guard-regression.test.mjs
tests/patch-06f-005-exact-source-limitation-wording.test.mjs
tests/patch-06f-007-domain-source-card-coverage.test.mjs
tests/patch-06g-003-source-card-wrapper-equivalence.test.mjs
tests/patch-06e-008-source-authority-selector-eligibility-extraction.test.mjs
```

## 12. Coverage Gaps

Current gaps:

```text
No dedicated no-dependency reranker comparison fixture exists yet.
No dedicated top-1/top-3 source-card precision/recall metric runner exists yet.
No active runtime assertion checks bare citation sourceAvailability/source-card outcomes; those remain pending metadata.
No measured near-match rejection rate exists yet.
No measured generic-query false promotion rate exists beyond regression pass/fail fixtures.
No latency/cost/fallback reliability baseline exists for reranker comparison.
No current evidence compares local reranker alternatives against the existing reranker.
```

## 13. Cohere-ai / External Reranker Readiness

Current readiness:

```text
Not ready.
```

Reason:

```text
The current baseline documents local behavior and passing guards, but it does not yet define a no-dependency comparison plan, metric runner, acceptance thresholds, fallback behavior, latency budget, or cost budget.
```

Required before cohere-ai or any external reranker:

```text
frozen baseline fixture set
exact authority hit-rate metric
top-1 and top-3 source-card quality metrics
generic false-promotion metric
near-match rejection metric
source-card click-target integrity metric
latency and failure/fallback metric
decision thresholds
rollback plan
```

Dependency position:

```text
Do not add cohere-ai in PATCH-06H-004.
Do not add any external reranker dependency until a no-dependency comparison plan shows a measurable need.
```

## 14. Recommended Metrics for Future Reranker Comparison

Recommended metrics:

```text
exact authority hit rate
top-1 source-card precision
top-3 source-card recall
near-match rejection rate
generic-query false promotion rate
source-card click-target integrity
authority state accuracy
source limitation accuracy
related-only disclosure accuracy
unavailable-source false promotion rate
latency p50/p95
token and cost impact
fallback reliability
regression-suite pass/fail preservation
```

## 15. Risk Assessment

Retrieval modification risk:

```text
Medium/high because retrieval annotations directly affect reranker order, SAE state, source-card eligibility, exact authority surfacing, and generic guard discipline.
```

Reranker modification risk:

```text
High because reranker ordering can silently change governing-card precision and related-only disclosure even when retrieval candidates are unchanged.
```

External reranker risk:

```text
High until latency, cost, fallback, determinism, authority precision, and guard preservation are measured locally.
```

Report-only patch risk:

```text
Low. No runtime, test, package, corpus, vector, DB, ingestion, prompt, route, or controller file is changed.
```

## 16. Roadmap / Backlog Discipline Confirmation

Confirmed parked:

```text
CTA 9711 / CTA 9369 / Seagate related-authority answer-grounding evaluation -> Phase 7C or 6F-LIVE
PATCH-025B validator false positives for BIR Form 2307/2550M -> Phase 7B unless diagnostics show pure classifier issue
PATCH-026 CREATE/TRAIN/NIRC 109/compliance/penalty coverage -> Phase 10
authority metadata schema/source registry/ingestion governance -> Phase 10
topic-based authority discovery and official-source acquisition -> Phase 10
Google Drive/source repository availability checking -> Phase 10
query evidence logging -> limited Phase 7C possible, full Phase 11
adaptive self-updating backbone / continuous governance -> Phase 11/15
full red-team revalidation -> after Phase 10 source coverage
zod/langfuse/cohere-ai/zustand/Vercel AI SDK adoption -> only in assigned future phases
mobile app/distribution -> Phase 14 after Phase 13
```

## 17. Validation Commands and Results

Focused PATCH-06H-002/003 regression:

```text
node tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
PASS - 14 passed, 0 failed
```

Focused reranker normalizer coverage:

```text
node tests/patch-06e-004-reranker-normalizers-extraction.test.mjs
PASS - 4 passed, 0 failed
```

Focused reranker issue-signal coverage:

```text
node tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs
PASS - 5 passed, 0 failed
```

Authority/source-card regression suite:

```text
node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed
```

Generic-query guard regression:

```text
node tests/patch-06f-004-generic-query-guard-regression.test.mjs
PASS - 9 passed, 0 failed
```

Full regression gate:

```text
npm test
PASS - 10 syntax checks, 75 suites, 0 failures
GATE PASSED
```

Protected files guard:

```text
npm run guard:files
PASS - No protected files modified
```

## 18. Confirmation of No Runtime Behavior Change

Confirmed:

```text
No retrieval-engine.js change.
No reranker-engine.js change.
No issue-exact-authority-detector.js change.
No source-card-engine.js change.
No sourceAvailability behavior change.
No pipeline.js change.
No tests changed.
No package/dependency/env/DB/indexing/vector/corpus/ingestion files changed.
No prompts, routes, or controllers changed.
No cohere-ai or external reranker work added.
```

## 19. Recommended Next Task

Recommended:

```text
PATCH-06H-005 - Retrieval / reranker comparison plan, no dependency
```

Reason:

```text
The current evidence does not justify runtime reranker modification or cohere-ai adoption.
A no-dependency comparison plan can define metrics, fixtures, acceptance thresholds, fallback rules, and decision gates before any retrieval/reranker behavior changes.
```
