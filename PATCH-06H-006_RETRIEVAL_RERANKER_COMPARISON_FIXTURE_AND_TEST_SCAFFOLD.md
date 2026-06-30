# PATCH-06H-006 - Retrieval / Reranker Comparison Fixture and Test Scaffold

Status: COMPLETE / FIXTURE-TEST ONLY / LOCAL PASS

Branch: feature/source-availability-engine-v1

## 1. Objective

Create the Phase 6H retrieval/reranker comparison fixture and focused offline test scaffold based on PATCH-06H-005. This patch defines comparison structure only and does not execute retrieval, reranking, source-card selection, sourceAvailability, DB/vector lookup, OpenAI, or external APIs.

## 2. Scope

Changed files:

```text
evaluation/fixtures/phase-6h-006-retrieval-reranker-comparison.fixture.json
tests/patch-06h-006-retrieval-reranker-comparison-scaffold.test.mjs
PATCH-06H-006_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_AND_TEST_SCAFFOLD.md
knowledge/CURRENT_STATE.md
```

No runtime files were changed.

## 3. Basis from PATCH-06H-005

PATCH-06H-005 required a no-dependency comparison structure before any reranker modification, retrieval-engine change, Cohere experiment, dependency addition, or external provider evaluation.

The fixture encodes:

```text
query groups
comparison metrics
conservative pass/fail policies
generic guard controls
near-match rejection controls
runtime-safety flags
future pending comparison assertions
```

## 4. Fixture Added

Added:

```text
evaluation/fixtures/phase-6h-006-retrieval-reranker-comparison.fixture.json
```

The fixture is local/static only:

```text
runtimeSafe: true
requiresNetwork: false
requiresDb: false
requiresSecrets: false
mode: local_static_scaffold
```

The fixture reuses existing evaluation runner categories and stores PATCH-06H-006 comparison semantics in `group` and policy fields. No evaluation runner or runtime classifier category change was needed.

## 5. Test Added

Added:

```text
tests/patch-06h-006-retrieval-reranker-comparison-scaffold.test.mjs
```

The test validates:

```text
fixture loading
evaluation runner compatibility
required top-level fields
runtime-safety flags
required metrics
pass/fail policy structure
required query groups
minimum query coverage
required case fields
generic guard non-promotable marking
near-match rejection marking
exact authority family/reference metadata
pending comparison assertions
```

The test does not import retrieval-engine.js, reranker-engine.js, pipeline.js, source-card-engine.js, DB/vector code, OpenAI code, or external APIs.

## 6. Query Groups Covered

Covered groups:

```text
exact_administrative_authority
exact_statutory_authority
exact_case_authority
topic_based_tax
audit_procedural
generic_guard_control
near_match_wrong_authority_control
```

Required representative queries included:

```text
RR 2-98
RMC 65-2012
RMO 20-2013
RMO 24-2013
NIRC Sec. 57
NIRC Sec. 58
NIRC Section 23
RA 10963
RA 11534
CTA Case No. 9369
G.R. No. 153866
CIR v. Seagate
NOLCO
VAT zero-rating
expanded withholding tax
PEZA VAT treatment
MCIT
improperly accumulated earnings tax
input VAT substantiation
LOA validity
PAN/FAN mismatch
subpoena/NTPR
CWT reconciliation
invoice mismatch
tax law
BIR issuance
court case
VAT case
withholding tax case
explain EWT
what is withholding tax
RR 12-2019
RMC 20-2013
CTA Case No. 9360
BIR Ruling DA-489-03
```

## 7. Metrics Encoded

Encoded metrics:

```text
exact_authority_hit_rate
top_1_authority_precision
top_3_authority_recall
source_card_label_integrity
source_card_click_target_integrity
authority_state_accuracy
governing_vs_related_distinction_accuracy
near_match_rejection_rate
generic_query_false_promotion_rate
no_indexed_source_accuracy
source_limitation_accuracy
latency_ms
token_cost_impact
fallback_success_rate
deterministic_repeatability
```

## 8. Pass / Fail Policies Encoded

Encoded conservative policies:

```text
no regression allowed in exact_authority_hit_rate
no regression allowed in source_card_click_target_integrity
no regression allowed in generic_query_guard_controls
no regression allowed in no_indexed_source_discipline
no regression allowed in authority_state_accuracy
candidate must maintain or improve top_1_authority_precision
candidate must maintain or improve top_3_authority_recall
candidate must not materially increase latency without measurable retrieval benefit
future external reranker must have fallback behavior
no dependency adoption without cost/latency/privacy/reliability review
```

## 9. Generic Guard Controls

Generic controls are marked with:

```text
group: generic_guard_control
expectedAuthorityFamily: none
expectedAuthorityReference: null
expectedGenericGuardPolicy: non_promotable_generic_control
expectedSourceCardPolicy: do_not_fabricate_exact_source_card
forbiddenFalseExactPromotion: true
```

These controls remain pending future comparison assertions and do not execute runtime behavior.

## 10. Near-Match Controls

Near-match controls include:

```text
RR 12-2019 must not be substituted with RR 12-2018
RMC 20-2013 must not be substituted with RMO 20-2013
CTA Case No. 9360 must not expose CTA Case No. 9369 click target
BIR Ruling DA-489-03 must not be filled by unrelated G.R./NIRC substitute cards
```

Each near-match case carries `rejectNearMatch: true` in a pending future comparison assertion.

## 11. Runtime-Safety Confirmation

Confirmed:

```text
requiresNetwork=false
requiresDb=false
requiresSecrets=false
runtimeSafe=true
```

The focused test validates schema and policy metadata only. It does not call live retrieval, reranking, DB/vector store, OpenAI, external APIs, sourceAvailability, source-card selection, ask/tax/audit runtime, or staging.

## 12. Local Validation Results

Focused PATCH-06H-006 test:

```text
node tests/patch-06h-006-retrieval-reranker-comparison-scaffold.test.mjs
PASS
```

Required adjacent regression:

```text
node tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
PASS
```

Focused reranker/source-card/generic guard tests:

```text
node tests/patch-06e-004-reranker-normalizers-extraction.test.mjs
PASS

node tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs
PASS

node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS

node tests/patch-06f-004-generic-query-guard-regression.test.mjs
PASS
```

Full regression gate:

```text
npm test
PASS
```

Protected files guard:

```text
npm run guard:files
PASS
```

## 13. Confirmation of No Runtime Behavior Change

Confirmed unchanged:

```text
retrieval-engine.js
reranker-engine.js
issue-exact-authority-detector.js
source-card-engine.js
pipeline.js
sourceAvailability behavior
issue-classification behavior
ask/tax/audit behavior
prompts/templates/routes/controllers
```

## 14. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed unchanged:

```text
package.json
package-lock.json
dependencies
environment files
secrets
DB
indexing
RAG
vector store
corpus
ingestion
Google Drive source checking
Backblaze B2 ingestion
external tools
cohere-ai
```

## 15. Risk Assessment

Risk: Low.

Reason:

```text
The patch adds an offline fixture, focused scaffold test, report, and continuity update only.
All comparison assertions are pending future assertions.
No runtime modules, package files, dependencies, DB/vector/corpus/ingestion files, prompts, routes, or controllers changed.
```

Residual risk:

```text
Future comparison reporting still needs deterministic summary tooling before any runtime reranker/retrieval candidate should be evaluated.
```

## 16. Recommended Next Task

Recommended:

```text
PATCH-06H-007 - Retrieval / reranker comparison report generator, no runtime change
```

Reason:

```text
After the fixture and scaffold exist, the next safest step is a local/static report generator or evaluator that summarizes comparison readiness and produces deterministic markdown/json output without calling live retrieval or changing runtime behavior.
```
