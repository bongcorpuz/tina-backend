# PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1 - Route/Prompt Integration Fixture and Tests

## 1. Objective

Create the fixture and scaffold tests for future live clarification route/prompt integration before any route wiring, prompt construction, response-generation change, production orchestrator, or live clarification implementation occurs.

## 2. Scope

This patch adds a route/prompt integration fixture, scaffold test, and report only. It does not change routes, prompts, response generation, pipeline behavior, production orchestration, frontend behavior, retrieval, reranking, sourceAvailability, source-card behavior, package/dependency files, DB/indexing/vector/corpus/ingestion, or later phase work.

## 3. Gemini Review 13 Carry-Forward

PATCH-07B-GEMINI-REVIEW-13 is carried forward as COMPLETE / PASS WITH STRICT RECOMMENDATIONS. The review permits fixture/test scaffolding for future route/prompt integration expectations but does not approve live implementation in this patch.

## 4. Route Design Carry-Forward

PATCH-07B-CLARIFICATION-ROUTE-DESIGN-1 is carried forward as DESIGN COMPLETE / GO WITH STRICT CONSTRAINTS. The approved future insertion point is inside `runPipeline()` after Step 6.5, where sourceAvailability / SAE state is available, and before Step 13 prompt construction and Step 14 OpenAI generation.

## 5. Files Added

- `evaluation/fixtures/phase-7b-clarification-route-scaffold-1-integration-policy.fixture.json`
- `tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs`
- `PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1_ROUTE_PROMPT_INTEGRATION_FIXTURE_AND_TESTS.md`

## 6. Fixture Summary

The fixture defines future route/prompt integration expectations, metadata, feature-flag behavior, insertion point, answer blocking rule, response types, future object contract, stop conditions, deferred items, and 18 representative cases across `/ask`, `/tax`, `/audit`, feature flag behavior, prompt constraints, Phase 7A preservation, frontend anticipation, and no-live-implementation boundaries.

## 7. Future Insertion Point Coverage

The fixture encodes `runPipeline` as the future location, after `Step 6.5 sourceAvailability/SAE state available` and before `Step 13 prompt construction and Step 14 OpenAI generation`. It also encodes that future clarification integration must not run after generation or after pipeline return.

## 8. Answer Blocking Rule Coverage

The fixture encodes `answerAllowed === false` as the hard blocking trigger. When blocked, future behavior must not build a full answer prompt, must not call OpenAI for a full answer, and must return response type `clarification`.

## 9. Response Type Coverage

The fixture defines these future response types: `clarification`, `answer_with_followup`, `document_request_with_cautious_answer`, `source_limited_orientation`, `phase10_deferred_orientation`, and `answer`.

## 10. Future Object Contract Coverage

The fixture defines the future structured object contract with `mode`, `userQuery`, `sourceAvailabilityState`, `authorityState`, `sourceCoverageNeeds`, `sourceCards`, compact `retrievalContext`, `knownFacts`, and helper output slots for all nine Phase 7B helpers through `clarificationResult`. `retrievalContext` and `sourceCards` are metadata-only and prohibit raw full-document injection.

## 11. Mode-Specific Coverage

The cases cover `/ask` blocking clarification, `/ask` answer with follow-up, `/ask` source-limited orientation, `/tax` blocking clarification, `/tax` document requests, `/tax` Phase 10 deferral, `/tax` answer-now behavior, `/audit` procedural blocking clarification, `/audit` document requests, and `/audit` source-limited orientation.

## 12. Prompt Construction Boundary Coverage

The scaffold requires a structured clarification object for future prompt construction. Raw string-only prompt injection is prohibited. The fixture requires `prohibitedConclusions`, `allowedAnswerPosture`, `sourceCoverageLimitations`, `phase10Deferrals`, `questions`, `documentRequests`, and `canReachFinalConclusion`.

## 13. Response Formatting Boundary Coverage

The fixture expects future clarification-only responses for blocked cases, answer-with-follow-up for helpful-only cases, document-request-with-cautious-answer for document gaps, source-limited orientation for unavailable indexed support, Phase 10 deferred orientation for Phase 10 flags, and ordinary answer generation only where no clarification is needed.

## 14. Phase 7A Preservation Coverage

The fixture requires `/ask` conversational formatting, `/tax` senior memo formatting, `/audit` advisory formatting, source limitation wording, source cards, and `applyVerifiedAuthorityGate` as terminal gate to remain preserved.

## 15. Phase 7B Helper Boundary Coverage

The scaffold references the existing nine-helper chain only as future structured helper output slots. It does not create a new detector, route orchestrator, prompt builder, response generator, or live integration branch.

## 16. Source / Authority State Dependency Coverage

The future integration depends on sourceAvailability / SAE state being available after Step 6.5. Source limitation and Phase 10 deferral cases require preservation of source-state boundaries and prohibit outsourcing legal-source or metadata review to users.

## 17. Feature Flag Coverage

The fixture sets `featureFlagDefault` to `OFF` and requires `BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED` when the flag is off. Future flag-on behavior may run only at the approved insertion point and must block generation when `answerAllowed === false`.

## 18. Frontend Response Contract Coverage

The fixture anticipates `responseType` for future frontend display while confirming no frontend implementation is included. Frontend implications remain deferred to a later design gate.

## 19. Stop Conditions Coverage

The scaffold requires future work to stop if generation-blocking cannot be proven, feature-flag OFF behavior is not byte-identical, sourceAvailability is unavailable, source limitation wording is lost, Phase 7A formatting is bypassed, frontend display cannot safely support clarification response, or route flow materially changes.

## 20. Deferred Items Coverage

Deferred items remain: Phase 8 memory, Phase 9 workflows, Phase 10 source governance/acquisition, Phase 10 Tax Accuracy QA execution, Phase 11 observability, Phase 12 document advisory, settlement/protest runtime, CTA strategy runtime, and authority conflict/hierarchy/supersession runtime.

## 21. Prohibited Behavior Coverage

The fixture and test prohibit outcome guarantees, unsafe audit/tax conclusions, strategy runtime, legal-source outsourcing, metadata outsourcing, and legal-judgment document requests in expected integration behavior.

## 22. Route / Prompt / Response Generation Non-Implementation

No route/controller files were changed. No prompt files were changed. No response-generation files were changed. No pipeline behavior was changed. No production orchestrator was added. The test does not import or call live route behavior.

## 23. Test Coverage

The scaffold test validates fixture metadata, insertion point, answer blocking rule, response taxonomy, future object contract, case coverage, blocking behavior, non-blocking behavior, `/ask`, `/tax`, `/audit`, source limitation, Phase 10 deferral, prompt constraint object, Phase 7A preservation, feature flags, frontend anticipation, stop conditions, deferred items, no live implementation, prohibited expected text, and protected-file diff boundaries.

## 24. Validation Commands Run

- `git status --short --branch`
- `git branch --show-current`
- `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD`
- `git log --oneline -25`
- `node tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs`
- `node tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs`
- `node tests/patch-07b-clarification-gate-2-composition-safety-gate.test.mjs`
- `node tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs`
- `node tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs`
- Required focused Phase 7B, Phase 7A, PATCH-06F, and PATCH-019A regression commands
- `npm test`
- `npm run guard:files`

## 25. Validation Results

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync before work confirmed: `0 0`
- Latest history confirmed through `b9c826f PATCH-07B-CLARIFICATION-FINAL-GATE-1 close clarification track`
- New route scaffold fixture test: passed
- Clarification final-gate focused test: passed
- Clarification composition, helper, and scaffold focused tests: passed
- Required focused regressions: passed
- `npm test`: passed
- `npm run guard:files`: passed

## 26. Known Untracked / Deferred Files Status

Known untracked/deferred files remained untouched and uncommitted: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`.

## 27. Gate Decision

PASS WITH RECOMMENDATIONS.

The route/prompt integration scaffold defines future integration expectations, but no runtime implementation exists yet.

## 28. Residual Risks

This patch does not prove live route behavior, live prompt behavior, actual answer blocking, feature-flag byte identity in live traffic, OpenAI call suppression, frontend display behavior, production orchestration, source currentness, hierarchy, supersession, official-source metadata, workflow generation, observability, document-aware advisory, or live user clarification UX.

## 29. Recommended Next Task

PATCH-07B-CLARIFICATION-ROUTE-HELPER-1 - Narrow Route Clarification Orchestrator Helper.

Recommended agent: Codex.

Purpose: implement a narrow, non-live route orchestration helper that prepares the structured clarification integration object and decision effects, without wiring into live routes or prompts.

Do not proceed directly to live route integration.

## 30. Gemini Review Requirement

PATCH-07B-GEMINI-REVIEW-14 is required after route helper implementation and before any live route/prompt integration.

## 31. Final Recommendation

Close PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1 as COMPLETE / PASS WITH RECOMMENDATIONS. Proceed next only to the narrow non-live route clarification orchestrator helper, then Gemini Review 14 before any live route or prompt implementation.
