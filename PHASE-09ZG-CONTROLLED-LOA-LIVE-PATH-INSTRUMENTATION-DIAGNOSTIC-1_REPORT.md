# PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1 Report

## 1. Patch Name
PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1

## 2. Purpose
Instrument (do not fix) the actual live `/ask` runtime path so the four LOA/eLA audit-procedure queries that still fail PHASE-09ZB after PHASE-09ZF's gate-ordering remediation can be traced against one passing baseline query, without presuming a root cause in advance.

## 3. Base State
Base commit: b0031c2 (PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1, latest live-staging FAIL after 09ZF).
Prior gate-ordering remediation commit: dd991cc (PHASE-09ZF, PASS WITH STRICT RECOMMENDATIONS locally, but the same 4 of 8 safe queries reproduced FAIL live).
Branch: feature/source-availability-engine-v1, synced 0/0 with origin at the start of this patch.

## 4. Prior 09ZB Failure
Live staging smoke (post-09ZF, refreshed JWT) confirmed: 4 of 8 mandated safe LOA/eLA queries -- replacement eLA, consolidated eLA, notice for presentation/submission, reminder before subpoena -- still did not return `responseType: "controlled_loa_answer"`. Runtime/security checks passed; excluded and unrelated query behavior was preserved; production was unaffected.

## 5. Prior 09ZF Remediation
dd991cc reordered Step 12.65 (controlled LOA gate) to execute before Step 12.6 (clarification route gate) in `pipeline.js`, on the theory that the clarification gate's generic fallback was intercepting the four queries before the controlled LOA gate ran. All local/static tests for 09ZF passed, and `evaluateControlledLoaAskGate()` called in isolation correctly classifies all 8 safe queries (including the 4 previously-failing ones) as `matched: true`. Live staging still reproduced the identical 4-query failure after this remediation was deployed and verified (commit 431ba5b / b0031c2), proving the gate-ordering fix alone did not resolve the live discrepancy and that the root cause is not yet proven.

## 6. Diagnostic Hypothesis List
No hypothesis is presumed as root cause. Candidates under investigation, none of which may be declared proven without live trace evidence:
- live staging is executing a different pipeline path than the one read statically
- another early exit executes before the instrumented section (e.g. a timeout/exception in Steps 1-12.5, which run before Step 12.65 in the current ordering)
- the controlled LOA gate receives a transformed or different query than expected
- normalized query (`effectiveQuery`) differs meaningfully from the raw query for these phrasings
- issue/domain classification mutates or replaces the query before Step 12.65
- the runtime feature flag is read differently in the live path than locally
- `evaluateControlledLoaAskGate` returns a non-trigger result live even though it matches locally
- a separate `/ask` handler path bypasses the expected pipeline block
- a fallback response is produced after a controlled result is generated
- response normalization in `ask-handler.js` overwrites `responseType`
- the deployed staging commit differs from the expected source state (dd991cc or later)
- branching or middleware behavior differs for audit-procedure terms specifically

Static investigation (see the approved investigation plan) found: `/ask` has a single live route (`routes/ask-route.js` -> `ask-handler.js: handleAsk` -> `handleControlledRagRoute` -> `pipeline.js: runPipeline`); query normalization for `/ask` is a no-op for these queries (no `/ask` prefix to strip); the controlled LOA and clarification gates read the raw `query` parameter, not `effectiveQuery`; `ask-handler.js` passes `result.responseType` through unchanged. The most notable structural fact is that Step 12.65 sits deep in `runPipeline` (after Steps 1-12.5, i.e. after issue classification, retrieval, reranking, and SAE classification), so a timeout or exception in an earlier step for these specific phrasings could prevent Step 12.65 from ever running -- this is a hypothesis to test with live evidence, not a conclusion.

## 7. Files Changed
- diagnostics/controlled-loa-live-path-trace.js (new)
- pipeline.js (gated trace checkpoints only)
- evaluation/fixtures/phase-09zg-controlled-loa-live-path-instrumentation-diagnostic-1.fixture.json (new)
- tests/phase-09zg-controlled-loa-live-path-instrumentation-diagnostic-1.test.mjs (new)
- PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1_REPORT.md (new)
- knowledge/CURRENT_STATE.md

## 8. Instrumentation Design
`diagnostics/controlled-loa-live-path-trace.js` exports a pure factory (`createControlledLoaLivePathTrace`) that produces a request-scoped, in-memory trace object with a single `record(eventName, fieldsBuilder)` method. When disabled (default), `record()` is a true no-op: it returns `null` without invoking the field builder, so there is zero cost and zero side effect. When enabled, each call immediately sanitizes and logs one structured event under the `[TINA_09ZG_LOA_PATH]` prefix -- immediately, not buffered until the end of the request, so a mid-request timeout or exception still leaves a partial trace showing how far the request got before failing.

`pipeline.js` wires 12 checkpoints into `runPipeline()`: `REQUEST_RECEIVED` and `QUERY_NORMALIZED` near the top; `FEATURE_FLAG_CHECKED`, `PH_TAX_BOUNDARY_EVALUATED`, and a read-only `AUDIT_PROCEDURE_OVERLAY_EVALUATED` re-check inside the existing domain-boundary block; `CONTROLLED_LOA_GATE_ENTERED`, `CONTROLLED_LOA_GATE_INPUT`, `CONTROLLED_LOA_GATE_RESULT`, and (conditionally) `CONTROLLED_LOA_EARLY_EXIT_BUILT` at Step 12.65; `SUBSEQUENT_BRANCH_ENTERED` at Step 12.6 entry; and `FINAL_RESPONSE_SELECTED` + `REQUEST_COMPLETED` at each of the three possible exit points (the Step 12.65 early exit, the Step 12.6 early exit, and the final full-generation return at the end of `runPipeline`).

The `AUDIT_PROCEDURE_OVERLAY_EVALUATED` checkpoint independently re-tests the existing `CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS` list against the effective query purely for observability; it does not call or alter `detectPhilippineTaxBoundary()`'s actual decision.

## 9. Diagnostic Flag
`TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC`, default false (gated on an explicit true-value set: "1"/"true"/"on"/"yes"), staging-only, no production activation planned or performed in this task.

## 10. Secret/Privacy Protections
The trace collector strips any field key matching `authorization|jwt|token|password|secret|cookie|headers|reqbody|envvars` (case-insensitive) before logging, regardless of what a call site passes. Only sanitized fields are ever logged: diagnostic event id, a query fingerprint (SHA-256 hash + length + a length-bounded preview -- not a general-purpose raw-query logger, and only used because the fixed test-query matrices contain no taxpayer data), branch labels, booleans, classification labels, and `responseType`. No JWT, Authorization header, password, token, environment secret, full request headers, or unrestricted request body is ever logged. Verified by a dedicated test that asserts none of those keys survive sanitization.

## 11. Runtime Behavior Protections
When disabled (default), the diagnostic module never calls its field-builder functions, so it introduces no computation, no logging, and no control-flow change into `runPipeline()`. When enabled, it still never changes which gate matches, what response is built, or what `responseType` is returned -- it only observes and logs. Verified by rerunning the full pre-existing 09ZA/09ZE/09ZF regression suite with the flag left at its default (disabled) and confirming zero behavioral difference.

## 12. Required Trace Events
REQUEST_RECEIVED, QUERY_NORMALIZED, FEATURE_FLAG_CHECKED, PH_TAX_BOUNDARY_EVALUATED, AUDIT_PROCEDURE_OVERLAY_EVALUATED, CONTROLLED_LOA_GATE_ENTERED, CONTROLLED_LOA_GATE_INPUT, CONTROLLED_LOA_GATE_RESULT, CONTROLLED_LOA_EARLY_EXIT_BUILT, SUBSEQUENT_BRANCH_ENTERED, FINAL_RESPONSE_SELECTED, REQUEST_COMPLETED -- all implemented and present in `pipeline.js`.

## 13. Passing Baseline Trace
Pending live capture. Not yet executed against staging in this session.

## 14. Failing Query Trace 1 (replacement eLA)
Pending live capture.

## 15. Failing Query Trace 2 (consolidated eLA)
Pending live capture.

## 16. Failing Query Trace 3 (notice for presentation/submission)
Pending live capture.

## 17. Failing Query Trace 4 (reminder before subpoena)
Pending live capture.

## 18. First Divergence Comparison
Pending live capture. Cannot be produced from static inspection alone per this task's root-cause decision rules.

## 19. Root-Cause Finding
Not yet determined. No hypothesis in Section 6 may be declared proven without live trace evidence.

## 20. Confidence Level
N/A pending live evidence.

## 21. Evidence Limitations
This report reflects instrumentation build and local static/pure validation only. No staging deployment, flag enablement, or live request has been executed yet in this task. Live capture requires: (a) deploying this commit to staging, (b) verifying the deployed commit via the existing `/debug/db-identity` `RENDER_GIT_COMMIT` field, (c) enabling `TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC=true` on staging only, (d) running the 6-query matrix (2 baseline + 4 failing) with `TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true` preserved, (e) capturing sanitized trace logs, and (f) disabling the diagnostic flag afterward.

## 22. Source-Card/Citation Discipline
No source cards are created or altered by this diagnostic. The controlled LOA branch's existing metadata contract is unchanged: sourceCards: [], sourceCardVerification: not_performed, legalCitationAllowed: false, filingReadyDocumentGenerated: false, automaticSubmission: false.

## 23. Legal-Safety Boundary
No final legal conclusions. No claim that any LOA/eLA/PAN/FAN/FLD/FDDA/assessment/protest/BIR action is valid, invalid, void, cancelled, final, enforceable, or appealable. No filing-ready output. No automatic BIR submission. Human tax/legal review notice remains preserved by the unmodified controlled LOA answer scaffold.

## 24. Persistence/External-Operation Boundary
No database writes, no filesystem persistence, no external service calls (OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR) were added. The trace collector only builds in-memory objects and calls `console.log`.

## 25. Production Boundary
Production impact: None. The diagnostic flag defaults to false and is intended for staging-only activation; this task does not enable it in production at any point.

## 26. Validation Summary
Ran `node --check` on `pipeline.js` and the new diagnostics module (both syntax-valid). Verified the trace collector is a true no-op when disabled (field builder never invoked, zero events recorded) and correctly sanitizes forbidden secret-shaped fields when enabled, via a standalone Node script and the dedicated 09ZG test. Reran the full 09ZA/09ZE regression suite with the diagnostic flag at its default (disabled) -- both pass with zero change. 09ZF's own historical diff-scope guard shows the same class of expected false-positive seen in prior phases (it checks the current uncommitted `git diff`, which now legitimately includes this patch's `pipeline.js` changes; it will clear once this patch is committed, exactly as it did for 09ZF's own commit).

## 27. Decision
Instrumentation build and local validation stage. Live trace has not yet been captured in this task; per the required root-cause decision rules, no PASS WITH ROOT CAUSE IDENTIFIED / PASS WITH PARTIAL FINDINGS / BLOCKED / FAIL decision is claimed until a live staging trace is run. This report will be updated with live evidence and a decision only after explicit approval to deploy and run the diagnostic.

## 28. Strict Recommendations
1. Do not enable `TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC` in production at any time.
2. Disable the diagnostic flag on staging immediately after evidence capture unless explicitly told to keep it temporarily enabled.
3. Run only the required 6-query diagnostic matrix (1-2 baseline + 4 failing) -- do not expand to the full excluded/unrelated matrix unless needed to confirm an identified root cause.
4. Verify the staging deployment's `RENDER_GIT_COMMIT` before trusting any live trace as representative of this patch's source.
5. Do not implement PHASE-09ZH remediation in this task even if a root cause becomes apparent mid-diagnosis.
6. Do not proceed to PHASE-09ZC until PHASE-09ZB is rerun and passes.
7. Preserve source-card discipline, legal-safety boundary, and human-review requirement throughout.

## 29. Next Task
Pending live evidence: PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1 (only if root cause is proven with live trace evidence). Not implemented in this task.

## 30. Blocked Task
PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1 remains blocked until PHASE-09ZB passes.

---

Runtime impact: Diagnostic instrumentation only.
Answer-content impact: None.
Controlled LOA classification impact: None.
Ask-handler behavioral impact: None except diagnostic observation.
Route behavior impact: None.
Auth behavior impact: None.
Feature flag impact: New staging-only diagnostic flag, default false.
Memory impact: Request-local diagnostic trace only.
Persistence impact: None.
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Source-card impact: None.
Legal-citation impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
Production impact: None.
09ZC remains blocked.
