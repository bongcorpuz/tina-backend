# PATCH-06F-001 Evaluation Runner Skeleton

## Objective

Start Phase 6F, Automated Evaluation & Regression Harness, by adding a minimal local/offline evaluation runner skeleton for TINA.

The skeleton creates a permanent foundation for future repeatable checks around source cards, sourceAvailability, exact authorities, related authorities, unavailable sources, generic guards, source-limitation wording, click-target integrity, and route/mode formats. PATCH-06F-001 intentionally does not implement live/staging behavioral assertions.

## Scope

Implemented only a dependency-free local evaluation harness skeleton:

- loads a JSON fixture file;
- validates fixture and case shape;
- groups cases by category;
- treats supported `schema` checks as active;
- marks future behavior checks as pending;
- returns a structured report object;
- supports CLI execution and optional explicit report output;
- remains offline-safe by default.

No runtime behavior was changed.

## Files Changed

```text
evaluation/runner/evaluation-runner.js
evaluation/fixtures/phase-6f-001-sample.fixture.json
evaluation/reports/README.md
tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PATCH-06F-001_EVALUATION_RUNNER_SKELETON.md
knowledge/CURRENT_STATE.md
```

`knowledge/CURRENT_STATE.md` was updated only after local validation passed.

## Runner Structure

```text
evaluation/
  runner/
    evaluation-runner.js
  fixtures/
    phase-6f-001-sample.fixture.json
  reports/
    README.md
```

The runner exports:

```text
DEFAULT_FIXTURE_PATH
EVALUATION_CATEGORIES
loadFixtureFile()
validateEvaluationFixture()
groupCasesByCategory()
buildEvaluationReport()
runEvaluation()
```

CLI usage:

```text
node evaluation/runner/evaluation-runner.js --pretty
node evaluation/runner/evaluation-runner.js --fixture evaluation/fixtures/phase-6f-001-sample.fixture.json
node evaluation/runner/evaluation-runner.js --fixture evaluation/fixtures/phase-6f-001-sample.fixture.json --output evaluation/reports/local-report.json
```

PATCH-06F-001 does not commit generated report artifacts.

## Fixture Structure

Fixture root shape:

```json
{
  "version": "phase-6f-001",
  "description": "...",
  "cases": []
}
```

Case shape:

```json
{
  "id": "nirc-section-23-exact-authority",
  "name": "NIRC Section 23 exact authority",
  "category": "exact_authority",
  "route": "/ask",
  "query": "What is NIRC Section 23?",
  "checks": [
    { "type": "schema" },
    { "type": "sourceCard", "status": "pending", "expectedLabel": "NIRC Sec. 23" }
  ]
}
```

Prepared categories:

```text
exact_authority
unavailable_source
related_authority
generic_guard
source_limitation_wording
click_target_integrity
mode_format
domain_source_card_coverage
```

The sample fixture includes 18 representative future cases and 37 total checks: 18 active schema checks and 19 pending future behavior checks.

## What Is Active Now

Active in PATCH-06F-001:

- fixture JSON loading;
- required root and case-field validation;
- category validation;
- route validation for `/ask`, `/tax`, `/audit`, and `/source`;
- check-shape validation;
- category grouping;
- structured report generation;
- CLI success/failure exit behavior;
- optional explicit JSON report writing.

The runner exits non-zero for actual harness validation failures, such as invalid fixture shape. It does not fail merely because future behavioral assertions are pending.

## What Is Intentionally Pending

Pending for later Phase 6F patches:

- live/staging API calls;
- sourceAvailability assertions;
- source-card label assertions;
- public URL / click-target assertions;
- related authority assertions;
- unavailable-source behavior assertions;
- source limitation wording assertions;
- `/ask`, `/tax`, and `/audit` format assertions;
- domain source-card coverage assertions;
- persistent generated report artifacts.

## How To Run

Focused test:

```text
node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
```

Local skeleton runner:

```text
node evaluation/runner/evaluation-runner.js --pretty
```

Full regression gate:

```text
npm test
```

Forbidden-files guard:

```text
npm run guard:files
```

## Local Validation Results

Focused test:

```text
node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
PASS - 6 passed, 0 failed
```

Syntax check:

```text
node --check evaluation/runner/evaluation-runner.js
PASS
```

Local runner:

```text
node evaluation/runner/evaluation-runner.js --pretty
PASS
summary: 18 total cases, 18 valid cases, 0 invalid cases, 18 active checks, 19 pending checks, 0 invalid issues
```

Full regression gate:

```text
npm test
PASS
Syntax checks: 10 run, 0 failed
Test suites: 66 run, 0 failed
```

Forbidden-files guard:

```text
npm run guard:files
PASS: No protected files modified
```

## Risk Assessment

Risk is low.

The patch adds an offline-only harness skeleton under `evaluation/`, a sample fixture, a focused test, and documentation. It does not call staging or production services, does not read credentials, does not alter runtime routes, and does not change package dependencies.

The only active evaluation behavior is fixture/schema validation. Future behavioral checks are explicitly marked pending to avoid false claims of coverage.

## Forbidden-Scope Confirmation

Confirmed unchanged:

```text
pipeline.js
DB/indexing/vector/corpus/ingestion files
retrieval behavior
reranker behavior
sourceAvailability behavior
source-card behavior
issue classification behavior
ask/tax/audit runtime behavior
environment configuration
external tool integrations
Terraform/OpenTofu
```

No new dependencies were added. `package.json` and `package-lock.json` were not changed.

## Next Recommended Task

Recommended next task:

```text
PATCH-06F-002 - Authority/source-card regression suite
```

Reason: PATCH-06F-001 is fully local/offline and does not require staging credentials or live calls. The next useful Phase 6F step is to add active authority/source-card assertions to the evaluation harness.
