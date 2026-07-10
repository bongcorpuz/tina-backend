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

**Deployment verification:** `GET /debug/db-identity` returned `RENDER_GIT_COMMIT: d899b35497fb55a1f6c98c3d5a3304f5e65ea114` (matches this patch's commit exactly), `RENDER_SERVICE_NAME: tina-backend-staging`, `NODE_ENV: staging`.

**Baseline 1 -- "I received a BIR LOA, what should I do?"**
- HTTP status: 200. Elapsed: ~16086ms (full retrieval pipeline ran).
- Response: `routeKind: "NORMAL_RAG"`, `responseType: "controlled_loa_answer"`, `sourceStatus: "RELATED_AUTHORITY_ONLY"`.
- `[TINA_09ZG_LOA_PATH]` trace: 10 matching log lines captured in the Render log stream for this request's time window (05:14:21.731-.734Z, an early cluster of 5 events immediately after request receipt, then a second cluster of 5 events at 05:14:37.756Z -- ~16s later, matching the full retrieval/SAE/doctrine pipeline duration before Step 12.65 was reached). This confirms `runPipeline()` executed to Step 12.65 and the controlled LOA gate fired.
- Answer preview: "If you received a BIR LOA/eLA, do not ignore it. Preserve the date and manner of receipt, keep a copy of the notice, and verify it through the available BIR verification process (for example, the REVI[E]..." -- the controlled scaffold's procedural-guidance-only text.

**Baseline 2 -- "I received a BIR eLA, what should I do?"** (optional second baseline)
- HTTP status: 200. Elapsed: ~15589ms.
- Response: `routeKind: "NORMAL_RAG"`, `responseType: "controlled_loa_answer"`, `sourceStatus: "AUTHORITY_FOUND"`. Same answer family as baseline 1.
- No additional `[TINA_09ZG_LOA_PATH]` log lines were retrievable for this specific request via the Render Logs API text-filter query in the capture window used (see Evidence Limitations, Section 21) -- this is a log-capture-tooling limitation, not evidence that the pipeline did not run; the HTTP response fields (`routeKind: "NORMAL_RAG"`, `responseType: "controlled_loa_answer"`) independently confirm it followed the same full-pipeline path as baseline 1.

## 14. Failing Query Trace 1 (replacement eLA)
Query: "I received a replacement eLA, what should I check first?"
- HTTP status: 200. Elapsed: ~910ms (an order of magnitude faster than the baseline queries -- no retrieval occurred).
- Response: `routeKind: "DOMAIN_BOUNDARY"`, `responseType: null`, `sourceStatus: "DOMAIN_BOUNDARY_REJECT"`.
- Answer: "TINA is designed to answer questions about Philippine taxation. Please ask a Philippine tax-related question, such as VAT, income tax, withholding tax, BIR compliance, local tax, customs duties, or ta[x remedies]..." -- this is the literal `BOUNDARY_REJECTION_MESSAGE` from `services/philippine-tax-domain-boundary.js`.
- `[TINA_09ZG_LOA_PATH]` trace: **zero events** in the Render log stream for this request's window. `runPipeline()` (where every 09ZG checkpoint lives) was never entered.

## 15. Failing Query Trace 2 (consolidated eLA)
Query: "I received a consolidated eLA, what should I do?"
- HTTP status: 200. Elapsed: ~993ms.
- Response: `routeKind: "DOMAIN_BOUNDARY"`, `responseType: null`, `sourceStatus: "DOMAIN_BOUNDARY_REJECT"`. Identical `BOUNDARY_REJECTION_MESSAGE` answer text as Trace 1.
- `[TINA_09ZG_LOA_PATH]` trace: zero events -- `runPipeline()` never entered.

## 16. Failing Query Trace 3 (notice for presentation/submission)
Query: "I received a notice for presentation/submission of documents."
- HTTP status: 200. Elapsed: ~1089ms.
- Response: `routeKind: "DOMAIN_BOUNDARY"`, `responseType: null`, `sourceStatus: "DOMAIN_BOUNDARY_REJECT"`. Identical `BOUNDARY_REJECTION_MESSAGE` answer text.
- `[TINA_09ZG_LOA_PATH]` trace: zero events -- `runPipeline()` never entered.

## 17. Failing Query Trace 4 (reminder before subpoena)
Query: "I received a reminder before subpoena."
- HTTP status: 200. Elapsed: ~919ms.
- Response: `routeKind: "DOMAIN_BOUNDARY"`, `responseType: null`, `sourceStatus: "DOMAIN_BOUNDARY_REJECT"`. Identical `BOUNDARY_REJECTION_MESSAGE` answer text.
- `[TINA_09ZG_LOA_PATH]` trace: zero events -- `runPipeline()` never entered.

## 18. First Divergence Comparison

| Field | Baseline (BIR LOA / BIR eLA) | Each of the 4 failing queries |
|---|---|---|
| HTTP status | 200 | 200 |
| Elapsed time | ~15.6-16.1s (full retrieval ran) | ~0.9-1.1s (no retrieval) |
| `routeKind` | `NORMAL_RAG` | `DOMAIN_BOUNDARY` |
| `responseType` | `controlled_loa_answer` | `null` |
| `sourceStatus` | `RELATED_AUTHORITY_ONLY` / `AUTHORITY_FOUND` | `DOMAIN_BOUNDARY_REJECT` |
| Answer text | Controlled LOA procedural-guidance scaffold | Generic `BOUNDARY_REJECTION_MESSAGE` |
| `[TINA_09ZG_LOA_PATH]` events | Present (baseline 1: 10 log lines spanning request receipt through Step 12.65) | Absent -- zero events |
| `pipeline.js: runPipeline()` reached | Yes | **No** |

**FIRST DIVERGENCE POINT (identical for all four failing queries):** the request never reaches `pipeline.js` at all. `ask-handler.js` (line 65-68 imports, line 2969 call site) runs its own, separate Philippine-tax domain-boundary check -- `detectPhilippineTaxBoundary()` imported directly from `services/philippine-tax-domain-boundary.js` (the base module, not `pipeline.js`'s exported wrapper that carries the PHASE-09ZE audit-procedure overlay patterns). When that check returns `REJECT`, `ask-handler.js` returns immediately at line 3008 (`routeKind: "DOMAIN_BOUNDARY"`) -- before `handleControlledRagRoute()` is ever called and therefore before `pipeline.js: runPipeline()` (and everything inside it: the 09ZE overlay, the 09ZF gate-ordering fix, Step 12.65, and every 09ZG trace checkpoint) is ever reached.

The base module's decision logic (`services/philippine-tax-domain-boundary.js`) is a pure allowlist: it `ALLOW`s only if the query matches a Philippine-tax pattern or keyword, and otherwise always `REJECT`s/`CLARIFY`s. It has no knowledge of "eLA", "replacement", "consolidated", "presentation/submission", or "subpoena" -- those signals exist only in the 09ZE overlay inside `pipeline.js`, which this earlier ask-handler-level check never consults. "I received a BIR LOA..." and "I received a BIR eLA..." both contain the literal keyword "BIR", which the base allowlist does recognize, so they `ALLOW` at this earlier gate and proceed into the pipeline, where Step 12.65 (fixed in order by 09ZF) correctly classifies them as `controlled_loa_answer`. The four failing phrasings contain no keyword the base allowlist recognizes, so they are rejected here, before either the 09ZE overlay or the 09ZF ordering fix ever get a chance to run.

## 19. Root-Cause Finding
**Proven.** `ask-handler.js` contains a second, independent Philippine-tax domain-boundary check (line 2969) that calls the *base* `detectPhilippineTaxBoundary()` from `services/philippine-tax-domain-boundary.js` directly -- not `pipeline.js`'s exported wrapper of the same name, which is the only place the PHASE-09ZE audit-procedure overlay patterns exist. This ask-handler-level check runs, and rejects, before `handleControlledRagRoute()`/`pipeline.js: runPipeline()` is ever invoked. Both PHASE-09ZE (which patched only `pipeline.js`'s wrapper) and PHASE-09ZF (which only reordered code inside `pipeline.js`'s `runPipeline()`) were structurally incapable of fixing this, because neither patch touched, or could have touched under their allowed-file constraints, the earlier ask-handler-level gate that actually rejects these four queries. This explains every prior observation: why 09ZE had no live effect, why 09ZF had no live effect, why exactly these four (and only these four) queries fail, why they return ~10x faster than the queries that reach the full pipeline, and why the passing baseline queries succeed only because they happen to contain the literal keyword "BIR".

## 20. Confidence Level
**High.** This finding is supported by three independent, mutually corroborating lines of evidence: (1) static code proof -- the duplicate, un-overlaid boundary check and its early-return path in `ask-handler.js`; (2) live HTTP response fields (`routeKind`, `sourceStatus`, `responseType`, exact answer text) captured for all 6 diagnostic queries against a verified staging deployment of this exact commit; (3) elapsed-time evidence consistent with an early rejection versus a full pipeline run. The Render server-log trace corroborates this for the one query where full multi-line log capture succeeded (baseline 1) and is consistent (zero events) for the four failing queries.

## 21. Evidence Limitations
The `[TINA_09ZG_LOA_PATH]` events are logged via `console.log(prefix, object)`, which Node/Render render as multiple physical log lines per event. The Render Logs API's `text` filter matched only the opening `{` line of each multi-line event, so full field-level JSON reconstruction from the Render log stream was not achieved for every event of every query within this task's "do not modify the diagnostics module" constraint (a single-line `JSON.stringify` logging format would resolve this cleanly but is a code change out of scope for this findings-only commit). This limitation affected only the *log-stream* corroboration layer -- it did not affect the HTTP-response-level evidence (`routeKind`, `sourceStatus`, `responseType`, answer text), which was captured completely and reliably for all 6 queries and is the primary basis for the root-cause finding above. Baseline 2 shows the same log-capture gap as the four failing queries at the log-stream layer; this is attributed to the same tooling limitation, not to baseline 2 following the failing queries' code path, because its HTTP response (`routeKind: "NORMAL_RAG"`, `responseType: "controlled_loa_answer"`) is unambiguous and matches baseline 1.

**Confirmation diagnostics did not alter answers:** All 6 answers returned are consistent with pre-existing, unmodified logic (`BOUNDARY_REJECTION_MESSAGE` for the 4 failing queries; the unmodified controlled-LOA scaffold text for both baselines). No diagnostic-only content appeared in any answer field.

**Confirmation production remained unchanged:** All requests were sent to `https://tina-backend-staging.onrender.com/ask` only. No production URL, service, or configuration was touched at any point in this task.

**Confirmation 09ZC remains blocked:** PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1 remains blocked; PHASE-09ZB has not yet been rerun to a PASS.

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
PHASE 09ZG CONTROLLED LOA LIVE PATH INSTRUMENTATION DIAGNOSTIC PASS WITH ROOT CAUSE IDENTIFIED

## 28. Strict Recommendations
1. Do not enable `TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC` in production at any time.
2. The diagnostic flag has been disabled on staging (`TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC=false`, confirmed via Render API read-back) immediately after evidence capture in this task.
3. PHASE-09ZH's remediation must target `ask-handler.js`'s duplicate boundary check (line ~2969, importing the base `detectPhilippineTaxBoundary` from `services/philippine-tax-domain-boundary.js`), not `pipeline.js` again -- both 09ZE and 09ZF correctly fixed `pipeline.js` but could not have fixed this, since the request never reaches `pipeline.js` for the four failing queries.
4. When scoping PHASE-09ZH, prefer the narrowest fix: either have `ask-handler.js` import and use `pipeline.js`'s exported (overlaid) `detectPhilippineTaxBoundary` wrapper instead of the raw base function, or move the 09ZE audit-procedure overlay patterns into `services/philippine-tax-domain-boundary.js` itself so both call sites share one definition. Do not duplicate the overlay list a third time.
5. Preserve all existing exclusion/unrelated-query behavior -- the base boundary function's allowlist still governs every other query family; only the audit-procedure overlay signal needs to reach this earlier gate.
6. Do not implement PHASE-09ZH in this task (not done here, per instructions).
7. Do not proceed to PHASE-09ZC until PHASE-09ZB is rerun and passes.
8. Preserve source-card discipline, legal-safety boundary, and human-review requirement throughout PHASE-09ZH.
9. Consider switching the 09ZG diagnostic module to single-line JSON logging (`JSON.stringify(event)`) in a future patch if this instrumentation is reused, to avoid the multi-line log-capture limitation noted in Section 21.

## 29. Next Task
PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1 (root cause proven; not implemented in this task).

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
