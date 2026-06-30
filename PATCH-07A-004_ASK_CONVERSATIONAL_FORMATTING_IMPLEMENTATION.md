# PATCH-07A-004 - /ask Conversational Formatting Implementation

## Status

COMPLETE / LOCAL PASS

## Objective

Implement the Phase 7A `/ask` conversational response formatting change while preserving the existing `/tax`, `/audit`, authority-state, source limitation, and source-card behavior.

## Runtime Scope

Changed runtime file:

- `answer-renderer.js`

No changes were made to:

- `context-orchestration-engine.js`
- `rag-answer-handler.js`
- `ask-handler.js`
- prompts
- retrieval
- reranker
- sourceAvailability
- source-card generation
- package/dependency files
- DB/indexing/RAG/vector/corpus/ingestion configuration
- environment or secret files

## Implementation Summary

`answer-renderer.js` now applies a narrow `/ask`-only conversational formatting pass after the existing adaptive answer rendering and before existing source disclosure/source-card handling.

The formatting pass is eligible only when the route/hook metadata identifies `/ask` and the response mode is one of:

- `FAST_DEFINITION`
- `QUICK`
- `EMERGENCY_TRIM`

or when the response plan explicitly marks an ask profile.

Eligible `/ask` responses are rendered into lighter human-facing sections:

- `### Direct answer`
- `### Key explanation`
- `### Practical note`
- `### Source / authority note`

The implementation supports both existing fast-definition headings and complete legacy A-F structures. Heading-only lines are stripped from migrated section bodies to avoid nested or duplicated legal headings.

## Protected Modes

`/tax` and `/audit` are protected by route/hook eligibility checks. Even when a tax or audit response carries a fast mode, it is not converted unless the route/hook metadata is `/ask`.

Focused regression coverage verifies:

- `/tax` keeps senior/legal memo style structure.
- `/audit` keeps advisory/audit structure.
- `/ask` can convert fast-definition headings to conversational headings.
- `/ask` can convert legacy A-F content to conversational headings.

## Authority and Source Safety

The source availability disclosure layer remains unchanged and still runs after the formatting pass.

Focused regression coverage verifies:

- `RELATED_AUTHORITY_ONLY` limitation wording survives.
- `NO_INDEXED_SOURCE` limitation wording survives.
- generic tax answers remain non-promotional.
- `applyVerifiedAuthorityGate` remains compatible with short `/ask` answers.

## Test Added

- `tests/patch-07a-004-ask-conversational-formatting.test.mjs`

## Validation

Passed:

```text
node tests/patch-07a-004-ask-conversational-formatting.test.mjs
PATCH-07A-004 ask conversational formatting tests: 10 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs
PATCH-07A-003 authority-state response policy and gate compatibility tests: 18 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-002-human-response-mode-format-fixtures.test.mjs
PATCH-07A-002 human response mode-format fixture tests: 16 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PATCH-06F-005 exact source limitation wording tests: 10 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-006-mode-format-evaluation.test.mjs
PATCH-06F-006 mode-format evaluation tests: 12 passed, 0 failed
```

Passed:

```text
node tests/patch-019a-regression.test.mjs
PATCH-019A regression tests: 87 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PATCH-06F-002 authority source-card regression suite: 8 passed, 0 failed
```

Passed:

```text
node tests/patch-027r-source-card-field-preservation.test.mjs
PATCH-027R source-card field preservation tests: 23 passed, 0 failed
```

Passed:

```text
node tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
PATCH-06E-010 unavailable BIR ruling sourceAvailability guard: 5 passed, 0 failed
```

Passed:

```text
npm test
Syntax checks: 10 run, 0 failed
Test suites:   80 run, 0 failed
GATE PASSED
```

Guard result:

```text
npm run guard:files
FAIL: protected files modified:
  [M] answer-renderer.js
```

This guard result is expected for this patch because `answer-renderer.js` is the explicitly authorized and required runtime target for PATCH-07A-004. No other protected runtime, secret, environment, package, dependency, retrieval, reranker, sourceAvailability, source-card, DB/indexing/RAG/vector/corpus, or ingestion files were modified.

## Risk Assessment

Risk is moderate because this is a runtime formatting change, but the blast radius is limited by route/hook eligibility and focused regression coverage. Existing authority disclosure and source-card logic remain downstream and unchanged.

## Recommended Next Patch

PATCH-07A-005 - `/tax` senior memo prompt and formatting protection.
