# PATCH-07A-002 - Human Response Mode-Format Fixtures and Regression Tests

## 1. Objective

Add Phase 7A human response mode-format fixtures and regression tests for `/ask`, `/tax`, and `/audit` before any runtime response formatting changes are implemented.

## 2. Scope

Fixture/test-only patch. No runtime response formatting, prompt, answer-renderer, route/controller, retrieval, reranker, authority-normalization, source-card, sourceAvailability, issue-classification, DB, vector, corpus, ingestion, package, dependency, environment, or external-tool changes were made.

## 3. Basis from PATCH-07A-001

PATCH-07A-001 established that:

- `answer-renderer.js` is the future formatting target, but must not be changed in this patch.
- `/ask` should move toward a lighter conversational structure.
- `/tax` should preserve the senior memo A-F structure.
- `/audit` should preserve professional audit advisory sections.
- Authority-state response policy and `applyVerifiedAuthorityGate` compatibility must be assessed in PATCH-07A-003 before runtime formatting work.
- Fixture-first discipline is required before PATCH-07A-004 implementation.

## 4. Fixture Added

Created:

```text
evaluation/fixtures/phase-7a-002-human-response-mode-format.fixture.json
```

The fixture includes top-level runtime-safety fields and local/static cases for human response structure, authority-state policy, source-card/limitation policy, generic-query non-promotion, and mode escalation.

## 5. Test Added

Created:

```text
tests/patch-07a-002-human-response-mode-format-fixtures.test.mjs
```

The test validates fixture shape, existing evaluation runner compatibility, runtime safety, mode coverage, authority-state coverage, `/ask` conversational expectations, `/tax` A-F memo expectations, `/audit` advisory expectations, source limitation policy, generic guard non-promotion, and pending-only runtime assertions.

## 6. /ask Cases Covered

Covered `/ask` conversational examples include:

- `/ask What is withholding tax?`
- `/ask Explain EWT in simple terms`
- `/ask What is VAT zero-rating?`
- `/ask Any authority or revenue regulation about NOLCO?`
- `/ask What is RR 2-98?`

The fixture expects short direct-answer structures and forbids default full A-F senior memo formatting for simple `/ask` questions.

## 7. /tax Cases Covered

Covered `/tax` senior memo examples include:

- `/tax NIRC Sec. 57 withholding tax obligation`
- `/tax RR 2-98 expanded withholding tax`
- `/tax PEZA VAT treatment`
- `/tax NOLCO under income tax rules`
- `/tax compare TRAIN and CREATE treatment if relevant`

The fixture preserves:

```text
A. Short Answer / Conclusion
B. Governing Authority
C. Analysis
D. Compliance Effect
E. Caveats / Missing Facts
F. Sources / Source Cards
```

## 8. /audit Cases Covered

Covered `/audit` advisory examples include:

- `/audit LOA validity issue`
- `/audit PAN/FAN mismatch`
- `/audit EWT deficiency with CWT support`
- `/audit input VAT invoice mismatch`
- `/audit subpoena or NTPR concern`

The fixture expects:

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

## 9. Authority-State Coverage

The fixture covers:

- `AUTHORITY_FOUND`
- `RELATED_AUTHORITY_ONLY`
- `NO_INDEXED_SOURCE`
- `GENERAL_TAX`

Each limited-source state carries source-card and source-limitation policy fields.

## 10. Source-Card / Limitation Policy Coverage

The fixture distinguishes exact/governing cards from related/supporting cards and no-source cases. It requires source limitation preservation for related-only and no-indexed-source states and forbids fabricated source cards when no indexed source is available.

## 11. Generic Guard Coverage

Generic guard cases cover:

- `tax law`
- `BIR issuance`
- `court case`
- `VAT case`
- `withholding tax case`
- `explain EWT`
- `what is withholding tax`

Each generic guard case is marked non-promotable and forbids fabricated named authority.

## 12. Runtime-Safety Confirmation

Confirmed:

- `runtimeSafe: true`
- `requiresNetwork: false`
- `requiresDb: false`
- `requiresSecrets: false`
- all behavioral assertions are `future_runtime_assertion` and pending
- no live retrieval, reranking, DB/vector, OpenAI, staging, secrets, source-card selection, or sourceAvailability execution is required

## 13. Local Validation Results

Passed:

- `node tests/patch-07a-002-human-response-mode-format-fixtures.test.mjs`
- `node tests/patch-06f-006-mode-format-evaluation.test.mjs`
- `node tests/patch-06f-005-exact-source-limitation-wording.test.mjs`
- `npm test` - PASS, 10 syntax checks and 78 test suites, 0 failed
- `npm run guard:files` - PASS, no protected files modified

## 14. Confirmation of No Runtime Behavior Change

Confirmed. No runtime files were edited.

## 15. Confirmation of No Dependency / Package / DB / Indexing / Vector / Corpus / Ingestion Changes

Confirmed. No package/dependency files, DB/indexing/RAG/vector/corpus/ingestion files, environment files, or secrets were edited.

## 16. Risk Assessment

Low. This patch adds local/static evaluation fixtures and tests only. The main future risk remains that conversational response formatting could weaken source limitation visibility, which is why PATCH-07A-003 must assess authority-state response policy and `applyVerifiedAuthorityGate` compatibility before runtime implementation.

## 17. Recommended Next Task

```text
PATCH-07A-003 - Authority-state response policy and applyVerifiedAuthorityGate compatibility tests
```

Reason: Before runtime formatting changes, TINA must confirm that short `/ask` conversational responses remain compatible with `applyVerifiedAuthorityGate` and source limitation discipline. PATCH-07A-004 runtime `/ask` implementation should not begin until PATCH-07A-003 is complete.
