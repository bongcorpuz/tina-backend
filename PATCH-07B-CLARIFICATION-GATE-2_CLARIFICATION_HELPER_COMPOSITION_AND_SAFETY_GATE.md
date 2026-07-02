# PATCH-07B-CLARIFICATION-GATE-2 - Clarification Helper Composition and Safety Gate

## 1. Objective

Create a test-only composition gate validating that `clarification-boundary-policy.js` composes safely with the existing Phase 7B helper chain.

## 2. Scope

This patch adds a composition gate test and this report only. It does not add live clarification behavior, route integration, prompt integration, response-generation changes, a production orchestrator, frontend changes, retrieval/reranker/source-card changes, package changes, DB/vector/corpus/ingestion changes, or Phase 8/9/10/11/12 work.

## 3. Gemini Review 11 Carry-Forward

Gemini Review 11 is carried forward as COMPLETE / PASS WITH STRICT RECOMMENDATIONS. This gate validates composition before any clarification final gate or live integration design.

## 4. Clarification Helper Carry-Forward

PATCH-07B-CLARIFICATION-HELPER-1 added `clarification-boundary-policy.js` with `assessClarificationNeed` and `buildClarificationChecklist`. This gate treats that helper as aggregator-only and validates it through accepted upstream result fields.

## 5. Files Added

- `tests/patch-07b-clarification-gate-2-composition-safety-gate.test.mjs`
- `PATCH-07B-CLARIFICATION-GATE-2_CLARIFICATION_HELPER_COMPOSITION_AND_SAFETY_GATE.md`

## 6. Composition Gate Summary

The gate composes realistic upstream outputs in test-only code and passes them into `assessClarificationNeed`. It validates deterministic, non-conclusive, safety-policy-compliant clarification decisions across 12 scenarios.

## 7. Nine-Helper Chain Covered

The gate covers:

1. `issue-framing-engine.js`
2. `reasoning-safety-policy.js`
3. `fact-gap-helper.js`
4. `client-fact-checklist-output.js`
5. `authority-applicability-helper.js`
6. `adversarial-content-safety-policy.js`
7. `bir-vs-taxpayer-position-helper.js`
8. `audit-risk-language-helper.js`
9. `clarification-boundary-policy.js`

## 8. Scenario Coverage

The gate covers `/ask` critical facts, `/ask` helpful-only facts, `/ask` NO_INDEXED_SOURCE, `/tax` VAT/PEZA/export/customer facts, `/tax` document gaps, `/tax` RELATED_AUTHORITY_ONLY, `/tax` Phase 10 flags, `/tax` complete facts/documents, `/audit` missing procedure, `/audit` known stage with missing documents, `/audit` NO_INDEXED_SOURCE, and privacy/prohibited behavior.

## 9. Output Shape Coverage

Every composed output is checked for the approved clarification output fields, `canReachFinalConclusion: false`, and `implementationScope: CLARIFICATION_BOUNDARY_POLICY_ONLY`.

## 10. Decision Taxonomy Coverage

The gate asserts every decision is one of the six approved clarification decisions.

## 11. Allowed Answer Posture Coverage

The gate asserts every posture is one of `GENERAL_ORIENTATION_ONLY`, `CAUTIOUS_ANSWER_WITH_OPEN_ITEMS`, and `NO_ANSWER_UNTIL_CLARIFIED`.

## 12. Decision Precedence Coverage

The scenarios verify Phase 10 deferral, source limitation, mandatory clarification, document request, related-authority limitation, helpful-only follow-up, and answer-now behavior.

## 13. Missing User Fact Boundary Coverage

Critical fact gaps trigger `ASK_BEFORE_ANSWERING` and do not allow document requests to crowd out gating questions.

## 14. Missing Document Boundary Coverage

Document-only scenarios trigger `REQUEST_DOCUMENTS` with factual document requests and cautious answer posture.

## 15. Source Coverage Boundary Coverage

NO_INDEXED_SOURCE scenarios disclose source limitations and do not ask the user to supply law or source research.

## 16. Phase 10 Boundary Coverage

Phase 10 flag scenarios disclose deferrals and do not ask users to resolve currentness, supersession, hierarchy, ruling/case status, or source metadata.

## 17. Audit Procedural Boundary Coverage

Audit scenarios prioritize stage, notice, deadline, and LOA/PAN/FAN/FDDA questions before substantive follow-up.

## 18. Mode-Specific Cap Coverage

The gate enforces `/ask` <= 3, `/tax` <= 7, and `/audit` <= 10 questions.

## 19. Question Prioritization Coverage

Procedural audit questions are verified as first in `/audit` ASK_BEFORE_ANSWERING scenarios.

## 20. Privacy / Security Boundary Coverage

The gate verifies outputs do not ask for TIN, full address, bank account number, or unnecessary personal identifiers.

## 21. Safety Policy Coverage

Every composed assessment and checklist output must pass `assertAdversarialSafety`.

## 22. Prohibited Behavior Coverage

The gate blocks final-conclusion language, guaranteed outcome language, settlement/protest/CTA strategy, source outsourcing, Phase 10 outsourcing, legal-judgment document requests, and privacy overreach.

## 23. Aggregator-Only Boundary Coverage

The gate passes accepted upstream fields into the clarification helper and confirms no route, prompt, or live data is required.

## 24. Route / Prompt / Live Integration Non-Implementation

No route, prompt, response-generation, production orchestrator, or live integration code was added. The composition gate test asserts it imports no live route, prompt, or response module.

## 25. Test Coverage

The new focused test validates export boundaries, output shape, decisions, postures, safety, determinism, source limitation, Phase 10 deferrals, document safety, non-conclusion behavior, strategy prohibitions, privacy, nine-helper coverage, and no live integration imports.

## 26. Validation Commands Run

- `git status --short --branch`
- `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD`
- `git log --oneline -5`
- `node tests/patch-07b-clarification-gate-2-composition-safety-gate.test.mjs`
- `node tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs`
- `node tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs`
- Required focused Phase 7B, Phase 7A, PATCH-06F, and PATCH-019A regression commands
- `npm test`
- `npm run guard:files`

## 27. Validation Results

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync before work confirmed: `0 0`
- Latest history confirmed through `4fa788b PATCH-07B-CLARIFICATION-HELPER-1 add clarification boundary policy`
- New composition gate test: 8 passed, 0 failed
- Required focused regressions: passed
- `npm test`: 10 syntax checks, 106 suites, 0 failures
- `npm run guard:files`: passed

## 28. Known Untracked / Deferred Files Status

Known untracked/deferred files remained untouched and uncommitted: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`.

## 29. Gate Decision

PASS WITH RECOMMENDATIONS.

Reason: the clarification helper is composed in a test-only gate and passes, but Gemini Review 12 is required before any clarification final gate or route/prompt integration design.

## 30. Residual Risks

This patch does not prove live route behavior, live prompt behavior, response generation behavior, source currentness, authority hierarchy resolution, source metadata governance, settlement/protest workflows, CTA workflows, document-aware advisory, or later-phase functionality.

## 31. Gemini Review Requirement

PATCH-07B-GEMINI-REVIEW-12 is required to review the clarification composition gate.

## 32. Recommended Next Task

PATCH-07B-GEMINI-REVIEW-12 - Clarification Composition Gate Review.

Reviewer: Gemini.

## 33. Final Recommendation

Proceed to Gemini Review 12. Do not proceed directly to live route integration, prompt integration, response generation changes, or Phase 8/9/10/11/12 work.
