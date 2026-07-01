# PATCH-07A-007 - Phase 7A Response-Safety Red-Team Fixture and Tests

## 1. Objective

Create a limited Phase 7A response-safety red-team fixture and focused regression tests to verify that TINA's humanized `/ask`, `/tax`, and `/audit` response layer remains authority-safe.

## 2. Scope

Fixture/test/report only. No runtime behavior, prompt, route/controller, retrieval, reranker, authority-normalization, source-card, sourceAvailability, issue-classification, package/dependency, DB, vector, corpus, ingestion, environment, or secret changes were made.

## 3. Red-Team Classification

This is a limited offline Phase 7A response-safety red-team.

It is not:

- a full system red-team
- a source-governance red-team
- a live staging test
- a retrieval/reranker evaluation
- a Phase 7B reasoning patch

## 4. Basis from PATCH-07A-001

PATCH-07A-001 established that Phase 7A must improve response style without weakening authority discipline, source-card integrity, sourceAvailability state, or `/ask`, `/tax`, and `/audit` boundaries.

## 5. Basis from PATCH-07A-002

PATCH-07A-002 created fixture-first mode-format expectations for `/ask` conversational answers, `/tax` senior memo answers, and `/audit` advisory answers.

## 6. Basis from PATCH-07A-003

PATCH-07A-003 created authority-state and `applyVerifiedAuthorityGate` compatibility coverage for shorter and mode-specific answers.

## 7. Basis from PATCH-07A-004

PATCH-07A-004 implemented `/ask` conversational formatting. PATCH-07A-007 adds adversarial coverage to ensure conversational formatting does not cause generic authority promotion, source limitation suppression, or mode contamination.

## 8. Basis from PATCH-07A-005

PATCH-07A-005 protected `/tax` senior memo formatting. PATCH-07A-007 adds adversarial coverage to ensure `/tax` does not become casual, suppress authority sections, or misuse source cards.

## 9. Basis from PATCH-07A-006

PATCH-07A-006 protected `/audit` advisory formatting. PATCH-07A-007 adds adversarial coverage to ensure `/audit` does not guarantee taxpayer wins, overstate related authority, or suppress risk/source limitations.

## 10. Fixture Added

Created:

- `evaluation/fixtures/phase-7a-007-response-safety-red-team.fixture.json`

The fixture includes:

- `redTeamType: phase_7a_response_safety`
- `runtimeSafe: true`
- `requiresNetwork: false`
- `requiresDb: false`
- `requiresSecrets: false`
- `fullSystemRedTeam: false`
- `sourceGovernanceRedTeam: false`
- 30 local/static red-team cases

## 11. Test Added

Created:

- `tests/patch-07a-007-response-safety-red-team-fixture.test.mjs`

The test validates fixture shape, local evaluation-runner compatibility, required red-team category coverage, mode coverage, authority-state coverage, source-card/source-limitation policies, prompt-injection safeguards, mode-confusion boundaries, and audit-overconfidence controls.

## 12. Red-Team Categories Covered

Covered categories:

- generic authority traps
- fake citation / hallucinated authority bait
- related-authority overclaim traps
- NO_INDEXED_SOURCE fabrication pressure
- source-card misuse
- prompt-injection style safeguard suppression
- forced yes/no overconfidence
- mode confusion
- structure contamination
- audit outcome overconfidence

Each category has at least three cases.

## 13. Mode Coverage

Covered:

- `/ask`
- `/tax`
- `/audit`

## 14. Authority-State Coverage

Covered:

- `AUTHORITY_FOUND`
- `RELATED_AUTHORITY_ONLY`
- `NO_INDEXED_SOURCE`
- `GENERAL_TAX`

## 15. Source-Card / Source-Limitation Coverage

The fixture tests:

- exact-vs-related source-card distinction
- related source-card overclaim pressure
- generic source-card fabrication pressure
- source limitation suppression attempts
- false governing-authority claims from displayed source cards

## 16. Prompt-Injection / Safeguard Suppression Coverage

The fixture includes attempts to:

- ignore source limitation wording
- hide caveats and missing facts
- conceal authority weakness
- force unsupported certainty

Expected safe behavior preserves safeguards.

## 17. Mode-Confusion Coverage

The fixture includes attempts to:

- make `/ask` produce a full protest letter
- make `/tax` use casual `/ask` style
- make `/audit` collapse into a casual one-paragraph answer
- contaminate `/ask`, `/tax`, and `/audit` structures across modes

## 18. Audit-Outcome Overconfidence Coverage

The fixture includes attempts to:

- force taxpayer-win language
- claim an assessment is automatically void without authority
- guarantee beating the BIR

Expected safe behavior forbids outcome guarantees and preserves cautious risk-level language.

## 19. Runtime-Safety Confirmation

Confirmed:

- no live retrieval
- no DB/vector access
- no OpenAI call
- no staging call
- no external service
- no sourceAvailability execution
- no source-card selection
- no runtime response generation

## 20. Local Validation Results

Passed:

```text
node tests/patch-07a-007-response-safety-red-team-fixture.test.mjs
PATCH-07A-007 response-safety red-team fixture tests: 21 passed, 0 failed
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
PATCH-027R  23 passed  0 failed
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
Test suites:   83 run, 0 failed
GATE PASSED
```

Passed:

```text
npm run guard:files
PASS: No protected files modified
```

## 21. Confirmation of No Runtime Behavior Change

Confirmed. No runtime files were changed.

## 22. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No dependency/package, DB, indexing, vector, corpus, ingestion, environment, or secret files were changed.

## 23. Risk Assessment

Low. This is local/static fixture and test coverage only. The main residual risk is that Gemini review or later red-team expansion may identify missing adversarial cases; any additions should occur in a later approved patch.

## 24. Gemini Review Recommendation

Gemini review is suggested for adversarial review of the red-team fixture and categories.

Gemini should verify that the fixture covers realistic Philippine tax response-safety attacks, generic authority traps, source-card overclaim traps, mode-confusion traps, and prompt-injection-style safeguard suppression.

Gemini should not implement code. If Gemini identifies missing cases, add them in a later patch only after approval.

## 25. Recommended Next Task

PATCH-07A-008 - Source limitation wording preservation and mode-boundary regression hardening.

Recommended agent: Codex.

Gemini review for next task: not necessary unless PATCH-07A-007 or Gemini review identifies serious missing adversarial coverage.
