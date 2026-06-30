# PATCH-06G-003 - Source-Card Wrapper Equivalence Test Lock

## Objective

Add a focused regression lock for the current equivalence between the `pipeline.js` source-card compatibility wrappers and their underlying `source-card-engine.js` implementations before PATCH-06G-004 attempts wrapper collapse.

## Scope

This patch is test-only. It adds one focused local/offline test file and this report. No runtime behavior, source-card implementation, source availability behavior, retrieval, reranking, issue classification, routes, prompts, controllers, DB, indexing, vector store, corpus, ingestion, package files, dependencies, or environment files were changed.

## Architecture-Review Basis From PATCH-06G-002

PATCH-06G-002 confirmed that `pipeline.js` imports six source-card functions from `source-card-engine.js` using `engine*` aliases and re-exposes them internally through local compatibility wrappers. The implementation already lives in `source-card-engine.js`, and wrapper collapse is the lowest-risk Phase 6G decomposition step after equivalence is locked.

## Wrapper Functions Covered

| pipeline.js wrapper | source-card-engine.js alias |
| --- | --- |
| `finalSourceCardCanonicalKey` | `engineFinalSourceCardCanonicalKey` |
| `mergeFinalSourceCards` | `engineMergeFinalSourceCards` |
| `sourceCardPublicUrlFromDoc` | `engineSourceCardPublicUrlFromDoc` |
| `sanitizePublicSourceCard` | `engineSanitizePublicSourceCard` |
| `sourceCardFromRetrievedTarget` | `engineSourceCardFromRetrievedTarget` |
| `resolveIndexedSourceCardTarget` | `engineResolveIndexedSourceCardTarget` |

## Test File Added

`tests/patch-06g-003-source-card-wrapper-equivalence.test.mjs`

## Test Strategy

The six wrappers are local functions in `pipeline.js`, not named module exports. To stay test-only and avoid modifying runtime exports, the test locks the current equivalence by:

1. Verifying `pipeline.js` imports all six `source-card-engine.js` functions under the expected `engine*` aliases.
2. Verifying each compatibility wrapper delegates to the matching engine alias as its first statement.
3. Exercising the real `source-card-engine.js` implementations with representative source-card fixtures.
4. Asserting expected outputs for canonical keys, merge/dedupe behavior, public URL hydration, sanitization, restored card construction, and indexed source-card target lookup.
5. Asserting representative object/array inputs are not unexpectedly mutated.

No engine function is mocked in a way that would make equivalence meaningless.

## Local Validation Results

Initial state checks:

- Branch confirmed: `feature/source-availability-engine-v1`
- Recent history confirmed:
  - `644d14b PATCH-06G-002 add Claude architecture review`
  - `7dbc249 PATCH-06G-001 add JS module inventory and decomposition map`
  - `7e59d6b PATCH-06F-GATE-1 close Phase 6F`
- Pre-work `git status --short` was not fully clean because of existing untracked `.vscode/`; it was left untouched and not staged.

Validation commands:

- `node tests/patch-06g-003-source-card-wrapper-equivalence.test.mjs` - PASS, 13 passed / 0 failed
- `node tests/patch-034a-source-card-engine-extraction.test.mjs` - PASS, 7 passed / 0 failed
- `node tests/patch-034b-indexed-source-card-target-extraction.test.mjs` - PASS, 8 passed / 0 failed
- `node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs` - PASS, 8 passed / 0 failed
- `node tests/patch-06f-007-domain-source-card-coverage.test.mjs` - PASS, 12 passed / 0 failed
- All `tests/patch-06f-*.test.mjs` suites - PASS
- `npm test` - PASS, 10 syntax checks / 0 failed, 74 test suites / 0 failed

## Test-Only Confirmation

This is a test-only patch. It adds a focused regression test and this report. The only continuity update is `knowledge/CURRENT_STATE.md`, applied after validation because PATCH-06G-003 passed.

## Runtime File Confirmation

`pipeline.js` was not modified.

`source-card-engine.js` was not modified.

No sourceAvailability runtime files, retrieval/reranker runtime files, issue-classification runtime files, ask/tax/audit runtime files, prompts/templates/routes/controllers, DB/indexing/vector/corpus/ingestion files, package files, dependencies, or environment files were modified.

## Runtime Behavior Confirmation

Runtime behavior was not changed. The new test reads `pipeline.js` source for wrapper mapping and imports the existing `source-card-engine.js` functions for offline representative fixtures only.

## Risk Assessment

Risk is low. The test avoids live services, DB access, network access, staging credentials, corpus mutation, and runtime export changes. The only notable finding is that `sanitizePublicSourceCard` and `sourceCardFromRetrievedTarget` currently retain legacy unreachable code after their immediate engine delegation; this does not affect behavior and remains untouched for PATCH-06G-003.

## Recommended Next Task

PATCH-06G-004 - Source-card wrapper collapse in `pipeline.js`.

After PATCH-06G-003, PATCH-06G-004 can remove the now-locked local compatibility wrappers and point internal callers/imports directly to `source-card-engine.js`, subject to the normal validation gate.
