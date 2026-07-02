# PATCH-07B-CLARIFICATION-ROUTE-HELPER-1 - Narrow Route Clarification Orchestrator Helper

## 1. Objective

Implement a narrow, non-live route clarification helper that prepares a structured clarification route decision object for future route/prompt integration.

## 2. Scope

This patch adds a pure helper, focused isolated tests, and this report. It does not wire live `/ask`, `/tax`, or `/audit` routes and does not change prompts, response generation, pipeline behavior, frontend behavior, retrieval, reranker, sourceAvailability, source cards, DB/vector/corpus/indexing/ingestion, or dependencies.

## 3. Gemini Review 13 Carry-Forward

Gemini Review 13 was required and completed before PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1. This helper carries forward the strict boundary that live route wiring, prompt implementation, response-generation branching, and production orchestration remain prohibited until later approved route-helper, route-gate, and review sequence steps are complete.

## 4. Route Scaffold Carry-Forward

PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1 supplied the response type taxonomy, future insertion point, answerAllowed blocking contract, feature-flag OFF contract, and structured object requirements used by this helper.

## 5. Files Added

- `clarification-route-orchestrator-helper.js`
- `tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs`
- `PATCH-07B-CLARIFICATION-ROUTE-HELPER-1_NARROW_ROUTE_CLARIFICATION_ORCHESTRATOR_HELPER.md`

## 6. Helper Summary

`clarification-route-orchestrator-helper.js` converts clarification boundary output plus route/prompt context metadata into a structured future route decision object. The helper is pure, deterministic, dependency-free, side-effect free, and non-live.

## 7. Exported Functions

- `buildClarificationRouteDecision(input)`
- `normalizeClarificationResponseType(input)`
- `shouldBlockFullAnswerGeneration(input)`

No default route handler, prompt builder, OpenAI caller, pipeline wrapper, or production orchestrator was added.

## 8. Feature Flag OFF Behavior

When `featureFlagEnabled` is false, the helper returns `enabled: false`, `routeBranchActive: false`, `responseType: "answer"`, full-answer prompt/generation booleans set to true, `structuredClarificationObject: null`, and `featureFlagOffBehavior: "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED"`.

## 9. Feature Flag ON Behavior

When `featureFlagEnabled` is true, the helper marks the future route branch active, records insertion point `RUNPIPELINE_AFTER_STEP_6_5_BEFORE_STEP_13_14`, requires execution before prompt construction and OpenAI generation, and returns a structured clarification object.

## 10. Answer Blocking Rule Coverage

`answerAllowed === false` is the only hard blocking trigger. In that case the helper returns `responseType: "clarification"`, `shouldBuildFullAnswerPrompt: false`, `shouldCallOpenAIForFullAnswer: false`, `blockingTrigger: "answerAllowed === false"`, and `routeAction: "RETURN_CLARIFICATION_ONLY"`.

## 11. Response Type Mapping

The helper maps scaffold decisions to:

- `ASK_BEFORE_ANSWERING` with `answerAllowed === false` -> `clarification`
- `ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP` -> `answer_with_followup`
- `REQUEST_DOCUMENTS` -> `document_request_with_cautious_answer`
- `DISCLOSE_SOURCE_LIMITATION` -> `source_limited_orientation`
- `DISCLOSE_PHASE10_DEFERRAL` -> `phase10_deferred_orientation`
- `ANSWER_NOW_NO_CLARIFICATION_NEEDED` -> `answer`
- unknown decisions -> `answer_with_followup` if allowed, otherwise `clarification`

## 12. Structured Clarification Object Contract

When enabled, the structured object includes mode, decision, responseType, answerAllowed, canReachFinalConclusion, allowedAnswerPosture, prohibitedConclusions, sourceCoverageLimitations, phase10Deferrals, questions, documentRequests, sourceAvailabilityState, authorityState, sourceCoverageNeeds, sourceCards, retrievalContext, knownFacts, helperOutputsSummary, renderingHints, and implementation scope.

## 13. Compact Metadata Sanitization

Source cards preserve compact metadata only. Raw text fields such as body, content, text, rawText, fullText, excerpt, pageText, and chunkText are stripped from sourceCards and retrievalContext. Helper output summaries preserve compact labels and presence metadata only.

## 14. Question Cap Coverage

Questions are cleaned, preserve original order, remove blank/non-string values, and are capped at 3. The helper does not generate new questions beyond `clarificationResult`.

## 15. Document Request Coverage

Document requests are cleaned, preserve original order, remove blank/non-string values, and are not invented beyond `clarificationResult`.

## 16. Prohibited Conclusions Coverage

The helper preserves and supplements prohibitions against final legal/tax conclusions when facts are insufficient, void-assessment claims, BIR/no-case claims, taxpayer/BIR win predictions, guaranteed outcomes, settlement recommendations, protest strategy, CTA strategy, litigation strategy, fake citations, and unsupported authority conclusions.

## 17. Source Limitation Coverage

`DISCLOSE_SOURCE_LIMITATION` remains non-blocking unless `answerAllowed === false`, returns `source_limited_orientation`, preserves sourceCoverageLimitations, and does not ask the user to find the law or search BIR.

## 18. Phase 10 Deferral Coverage

`DISCLOSE_PHASE10_DEFERRAL` remains non-blocking unless `answerAllowed === false`, returns `phase10_deferred_orientation`, preserves phase10Deferrals, and does not ask the user to determine currentness, supersession, hierarchy, or source metadata.

## 19. Mode Rendering Hint Coverage

The helper returns compact rendering hints only: ask -> conversational/maxQuestions 3, tax -> senior_memo/noFinalOpinionWhenClarificationRequired, audit -> procedural_first/noProtestSettlementCTAWhenClarificationRequired.

## 20. Non-Live Integration Guarantees

Every output marks liveRouteImplemented, promptIntegrationImplemented, responseGenerationImplemented, productionOrchestratorImplemented, and frontendImplemented as false.

## 21. Test Coverage

Focused tests validate exports, feature flag OFF behavior, feature flag ON blocking, shouldBlockFullAnswerGeneration, decision mapping, structured object fields, question cap, document cleanup, compact sourceCards, compact retrievalContext, helperOutputsSummary, prohibited conclusions, source limitation, Phase 10 deferral, mode hints, non-live flags, fixture compatibility, and no live route/prompt/pipeline imports.

## 22. Validation Commands Run

- `git branch --show-current`
- `git status --short`
- `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD`
- `git log --oneline -25`
- `node tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs`
- `node tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs`
- `node tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs`
- `node tests/patch-07b-clarification-gate-2-composition-safety-gate.test.mjs`
- `node tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs`
- `node tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs`
- Required audit-risk and core Phase 7B focused regression chain
- Required Phase 7A focused regression chain
- Required selected Phase 6F / PATCH-019A regression chain
- `npm test`
- `npm run guard:files`

## 23. Validation Results

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync before work confirmed: `0 0`
- Latest history confirmed through `10ed5ac PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1 add route integration fixture`
- New focused helper test: 17 passed, 0 failed
- Route scaffold fixture test: 21 passed, 0 failed
- Clarification final-gate test: 8 passed, 0 failed
- Clarification gate/helper/scaffold tests: passed
- Audit-risk and core Phase 7B focused regressions: passed
- Phase 7A focused regressions: passed
- Selected Phase 6F / PATCH-019A regressions: passed
- `npm test`: 10 syntax checks, 109 suites, 0 failures
- `npm run guard:files`: passed

## 24. Known Untracked / Deferred Files Status

Known untracked/deferred files must remain untouched and uncommitted: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`.

## 25. Gate Decision

PASS WITH RECOMMENDATIONS.

Reason: the helper prepares future route clarification decisions but is not live-wired.

## 26. Residual Risks

This patch does not prove live route behavior, live prompt behavior, response generation behavior, frontend rendering, route composition, source currentness, hierarchy resolution, source metadata governance, document-aware advisory, settlement/protest workflows, CTA workflows, or later-phase functionality.

## 27. Recommended Next Task

PATCH-07B-GEMINI-REVIEW-14 - Narrow Route Clarification Orchestrator Helper Review.

## 28. Gemini Review Requirement

Gemini Review 14 is required before the route composition gate, any live route wiring, any prompt integration, any response-generation branching, or any frontend responseType implementation.

## 29. Final Recommendation

Proceed to Gemini Review 14 after validation. Do not proceed directly to live route integration, prompt integration, response generation changes, frontend responseType work, or Phase 8/9/10/11/12 work.
