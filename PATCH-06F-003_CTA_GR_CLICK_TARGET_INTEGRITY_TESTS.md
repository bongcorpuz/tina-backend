# PATCH-06F-003 - CTA / G.R. Click-Target Integrity Tests

## 1. Objective

Extend the Phase 6F evaluation harness with focused CTA Case and Supreme Court G.R. click-target integrity coverage.

The goal is to make exact case-card mismatch, case-number mismatch, label mismatch, wrong linked target, and exact-source limitation wording regressions permanent evaluation targets.

## 2. Scope

This patch is evaluation/regression-suite work only.

It adds a dedicated local/offline fixture and focused tests. Runtime, source-card, click-target, and live/staging assertions remain pending because the current Phase 6F runner validates fixture structure and pending assertion metadata only.

## 3. Files Changed

```text
evaluation/fixtures/phase-6f-003-case-click-target-integrity.fixture.json
tests/patch-06f-003-case-click-target-integrity.test.mjs
PATCH-06F-003_CTA_GR_CLICK_TARGET_INTEGRITY_TESTS.md
knowledge/CURRENT_STATE.md
```

`knowledge/CURRENT_STATE.md` is updated only after validation passes.

## 4. How This Extends PATCH-06F-001 And PATCH-06F-002

PATCH-06F-001 added the offline runner, fixture validation, category grouping, report summaries, CLI execution, and pending-check handling.

PATCH-06F-002 added the broader authority/source-card regression fixture and the `case_card_integrity` category.

PATCH-06F-003 reuses the same runner, categories, fixture shape, `schema` active checks, and `future_runtime_assertion` pending-check pattern. No runner or schema change is required.

## 5. Fixture/Case Categories Added Or Reused

No new category was added.

The fixture reuses:

```text
case_card_integrity
click_target_integrity
source_limitation_wording
generic_guard
```

## 6. Included Regression Cases

```text
1. What is CTA Case No. 9369?
2. Show me the source for CTA Case No. 9369.
3. EXPOUND CIR v. Seagate Technology (GR No. 153866)
4. Show me the source for CIR v. Seagate Technology G.R. No. 153866.
5. What is a G.R. case?
6. What is a CTA case?
```

## 7. Active Checks Now

Active local checks:

```text
fixture JSON loading
required field validation
route validation
category validation
check-shape validation
case grouping
fixture query inventory
assertion metadata presence
runner summary counts
CLI success behavior
invalid fixture failure behavior
```

The 06F-003 fixture has:

```text
6 total cases
6 active schema checks
```

## 8. Pending/Future Checks

Pending runtime checks:

```text
CTA Case No. 9369 answer identity
CTA Case No. 9369 source-card label/title exactness
CTA Case No. 9369 click-target exactness
CTA unrelated case substitution guard
G.R. No. 153866 answer identity
G.R. No. 153866 source-card/click-target exactness
G.R. unrelated case substitution guard
exact-source limitation wording suppression
generic G.R. false-promotion guard
generic CTA false-promotion guard
```

The fixture has:

```text
6 pending future runtime assertions
```

## 9. How To Run The Focused Test

Focused test:

```text
node tests/patch-06f-003-case-click-target-integrity.test.mjs
```

Run the 06F-003 fixture through the runner:

```text
node evaluation/runner/evaluation-runner.js --fixture evaluation/fixtures/phase-6f-003-case-click-target-integrity.fixture.json --pretty
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

Focused PATCH-06F-003 test:

```text
node tests/patch-06f-003-case-click-target-integrity.test.mjs
PASS - 9 passed, 0 failed
```

Focused PATCH-06F-001 compatibility test:

```text
node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PASS - 6 passed, 0 failed
```

Focused PATCH-06F-002 compatibility test:

```text
node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed
```

Local runner:

```text
node evaluation/runner/evaluation-runner.js --fixture evaluation/fixtures/phase-6f-003-case-click-target-integrity.fixture.json --pretty
PASS
summary: 6 total cases, 6 valid cases, 0 invalid cases, 6 active checks, 6 pending checks, 0 invalid issues
```

Full regression gate:

```text
npm test
PASS
Syntax checks: 10 run, 0 failed
Test suites: 68 run, 0 failed
```

Forbidden-files guard:

```text
npm run guard:files
PASS: No protected files modified
```

## 11. Risk Assessment

Risk is low.

The patch adds local/offline evaluation fixture coverage and tests. It does not call staging, does not read credentials, does not add dependencies, and does not alter runtime behavior.

## 12. Runtime Behavior Confirmation

No runtime behavior was changed.

## 13. Forbidden-Scope Confirmation

Confirmed unchanged:

```text
pipeline.js
retrieval behavior
reranker behavior
sourceAvailability behavior
source-card behavior
issue-classification behavior
ask/tax/audit runtime behavior
DB/indexing/vector/corpus/ingestion files
package.json
package-lock.json
environment configuration
external tool integrations
Terraform/OpenTofu
```

## 14. Recommended Next Task

Recommended next task:

```text
PATCH-06F-004 - Generic-query guard regression tests
```

Reason: PATCH-06F-003 captures exact case/click-target and exact-source wording metadata while leaving live behavior pending. The next broad protection gap is generic-query false promotion across public/general tax and legal terms.
