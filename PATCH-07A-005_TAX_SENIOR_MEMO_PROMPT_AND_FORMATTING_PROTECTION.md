# PATCH-07A-005 - /tax Senior Memo Prompt and Formatting Protection

## 1. Objective

Protect and formalize `/tax` senior memo response formatting after PATCH-07A-004 introduced lighter `/ask` conversational formatting.

## 2. Scope

This patch is limited to Phase 7A response format protection and prompt guidance. It does not introduce Phase 7B reasoning, authority conflict resolution, applicability engines, audit-defense engines, retrieval changes, reranker changes, sourceAvailability changes, or source-card behavior changes.

## 3. Basis from PATCH-07A-001

PATCH-07A-001 identified `answer-renderer.js` as the formatting-only target and confirmed that `/tax` should preserve senior tax memo structure while `/ask` becomes lighter and more conversational.

## 4. Basis from PATCH-07A-002

PATCH-07A-002 established fixture expectations for `/tax`:

```text
A. Short Answer / Conclusion
B. Governing Authority
C. Analysis
D. Compliance Effect
E. Caveats / Missing Facts
F. Sources / Source Cards
```

## 5. Basis from PATCH-07A-003

PATCH-07A-003 confirmed that authority-state discipline and `applyVerifiedAuthorityGate` must remain compatible with shorter and mode-specific answer formats, including `/tax` senior memo answers.

## 6. Basis from PATCH-07A-004

PATCH-07A-004 added `/ask`-only conversational formatting. PATCH-07A-005 protects `/tax` from inheriting that lighter `/ask` structure.

## 7. Runtime Files Changed

- `answer-renderer.js`

Renderer changes are formatting-only. No retrieval, reranker, sourceAvailability, source-card, OpenAI, or prompt assembly behavior was added.

## 8. Prompt Files Changed or Created

Created:

- `prompts/tax-mode-prompt.js`

The prompt module is guidance-only and exports:

- `TAX_SENIOR_MEMO_SECTIONS`
- `buildTaxSystemPrompt`
- `taxPromptHealthCheck`

It was not wired into `context-orchestration-engine.js` in this patch to avoid broad prompt-orchestration changes.

## 9. /tax Senior Memo Protection

`answer-renderer.js` now defines `TAX_SENIOR_MEMO_HEADINGS` and uses those headings for `/tax` route metadata, including cases where the input mode would otherwise look like `FAST_DEFINITION`.

Legacy A-F legal headings are normalized into the Phase 7A `/tax` senior memo structure:

```text
A. DIRECT ANSWER -> A. Short Answer / Conclusion
B. CONTROLLING LEGAL BASIS -> B. Governing Authority
C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES -> C. Analysis
D. SUPPORTING JURISPRUDENCE -> D. Compliance Effect
E. DOCTRINAL STATUS / CONFLICT ANALYSIS -> E. Caveats / Missing Facts
F. PRACTICAL NOTE / APPLICATION -> F. Sources / Source Cards
```

## 10. /ask Isolation Confirmation

PATCH-07A-004 `/ask` conversational formatting remains route-gated to `/ask`. The focused PATCH-07A-004 test still passes and confirms `/ask` retains the lighter Direct answer, Key explanation, Practical note, and Source / authority note structure.

## 11. /audit Isolation Confirmation

`/audit` formatting remains unchanged. Focused tests confirm audit outputs keep audit/advisory headings and do not adopt `/tax` senior memo headings or `/ask` conversational headings.

## 12. Authority-State Safety

Focused tests confirm `/tax` preserves:

- `AUTHORITY_FOUND` compatibility through `applyVerifiedAuthorityGate`
- `RELATED_AUTHORITY_ONLY` caution
- `NO_INDEXED_SOURCE` non-fabrication/source unavailable treatment
- source limitation disclosure wording

## 13. Source Limitation / applyVerifiedAuthorityGate Safety

The sourceAvailability disclosure layer remains downstream of the formatting pass and unchanged. `applyVerifiedAuthorityGate` remains compatible with `/tax` senior memo text and the full PATCH-019A regression suite passed.

## 14. Test Added

- `tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs`

Updated:

- `tests/patch-07a-004-ask-conversational-formatting.test.mjs`

The PATCH-07A-004 `/tax` isolation assertion now expects senior memo headings instead of merely preserving fast-definition headings.

## 15. Validation Results

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
Test suites:   81 run, 0 failed
GATE PASSED
```

Guard result:

```text
npm run guard:files
FAIL: protected files modified:
  [M] answer-renderer.js
```

This guard result is expected for this patch because `answer-renderer.js` is an explicitly authorized primary implementation target for PATCH-07A-005. No other protected runtime, secret, environment, package, dependency, retrieval, reranker, sourceAvailability, source-card, DB/indexing/RAG/vector/corpus, or ingestion files were modified.

## 16. Confirmation of No Retrieval / Reranker / SourceAvailability / Source-Card Behavior Change

Confirmed. This patch did not modify retrieval, reranker, sourceAvailability, source-card, issue-classification, pipeline, or source-governance behavior.

## 17. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency, DB, indexing, vector, corpus, ingestion, environment, or secret files were changed.

## 18. Risk Assessment

Risk is moderate because `answer-renderer.js` is runtime formatting code. The risk is constrained by route/hook gating, focused `/tax`, `/ask`, and `/audit` tests, and the full regression gate.

## 19. Recommended Next Task

PATCH-07A-006 - `/audit` advisory formatting protection.

Recommended agent: Codex.

Gemini review for next task: not necessary unless `/audit` work expands into substantive audit-defense reasoning beyond formatting/protection.

## 20. Gemini Review Recommendation

Gemini review is not necessary because this patch stayed limited to `/tax` formatting protection and prompt guidance.

Gemini review becomes suggested only if substantive legal/tax reasoning, authority-conflict handling, or Phase 7B logic is introduced. This patch did not introduce those items.
