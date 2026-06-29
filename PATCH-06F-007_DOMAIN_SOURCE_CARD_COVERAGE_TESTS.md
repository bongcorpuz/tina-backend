# PATCH-06F-007 - Domain Source-Card Coverage Tests

## 1. Objective

Add focused Phase 6F regression coverage for domain-level source-card expectations across EWT, VAT, PEZA, and LOA professional tax/audit domains.

## 2. Scope

This patch is limited to the offline evaluation harness. It defines source-card coverage expectations and focused local tests. It does not ingest sources, modify corpus/vector data, add live staging calls, or change runtime behavior.

## 3. Files Changed

```text
evaluation/fixtures/phase-6f-007-domain-source-card-coverage.fixture.json
tests/patch-06f-007-domain-source-card-coverage.test.mjs
PATCH-06F-007_DOMAIN_SOURCE_CARD_COVERAGE_TESTS.md
knowledge/CURRENT_STATE.md
```

## 4. How This Extends PATCH-06F-001 Through PATCH-06F-006

PATCH-06F-001 created the local offline evaluation runner.
PATCH-06F-002 added authority/source-card regression metadata.
PATCH-06F-003 added CTA/G.R. click-target coverage.
PATCH-06F-004 added generic-query guard coverage.
PATCH-06F-005 added exact-source limitation wording coverage.
PATCH-06F-006 added `/ask`, `/tax`, and `/audit` mode-format expectations.

PATCH-06F-007 reuses the same runner, fixture format, category registry, and pending assertion convention to define domain-level source-card coverage expectations.

## 5. Fixture/Case Categories Added Or Reused

No new categories were added. Existing category reused:

```text
domain_source_card_coverage
```

## 6. Included Regression Cases

```text
What does RR 2-98 provide on expanded withholding tax?
What does NIRC Section 57 provide?
/tax What is the withholding tax treatment of interest payments?
Explain EWT.
/tax What is input VAT?
/tax What is the VAT treatment of reimbursable expenses?
/audit The examiner included reimbursable expenses in gross receipts for VAT. What is our defense?
/audit The examiner disallowed input VAT due to invoice mismatch. What is our defense?
/tax What is the tax treatment of PEZA purchases?
/tax Expound CIR v. Seagate Technology G.R. No. 153866.
/tax Explain the cross-border doctrine in PEZA VAT cases.
/tax Are sales to PEZA entities VAT zero-rated or VAT-exempt?
/audit Evaluate this LOA and possible defense.
/audit We received a PAN after a stale LOA. What is our defense?
/audit We received a subpoena and NTPR. What documents do we need?
/audit The LOA names different examiners from those who conducted the audit. What is the issue?
/ask What source cards do you have for EWT?
/ask What source cards do you have for VAT?
/ask What source cards do you have for PEZA VAT?
/ask What source cards do you have for LOA procedural defenses?
```

## 7. Covered Domains And Subdomains

```text
EWT / withholding tax
VAT / input VAT / output VAT / reimbursable expenses / audit defense
PEZA / VAT / zero-rating / cross-border doctrine / Seagate
LOA / BIR audit procedure / PAN / subpoena / NTPR / examiner authority
Source-card inventory gap awareness for EWT, VAT, PEZA VAT, and LOA
```

## 8. Active Checks Now

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

## 9. Pending/Future Checks

Runtime checks remain pending until the Phase 6F runner supports live/staging evaluation:

```text
domain and subdomain
expectedInternalMode
expectedSourceBehavior
expectedAuthorityTypes
requiredSourceCardTerms
forbiddenAuthoritySubstitutions
sourceCoverageGapAwareness
requiredFactPrompts
pendingRuntimeAssertions
```

## 10. How To Run The Focused Test

```text
node tests/patch-06f-007-domain-source-card-coverage.test.mjs
```

## 11. Local Validation Results

```text
node tests/patch-06f-007-domain-source-card-coverage.test.mjs
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

node tests/patch-06f-006-mode-format-evaluation.test.mjs
PASS - 12 passed, 0 failed

npm test
PASS - 10 syntax checks, 72 suites, 0 failures

npm run guard:files
PASS - No protected files modified
```

## 12. Phase 6F Vs Phase 10 Source Coverage Distinction

PATCH-06F-007 only tests whether approved/indexed runtime sources are exposed correctly and whether source-card gaps are represented safely. It does not change Google Drive source inventory, approved source inventory, indexed corpus inventory, runtime source-card inventory, ingestion, or vector-store content.

Phase 10 remains the proper phase for governed source discovery, approval, ingestion, indexing, archival, and coverage expansion.

## 13. Risk Assessment

Risk is low. The patch adds offline fixture metadata and tests only. Future runtime assertions are explicitly pending and are counted as pending, not failed.

## 14. Runtime Behavior Confirmation

No runtime behavior was changed.

## 15. Forbidden File Confirmation

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

## 16. Recommended Next Task

```text
PATCH-06F-008 - Staging evaluation report generator
```
