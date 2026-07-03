# PATCH-07B-CLARIFICATION-LIVE-WIRING-1 - Narrow Live Clarification Route Wiring

## Purpose

Complete the narrow live Step 12.6 clarification route wiring behind the feature flag:

```text
TINA_ENABLE_CLARIFICATION_ROUTE_GATE
```

This patch connects the previously completed clarification route helper chain to `runPipeline()` without changing default runtime behavior.

## Base Commit

```text
f0508b7 PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1 add live wiring scaffold
```

## Scope

Narrow backend-only live clarification route wiring:

- Add feature-flag parser and live gate evaluator.
- Insert Step 12.6 after Step 12.5 and before Step 13 prompt construction / Step 14 OpenAI generation.
- Invoke the existing ten-helper clarification chain only when the feature flag is explicitly enabled.
- Return a clarification-only response when the route decision blocks a full answer.
- Pass compact structured clarification metadata to prompt construction only when the feature flag is enabled and non-blocking.

## Files Changed

```text
pipeline.js
tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs
PATCH-07B-CLARIFICATION-LIVE-WIRING-1_NARROW_LIVE_CLARIFICATION_ROUTE_WIRING.md
knowledge/CURRENT_STATE.md
```

## Explicit Non-Scope Confirmation

This patch did not perform frontend work, dependency changes, retrieval changes, reranker changes, sourceAvailability behavior changes, source-card behavior changes, DB/vector/indexing/corpus/ingestion changes, Phase 8 memory work, Phase 9 workflow work, or Phase 10 hallucination/source-governance/currentness work.

No `package.json` or `package-lock.json` changes were made.

## Feature Flag Behavior

`TINA_ENABLE_CLARIFICATION_ROUTE_GATE` is default OFF.

Missing, empty, and invalid values are OFF. Only explicit true-like values enable the gate:

```text
1
true
on
yes
```

## OFF-State Behavior

When the flag is OFF:

- The ten-helper clarification route chain is not invoked.
- `buildClarificationRouteDecision` is not called.
- No clarification early exit is returned.
- `responseType` is not added.
- `structuredClarificationObject` is not added.
- Step 13 and Step 14 continue through the existing path.
- Source cards and frontend behavior remain unchanged.

## ON-State Blocking Behavior

When the flag is ON and the route decision has `answerAllowed === false`:

- The pipeline returns a clarification-only response.
- `responseType` is `clarification`.
- Questions are capped to 3.
- `documentRequests`, `sourceCoverageLimitations`, and `phase10Deferrals` are included when produced by the route decision.
- Full-answer prompt construction and OpenAI full-answer generation are skipped.
- The response avoids fake citations and final legal/tax conclusions.
- Existing safe metadata and source-card behavior are preserved.

## ON-State Non-Blocking Behavior

When the flag is ON and `answerAllowed !== false`:

- The pipeline continues to Step 13 and Step 14.
- Existing answer generation, authority gates, source cards, and Phase 7A mode formatting are preserved.
- `structuredClarificationObject` is passed as compact prompt constraint metadata only when present.
- `responseType` is set from the route decision only when the feature flag is enabled.

Mapped response types:

```text
ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP -> answer_with_followup
REQUEST_DOCUMENTS -> document_request_with_cautious_answer
DISCLOSE_SOURCE_LIMITATION -> source_limited_orientation
DISCLOSE_PHASE10_DEFERRAL -> phase10_deferred_orientation
ANSWER_NOW_NO_CLARIFICATION_NEEDED -> answer
```

## Fail-Open Behavior

If the helper-chain or route-decision invocation fails while the flag is ON, the pipeline logs a warning, does not expose a stack trace, does not fabricate a clarification result, and continues through the normal Step 13 path.

## Structured Fact Extraction

No structured user-fact extraction was introduced. The live wiring uses query text and available pipeline metadata only, preserving the design limitation that missing user facts should bias toward clarification rather than unsupported conclusions.

## Source-Card / Authority Preservation

The patch preserves source-card and authority-gate behavior. Blocking clarification responses are passed through the existing verified authority gate with the route-provided compact source cards. Non-blocking responses continue through the existing source-card, authority, and rendering path.

## Legacy Guard Alignment

Recovery Pass 2 found that older scaffold/final-gate tests still encoded the pre-live rule that `pipeline.js` must not contain live clarification route wiring and must not appear in the current patch diff.

That rule was correct before this patch, but conflicts with the authorized transition in `PATCH-07B-CLARIFICATION-LIVE-WIRING-1`.

The obsolete assertions were aligned narrowly:

- `pipeline.js` is allowed only for the authorized Step 12.6 live clarification route wiring.
- The allowed live wiring must remain behind `TINA_ENABLE_CLARIFICATION_ROUTE_GATE`.
- The aligned guards require OFF-state no-op behavior and ON-state response taxonomy/early-exit behavior to remain covered by the focused live wiring test.
- Route/controller rewrites, frontend work, dependency changes, retrieval changes, reranker changes, source-card changes, sourceAvailability behavior changes, DB/vector/indexing/corpus/ingestion changes, and deferred fact-check assets remain blocked.
- No tests were deleted or bypassed.

Two older Phase 7B final-gate guards included in `npm test` also required the same narrow alignment because they still treated any production helper-chain usage in `pipeline.js` as unauthorized. Their assertions now permit only the authorized flagged clarification live wiring while continuing to block unrelated production integration changes.

## Validation

Final Recovery Pass 2 validation results:

```text
PASS node --check pipeline.js
PASS node tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs
PASS node tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs
PASS node tests/patch-07b-clarification-final-gate-2-route-helper-workstream-closure.test.mjs
PASS node tests/patch-07b-clarification-route-gate-1-composition-safety-gate.test.mjs
PASS node tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs
PASS node tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs
PASS node tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs
PASS npm test
PASS npm run guard:files
```

`npm test` result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   113 run, 0 failed
GATE PASSED
```

## Final Status

Complete. Ready for selective staging, commit, and push.
