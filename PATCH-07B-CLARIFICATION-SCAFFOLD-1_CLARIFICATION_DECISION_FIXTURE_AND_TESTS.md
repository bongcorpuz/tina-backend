# PATCH-07B-CLARIFICATION-SCAFFOLD-1 - Clarification Decision Fixture and Tests

## 1. Objective

Create the fixture and test scaffold for future clarification decision logic before any runtime helper is implemented.

## 2. Scope

This patch adds a clarification decision fixture, scaffold tests, and this report only. It does not add `clarification-boundary-policy.js`, `assessClarificationNeed`, `buildClarificationChecklist`, route wiring, prompt wiring, live clarification behavior, a production orchestrator, response-generation changes, or later phase work.

## 3. Gemini Review 10 Carry-Forward

Gemini Review 10 is carried forward as PASS WITH STRICT RECOMMENDATIONS. This scaffold preserves the recommendation to define decision taxonomy and boundary tests before any runtime implementation.

## 4. Claude Clarification Design Carry-Forward

PATCH-07B-CLARIFICATION-GATE-1 is carried forward as the design source for live clarification boundaries. The scaffold keeps clarification design separate from live integration and treats the future helper as an aggregator over existing Phase 7B outputs.

## 5. Files Added

- `evaluation/fixtures/phase-7b-clarification-scaffold-1-decision-policy.fixture.json`
- `tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs`
- `PATCH-07B-CLARIFICATION-SCAFFOLD-1_CLARIFICATION_DECISION_FIXTURE_AND_TESTS.md`

## 6. Fixture Summary

The fixture defines expected future clarification decision behavior, metadata, enums, output shape, safe document request examples, unsafe legal-judgment examples, question caps, priority ordering, and twenty representative cases.

## 7. Decision Taxonomy Covered

The fixture covers `ASK_BEFORE_ANSWERING`, `ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP`, `REQUEST_DOCUMENTS`, `DISCLOSE_SOURCE_LIMITATION`, `DISCLOSE_PHASE10_DEFERRAL`, and `ANSWER_NOW_NO_CLARIFICATION_NEEDED`.

## 8. Output Shape Covered

Each case encodes `clarificationDecision`, `clarificationReason`, `shouldAskBeforeAnswer`, `questions`, `documentRequests`, `sourceCoverageLimitations`, `phase10Deferrals`, `answerAllowed`, `allowedAnswerPosture`, `prohibitedConclusions`, `canReachFinalConclusion: false`, and `implementationScope: CLARIFICATION_BOUNDARY_POLICY_ONLY`.

## 9. Missing User Fact Boundary Coverage

The fixture separates critical missing facts from helpful-only facts. Critical facts can block specific answers, while helpful-only facts allow cautious answers with follow-up.

## 10. Missing Document Boundary Coverage

Document gaps produce factual document requests. The fixture explicitly allows requests such as Form 2307, service invoice, LOA/PAN/FAN/FDDA, and reconciliation schedule, while prohibiting legal-judgment wording.

## 11. Source Coverage Boundary Coverage

`NO_INDEXED_SOURCE` and related source coverage cases disclose source limitations and do not ask the user to identify the law, find regulations, search BIR, or determine governing authority.

## 12. Authority Applicability Boundary Coverage

The fixture permits limited applicability fact questions while preserving authority-state boundaries. Related authority cannot become exact authority support or a conclusive authority claim.

## 13. Audit Procedural Boundary Coverage

Audit cases prioritize LOA, PAN, FAN, FDDA, stage, notice date, deadline, and taxable-period facts before substantive or document questions.

## 14. Mode-Specific Boundary Coverage

`/ask`, `/tax`, and `/audit` cases each preserve their mode boundaries. The fixture avoids `/ask` promotion, `/tax` final conclusion drift, and `/audit` strategy or outcome drift.

## 15. Over-Questioning Cap Coverage

Question caps are encoded as `/ask` <= 3, `/tax` <= 7 unless grouped as a checklist, and `/audit` <= 10. The test validates those caps.

## 16. Clarification vs Cautious Answer Coverage

The fixture distinguishes when TINA should ask before answering, answer cautiously and ask a follow-up, request documents, disclose source limitations, disclose Phase 10 deferrals, or answer without clarification.

## 17. Phase 10 Boundary Coverage

Phase 10 currentness, supersession, hierarchy, ruling/case status, and official-source metadata issues are disclosed as deferrals. The fixture prohibits asking users to resolve those matters.

## 18. Privacy / Security Boundary Coverage

The privacy/security case asks for safe categories such as taxable year, tax type, transaction character, document status, and procedural stage, while prohibiting unnecessary TIN, full address, bank account, and personal identifier requests.

## 19. Future Helper Naming Coverage

The fixture encodes the future helper file as `clarification-boundary-policy.js`, with `assessClarificationNeed` and `buildClarificationChecklist`. It explicitly prohibits `buildClarificationPrompt`.

## 20. Aggregator-Only Boundary Coverage

The fixture states that the future helper consumes existing helper outputs only: critical missing facts, helpful missing facts, document gaps, source coverage needs, missing and required applicability facts, Phase 10 flags, and audit procedural facts. It does not create a new detector taxonomy.

## 21. Route / Prompt / Live Integration Non-Implementation

No live route, prompt, production orchestrator, response generation, or live clarification integration was implemented.

## 22. Prohibited Behavior Coverage

The scaffold prohibits final-conclusion language, settlement/protest/CTA strategy, source outsourcing, Phase 10 outsourcing, unsafe document requests, legal-judgment questions, privacy overreach, and prompt-builder naming.

## 23. Test Coverage

The focused test validates fixture metadata, enums, case shape, expected output shape, prohibited text, safe and unsafe document examples, mode caps, audit procedural ordering, source limitations, Phase 10 deferrals, privacy/security boundaries, future helper naming, aggregator-only boundaries, and no integration flags.

## 24. Validation Commands Run

- `git status --short --branch`
- `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD`
- `git log --oneline -20`
- `node tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs`
- Required focused Phase 7B, Phase 7A, PATCH-06F, and PATCH-019A regression commands
- `npm test`
- `npm run guard:files`

## 25. Validation Results

- Branch confirmed: `feature/source-availability-engine-v1`
- Remote sync before work confirmed: `0 0`
- Latest history confirmed through `36309c5 PATCH-07B-AUDIT-RISK-FINAL-GATE-1 close audit risk workstream`
- New focused scaffold test: 13 passed, 0 failed
- Required focused regressions: passed
- `npm test`: passed
- `npm run guard:files`: passed

## 26. Known Untracked / Deferred Files Status

Known untracked files remained untouched and uncommitted: `.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, and `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`.

## 27. Gate Decision

PASS WITH RECOMMENDATIONS.

Reason: the scaffold defines clarification decisions and validates policy expectations, but runtime helper implementation still requires a separate patch.

## 28. Residual Risks

This patch does not prove runtime helper behavior, live route behavior, live prompt behavior, response generation behavior, retrieval quality, source metadata currentness, source governance, settlement/protest workflows, CTA workflows, or later phase functionality.

## 29. Recommended Next Task

PATCH-07B-CLARIFICATION-HELPER-1 - Narrow Clarification Boundary Policy Helper.

## 30. Gemini Review Requirement

Gemini Review 11 is required after helper implementation. Do not proceed directly to route or prompt integration after this scaffold.

## 31. Final Recommendation

Proceed to a narrow runtime helper implementation patch using the approved scaffold. Do not implement route/prompt integration, live clarification behavior, settlement/protest runtime, CTA strategy runtime, or Phase 8/9/10/11/12 work in the next patch.
