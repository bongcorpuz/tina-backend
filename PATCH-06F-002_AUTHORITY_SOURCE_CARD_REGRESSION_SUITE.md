# PATCH-06F-002 - Authority/Source-Card Regression Suite

## 1. Objective

Create the first real Phase 6F authority/source-card regression suite on top of the PATCH-06F-001 offline evaluation runner skeleton.

The suite captures known sourceAvailability, exact authority, related authority, source-card, click-target, source-limitation wording, and generic-query guard behaviors as structured local evaluation cases.

## 2. Scope

This patch is evaluation/regression-suite work only.

It adds a dedicated fixture and focused tests for local/static validation. Runtime/live assertions remain pending because PATCH-06F-001 does not yet support live staging calls or behavioral source-card evaluation.

## 3. Files Changed

```text
evaluation/runner/evaluation-runner.js
evaluation/fixtures/phase-6f-002-authority-source-card-regression.fixture.json
tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PATCH-06F-002_AUTHORITY_SOURCE_CARD_REGRESSION_SUITE.md
knowledge/CURRENT_STATE.md
```

`knowledge/CURRENT_STATE.md` is updated only after validation passes.

## 4. How The Suite Extends PATCH-06F-001

PATCH-06F-001 created the offline runner, fixture schema validation, category grouping, report summaries, CLI execution, and pending-check handling.

PATCH-06F-002 reuses that runner directly. It adds one narrow category, `case_card_integrity`, because CTA case-card integrity is distinct from general click-target checks and source-limitation wording checks.

No parallel framework was created.

## 5. Fixture/Case Categories Added

The fixture uses these categories:

```text
unavailable_source
exact_authority
related_authority
case_card_integrity
source_limitation_wording
generic_guard
```

The runner category registry was extended with:

```text
case_card_integrity
```

## 6. Included Regression Cases

```text
1. What is BIR Ruling DA-489-03?
2. BIR Ruling DA-489-03
3. Explain BIR Ruling DA-489-03
4. BIR Ruling DA 489 03
5. What is NIRC Section 23?
6. Show me the source for NIRC Section 23.
7. What does NIRC Section 57 provide?
8. What does NIRC Section 58 provide?
9. What does RR 2-98 provide on expanded withholding tax?
10. What is RMC 65-2012?
11. What is RMO 20-2013?
12. What is RMO 24-2013?
13. What is RA 10963?
14. What is the TRAIN Law?
15. What is RA 11534?
16. What is the CREATE Act?
17. What is CTA Case No. 9369?
18. EXPOUND CIR v. Seagate Technology (GR No. 153866)
19. Explain EWT.
20. What is withholding tax?
21. What is BIR?
22. What is TRAIN?
23. What is a Republic Act?
24. Are there jurisprudence cases on withholding tax?
```

## 7. Checks Active Now

Active local checks:

```text
fixture JSON loading
required field validation
route validation
category validation
check-shape validation
category grouping
report summary counts
CLI success behavior
invalid fixture failure behavior
```

The 06F-002 fixture has:

```text
24 total cases
24 active schema checks
```

## 8. Checks Intentionally Pending/Future

Pending checks:

```text
sourceAvailability outcomes
sourceCount outcomes
source-card labels
source-card suppression for unavailable sources
unrelated authority substitution guards
related-authority distinction
case-card exactness
source-limitation wording
click-target/public URL integrity
generic-query false-promotion guards
```

The fixture uses `future_runtime_assertion` checks marked `status: "pending"` for these future behavioral assertions.

The 06F-002 fixture has:

```text
24 pending future runtime assertions
```

## 9. How To Run The Suite

Focused 06F-002 test:

```text
node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
```

Run the 06F-002 fixture through the runner:

```text
node evaluation/runner/evaluation-runner.js --fixture evaluation/fixtures/phase-6f-002-authority-source-card-regression.fixture.json --pretty
```

Full regression gate:

```text
npm test
```

Forbidden-files guard:

```text
npm run guard:files
```

## 10. Local Validation Results

Focused PATCH-06F-002 test:

```text
node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed
```

Focused PATCH-06F-001 regression compatibility test:

```text
node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PASS - 6 passed, 0 failed
```

Local runner:

```text
node evaluation/runner/evaluation-runner.js --fixture evaluation/fixtures/phase-6f-002-authority-source-card-regression.fixture.json --pretty
PASS
summary: 24 total cases, 24 valid cases, 0 invalid cases, 24 active checks, 24 pending checks, 0 invalid issues
```

Full regression gate:

```text
npm test
PASS
Syntax checks: 10 run, 0 failed
Test suites: 67 run, 0 failed
```

Forbidden-files guard:

```text
npm run guard:files
PASS: No protected files modified
```

## 11. Risk Assessment

Risk is low.

The patch adds local/offline evaluation fixture coverage and tests. The only runner change is adding a fixture category string. No live calls, staging calls, credentials, retrieval, reranking, source-card selection, sourceAvailability decisions, issue classification, ingestion, or runtime route behavior are changed.

## 12. Runtime Behavior Confirmation

No runtime behavior was changed.

## 13. Forbidden-Scope Confirmation

Confirmed unchanged:

```text
pipeline.js
DB/indexing/vector/corpus/ingestion files
retrieval behavior
reranker behavior
sourceAvailability behavior
source-card behavior
issue-classification behavior
ask/tax/audit runtime behavior
environment configuration
package.json
package-lock.json
external tool integrations
Terraform/OpenTofu
```

## 14. Recommended Next Task

Recommended next task:

```text
PATCH-06F-003 - CTA / G.R. click-target integrity tests
```

Reason: PATCH-06F-002 now captures the broad authority/source-card fixture map while leaving live behavior pending. The best next narrow step is to deepen the click-target and exact-case/G.R. integrity cases into enforceable tests.
