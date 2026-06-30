# PATCH-06G-005 - SAE Boundary Documentation Comments

## Objective

Add narrow documentation comments in `pipeline.js` around the Source Availability Engine boundary so future Phase 6G work does not accidentally move or conflate `computeSourceAvailability` and `classifySourceAvailability`.

## Scope

This patch is documentation/comment-only. It adds boundary comments in `pipeline.js`, this report, and the required continuity update after validation.

## Architecture-Review Basis From PATCH-06G-002

PATCH-06G-002 identified a hard SAE coupling:

- `computeSourceAvailability` and `classifySourceAvailability` are distinct functions.
- `computeSourceAvailability` is private pipeline orchestration/aggregation logic.
- `classifySourceAvailability` is the exported SAE classifier boundary.
- `classifySourceAvailability` is directly imported by test files and must remain in `pipeline.js` during Phase 6G.
- `source-visibility-engine.js` is not a source availability classifier and is not the correct destination.
- Any future extraction belongs to Phase 6H or later and should use a dedicated `source-availability-classifier.js` style module after evaluation coverage and explicit approval.

## pipeline.js Comments Added

Comments were added in three narrow locations:

1. Above `computeSourceAvailability`, documenting that it is private orchestration/aggregation logic and not the exported SAE classifier boundary.
2. Above `classifySourceAvailability`, documenting that it is the exported SAE classifier boundary, intentionally kept in `pipeline.js` during Phase 6G, and not to be moved to `source-visibility-engine.js`.
3. At the `classifySourceAvailability` call site in `runPipeline`, documenting that the local exported classifier remains the intended Phase 6G boundary.

## Comment-Only Confirmation

This patch is documentation/comment-only. No logic, imports, exports, function names, call arguments, runtime behavior, tests, package files, dependencies, routes, controllers, prompts, DB, indexing, RAG, vector store, corpus, ingestion, environment files, or secrets were changed.

## Function Boundary Confirmation

`computeSourceAvailability` was not moved or changed.

`classifySourceAvailability` was not moved or changed.

`classifySourceAvailability` remains exported from `pipeline.js`.

`source-visibility-engine.js` was not touched.

## Local Validation Results

Initial checks:

- Pre-work `git status --short`: existing untracked `.vscode/` noted and left untouched.
- Branch confirmed: `feature/source-availability-engine-v1`
- Recent history confirmed:
  - `d641efb PATCH-06G-004 collapse source-card wrappers`
  - `6c6caaf PATCH-06G-003 add source-card wrapper equivalence tests`
  - `644d14b PATCH-06G-002 add Claude architecture review`
  - `7dbc249 PATCH-06G-001 add JS module inventory and decomposition map`
  - `7e59d6b PATCH-06F-GATE-1 close Phase 6F`

Validation commands:

- `node --check pipeline.js` - PASS
- `node tests/patch-06g-003-source-card-wrapper-equivalence.test.mjs` - PASS, 9 passed / 0 failed
- `npm test` - PASS, 10 syntax checks / 0 failed, 74 suites / 0 failed
- `npm run guard:files` - PASS

## Risk Assessment

Risk is minimal. The patch adds comments only and makes no executable changes. The comments clarify the Phase 6G boundary and reduce future extraction risk.

## Recommended Next Task

PATCH-06G-GATE-1 - Phase 6G Stabilization Gate.

After source-card wrapper equivalence tests, wrapper collapse, and SAE boundary documentation are complete, Phase 6G should be closed through a stabilization gate before any further decomposition begins.
