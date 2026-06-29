# PATCH-06F-004 - Generic-Query Guard Regression Tests

## 1. Objective

Add focused Phase 6F regression coverage for broad/generic user queries so future live or staging evaluation can detect false promotion of unrelated exact authorities, source cards, CTA cases, G.R. cases, NIRC sections, BIR issuances, or laws.

## 2. Scope

This patch is limited to the offline evaluation harness. It adds a generic-query guard fixture and focused local tests. It does not add live staging calls and does not change runtime behavior.

## 3. Files Changed

```text
evaluation/fixtures/phase-6f-004-generic-query-guard-regression.fixture.json
tests/patch-06f-004-generic-query-guard-regression.test.mjs
PATCH-06F-004_GENERIC_QUERY_GUARD_REGRESSION_TESTS.md
knowledge/CURRENT_STATE.md
```

## 4. How This Extends PATCH-06F-001, PATCH-06F-002, and PATCH-06F-003

PATCH-06F-001 created the local offline evaluation runner and schema validation path.
PATCH-06F-002 added authority/source-card regression metadata, including pending future runtime assertions.
PATCH-06F-003 added CTA/G.R. case-card and click-target fixture conventions.

PATCH-06F-004 reuses the same runner, fixture shape, category registry, pending assertion convention, and test style to add generic-query guard coverage.

## 5. Fixture/Case Categories Added Or Reused

No new categories were added. Existing categories reused:

```text
generic_guard
related_authority
source_limitation_wording
```

## 6. Included Regression Cases

```text
Explain EWT.
What is withholding tax?
What is expanded withholding tax?
What is BIR?
What is the CTA?
What is a CTA case?
What is TRAIN?
What is a Republic Act?
What is a tax law?
What is a G.R. case?
What is jurisprudence?
Are there jurisprudence cases on withholding tax?
Show me tax sources.
Give me BIR issuances.
What are tax cases?
```

## 7. Active Checks Now

The active local checks are fixture shape and schema validation only:

```text
version exists
cases array exists
case id/name/category/route/query exist
category is registered
route is supported
checks array is non-empty
schema checks count as active checks
invalid case shape still fails validation
```

## 8. Pending/Future Checks

Runtime checks remain pending until the Phase 6F runner supports live/staging evaluation:

```text
queryShape is generic
expectedBehavior is generic_guard
false exact-authority promotion is forbidden
exact-card overclaim is forbidden
forbidden substituted authorities are listed per case
related-source behavior is permitted only when clearly not overclaimed as exact authority
source limitation or narrowing behavior can be enforced for broad source requests
```

## 9. How To Run The Focused Test

```text
node tests/patch-06f-004-generic-query-guard-regression.test.mjs
```

## 10. Local Validation Results

```text
node tests/patch-06f-004-generic-query-guard-regression.test.mjs
PASS - 9 passed, 0 failed

node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PASS - 6 passed, 0 failed

node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed

node tests/patch-06f-003-case-click-target-integrity.test.mjs
PASS - 9 passed, 0 failed

npm test
PASS - 10 syntax checks, 69 suites, 0 failures

npm run guard:files
PASS - No protected files modified
```

## 11. Risk Assessment

Risk is low. The patch adds offline fixture metadata and tests only. Future runtime assertions are explicitly pending and are counted as pending, not failed.

## 12. Runtime Behavior Confirmation

No runtime behavior was changed.

## 13. Forbidden File Confirmation

The patch does not change:

```text
pipeline.js
retrieval or reranker runtime files
sourceAvailability runtime files
source-card runtime behavior
issue-classification behavior
ask/tax/audit runtime behavior
DB/indexing/vector/corpus/ingestion files
package.json
package-lock.json
dependencies
```

## 14. Recommended Next Task

```text
PATCH-06F-005 - Exact-source limitation wording regression tests
```
