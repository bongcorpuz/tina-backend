# PATCH-06H-005 - Retrieval / Reranker Comparison Plan, No Dependency

Status: COMPLETE / PLANNING ONLY / LOCAL PASS

Branch: feature/source-availability-engine-v1

## 1. Objective

Define a no-dependency comparison framework for retrieval/reranker behavior before any runtime reranker modification, Cohere experiment, retrieval-engine change, dependency addition, sourceAvailability change, source-card change, corpus change, or ingestion change.

The plan answers what evidence must exist before TINA changes the current retrieval/reranker path or evaluates an external reranker.

## 2. Scope

This patch is planning/report-only.

Confirmed out of scope:

```text
runtime behavior changes
retrieval behavior changes
reranker behavior changes
authority-normalization behavior changes
source-card behavior changes
sourceAvailability behavior changes
issue-classification behavior changes
ask/tax/audit behavior changes
prompts/templates/routes/controllers changes
DB/indexing/RAG/vector-store/corpus/ingestion changes
package/dependency/env/secrets changes
Cohere or external reranker implementation
new runtime modules
```

## 3. Current Branch / Commit Baseline

Branch:

```text
feature/source-availability-engine-v1
```

Pre-work git status:

```text
## feature/source-availability-engine-v1...origin/feature/source-availability-engine-v1
?? .vscode/extensions.json
```

The untracked `.vscode/extensions.json` file was pre-existing and left untouched.

Recent history confirmed:

```text
e2f4ff3 PATCH-06H-004 add retrieval reranker baseline evaluation
d671a85 PATCH-06H-003 fix bare citation normalization
1c0a689 PATCH-06H-002 add bare citation normalization regression tests
95036d1 PATCH-06H-001 add retrieval reranker authority baseline map
ed0af67 PATCH-06G-GATE-1 close Phase 6G
```

## 4. Inputs Reviewed

Reviewed:

```text
PATCH-06H-001_RETRIEVAL_RERANKER_AUTHORITY_NORMALIZATION_BASELINE_MAP.md
PATCH-06H-004_RETRIEVAL_RERANKER_BASELINE_EVALUATION_REPORT.md
PATCH-06H-002_BARE_CITATION_NORMALIZATION_REGRESSION_TESTS.md
PATCH-06H-003_BARE_CITATION_NORMALIZATION_FIX.md
evaluation/fixtures/phase-6h-002-bare-citation-normalization-regression.fixture.json
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
reranker-engine.js
retrieval-engine.js
issue-exact-authority-detector.js
source-card-engine.js
pipeline.js
Phase 6F evaluation fixtures/tests
source-card, authority, and generic guard tests
```

## 5. Why a No-Dependency Comparison Plan Is Required

PATCH-06H-004 concluded that current evidence does not justify a reranker modification or Cohere adoption. The current reranker is not a cosmetic ordering layer; it affects source-card precision, exact authority surfacing, generic-query protection, sourceAvailability state, and related-only disclosure.

A comparison plan is required before any change because it protects:

```text
exact authority hit rate
top-1 and top-3 source-card quality
source-card label and click-target integrity
generic-query guard discipline
near-match rejection
authority state accuracy
governing-vs-related distinction accuracy
no-indexed-source discipline
source limitation wording
latency and cost
fallback reliability
deterministic repeatability
```

The comparison must first be local and no-dependency so the team can distinguish real retrieval/reranker improvement from provider effects, network variance, corpus gaps, source-card filtering, or sourceAvailability behavior.

## 6. Candidate Comparison Modes

The future comparison framework should define modes but not implement them in PATCH-06H-005.

Mode 1: Current baseline reranker

```text
Uses current retrieval-engine.js and reranker-engine.js behavior.
This is the control and must remain the default behavior unless a later approved patch changes it.
```

Mode 2: Internal no-dependency candidate variant

```text
Future optional candidate only.
May compare alternate local scoring weights, tie-break order, thresholds, or candidate filtering if later justified.
Must be evaluated through fixtures/tests before any runtime switch.
```

Mode 3: External reranker candidate

```text
Future optional candidate only, such as cohere-ai.
Not approved for implementation now.
Requires baseline artifacts, thresholds, cost/latency estimates, privacy review, fallback design, and rollback plan.
```

Mode 4: Fallback mode

```text
Required for any future external candidate.
If the external reranker is unavailable, slow, over budget, returns invalid output, or underperforms guard metrics, TINA must fall back to the current local baseline without source-card or sourceAvailability degradation.
```

## 7. Query Set Design

The comparison set should be representative and frozen before testing candidate behavior.

Exact administrative authority queries:

```text
RR 2-98
RR No. 2-98
Revenue Regulations No. 2-98
RMC 65-2012
RMO 20-2013
RMO 24-2013
```

Exact statutory authority queries:

```text
NIRC Sec. 57
NIRC Sec. 58
NIRC Section 23
RA 10963
Republic Act No. 10963
RA 11534
CREATE Act
TRAIN Law
```

Exact court/case queries:

```text
CTA Case No. 9369
CTA Case 9369
G.R. No. 153866
CIR v. Seagate
Seagate case
```

Topic-based tax queries:

```text
NOLCO
VAT zero-rating
expanded withholding tax
PEZA VAT treatment
MCIT
improperly accumulated earnings tax
input VAT substantiation
resident citizen income scope
taxpayer classification
```

Audit/procedural queries:

```text
LOA validity
PAN/FAN mismatch
subpoena or NTPR
CWT reconciliation
invoice mismatch
BIR Form 2307 substantiation
VAT return support
```

Generic guard controls:

```text
tax law
BIR issuance
court case
VAT case
withholding tax case
explain EWT
what is withholding tax
what is BIR
what is TRAIN
what is a Republic Act
```

Near-match / wrong-authority controls:

```text
RR 12-2019 when RR 12-2018 is expected
RMC number mismatch controls
RMO number mismatch controls
CTA label/click-target mismatch controls
BIR Ruling DA-489-03 not indexed controls
case-name alias controls where only one known case should match
NIRC section adjacent-number controls
```

Each case should state whether it is exact-authority, topic-based, audit/procedural, generic guard, near-match rejection, unavailable source, source limitation, or case-card integrity.

## 8. Metrics

Required metrics:

```text
exact authority hit rate
top-1 authority precision
top-3 authority recall
source-card label/click-target integrity
authority state accuracy
governing-vs-related distinction accuracy
near-match rejection rate
generic-query false promotion rate
no-indexed-source accuracy
source limitation accuracy
latency p50/p95
token/cost impact
fallback success rate
deterministic repeatability
regression-suite preservation
```

Suggested definitions:

```text
exact authority hit rate:
  required target authority appears in the retrieved/reranked candidate set and source-card candidate set where indexed.

top-1 authority precision:
  highest-ranked authority/source card is the expected governing authority.

top-3 authority recall:
  expected authority appears within top three ranked candidates/cards.

click-target integrity:
  displayed label, citation, authority type, and public URL point to the same authority.

generic false promotion:
  generic query produces an exact authority/source card that the fixture forbids.

near-match rejection:
  wrong-number or wrong-label authority is not promoted as the expected authority.

fallback success:
  fallback returns baseline-compatible output when candidate reranking fails or is disabled.
```

## 9. Pass / Fail Thresholds

Initial conservative thresholds:

```text
No regression allowed in exact authority hit rate.
No regression allowed in source-card label/click-target integrity.
No regression allowed in generic-query guard controls.
No regression allowed in no-indexed-source discipline.
No regression allowed in unavailable-source false promotion controls.
No regression allowed in source limitation accuracy.
Candidate must maintain or improve top-1 authority precision.
Candidate must maintain or improve top-3 authority recall.
Candidate must improve measured weak area before it is considered useful.
Candidate must not materially increase latency without measured retrieval/reranker benefit.
Candidate must be deterministic enough to pass repeat runs against fixed fixtures.
External candidate must have verified fallback behavior before any runtime use.
```

Suggested initial numeric gates for future fixture work:

```text
exact authority hit rate: 100% on exact authority cases
source-card click-target integrity: 100%
generic false promotion allowed: 0 cases
no-indexed-source false AUTHORITY_FOUND promotion allowed: 0 cases
near-match false promotion allowed: 0 cases
fallback success rate for external candidates: 100% on simulated provider failures
repeatability: same pass/fail result across at least 3 local runs
latency: no p95 increase above an approved budget unless top-1/top-3 quality improves and no guard regresses
```

These thresholds can be revised only after a future comparison artifact proves they are too broad or too narrow.

## 10. Evaluation Artifact Design

Recommended future artifacts:

```text
evaluation/fixtures/phase-6h-006-retrieval-reranker-comparison.fixture.json
tests/patch-06h-006-retrieval-reranker-comparison-plan.test.mjs
PATCH-06H-006_RETRIEVAL_RERANKER_COMPARISON_RESULTS.md
```

Do not create those artifacts in PATCH-06H-005. They are the recommended next patch.

Fixture case fields should include:

```text
id
name
category
route
query
comparisonGroup
expectedAuthorityLookupType
expectedAuthorityFamily
expectedTargetAuthorities
expectedTop1Authority
expectedTop3Authorities
expectedSourceCardPolicy
expectedSourceAvailability
expectedDisclosureType
expectedGuardBehavior
forbiddenAuthorities
forbiddenSourceCards
forbiddenFalseExactPromotion
expectedNoIndexedSourceBehavior
nearMatchControl
requiresClickTargetIntegrity
latencyBudgetClass
checks
notes
```

Expected result format should include:

```text
caseId
mode
ok
metrics
topAuthorities
topSourceCards
sourceAvailability
disclosureType
failures
latencyMs
fallbackUsed
```

Test design:

```text
Local/static tests should validate fixture schema, category grouping, expected metrics, forbidden authorities, pending runtime assertions, and CLI compatibility without DB/network/secrets.
Staging-smoke tests may later evaluate a small selected subset against deployed behavior.
Live-eval only tests should be reserved for answer-grounding, citation-faithfulness, latency, provider cost, and source-card outcome verification.
Ordinary npm tests must not require network, staging credentials, DB queries, vector-store access, or external provider keys.
```

## 11. External Reranker / Cohere-ai Readiness

Current status:

```text
cohere-ai is not approved for implementation in PATCH-06H-005.
cohere-ai remains deferred.
```

External reranker evaluation requires:

```text
completed no-dependency comparison fixture and test scaffold
baseline metric report for current local behavior
cost estimate
latency estimate
provider error handling design
fallback plan
privacy review
no-source-card-regression evidence
generic guard protection evidence
near-match rejection evidence
rollback plan
```

Minimum evidence before adding a dependency:

```text
The local baseline must show a measurable weakness.
A no-dependency candidate or analysis must show the weakness is truly reranking-related.
The external candidate must improve the measured weakness without any guard/source-card/no-indexed-source regression.
Fallback must preserve current baseline behavior.
Cost and latency must fit an approved budget.
```

## 12. Privacy, Cost, Latency, and Fallback Considerations

Privacy:

```text
Future external reranker requests may expose user query text and candidate source snippets.
No external provider should be used until data sent to the provider is reviewed, minimized, and approved.
```

Cost:

```text
Any external candidate must define per-query cost, monthly projection, failure retry cost, and budget cutoff behavior.
```

Latency:

```text
Any external candidate must define timeout behavior, p50/p95 targets, and whether reranking runs synchronously or is skipped on slow paths.
```

Fallback:

```text
The current local baseline must remain available.
Provider errors, timeouts, malformed responses, cost cutoff, disabled configuration, and worse candidate metrics must fall back to local ranking.
Fallback must not change sourceAvailability, source-card labels, click targets, or generic guard behavior.
```

## 13. Roadmap / Backlog Discipline Confirmation

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

## 14. Risk Assessment

Plan-only patch risk:

```text
Low. No runtime files, test files, package files, corpus files, vector-store files, DB files, ingestion files, prompts, routes, controllers, or env files are changed.
```

Future comparison fixture risk:

```text
Low if local/static and no-network.
Medium if it begins asserting runtime source-card outcomes without controlled fixtures.
```

Future retrieval/reranker candidate risk:

```text
Medium to high because ranking changes can alter exact authority surfacing, sourceAvailability state, source-card integrity, and generic guard behavior.
```

Future external reranker risk:

```text
High until privacy, cost, latency, fallback, determinism, and guard preservation are proven.
```

## 15. Recommended Next Task

Recommended:

```text
PATCH-06H-006 - Retrieval / reranker comparison fixture and test scaffold, no runtime change
```

Reason:

```text
After the no-dependency comparison plan, the safest next step is a local/static fixture and test scaffold that encodes the comparison structure without changing retrieval, reranker, sourceAvailability, source-card behavior, dependencies, or corpus state.
```

Do not recommend Cohere implementation as the immediate next task.

## 16. Confirmation of No Runtime Behavior Change

Validation completed:

```text
node tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
PASS - 14 passed, 0 failed

node tests/patch-06e-004-reranker-normalizers-extraction.test.mjs
PASS - 4 passed, 0 failed

node tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs
PASS - 5 passed, 0 failed

node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed

node tests/patch-06f-004-generic-query-guard-regression.test.mjs
PASS - 9 passed, 0 failed

npm test
PASS - 10 syntax checks, 75 suites, 0 failures

npm run guard:files
PASS - No protected files modified
```

Confirmed unchanged:

```text
No retrieval-engine.js change.
No reranker-engine.js change.
No issue-exact-authority-detector.js change.
No source-card-engine.js change.
No sourceAvailability behavior change.
No pipeline.js change.
No test files changed.
No package/dependency/env/DB/indexing/vector/corpus/ingestion files changed.
No prompts, templates, routes, or controllers changed.
No cohere-ai or external reranker work added.
No .vscode file touched.
```
