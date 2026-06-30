# PATCH-07A-003 - Authority-State Response Policy and Gate Compatibility Tests

## 1. Objective

Add focused test-only compatibility coverage proving that Phase 7A shorter `/ask` conversational responses remain compatible with authority-state discipline, source limitation wording, exact-vs-related authority handling, NO_INDEXED_SOURCE non-fabrication, generic guard discipline, and `applyVerifiedAuthorityGate` behavior before runtime formatting changes begin.

## 2. Scope

Test/fixture-only patch. No runtime response formatting, prompt, answer-renderer, route/controller, retrieval, reranker, authority-normalization, source-card, sourceAvailability, issue-classification, DB, vector, corpus, ingestion, package, dependency, environment, or external-tool changes were made.

## 3. Basis from PATCH-07A-001

PATCH-07A-001 established that:

- `/ask` should move toward a lighter conversational structure.
- `/tax` should preserve the A-F senior memo format.
- `/audit` should preserve professional audit advisory structure.
- `context-orchestration-engine.js` should later receive explicit authority-state policy instructions.
- `applyVerifiedAuthorityGate` compatibility with short `/ask` responses must be assessed before PATCH-07A-004 runtime work.

## 4. Basis from PATCH-07A-002

PATCH-07A-002 added fixture-first human response mode-format coverage for:

- `/ask` conversational format.
- `/tax` senior memo format.
- `/audit` advisory format.
- `AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE`, and `GENERAL_TAX`.
- source limitation policy.
- generic-query non-promotion.
- mode escalation.

## 5. applyVerifiedAuthorityGate Investigation

Located `applyVerifiedAuthorityGate` in `answer-renderer.js`.

Existing tests already import it safely in:

```text
tests/patch-019a-regression.test.mjs
```

Input shape:

```text
answer
saeStatus
finalSourceCards
pipelineSourceCards
eligibleCandidates
preGenerationSourceCards
lockedAuthorities
vatFastDefinitionPreserved
ewtFastPathPreserved
mode
route
```

Observed behavior from implementation and tests:

- `AUTHORITY_FOUND`: citation-bearing lines are preserved only if every citation is verified by source-card/locked-authority inputs or preservation contracts.
- `RELATED_AUTHORITY_ONLY`: controlling/governing/primary authority headings are relabeled to related/supporting authority headings.
- `NO_INDEXED_SOURCE` and other unsafe states: citation-bearing lines and authority sections are suppressed.
- The gate is text-only. It does not retrieve, rerank, query DB/vector store, call OpenAI, classify the query, or change SAE state.
- Generic-query non-promotion must still be enforced before/around generation; the gate is not a generic-query classifier.

Import was safe for representative local assertions in this patch.

## 6. Fixture Added

Created:

```text
evaluation/fixtures/phase-7a-003-authority-state-response-policy.fixture.json
```

The fixture defines compatibility expectations for short `/ask`, `/tax`, and `/audit` answer shapes across authority states and source-card/source-limitation policies.

## 7. Test Added

Created:

```text
tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs
```

The test validates fixture structure and runs representative local `applyVerifiedAuthorityGate` assertions without live services.

## 8. Authority-State Coverage

Covered:

- `AUTHORITY_FOUND`
- `RELATED_AUTHORITY_ONLY`
- `NO_INDEXED_SOURCE`
- `GENERAL_TAX`

## 9. Mode Coverage

Covered:

- `/ask`
- `/tax`
- `/audit`

## 10. Short /ask Compatibility Findings

Representative local gate assertions confirm:

- short `/ask` `AUTHORITY_FOUND` answers preserve verified citations;
- short `/ask` `RELATED_AUTHORITY_ONLY` answers can retain related citations while relabeling controlling headings;
- short `/ask` `NO_INDEXED_SOURCE` answers suppress citation leakage;
- unverified citations are blocked even when `saeStatus` is `AUTHORITY_FOUND`.

## 11. RELATED_AUTHORITY_ONLY Policy Coverage

Fixture and tests require:

- caution/source limitation policy;
- no "the governing authority is" phrasing when only related authority exists;
- related/supporting source-card treatment;
- no controlling/primary authority heading survival.

## 12. NO_INDEXED_SOURCE Policy Coverage

Fixture and tests require:

- non-fabrication;
- source unavailable/no indexed source disclosure;
- no invented authority, deadline, source card, or citation;
- general orientation only if safe.

## 13. Generic Guard Coverage

The fixture locks non-promotion policy for:

```text
tax law
BIR issuance
court case
VAT case
withholding tax case
explain EWT
what is withholding tax
```

The report notes that `applyVerifiedAuthorityGate` is not a generic-query classifier, so generic guard discipline must remain a response-policy/generation/input-state requirement.

## 14. Runtime-Safety Confirmation

Confirmed:

- `runtimeSafe: true`
- `requiresNetwork: false`
- `requiresDb: false`
- `requiresSecrets: false`
- no live retrieval
- no DB/vector query
- no OpenAI/staging/external service call
- no runtime file edits

## 15. Local Validation Results

Passed:

- `node tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs`
- `node tests/patch-07a-002-human-response-mode-format-fixtures.test.mjs`
- `node tests/patch-06f-005-exact-source-limitation-wording.test.mjs`
- `node tests/patch-06f-006-mode-format-evaluation.test.mjs`
- `node tests/patch-019a-regression.test.mjs`
- `npm test` - PASS, 10 syntax checks and 79 test suites, 0 failed
- `npm run guard:files` - PASS, no protected files modified

## 16. Confirmation of No Runtime Behavior Change

Confirmed. No runtime files were edited.

## 17. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency files, DB/indexing/RAG/vector/corpus/ingestion files, environment files, or secrets were edited.

## 18. Risk Assessment

Low. This patch adds local/static compatibility fixtures and tests only. The key remaining implementation risk for PATCH-07A-004 is that lighter `/ask` formatting must preserve the authority-state and source-limitation constraints now documented and tested here.

## 19. Recommended Next Task

```text
PATCH-07A-004 - /ask conversational formatting implementation
```

Reason: After Phase 7A architecture review, mode-format fixtures, and authority-state gate compatibility tests are complete, the first safe runtime implementation is the lighter `/ask` response formatting in `answer-renderer.js`. `/tax` formatting and `prompts/tax-mode-prompt.js` should remain deferred until PATCH-07A-005.
