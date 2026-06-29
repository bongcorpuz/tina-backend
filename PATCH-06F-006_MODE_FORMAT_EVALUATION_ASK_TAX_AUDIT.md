# PATCH-06F-006 - Mode-Format Evaluation: /ask, /tax, /audit

## 1. Objective

Add focused Phase 6F regression coverage for response-mode format expectations across `/ask`, `/tax`, and `/audit`, including future internal mode routing and escalation checks.

## 2. Scope

This patch is limited to the offline evaluation harness. It adds a mode-format fixture and focused local tests. It does not make TINA more conversational, add live staging calls, or change runtime behavior.

## 3. Files Changed

```text
evaluation/fixtures/phase-6f-006-mode-format-evaluation.fixture.json
tests/patch-06f-006-mode-format-evaluation.test.mjs
PATCH-06F-006_MODE_FORMAT_EVALUATION_ASK_TAX_AUDIT.md
knowledge/CURRENT_STATE.md
```

## 4. How This Extends PATCH-06F-001 Through PATCH-06F-005

PATCH-06F-001 created the local offline evaluation runner and fixture validation path.
PATCH-06F-002 added authority/source-card regression metadata.
PATCH-06F-003 added CTA/G.R. click-target and exact-source conventions.
PATCH-06F-004 added generic-query guard metadata.
PATCH-06F-005 added exact-source limitation wording metadata.

PATCH-06F-006 reuses the same runner, fixture shape, category registry, pending assertion convention, and test style to capture future mode-format expectations for `/ask`, `/tax`, and `/audit`.

## 5. Fixture/Case Categories Added Or Reused

No new categories were added. Existing category reused:

```text
mode_format
```

## 6. Included Regression Cases

```text
What is withholding tax?
/ask What is BIR?
/ask What is the tax treatment of PEZA purchases?
/ask We received a PAN for EWT deficiency. What should we do?
/tax What is the tax treatment of PEZA purchases?
/tax What does NIRC Section 57 provide?
/tax Expound CIR v. Seagate Technology G.R. No. 153866.
/tax Compare RA 10963 and RA 11534.
/audit We received a PAN for EWT deficiency. What should we do?
/audit Evaluate this LOA and possible defense.
/audit The examiner disallowed input VAT due to invoice mismatch. What is our defense?
/audit There is an EWT deficiency due to CWT reconciliation. What documents do we need?
/ask Evaluate this LOA and possible defense.
/ask Expound CIR v. Seagate Technology G.R. No. 153866.
/tax We received a PAN for EWT deficiency. What should we do?
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
typedCommandMode
expectedInternalMode
expectedResponseFormat
requiredSections
optionalSections
forbiddenSections
forbiddenMisrouting
shouldEscalateToTaxMode
shouldEscalateToAuditMode
sourceCardExpectation
pendingRuntimeAssertions
```

## 9. How To Run The Focused Test

```text
node tests/patch-06f-006-mode-format-evaluation.test.mjs
```

## 10. Local Validation Results

```text
node tests/patch-06f-006-mode-format-evaluation.test.mjs
PASS - 12 passed, 0 failed

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

npm test
PASS - 10 syntax checks, 71 suites, 0 failures

npm run guard:files
PASS - No protected files modified
```

## 11. How This Prepares Phase 7A Human Conversational Response Layer

PATCH-06F-006 defines the structural targets Phase 7A must satisfy later without changing current prompts, templates, routes, or response generation. It gives future live/staging evaluation a stable map for distinguishing general `/ask` answers, senior `/tax` memo responses, and `/audit` defense advisories.

## 12. Risk Assessment

Risk is low. The patch adds offline fixture metadata and tests only. Future runtime assertions are explicitly pending and are counted as pending, not failed.

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
prompts, answer templates, response generation, or route/controller behavior
DB/indexing/vector/corpus/ingestion files
package.json
package-lock.json
dependencies
```

## 15. Recommended Next Task

```text
PATCH-06F-007 - Domain source-card coverage tests: EWT, VAT, PEZA, LOA
```
