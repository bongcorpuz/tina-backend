# PATCH-06F-008 - Staging Evaluation Report Generator

## 1. Objective

Add a deterministic Phase 6F evaluation report generator that summarizes local fixture results, categories, active checks, pending/future checks, invalid cases, coverage metadata, limitations, and the recommended next action.

## 2. Scope

This patch is evaluation/reporting work only. It does not perform live or staging calls, does not commit generated report artifacts, and does not change runtime behavior.

## 3. Files Changed

```text
evaluation/runner/evaluation-report-generator.js
tests/patch-06f-008-staging-evaluation-report-generator.test.mjs
PATCH-06F-008_STAGING_EVALUATION_REPORT_GENERATOR.md
knowledge/CURRENT_STATE.md
```

## 4. How This Extends PATCH-06F-001 Through PATCH-06F-007

PATCH-06F-001 created the local evaluation runner and schema validation path.
PATCH-06F-002 through PATCH-06F-007 added fixture families for authority/source-card behavior, CTA/G.R. click targets, generic-query guards, exact-source limitation wording, mode format, and domain source-card coverage.

PATCH-06F-008 adds a deterministic reporting layer over those local runner results.

## 5. Report Generator Structure

```text
evaluation/runner/evaluation-report-generator.js
```

The module exports:

```text
DEFAULT_PHASE_6F_FIXTURE_PATHS
buildPhase6FEvaluationReport
renderPhase6FMarkdownReport
generatePhase6FEvaluationReport
```

The default fixture set covers PATCH-06F-002 through PATCH-06F-007.

## 6. Report Sections And Metrics

Sections:

```text
Title
Generated Context
Phase
Fixture Summary
Case Summary
Category Coverage
Active Checks
Pending / Future Runtime Checks
Invalid Case Summary
Unsupported Assertion Summary
Domain Coverage Summary
Mode Coverage Summary
Source-Card Coverage Summary
Risk / Limitations
Recommended Next Action
```

Metrics:

```text
totalFixtures
totalCases
totalCategories
totalActiveChecks
totalPendingChecks
totalInvalidCases
totalInvalidIssues
totalUnsupportedAssertions
fixtureNames
categories
casesByCategory
casesByFixture
pendingByFixture
activeByFixture
unsupportedAssertionTypes
domainsCovered
modesCovered
sourceBehaviorTypesCovered
```

## 7. Active Checks Now

The report generator summarizes existing local runner validation output. Active checks remain schema checks from the existing runner.

## 8. Pending/Future Checks

Runtime, source-card, answer-text, staging, and live API assertions remain pending/future. The report generator counts and labels them but does not execute them.

## 9. How To Run The Report Generator Or Focused Test

```text
node evaluation/runner/evaluation-report-generator.js
node evaluation/runner/evaluation-report-generator.js --json
node tests/patch-06f-008-staging-evaluation-report-generator.test.mjs
```

## 10. Local Validation Results

```text
node tests/patch-06f-008-staging-evaluation-report-generator.test.mjs
PASS - 8 passed, 0 failed

node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PASS - 6 passed, 0 failed

node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PASS - 8 passed, 0 failed

node tests/patch-06f-003-case-click-target-integrity.test.mjs
PASS - 9 passed, 0 failed

node tests/patch-06f-004-generic-query-guard-regression.test.mjs
PASS - 9 passed, 0 failed

node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PASS - 10 passed, 0 failed

node tests/patch-06f-006-mode-format-evaluation.test.mjs
PASS - 12 passed, 0 failed

node tests/patch-06f-007-domain-source-card-coverage.test.mjs
PASS - 12 passed, 0 failed

npm test
PASS - 10 syntax checks, 73 suites, 0 failures

npm run guard:files
PASS - No protected files modified
```

## 11. Limitations

The report is local/static only unless live mode is added later. It does not call staging, inspect runtime source cards, validate answer text, query DB/vector stores, ingest sources, or alter runtime behavior.

## 12. Risk Assessment

Risk is low. The patch adds a deterministic local report generator and focused tests only. No dependencies were added.

## 13. Runtime Behavior Confirmation

No runtime behavior was changed.

## 14. Forbidden File Confirmation

The patch does not change:

```text
pipeline.js
retrieval or reranker runtime files
sourceAvailability runtime files
source-card runtime behavior
issue-classification behavior
ask/tax/audit runtime behavior
prompts/templates/routes/controllers
DB/indexing/vector/corpus/ingestion files
package.json
package-lock.json
dependencies
```

## 15. Recommended Next Task

```text
PATCH-06F-GATE-1 - Phase 6F Evaluation Harness Stabilization Gate
```
