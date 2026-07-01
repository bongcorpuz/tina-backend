# PATCH-07A-008 - Source Limitation Wording and Mode-Boundary Regression Hardening

## 1. Objective

Harden Phase 7A regression coverage for source limitation wording preservation and mode-boundary preservation across `/ask`, `/tax`, and `/audit`.

## 2. Scope

Fixture/test/report only. No runtime behavior, prompt, route/controller, retrieval, reranker, authority-normalization, source-card, sourceAvailability, issue-classification, package/dependency, DB, vector, corpus, ingestion, environment, or secret changes were made.

## 3. Basis from PATCH-07A-001

PATCH-07A-001 established that Phase 7A response improvements must preserve authority discipline, source-card integrity, sourceAvailability state, and `/ask`, `/tax`, and `/audit` boundaries.

## 4. Basis from PATCH-07A-002

PATCH-07A-002 created local/static mode-format fixtures for `/ask` conversational answers, `/tax` senior memo answers, and `/audit` advisory answers.

## 5. Basis from PATCH-07A-003

PATCH-07A-003 added authority-state response policy and `applyVerifiedAuthorityGate` compatibility coverage for `AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, and `GENERAL_TAX` states.

## 6. Basis from PATCH-07A-004

PATCH-07A-004 implemented `/ask` conversational formatting while preserving source limitation wording and preventing `/ask` from adopting `/tax` or `/audit` primary structures.

## 7. Basis from PATCH-07A-005

PATCH-07A-005 protected `/tax` senior memo formatting, including Governing Authority, Caveats / Missing Facts, and Sources / Source Cards sections.

## 8. Basis from PATCH-07A-006

PATCH-07A-006 protected `/audit` advisory formatting, risk-level language, recommended-action framing, source limitation discipline, and no-outcome-guarantee policy.

## 9. Basis from PATCH-07A-007

PATCH-07A-007 added a limited offline Phase 7A response-safety red-team fixture for adversarial response-safety coverage.

## 10. Basis from PATCH-07A-007R and Gemini Review

PATCH-07A-007R expanded the red-team fixture from 30 to 53 cases after Gemini PASS WITH RECOMMENDATIONS review. PATCH-07A-008 builds on that expansion with a narrower regression-hardening fixture focused on source limitation wording and mode-boundary preservation.

## 11. Fixture Added

Created:

- `evaluation/fixtures/phase-7a-008-source-limitation-mode-boundary-hardening.fixture.json`

The fixture includes 28 local/static hardening cases across `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, source-card authority status, `/ask`, `/tax`, `/audit`, safeguard suppression, and cross-mode contamination.

## 12. Test Added

Created:

- `tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs`

The test validates fixture shape, runtime-safety metadata, category coverage, mode coverage, authority-state coverage, source-card policy, source limitation policy, safeguard suppression policy, cross-mode contamination policy, and pure renderer heading boundaries.

## 13. RELATED_AUTHORITY_ONLY Wording Preservation

Covered `/ask`, `/tax`, and `/audit` cases where related authority must remain related/supporting only and must not become governing, controlling, or outcome-determinative.

## 14. NO_INDEXED_SOURCE Wording Preservation

Covered `/ask`, `/tax`, and `/audit` cases where no indexed source must remain disclosed, with no fabricated source, invented citation, or implied live source acquisition.

## 15. Source-Card Authority Status Preservation

Covered exact, related, and no-source card states. The fixture confirms that source-card display does not override sourceAvailability and that cards cannot be promoted beyond their authority state.

## 16. /ask Mode-Boundary Hardening

Covered `/ask` pressure to adopt `/tax` A-F structure, produce audit defense structure, or remove source limitation from short conversational answers.

## 17. /tax Mode-Boundary Hardening

Covered `/tax` senior memo preservation, resistance to casual `/ask` style, and resistance to audit advisory matrix contamination.

## 18. /audit Mode-Boundary Hardening

Covered `/audit` advisory preservation, resistance to `/tax` A-F memo contamination, resistance to casual `/ask` collapse, and no guaranteed taxpayer victory.

## 19. Safeguard Suppression Coverage

Covered direct user instructions to remove `/ask` limitations, remove `/tax` caveats/missing facts, and hide `/audit` authority weakness.

## 20. Cross-Mode Contamination Coverage

Covered `/ask` requesting `/tax`, `/tax` requesting `/ask`, `/audit` requesting `/tax`, `/tax` requesting audit defense sections, and `/audit` requesting one casual paragraph.

## 21. Runtime-Safety Confirmation

Confirmed. PATCH-07A-008 is local/static fixture and test hardening only. It does not call live retrieval, DB/vector store, OpenAI, staging, external services, sourceAvailability execution, source-card selection, or runtime response generation beyond pure local renderer formatting helpers already used by prior Phase 7A tests.

## 22. Local Validation Results

Passed:

```text
node tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs
PATCH-07A-008 source limitation and mode-boundary hardening tests: 23 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-007-response-safety-red-team-fixture.test.mjs
PATCH-07A-007 response-safety red-team fixture tests: 23 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs
PATCH-07A-006 audit advisory formatting protection tests: 19 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs
PATCH-07A-005 tax senior memo formatting protection tests: 16 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-004-ask-conversational-formatting.test.mjs
PATCH-07A-004 ask conversational formatting tests: 10 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs
PATCH-07A-003 authority-state response policy and gate compatibility tests: 18 passed, 0 failed
```

Passed:

```text
node tests/patch-07a-002-human-response-mode-format-fixtures.test.mjs
PATCH-07A-002 human response mode-format fixture tests: 16 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
PATCH-06F-005 exact-source limitation wording tests: 10 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-006-mode-format-evaluation.test.mjs
PATCH-06F-006 mode-format evaluation tests: 12 passed, 0 failed
```

Passed:

```text
node tests/patch-019a-regression.test.mjs
PATCH-019A Regression: 87 passed, 0 failed
```

Passed:

```text
node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
PATCH-06F-002 authority/source-card regression suite tests: 8 passed, 0 failed
```

Passed:

```text
node tests/patch-027r-source-card-field-preservation.test.mjs
PATCH-027R 23 passed, 0 failed
```

Passed:

```text
node tests/patch-023b-source-card-url-and-label.test.mjs
PATCH-023B Source Card URL + Label: 27 passed, 0 failed
```

Passed:

```text
node tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
PATCH-06E-010 unavailable BIR Ruling guard tests: 5 passed, 0 failed
```

Passed:

```text
npm test
Syntax checks: 10 run, 0 failed
Test suites: 84 run, 0 failed
GATE PASSED
```

Passed:

```text
npm run guard:files
PASS: No protected files modified
```

## 23. Runtime Files Changed, if any

None.

## 24. Confirmation of No Retrieval / Reranker / Authority-Normalization / SourceAvailability / Source-Card Behavior Change

Confirmed. No retrieval, reranker, authority-normalization, sourceAvailability, source-card behavior, route/controller, prompt, answer-renderer, ask-handler, context orchestration, or rag-answer-handler files were changed.

## 25. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, DB, indexing, vector, corpus, ingestion, environment, or secret files were changed.

## 26. Risk Assessment

Low. This is fixture/test/report-only hardening. The main residual risk is that future response generation could still produce unsafe wording if later prompt/runtime work weakens policy; the new fixture and focused test are designed to catch that regression layer before Phase 7A gate closure.

## 27. Gemini Review Recommendation

Gemini review is not necessary because PATCH-07A-008 stayed within source limitation/mode-boundary regression hardening and did not introduce new adversarial categories or substantive legal/tax reasoning.

## 28. Recommended Next Task

PATCH-07A-GATE-1 - Phase 7A Stabilization Gate.

Recommended agent: Codex.

Gemini review for next task: Suggested only if PATCH-07A-008 finds unresolved risk or if final gate wants adversarial review confirmation. Otherwise not necessary.
