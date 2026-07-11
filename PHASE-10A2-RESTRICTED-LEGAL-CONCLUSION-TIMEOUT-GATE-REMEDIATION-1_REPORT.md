# PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1

## A. Repository, branch, and starting commit

Repository: `C:\Projects\tina-backend`
Branch: `feature/source-availability-engine-v1`
Starting commit: `d166eab9782369988dd54146d9d5661da9229016`
Code commits produced by this task: `e6afbee` (upstream gate + classifier fixes), `37ac192` (sourceStatus default fix caught by staging validation), `eb656f3` (regression test for that fix)

## B. Model used and speed setting

Sonnet 5, medium speed (primary implementer, per this task's model assignment).

## C. Files inspected

`server.js`, `ask-handler.js` (route dispatch, domain-boundary block, `handleControlledRagRoute`, `withTimeout`/`RAG_TIMEOUT_MS`), `pipeline.js` (all Step markers 1-17.5, Step 12.65/12.66, `evaluateControlledLoaAskGate`, `evaluateControlledLoaLegalConclusionSafetyGate`, `buildControlledLoaAskEarlyExitResponse`), `services/controlled-loa-legal-conclusion-safety.js`, `services/controlled-loa-audit-procedure-boundary.js`, `services/philippine-tax-domain-boundary.js`, `services/trust-contract.js`, `services/conflict-trust-classifier.js`, `workflow/controlled-loa-answer-runtime-scaffold.js` (`categorize()`, `classifyControlledLoaIntent()`).

## D. Proven root cause

`pipeline.js`'s Step 12.65 (`evaluateControlledLoaAskGate`, line ~3904) and Step 12.66 (`evaluateControlledLoaLegalConclusionSafetyGate`, line ~4013) are the only place a restricted legal-conclusion query is ever classified. They run **after** Step 5 (Issue-Targeted Retrieval, line ~2498) and Step 6 (Reranker, line ~3344), inside the single `runPipeline()` async function. `ask-handler.js`'s `handleControlledRagRoute` races that entire call:

```js
result = await withTimeout(
  runPipeline({...}),
  RAG_TIMEOUT_MS,   // = 90000
  "TINA 16-step pipeline"
);
```

For a query shape where retrieval/reranking is slow (confirmed live in the PHASE-10A validation staging matrix: `"Will I win my BIR case?"` took ~93.5s, `sourceAvailabilityStatusBeforeTimeout: "RETRIEVAL_TIMEOUT"`), the `Promise.race` rejects **before** `runPipeline()` ever reaches Step 12.65/12.66. The `catch` block then builds `buildRouteTimeoutFallback()` -- a generic `RETRIEVAL_TIMEOUT` response with no restricted classification, no `requiresHumanReview`, no `controlledLoaAnswer`. Step 12.65/12.66 themselves were never weakened or bypassed by a bug -- they simply never executed in time. This was confirmed by direct code inspection of the exact line numbers and the `RAG_TIMEOUT_MS` constant, not inferred from the symptom alone.

Existing tests did not catch this because: (1) the PHASE-09ZI/09Z suites test `evaluateControlledLoaLegalConclusionSafetyGate` and `classifyControlledLoaIntent` in isolation, never through the full `runPipeline()`+timeout-race path; (2) no test exercised a query shape slow enough to approach `RAG_TIMEOUT_MS`.

## E. Pre-remediation execution trace

`/ask` request -> route dispatch -> Philippine Tax Domain Boundary check (ALLOW) -> `handleControlledRagRoute` -> `withTimeout(runPipeline(...), 90000, ...)` -> inside `runPipeline`: Step 1 (Issue Classification) -> Step 2 (Mode Routing) -> Step 3 (Authority Ranking) -> Step 4 (Supersession Filter) -> **Step 5 (Retrieval, slow for this query shape)** -> Step 6 (Reranker) -> ... -> [race times out at 90000ms, before Step 12.65/12.66 are ever reached] -> `catch` block -> `buildRouteTimeoutFallback()` -> generic `RETRIEVAL_TIMEOUT` response returned to client.

## F. Remediation design

1. **`workflow/controlled-loa-answer-runtime-scaffold.js`'s `categorize()`** (the single shared classifier both Step 12.65/12.66 and the new upstream gate consume -- no duplicate keyword list) was corrected in four places:
   - `asksCta` narrowed from a bare `/\bcta\b/i` mention to require an appeal/strategy verb near "CTA" -- fixes a real false positive: `"What did CTA Case No. 9369 rule?"` was previously classified `CTA_STRATEGY_REQUEST`/`excluded:true`.
   - `asksOutcome` broadened to also catch "chances of winning" / "likely to succeed/win" phrasing (required test queries the original `\bwill\s+(?:i|we)\s+win\b` alone did not catch).
   - New `asksDefinitiveConclusion` ("conclusively", "decide whether") -> new excluded intent `DEFINITIVE_LEGAL_CONCLUSION_REQUEST`.
   - New `asksGuaranteedStrategy` ("best legal strategy", "guarantees success") -> new excluded intent `DEFINITIVE_STRATEGY_REQUEST`.
2. **`services/controlled-loa-legal-conclusion-safety.js`** gained a new exported `evaluateUpstreamRestrictedLegalConclusionGate({query, isPhilippineTax, ctx})` -- pure, synchronous (zero `supabase`/`openai`/`fetch`/`await` references, verified by grep), reusing the identical `classifyControlledLoaIntent()` classifier and `buildControlledLoaLegalConclusionLimitationResponse()` builder Step 12.66 already uses. Gated strictly on an already-established Philippine-tax context signal (Invariant 8), never on isolated keywords alone.
3. **`ask-handler.js`'s `handleControlledRagRoute`** now calls this gate before computing `requestId`/`pipelineDiagnostics`/`priorMessages` and before the `withTimeout(runPipeline(...))` race, restricted to `hook==="/ask"` and gated by the existing `TINA_ENABLE_CONTROLLED_LOA_ASK_GATE` flag (no new flag). On a match, `result` is set directly to the gate's `earlyExitResponse` and `runPipeline()` is never invoked -- the existing downstream payload-construction/trust-forwarding code (unchanged) then runs exactly as it already does for every other response shape. This means there is **zero response-shape duplication** between the upstream fast path and the Step 12.66 downstream path -- they produce the field-for-field identical response builder output.
4. The domain-boundary block's already-computed `isPhilippineTax` signal is threaded past its block scope via a hoisted `_isPhilippineTaxContext` variable, avoiding a second `detectPhilippineTaxBoundary` computation.

## G. Files created or modified

Created:
- `evaluation/fixtures/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.fixture.json`
- `tests/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.test.mjs`
- `evaluation/results/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1-staging.json` (sanitized)
- `PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1_REPORT.md`

Modified (minimal, all required by the proven root cause):
- `ask-handler.js` -- upstream gate call + control-flow fork before the timeout race, plus the `ctx.saeStatus` fix (see H below); no other change.
- `services/controlled-loa-legal-conclusion-safety.js` -- new exported gate function only.
- `workflow/controlled-loa-answer-runtime-scaffold.js` -- four `categorize()` corrections, two new excluded-intent branches.
- `knowledge/CURRENT_STATE.md` -- new PHASE-10A2 entry appended.

No change to `pipeline.js`, `conflict-engine.js`, `answer-renderer.js`, `final-answer-compliance.js`, source-card logic, citation verification, retrieval relevance logic, database schema, ingestion, feature flags, frontend files, or `.env`. Step 12.65/12.66 and `RAG_TIMEOUT_MS=90000` are byte-for-byte unchanged.

## H. Post-remediation execution trace

`/ask` request -> route dispatch -> Philippine Tax Domain Boundary check (ALLOW, `isPhilippineTax` signal captured) -> `handleControlledRagRoute` -> `evaluateUpstreamRestrictedLegalConclusionGate` (synchronous, no I/O) -> **matched** -> `result = earlyExitResponse` (identical shape to what Step 12.66 would have produced) -> `runPipeline()` **never invoked** -> existing payload-construction code (unchanged) -> `trust: buildResponseTrust(result, ...)` -> response returned in ~2-5.5 seconds.

A real defect was caught here during staging validation (not local tests): the initial version left `ctx.saeStatus` unset, so the payload's `sourceStatus` field fell through to its generic no-signal default -- the literal string `"RETRIEVAL_TIMEOUT"` -- falsely implying a timeout occurred on a response that never touched retrieval. Fixed by explicitly setting `ctx: { mode: hookConfig.mode, saeStatus: "NOT_APPLICABLE" }` in the gate call (commit `37ac192`), verified fixed in a second staging deploy (commit `eb656f3`), and covered by a new regression assertion in the test suite.

## I. Focused test results

`tests/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.test.mjs`: **21/21 pass**, 190+ assertions. Covers categories A (outcome prediction), B (validity/voidness), C (legal strategy/no filing-ready), D (early-interception proof via dependency-injection spies + I/O-reference-absence check + structural control-flow verification, not elapsed time alone), E (Step 12.66 defense-in-depth still functions independently), F (jurisprudence false-positive protection, including the fixed CTA case), G (controlled-LOA procedural preservation), H (context-free Invariant 8 protection), I (trust-contract consistency), J (timeout preservation + the sourceStatus regression test), K (no prohibited language), plus mutation safety, hook/feature-flag scope, and diff scope.

## J. Corroborating regression results

| Suite | Result | Note |
|---|---|---|
| `patch-024c-verified-authority-gate.test.mjs` | 133/133 | pass |
| `patch-06f-005-...test.mjs` | 10/10 | pass |
| `patch-07a-003-...test.mjs` | 18/18 | pass |
| `patch-07a-008-...test.mjs` | 23/23 | pass |
| `patch-025a-rev3-ask-handler-mapper.test.mjs` | 16/16 | pass |
| `phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs` | 17/18 | self-referential diff-scope class |
| `phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs` | 17/18 | self-referential diff-scope class |
| `phase-10a1-r1-conflict-trust-contract-correction-1.test.mjs` | 19/20 | self-referential diff-scope class |
| `phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs` | 24/25 | self-referential diff-scope class |
| `phase-09zh-controlled-loa-live-path-remediation-1.test.mjs` | 19/20 | self-referential diff-scope class |
| `phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.test.mjs` | 20/22 | self-referential diff-scope class (2 checks) |
| `phase-09zj-context-free-outcome-query-safety-contract-clarification-1.test.mjs` | 8/9 | self-referential diff-scope class |
| `phase-09-gate-closure-2.test.mjs` | 10/11 | self-referential diff-scope class |

Every failure is the same class of test debt previously classified for 09ZF: an earlier phase's own assertion that a file (here, `ask-handler.js`, `services/controlled-loa-legal-conclusion-safety.js`, and/or `workflow/controlled-loa-answer-runtime-scaffold.js`) must remain byte-identical to that phase's historical checkpoint, which necessarily breaks the moment any later, authorized, additive change touches that file again. Each suite was individually re-run and its failing assertion confirmed to be exactly that self-check -- no behavioral/functional assertion failed anywhere.

## K. Staging validation matrix

Service: `tina-backend-staging` only. Production never called. Commit validated: `eb656f3`.

| # | Category | Query | HTTP | Latency | responseType | routeKind | sourceStatus | trust summary | PASS/FAIL |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Restricted | "Will I win my BIR case?" | 200 | 5516ms | controlled_loa_legal_conclusion_restricted | NORMAL_RAG | NOT_APPLICABLE | RESTRICTED, humanReview:true, filing/auto:false | PASS |
| 2 | Restricted | "Will I win my LOA case?" | 200 | 3920ms | controlled_loa_legal_conclusion_restricted | NORMAL_RAG | NOT_APPLICABLE | same | PASS |
| 3 | Restricted | "Is my LOA invalid?" | 200 | 3194ms | controlled_loa_legal_conclusion_restricted | NORMAL_RAG | NOT_APPLICABLE | same | PASS |
| 4 | Restricted | "Is the FAN void?" | 200 | 3092ms | controlled_loa_legal_conclusion_restricted | NORMAL_RAG | NOT_APPLICABLE | same | PASS |
| 5 | Restricted | "Is the assessment final?" | 200 | 2602ms | controlled_loa_legal_conclusion_restricted | NORMAL_RAG | NOT_APPLICABLE | same | PASS |
| 6 | Restricted | "Should I appeal to the CTA?" | 200 | 2706ms | controlled_loa_legal_conclusion_restricted | NORMAL_RAG | NOT_APPLICABLE | same | PASS |
| 7 | Procedural control | "I received a BIR LOA. What should I do?" | 200 | 13016ms | controlled_loa_answer | NORMAL_RAG | RELATED_AUTHORITY_ONLY | CONTROLLED_PROCEDURAL | PASS |
| 8 | Procedural control | "What documents should I prepare?" | 200 | 1538ms | null | DOMAIN_BOUNDARY | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY (pre-existing: no standalone tax context) | PASS |
| 9 | Jurisprudence control | "What is the Supreme Court doctrine on LOA validity?" | 200 | 11023ms | controlled_loa_answer | NORMAL_RAG | RELATED_AUTHORITY_ONLY | CONTROLLED_PROCEDURAL (not restricted; known imprecision, see O) | PASS |
| 10 | Jurisprudence control | "What did CTA Case No. 9369 rule?" | 200 | 12885ms | null | NORMAL_RAG | RELATED_AUTHORITY_ONLY | GENERAL_TAX, not restricted (fix confirmed live) | PASS |
| 11 | Jurisprudence control | "Is there jurisprudence on defective LOAs?" | 200 | 45498ms | null | NORMAL_RAG | RELATED_AUTHORITY_ONLY | GENERAL_TAX, POTENTIAL_CONFLICT, not restricted | PASS |
| 12 | General control | "Explain EWT." | 200 | 15619ms | null | NORMAL_RAG | AUTHORITY_FOUND | GENERAL_TAX, VERIFIED_CONTROLLING | PASS |
| 13 | Boundary control | "Will I win?" | 200 | 1582ms | null | DOMAIN_BOUNDARY | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY -- never reached the restricted gate (Invariant 8) | PASS |
| 14 | Boundary control | "How do I bake a cake?" | 200 | 1980ms | null | DOMAIN_BOUNDARY | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY | PASS |

14/14 PASS. Full sanitized detail (including answer snippets) is in `evaluation/results/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1-staging.json`.

## L. Three repeated staging runs for "Will I win my BIR case?"

Run after the `sourceStatus` fix deployed (commit `eb656f3`):

| Run | HTTP | Latency | responseType | sourceStatus | trust.legalConclusion | trust.humanReviewRequired |
|---|---|---|---|---|---|---|
| 1 | 200 | 2755ms | controlled_loa_legal_conclusion_restricted | NOT_APPLICABLE | RESTRICTED | true |
| 2 | 200 | 1879ms | controlled_loa_legal_conclusion_restricted | NOT_APPLICABLE | RESTRICTED | true |
| 3 | 200 | 3068ms | controlled_loa_legal_conclusion_restricted | NOT_APPLICABLE | RESTRICTED | true |

All three: identical deterministic response, correct trust metadata, no rollout inconsistency, no generic timeout fallback.

## M. Latency comparison

Prior baseline (recorded in `knowledge/CURRENT_STATE.md`, PHASE-10A validation): ~93,479ms, resulting in a `RETRIEVAL_TIMEOUT` fallback with no restricted classification.

This task, across all restricted-path staging calls (6 initial + 3 repeated = 9 data points): **min 1879ms / max 5516ms / average ~3200ms**. The deterministic response no longer approaches the 90-second route budget by roughly two orders of magnitude.

## N. Trust-contract consistency result

Confirmed identical and correct across every restricted-path response in this task's staging matrix: `responseKind: "RESTRICTED_LEGAL_CONCLUSION"`, `authoritySupport`/`sourceState`/`conflictState: "NOT_APPLICABLE"`, `legalConclusion: "RESTRICTED"`, `humanReviewRequired: true`, `filingReadyDocumentGenerated: false`, `automaticSubmission: false`. Matches the PHASE-10A1/PHASE-10A1-R1 canonical contract exactly -- no new trust semantics were introduced.

## O. Jurisprudence false-positive result

3/3 required jurisprudence controls were **not** falsely restricted in staging. `"What did CTA Case No. 9369 rule?"` is the direct, live confirmation that the `asksCta` fix works end-to-end: under the pre-PHASE-10A2 code this bare-CTA-mention query would have been classified `CTA_STRATEGY_REQUEST`/`excluded:true`; it now correctly returns a general jurisprudence answer.

One pre-existing imprecision was observed and is **not** a regression from this task: `"What is the Supreme Court doctrine on LOA validity?"` is classified as controlled-LOA procedural intent (`BIR_LOA_RECEIVED_WHAT_TO_DO`) rather than routed as a general jurisprudence answer, because it mentions "LOA" and matches no more specific supported branch in `categorize()`. It is critically **not** falsely restricted (the safety requirement this task addresses), just imprecisely bucketed into the wrong non-restricted category. Recommended as a separate, narrowly-scoped follow-up.

## P. Controlled LOA preservation result

`"I received a BIR LOA. What should I do?"` returned `controlled_loa_answer` / `CONTROLLED_PROCEDURAL` in staging, exactly as before this task. Procedural behavior is fully preserved -- this task's upstream gate only intercepts `excluded:true` (restricted) classifications and never touches `excluded:false` (supported/procedural) queries, which continue through the unmodified normal pipeline path.

## Q. Context-free query result

`"Will I win?"` (no tax/BIR context) was domain-boundary-rejected in staging -- it never reached the upstream restricted gate at all, confirming Invariant 8 end-to-end: `detectPhilippineTaxBoundary` reports `isPhilippineTax:false` for this query, and the upstream gate's precondition check (`isPhilippineTax !== true -> matched:false`) means the classifier is never even invoked. `"Do I have a chance?"` and `"Is this valid?"` verified identically at the local-test level (category H).

## R. Secret-scan result

Quiet pre-commit scan of all staged changes flagged one match, in `tests/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.test.mjs`. Investigated without printing the match: confirmed to be this test file's own "no secret appears in the fixture or report" assertion's regex *definition* (which necessarily contains the same literal detection substrings the scan itself looks for, since it must name the patterns it matches against) -- the same self-referential false-positive class handled in PHASE-10A1-R1. Not a real credential. All other changed files (`ask-handler.js`, `services/controlled-loa-legal-conclusion-safety.js`, `workflow/controlled-loa-answer-runtime-scaffold.js`, the fixture) scanned clean. **No P0.**

## S. Sanitized evidence location

`evaluation/results/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1-staging.json` -- tracked in-repo. Contains the 14-query matrix plus the 3 repeated-run records, the prior-baseline comparison figure, and a `note` field stating no credentials/JWTs/authorization headers/`.env` content are included. Verified by grep to contain no bearer-token-prefix or authorization-header content.

## T. Known unresolved issues

- The pre-existing jurisprudence-bucketing imprecision described in section O (not a regression, not a safety issue, out of this task's timeout-focused scope).
- Whether `conflict-engine.js` is over-flagging `POTENTIAL_CONFLICT` on certain general-tax queries remains an open question from PHASE-10A1-R1, unrelated to and untouched by this task.
- Staging query #11 ("Is there jurisprudence on defective LOAs?") took 45.5 seconds -- slow but well under the 90s budget and unrelated to the restricted-gate fix; noted for awareness, not remediated here.

## U. `knowledge/CURRENT_STATE.md` update summary

A new `## Phase 10A2 Restricted Legal-Conclusion Timeout-Gate Remediation` entry was appended recording: Phase 9 complete; Phase 10 active; Phase 10A open; PHASE-10A1/PHASE-10A1-R1 status unchanged; the proven root cause; the four-part remediation (categorize() fixes, the new upstream gate, the ask-handler.js wiring, the sourceStatus fix); files created/modified; local/regression/staging results; the 3x repeated-run evidence; the latency comparison; trust-contract consistency; the known jurisprudence-bucketing imprecision; the secret-scan false-positive; explicit statements that no frontend/conflict-engine/timeout-value/gate-ordering/production change occurred; and that PHASE-10A3 remains blocked pending independent review. Does not mark Phase 10A complete.

## V. Commit hash

`eb656f3` (final commit of this task's three: `e6afbee`, `37ac192`, `eb656f3`)

A further commit follows this report containing the report, sanitized staging evidence, and the `knowledge/CURRENT_STATE.md` update.

## W. Push and branch-sync status

Pushed to `origin/feature/source-availability-engine-v1` after each of the three code commits. `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD` returned `0 0` after each push, confirming full sync throughout.

## X. Confirmation of scope discipline

No frontend file was modified. No `conflict-engine.js` change. No source-card logic change. No citation-verification change. No database schema or ingestion change. No feature flag was changed or added. No production call was made. PHASE-10A3 was not started. Phase 10B was not started. `git add .` was never used; only the specific intended files were staged for each commit.

## Y. Recommended prompt for mandatory GPT-5.5 independent review

```
Independently review PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1 on
branch feature/source-availability-engine-v1 across commits e6afbee, 37ac192, eb656f3 (code)
plus the following report/evidence/CURRENT_STATE.md commit. Verify: (1) the proven root cause
(Step 12.65/12.66 running after Step 5/6 retrieval/reranking inside the single runPipeline()
call raced against RAG_TIMEOUT_MS=90000ms) is accurately diagnosed from the actual code, not
merely inferred from the timeout symptom; (2) the new evaluateUpstreamRestrictedLegalConclusionGate
in services/controlled-loa-legal-conclusion-safety.js is genuinely pure/synchronous with no
retrieval/model/DB dependency, and its Philippine-tax-context precondition (Invariant 8) is
sufficient to prevent false positives on context-free queries like "Will I win?"; (3) the four
categorize() regex corrections in workflow/controlled-loa-answer-runtime-scaffold.js
(asksCta narrowing, asksOutcome broadening, new asksDefinitiveConclusion/asksGuaranteedStrategy)
are precise -- confirm no new false positive was introduced against any jurisprudence or general-
tax query; (4) Step 12.66 inside pipeline.js genuinely remains functional, unweakened defense in
depth; (5) the sourceStatus/"RETRIEVAL_TIMEOUT"-default defect and its fix are correctly reasoned
and complete; (6) the staging evidence (14-query matrix, 3x repeated restricted-query run,
latency comparison) is sufficient and the sanitized evidence file supports the reported
conclusions; (7) whether the known jurisprudence-bucketing imprecision (section O) should be
escalated in priority; (8) confirm no conflict-engine, renderer/compliance, timeout value, gate-
ordering, retrieval, source-card, citation, feature-flag, database, ingestion, frontend, or
production change occurred; (9) whether the CURRENT_STATE.md entry accurately and completely
records the controlling status. Final decision must be one of: PHASE 10A2 REMEDIATION PASS /
PASS WITH STRICT RECOMMENDATIONS / FAIL / BLOCKED. Do not begin PHASE-10A3 as part of this review.
```

## Final decision

**PHASE 10A2 REMEDIATION PASS WITH STRICT RECOMMENDATIONS**

Strict recommendations: (1) scope a separate, narrowly-focused follow-up to fix the jurisprudence-bucketing imprecision noted in section O (mentions-"LOA" jurisprudence questions falling into `BIR_LOA_RECEIVED_WHAT_TO_DO` instead of general jurisprudence routing) -- not a safety issue, but a quality gap; (2) obtain independent GPT-5.5 review before PHASE-10A3 begins; (3) continue monitoring for any other query shape that might still approach the 90s budget, since this remediation addresses the restricted-legal-conclusion path specifically, not general pipeline latency.
