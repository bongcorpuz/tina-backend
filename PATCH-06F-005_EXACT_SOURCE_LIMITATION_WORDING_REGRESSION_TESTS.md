# PATCH-06F-005 - Exact-Source Limitation Wording Regression Tests

## 1. Objective

Add focused Phase 6F regression coverage for exact-source limitation wording so future live/staging evaluation can detect when TINA incorrectly says a governing authority was not directly located even though an exact authority or exact case source is found and exposed as a source card.

## 2. Scope

This patch is limited to the offline evaluation harness. It adds a fixture and focused local tests for pending exact-source limitation wording assertions. It does not add live staging calls and does not change runtime behavior.

## 3. Files Changed

```text
evaluation/fixtures/phase-6f-005-exact-source-limitation-wording.fixture.json
tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PATCH-06F-005_EXACT_SOURCE_LIMITATION_WORDING_REGRESSION_TESTS.md
knowledge/CURRENT_STATE.md
```

## 4. How This Extends PATCH-06F-001 Through PATCH-06F-004

PATCH-06F-001 created the local offline evaluation runner and fixture validation path.
PATCH-06F-002 added authority/source-card regression metadata and pending future runtime assertions.
PATCH-06F-003 added CTA/G.R. click-target and exact-source wording conventions.
PATCH-06F-004 added generic-query guard metadata.

PATCH-06F-005 reuses the same runner, fixture shape, category registry, pending assertion convention, and test style to isolate exact-source limitation wording regressions.

## 5. Fixture/Case Categories Added Or Reused

No new categories were added. Existing categories reused:

```text
source_limitation_wording
exact_authority
click_target_integrity
unavailable_source
related_authority
```

## 6. Included Regression Cases

```text
EXPOUND CIR v. Seagate Technology (GR No. 153866)
Show me the source for CIR v. Seagate Technology G.R. No. 153866.
What is NIRC Section 23?
Show me the source for NIRC Section 23.
What does NIRC Section 57 provide?
What does NIRC Section 58 provide?
What does RR 2-98 provide on expanded withholding tax?
What is RMC 65-2012?
What is RMO 20-2013?
What is RMO 24-2013?
What is RA 10963?
What is RA 11534?
What is BIR Ruling DA-489-03?
BIR Ruling DA-489-03
Are there jurisprudence cases on withholding tax?
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
exact source is present when expected
expected exact authority identifier matches
source card is exposed when exact source is found
forbidden limitation phrases are absent when exact source is present
allowed limitation context is accurate for unavailable-source cases
allowed limitation context is accurate for related-authority-only cases
exact source, unavailable source, and related authority only are distinguished
```

## 9. How To Run The Focused Test

```text
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
```

## 10. Local Validation Results

```text
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PASS - 10 passed, 0 failed

node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PASS - 6 passed, 0 failed

node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed

node tests/patch-06f-003-case-click-target-integrity.test.mjs
PASS - 9 passed, 0 failed

node tests/patch-06f-004-generic-query-guard-regression.test.mjs
PASS - 9 passed, 0 failed

npm test
PASS - 10 syntax checks, 70 suites, 0 failures

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
PATCH-06F-006 - Mode-format evaluation: /ask, /tax, /audit
```
