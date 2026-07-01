# PATCH-07A-006 - /audit Advisory Formatting Protection

## 1. Objective

Protect and formalize `/audit` advisory response formatting after PATCH-07A-004 introduced lighter `/ask` formatting and PATCH-07A-005 protected `/tax` senior memo formatting.

## 2. Scope

This patch is limited to Phase 7A response formatting protection and audit prompt guidance. It does not introduce Phase 7B reasoning, BIR controversy strategy engines, authority conflict resolution, applicability engines, audit-defense engines, settlement engines, retrieval changes, reranker changes, sourceAvailability changes, or source-card behavior changes.

## 3. Basis from PATCH-07A-001

PATCH-07A-001 identified `answer-renderer.js` as the formatting-only layer and confirmed that `/ask`, `/tax`, and `/audit` must remain separate response modes.

## 4. Basis from PATCH-07A-002

PATCH-07A-002 fixture expectations require `/audit` to use professional advisory sections:

```text
Quick assessment
BIR likely position
Taxpayer position / defenses
Documentary support
Procedural issues
Risk level
Recommended action
Sources / Source Cards
```

## 5. Basis from PATCH-07A-003

PATCH-07A-003 confirmed that authority-state policy and `applyVerifiedAuthorityGate` must remain compatible with mode-specific answer formats, including `/audit` advisory answers.

## 6. Basis from PATCH-07A-004

PATCH-07A-004 added `/ask`-only conversational formatting. PATCH-07A-006 confirms `/audit` does not inherit that lighter structure.

## 7. Basis from PATCH-07A-005

PATCH-07A-005 formalized `/tax` senior memo headings. PATCH-07A-006 confirms `/audit` does not inherit the `/tax` A-F senior memo structure.

## 8. Runtime Files Changed

- `answer-renderer.js`

Renderer changes are formatting-only. No retrieval, reranker, sourceAvailability, source-card, OpenAI, or prompt assembly behavior was added.

## 9. Prompt Files Changed or Reviewed

Changed:

- `prompts/audit-mode-prompt.js`

Reviewed:

- `prompts/tax-mode-prompt.js`

The audit prompt remains prompt-only guidance. It reinforces advisory structure, authority discipline, source limitation preservation, and no outcome guarantees.

## 10. /audit Advisory Protection

`answer-renderer.js` now defines `AUDIT_ADVISORY_HEADINGS` and uses those headings for `/audit` route metadata:

```text
1. Quick Assessment
2. BIR Likely Position
3. Taxpayer Position / Defenses
4. Documentary Support Needed
5. Procedural Issues
6. Risk Level
7. Recommended Action
8. Sources / Source Cards
```

Legacy audit headings are normalized into the Phase 7A `/audit` advisory structure, including older A-G audit labels such as `A. DIRECT ANSWER`, `E. AUDIT RISK / MISSTATEMENT RISK`, and `G. RECOMMENDED AUDIT POSITION`.

## 11. /ask Isolation Confirmation

PATCH-07A-004 `/ask` conversational formatting remains route-gated to `/ask`. Focused tests confirm `/ask` still uses the lighter conversational structure and does not receive audit advisory headings.

## 12. /tax Isolation Confirmation

PATCH-07A-005 `/tax` senior memo formatting remains route-gated to `/tax`. Focused tests confirm `/tax` keeps the senior memo A-F structure and does not receive audit advisory headings.

## 13. Authority-State Safety

Focused tests confirm `/audit` preserves:

- `AUTHORITY_FOUND` compatibility through `applyVerifiedAuthorityGate`
- `RELATED_AUTHORITY_ONLY` caution
- `NO_INDEXED_SOURCE` non-fabrication/source unavailable treatment
- source limitation disclosure wording
- no unsupported taxpayer-win conclusion

## 14. Source Limitation / applyVerifiedAuthorityGate Safety

The sourceAvailability disclosure layer remains downstream of formatting and unchanged. The PATCH-019A regression suite passed, and the focused PATCH-07A-006 test confirms `applyVerifiedAuthorityGate` compatibility with audit advisory text.

## 15. Test Added

- `tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs`

Updated:

- `tests/patch-07a-004-ask-conversational-formatting.test.mjs`
- `tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs`

The older tests now assert the formalized audit advisory headings.

## 16. Validation Results

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
PATCH-06F-005 exact source limitation wording tests: 10 passed, 0 failed
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
Test suites:   82 run, 0 failed
GATE PASSED
```

Guard result:

```text
npm run guard:files
FAIL: protected files modified:
  [M] answer-renderer.js
```

This guard result is expected for this patch because `answer-renderer.js` is an explicitly authorized primary implementation target for PATCH-07A-006. No other protected runtime, secret, environment, package, dependency, retrieval, reranker, sourceAvailability, source-card, DB/indexing/RAG/vector/corpus, or ingestion files were modified.

## 17. Confirmation of No Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. This patch did not modify retrieval, reranker, sourceAvailability, source-card, issue-classification, pipeline, or source-governance behavior.

## 18. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, DB, indexing, vector, corpus, ingestion, environment, or secret files were changed.

## 19. Risk Assessment

Risk is moderate because `answer-renderer.js` is runtime formatting code and `prompts/audit-mode-prompt.js` is live prompt guidance. The risk is constrained by route/hook gating, focused `/audit`, `/ask`, and `/tax` tests, and the full regression gate.

## 20. Recommended Next Task

PATCH-07A-007 - Phase 7A response-safety red-team fixture and tests.

Recommended agent: Codex.

Gemini review for next task: suggested, because the limited red-team will assess response-layer safety risks such as mode confusion, source discipline, related-authority overclaiming, no-indexed-source fabrication, and prompt-injection style instructions.

This is a limited Phase 7A red-team, not a full system red-team.

## 21. Gemini Review Recommendation

Gemini review is not necessary because this patch stayed limited to `/audit` formatting protection and prompt guidance.

Gemini review becomes suggested only if substantive audit-defense reasoning, BIR controversy strategy, authority-conflict handling, or Phase 7B logic is introduced. This patch did not introduce those items.
