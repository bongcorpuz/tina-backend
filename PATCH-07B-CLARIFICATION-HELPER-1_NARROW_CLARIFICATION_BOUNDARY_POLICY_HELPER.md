# PATCH-07B-CLARIFICATION-HELPER-1 - Narrow Clarification Boundary Policy Helper

## 1. Objective

Implement a narrow clarification decision helper that determines whether TINA should ask before answering, answer cautiously with follow-up, request documents, disclose source limitations, disclose Phase 10 deferrals, or proceed without clarification.

## 2. Scope

This patch adds `clarification-boundary-policy.js`, focused helper tests, and this report. It does not add route integration, prompt integration, live clarification behavior, a production orchestrator, response-generation changes, retrieval/reranker/source-card changes, package changes, DB/vector/corpus/ingestion changes, or Phase 8/9/10/11/12 work.

## 3. Gemini Review 10 Carry-Forward

Gemini Review 10 is carried forward as PASS WITH STRICT RECOMMENDATIONS. The helper follows the approved design by remaining narrow, fixture-driven, safety-gated, and review-bound before any composition gate or live integration.

## 4. Clarification Scaffold Carry-Forward

PATCH-07B-CLARIFICATION-SCAFFOLD-1 provided the decision taxonomy, output shape, policy boundaries, and fixture cases used by this helper test.

## 5. Files Added

- `clarification-boundary-policy.js`
- `tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs`
- `PATCH-07B-CLARIFICATION-HELPER-1_NARROW_CLARIFICATION_BOUNDARY_POLICY_HELPER.md`

## 6. Runtime Helper Summary

The helper exports a pure aggregator over existing Phase 7B outputs. It accepts precomputed upstream results when supplied and uses existing helper exports as fallback only.

## 7. Export Summary

Exports added:

- `assessClarificationNeed(input)`
- `buildClarificationChecklist(input)`

No prompt builder or live handler export was added.

## 8. Output Shape

Every output includes `clarificationDecision`, `clarificationReason`, `shouldAskBeforeAnswer`, `questions`, `documentRequests`, `sourceCoverageLimitations`, `phase10Deferrals`, `answerAllowed`, `allowedAnswerPosture`, `prohibitedConclusions`, `canReachFinalConclusion: false`, and `implementationScope: CLARIFICATION_BOUNDARY_POLICY_ONLY`.

## 9. Decision Taxonomy

The helper uses only the scaffold-approved decision values: `ASK_BEFORE_ANSWERING`, `ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP`, `REQUEST_DOCUMENTS`, `DISCLOSE_SOURCE_LIMITATION`, `DISCLOSE_PHASE10_DEFERRAL`, and `ANSWER_NOW_NO_CLARIFICATION_NEEDED`.

## 10. Allowed Answer Posture Taxonomy

The helper uses only `GENERAL_ORIENTATION_ONLY`, `CAUTIOUS_ANSWER_WITH_OPEN_ITEMS`, and `NO_ANSWER_UNTIL_CLARIFIED`.

## 11. Aggregator-Only Boundary

The helper aggregates existing outputs such as critical missing facts, helpful missing facts, document gaps, source coverage needs, applicability facts, Phase 10 flags, and audit procedural gaps. It does not introduce a new detector taxonomy.

## 12. Missing User Fact Handling

Critical, taxpayer-status, transaction-character, timing/period, audit-stage, and blocking applicability gaps can require clarification before answering.

## 13. Missing Document Handling

Document gaps produce factual document requests and may allow a cautious answer with open items. Legal-judgment document requests are filtered out.

## 14. Source Coverage Handling

`NO_INDEXED_SOURCE` discloses source limitation and does not ask the user to supply the law. `GENERAL_TAX` stays general orientation. `RELATED_AUTHORITY_ONLY` discloses related-only support while allowing applicability follow-up.

## 15. Authority Applicability Handling

Missing applicability facts are gathered from existing authority applicability helper output or explicit input signals. The helper does not decide authority hierarchy, conflict, currentness, or controlling effect.

## 16. Audit Procedural Clarification Handling

For `/audit`, procedural stage, notice, deadline, LOA/PAN/FAN/FDDA, taxable-period, and support status questions are prioritized before substantive follow-up.

## 17. Mode-Specific Question Caps

The helper enforces `/ask` <= 3, `/tax` <= 7 unless grouped checklist is explicitly enabled, and `/audit` <= 10.

## 18. Question Prioritization

Questions are ordered by gating facts, audit procedural posture, authority applicability facts, document status where relevant, and helpful-only facts.

## 19. Phase 10 Deferral Handling

Phase 10 flags produce non-final deferral disclosures. The helper does not ask users to resolve currentness, supersession, hierarchy, official-source metadata, ruling status, or case status.

## 20. Privacy / Security Boundary

The helper filters unnecessary sensitive identifiers such as TIN, full address, bank account number, and unnecessary personal identifiers, while allowing safe categories such as taxable year, tax type, transaction character, document status, and procedural stage.

## 21. Safety Policy Integration

The helper imports and uses `sanitizeAdversarialText` and `assertAdversarialSafety` from `adversarial-content-safety-policy.js`. Final outputs from both exports are safety-checked.

## 22. Prohibited Behavior Coverage

Focused tests verify that outputs avoid final-conclusion language, settlement/protest/CTA strategy, source outsourcing, Phase 10 outsourcing, unsafe legal-judgment document requests, and privacy overreach.

## 23. Fixture Activation

The focused helper test loads `evaluation/fixtures/phase-7b-clarification-scaffold-1-decision-policy.fixture.json` and activates every fixture case against `assessClarificationNeed`.

## 24. Test Coverage

The focused test validates export shape, output shape, fixture decisions, enum values, posture values, caps, audit priority, source limitation, Phase 10 deferrals, document request safety, aggregator-only behavior, privacy, safety gate success, prohibited phrases, and no prompt/route integration.

## 25. Validation Commands Run

- `git status --short --branch`
- `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD`
- `git log --oneline -5`
- `node tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs`
- `node tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs`
- Required focused Phase 7B, Phase 7A, PATCH-06F, and PATCH-019A regression commands
- `npm test`
- `npm run guard:files`

## 26. Validation Results

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync before work confirmed: `0 0`
- Latest history confirmed through `8f7e27f PATCH-07B-CLARIFICATION-SCAFFOLD-1 add clarification decision fixture`
- New focused helper test: 12 passed, 0 failed
- Clarification scaffold test: 13 passed, 0 failed
- Required focused regressions: passed
- `npm test`: 10 syntax checks, 105 suites, 0 failures
- `npm run guard:files`: passed

## 27. Known Untracked / Deferred Files Status

Known untracked/deferred files remained untouched and uncommitted: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`.

## 28. Gate Decision

PASS WITH RECOMMENDATIONS.

Reason: the narrow clarification helper is implemented and validated, but Gemini Review 11 is required before any composition gate or live integration.

## 29. Residual Risks

This patch does not prove live route behavior, live prompt behavior, response generation behavior, source currentness, hierarchy resolution, source metadata governance, document-aware advisory, settlement/protest workflows, CTA workflows, or later-phase functionality.

## 30. Gemini Review Requirement

PATCH-07B-GEMINI-REVIEW-11 is required to review `clarification-boundary-policy.js` and focused tests before proceeding.

## 31. Recommended Next Task

PATCH-07B-GEMINI-REVIEW-11 - Narrow Clarification Boundary Policy Helper Review.

Reviewer: Gemini.

## 32. Final Recommendation

Proceed to Gemini Review 11. Do not proceed directly to route integration, prompt integration, response generation changes, or Phase 8/9/10/11 work.
