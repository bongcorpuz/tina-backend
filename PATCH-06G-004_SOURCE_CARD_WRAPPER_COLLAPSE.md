# PATCH-06G-004 - Source-Card Wrapper Collapse

## Objective

Collapse the approved source-card compatibility wrappers in `pipeline.js` so the pipeline uses the real `source-card-engine.js` implementations directly while preserving behavior.

## Scope

This patch is narrow and limited to source-card wrapper collapse plus required test-source assertion updates. It does not change source-card implementation logic, sourceAvailability behavior, retrieval, reranking, issue classification, ask/tax/audit runtime behavior, prompts, templates, routes, controllers, DB, indexing, RAG, vector store, corpus, ingestion, package files, dependencies, environment files, or secrets.

## Architecture-Review Basis From PATCH-06G-002

PATCH-06G-002 confirmed that `pipeline.js` imported six source-card helpers from `source-card-engine.js` using `engine*` aliases and re-exposed them through local one-line wrappers. The implementation already lived in `source-card-engine.js`, so wrapper collapse was approved as the lowest-risk Phase 6G decomposition step.

## Equivalence-Test Basis From PATCH-06G-003

PATCH-06G-003 added focused offline equivalence coverage for the six wrapper-to-engine mappings and representative real engine fixtures. That lock was updated in this patch to assert the collapsed state: direct imports, no restored wrapper bodies, and the indexed lookup dependency object preserved at the direct engine call site.

## Wrapper Functions Collapsed

The following `pipeline.js` local wrappers were removed:

| Removed pipeline.js wrapper | Replacement |
| --- | --- |
| `finalSourceCardCanonicalKey` | direct import from `source-card-engine.js` |
| `mergeFinalSourceCards` | direct import from `source-card-engine.js` |
| `sourceCardPublicUrlFromDoc` | wrapper removed; no remaining pipeline caller |
| `sanitizePublicSourceCard` | direct import from `source-card-engine.js` |
| `sourceCardFromRetrievedTarget` | direct import from `source-card-engine.js` |
| `resolveIndexedSourceCardTarget` | direct import from `source-card-engine.js` |

## pipeline.js Changes Made

`pipeline.js` now imports the needed source-card helpers directly:

- `finalSourceCardCanonicalKey`
- `mergeFinalSourceCards`
- `resolveIndexedSourceCardTarget`
- `sanitizePublicSourceCard`
- `sourceCardFromRetrievedTarget`

The former `engine*` aliases and local wrapper bodies were removed. The single indexed source-card lookup call now passes the same dependency object directly:

```js
resolveIndexedSourceCardTarget(target, { exactAuthoritySearch, logger: console })
```

No source-card implementation logic was moved into `pipeline.js`.

## Compatibility Handling / Exports Preserved

The collapsed functions were local `pipeline.js` helpers, not public named exports. No public pipeline export was removed or changed. Existing internal callers continue to use the same helper names through direct imports from `source-card-engine.js`.

## Tests Updated

The PATCH-06G-003 test was updated to lock the collapsed state rather than the pre-collapse wrapper state.

Several older structural/source-scan tests were minimally updated because they asserted that local wrappers or `engine*` aliases still existed in `pipeline.js`. Those tests now assert the direct engine import/call shape or scan `source-card-engine.js` for implementation details:

- `tests/patch-023b-source-card-url-and-label.test.mjs`
- `tests/patch-027y-source-card-finalization.test.mjs`
- `tests/patch-033d-r1-source-card-integrity.test.mjs`
- `tests/patch-034b-indexed-source-card-target-extraction.test.mjs`
- `tests/patch-034c-authority-restoration-helper-extraction.test.mjs`
- `tests/patch-034f-2-vector-authority-reference-registry-extraction.test.mjs`
- `tests/patch-034g-doctrine-authority-map-extraction.test.mjs`
- `tests/patch-06g-003-source-card-wrapper-equivalence.test.mjs`

No evaluation fixtures were modified.

## Local Validation Results

Initial checks:

- Pre-work `git status --short`: existing untracked `.vscode/` noted and left untouched.
- Branch confirmed: `feature/source-availability-engine-v1`
- Recent history confirmed:
  - `6c6caaf PATCH-06G-003 add source-card wrapper equivalence tests`
  - `644d14b PATCH-06G-002 add Claude architecture review`
  - `7dbc249 PATCH-06G-001 add JS module inventory and decomposition map`
  - `7e59d6b PATCH-06F-GATE-1 close Phase 6F`

Validation commands:

- `node --check pipeline.js` - PASS
- `node tests/patch-06g-003-source-card-wrapper-equivalence.test.mjs` - PASS, 9 passed / 0 failed
- `node tests/patch-034a-source-card-engine-extraction.test.mjs` - PASS, 7 passed / 0 failed
- `node tests/patch-034b-indexed-source-card-target-extraction.test.mjs` - PASS, 8 passed / 0 failed
- `node tests/patch-027y-source-card-finalization.test.mjs` - PASS, 22 passed / 0 failed
- `node tests/patch-023b-source-card-url-and-label.test.mjs` - PASS, 27 passed / 0 failed
- `node tests/patch-033d-r1-source-card-integrity.test.mjs` - PASS, 6 passed / 0 failed
- `node tests/patch-034c-authority-restoration-helper-extraction.test.mjs` - PASS, 16 passed / 0 failed
- `node tests/patch-034f-2-vector-authority-reference-registry-extraction.test.mjs` - PASS, 9 passed / 0 failed
- `node tests/patch-034g-doctrine-authority-map-extraction.test.mjs` - PASS, 12 passed / 0 failed
- All `tests/patch-06f-*.test.mjs` suites - PASS
- `npm test` - PASS, 10 syntax checks / 0 failed, 74 suites / 0 failed
- `npm run guard:files` - PASS

## No Behavior Change Confirmation

Behavior is preserved. The patch removes local adapter layers only. Internal callers now invoke the same source-card-engine implementations directly, with the indexed lookup dependency injection preserved at the call site.

## Protected Areas Not Changed

The following were not changed:

- `classifySourceAvailability`
- `computeSourceAvailability`
- sourceAvailability behavior
- retrieval behavior
- reranker behavior
- issue-classification behavior
- ask/tax/audit runtime behavior
- routes/controllers
- prompts/templates
- DB/indexing/vector/corpus/ingestion files
- package files
- dependencies
- environment files and secrets
- `source-card-engine.js`
- `source-visibility-engine.js`

## Risk Assessment

Risk is low. PATCH-06G-003 already locked wrapper equivalence, and this patch preserves the same function names at internal call sites by importing directly from `source-card-engine.js`. The main risk was stale source-scan tests expecting wrappers to remain; those were updated to the new approved collapsed architecture.

## Recommended Next Task

PATCH-06G-005 - SAE boundary documentation comments in `pipeline.js`.

After wrapper collapse, Phase 6G should add narrow documentation around the SAE boundary to prevent accidental movement of `classifySourceAvailability` before Phase 6H.
