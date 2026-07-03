# PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1 - Live Clarification Wiring Fixture and Tests

## 1. Objective

Create the static fixture and scaffold tests that define the future live clarification wiring contract for `runPipeline()` without implementing live wiring.

## 2. Scope

Fixture/test scaffold only. This patch adds one fixture, one static fixture test, this report, and a continuity update after validation. It makes no route/controller behavior changes, no prompt behavior changes, no response-generation changes, no `pipeline.js` behavior changes, no production orchestrator implementation, no frontend implementation, no retrieval/reranker/sourceAvailability/source-card changes, no DB/vector/indexing/corpus/ingestion changes, no dependency changes, and no Phase 10 implementation.

## 3. Gemini Review 16 Carry-Forward

PATCH-07B-GEMINI-REVIEW-16 is carried forward as PASS WITH STRICT RECOMMENDATIONS.

Required design fixes before implementation: None.

The review requires the future live implementation to preserve the approved Step 12.6 insertion point, feature-flag OFF default, OFF-state no-helper-chain invocation, `answerAllowed === false` as the blocking trigger, source-card and authority-gate preservation, fail-open helper-chain error behavior, no frontend implementation unless separately approved, and no Phase 10 runtime.

## 4. Naming Collision Correction

Gemini Review 16 referred to the next scaffold as PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1, but that name was already used and completed at commit `10ed5ac`.

This patch uses the corrected non-colliding name: PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1.

## 5. Live Design Carry-Forward

PATCH-07B-CLARIFICATION-LIVE-DESIGN-1 is present in history as `2e51c19 PATCH-07B-CLARIFICATION-LIVE-DESIGN-1 design live clarification integration`.

The design carries forward the future Step 12.6 location inside `runPipeline()`: after Step 12.5, after sourceAvailability/SAE state is available from Step 6.5, before Step 13 `buildAdaptivePromptContract`, and before Step 14 OpenAI generation.

## 6. Files Added

- `evaluation/fixtures/phase-7b-clarification-live-wiring-scaffold-1-contract.fixture.json`
- `tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs`
- `PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1_LIVE_CLARIFICATION_WIRING_FIXTURE_AND_TESTS.md`

Continuity update after validation:

- `knowledge/CURRENT_STATE.md`

## 7. Fixture Summary

The fixture records the metadata, insertion point, feature flag, OFF-state expectations, ON-state blocking/non-blocking expectations, responseType taxonomy, helper-chain error behavior, structured fact limitation, source-card/authority preservation, frontend deferral, Phase 10 deferral, and future continuity contract.

It explicitly marks `runtimeImplemented`, `pipelineImplemented`, `promptIntegrationImplemented`, `responseGenerationImplemented`, `frontendImplemented`, `productionOrchestratorImplemented`, and `phase10Implemented` as false.

## 8. Insertion Point Contract Coverage

The scaffold test asserts:

- file: `pipeline.js`
- function: `runPipeline`
- new step: `12.6`
- after: `Step 12.5`
- before: `Step 13 buildAdaptivePromptContract`
- after source availability: `Step 6.5`
- before OpenAI generation: `Step 14`
- must run before prompt construction and before OpenAI generation.

## 9. Feature Flag Contract Coverage

The fixture and test cover `TINA_ENABLE_CLARIFICATION_ROUTE_GATE` with default OFF, missing OFF, invalid OFF, allowed truthy values, OFF-state byte-identical requirement, OFF-state no helper-chain invocation, and OFF-state no `responseType` or `structuredClarificationObject` additions.

## 10. OFF-State Contract Coverage

The fixture includes `FLAG_OFF_BASELINE_ASK`, `FLAG_OFF_BASELINE_TAX`, and `FLAG_OFF_BASELINE_AUDIT`.

All three require no helper-chain invocation, no `buildClarificationRouteDecision` invocation, no responseType addition, no structuredClarificationObject addition, no early exit, Step 13 continuation, and Step 14 full-answer call continuation.

## 11. ON-State Blocking Coverage

The fixture includes `FLAG_ON_BLOCKING_ASK`, `FLAG_ON_BLOCKING_TAX`, and `FLAG_ON_BLOCKING_AUDIT`.

All three require helper-chain invocation, `buildClarificationRouteDecision` invocation, `answerAllowed` false, `responseType` clarification, skipped prompt construction, skipped OpenAI full-answer call, and clarification-only return. The tax case forbids a final tax opinion. The audit case forbids protest, settlement, or CTA strategy.

## 12. ON-State Non-Blocking Coverage

The fixture covers source-limited orientation, Phase 10 deferral orientation, document-request cautious answer, cautious answer with follow-up, and no-clarification-needed answer.

These cases continue prompt construction and OpenAI full-answer generation while passing `structuredClarificationObject` only as future prompt constraint metadata where applicable.

## 13. Helper Chain Error / Fail-Open Coverage

`FLAG_ON_HELPER_CHAIN_ERROR_FAIL_OPEN` requires fail-open behavior: if the helper chain throws while the feature flag is ON, the future runtime continues to Step 13 and Step 14, exposes no stack trace, fabricates no clarification result, and logs diagnostics only if existing logging supports it.

## 14. Structured User-Fact Limitation Coverage

`NO_STRUCTURED_FACT_EXTRACTION` records that structured user-fact extraction is not available in the live pipeline. The future helper chain must not invent facts and must bias toward clarification when facts are missing.

## 15. Source Card / Authority Preservation Coverage

`SOURCE_CARD_AUTHORITY_PRESERVATION` requires source cards to be preserved, the authority gate not to be bypassed, and sourceAvailability not to be bypassed.

## 16. Frontend Deferred Coverage

`FRONTEND_DEFERRED` records that frontend implementation remains false, no frontend change is required while the flag is OFF, and frontend impact remains deferred.

## 17. Phase 10 Deferred Coverage

`PHASE10_DEFERRED` records that Phase 10 is not implemented, HAL/trap questions are not implemented, court-case metadata is not implemented, and no G.R. lookup is implemented.

## 18. ResponseType Taxonomy Coverage

The fixture and test assert the complete future taxonomy:

- `clarification`
- `answer_with_followup`
- `document_request_with_cautious_answer`
- `source_limited_orientation`
- `phase10_deferred_orientation`
- `answer`

## 19. No-Live-Implementation Confirmation

This scaffold leaves no live wiring implemented. No pipeline behavior implemented. No prompt integration implemented. No response-generation branching implemented. No frontend implementation. No production orchestrator implementation. No Phase 10 implementation.

The scaffold test statically guards against importing route, handler, pipeline, prompt, context orchestration, or renderer files.

## 20. Test Coverage

The new scaffold test validates fixture metadata, insertion point, feature flag behavior, OFF-state cases, ON-state blocking cases, non-blocking source limitation, non-blocking Phase 10 deferral, document request/follow-up/no-clarification cases, helper-chain fail-open behavior, structured fact limitation, source-card and authority preservation, frontend deferral, Phase 10 deferral, responseType taxonomy, report/CURRENT_STATE continuity, static no-live-import guard, no phase leakage, and diff protection.

## 21. Validation Commands Run

- `git branch --show-current`
- `git status --short`
- `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD`
- `git log --oneline -30`
- `node tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs`
- `node tests/patch-07b-clarification-final-gate-2-route-helper-workstream-closure.test.mjs`
- `node tests/patch-07b-clarification-route-gate-1-composition-safety-gate.test.mjs`
- `node tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs`
- `node tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs`
- `node tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs`
- Audit-risk and core Phase 7B focused tests using the actual filenames present in this repo
- Phase 7A focused tests
- selected Phase 6F / regression tests
- `npm test`
- `npm run guard:files`
- `git diff --name-only`

## 22. Validation Results

Initial repo validation passed:

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync before work confirmed: `0 0`
- Latest history includes `2e51c19 PATCH-07B-CLARIFICATION-LIVE-DESIGN-1 design live clarification integration`
- Latest history includes `ad57e09 PATCH-07B-CLARIFICATION-FINAL-GATE-2 close route helper workstream`

Focused and full validation passed:

- New scaffold test: passed
- Route final gate, route gate, route helper, route scaffold, and clarification final gate tests: passed
- Audit-risk and core Phase 7B tests: passed using the repo's actual filenames where task-listed names differed
- Phase 7A focused tests: passed
- Selected Phase 6F / regression tests: passed
- `npm test`: passed, 112 suites run, 0 failed
- `npm run guard:files`: passed

## 23. Known Untracked / Deferred Files Status

Known untracked/deferred files remain untouched and uncommitted:

- `.vscode/`
- `evaluation/factcheck/`
- `tests/TINA_Adversarial_Test_Set_PH_Tax.md`
- `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`

## 24. Gate Decision

PASS WITH RECOMMENDATIONS.

Reason: the scaffold defines future live wiring expectations but does not implement them.

## 25. Residual Risks

Live route behavior, prompt construction behavior, response-generation branching, frontend responseType display, and runtime OpenAI-generation blocking remain unimplemented. Byte-identical OFF-state runtime proof remains a future implementation-patch obligation. Phase 10 source governance, hallucination trap tests, court-case metadata, G.R. lookup, currentness, and supersession remain deferred.

## 26. Recommended Next Task

PATCH-07B-CLARIFICATION-LIVE-WIRING-1 - Narrow Live Clarification Route Wiring.

Recommended agent: Codex.

Task type: Narrow implementation.

Strict scope: feature flag parser/helper, Step 12.6 guarded live block in `pipeline.js`, ten-helper chain invocation only when the feature flag is ON, early exit if `answerAllowed === false`, pass `structuredClarificationObject` to prompt construction for non-blocking cases, fail-open on helper-chain errors, no frontend implementation unless expressly approved, and no Phase 10 implementation.

Do not recommend immediate staging rollout.

## 27. Gemini Review 17 Requirement

Gemini Review 17 required after live wiring implementation and focused tests before staging composition/gate or broader rollout.

## 28. Final Recommendation

Accept PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1 as a scaffold-only pass with recommendations, then proceed to PATCH-07B-CLARIFICATION-LIVE-WIRING-1 only as a narrow, feature-flagged implementation patch followed by Gemini Review 17.
