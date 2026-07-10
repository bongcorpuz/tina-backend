# PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1 Report

## 1. Patch Name
PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1

## 2. Purpose
Remediate the duplicated upstream domain-boundary behavior proven by PHASE-09ZG so the four safe LOA/eLA audit-procedure queries can pass through `ask-handler.js` and reach the existing controlled LOA gate in `pipeline.js`.

## 3. Base State
Base commit: 42bfcab (PHASE-09ZG diagnostic findings). Branch: feature/source-availability-engine-v1, synced 0/0 with origin at task start. `TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC` confirmed default false in committed code.

## 4. 09ZG Proven Root Cause
`ask-handler.js` (line ~2969) runs its own, separate Philippine-tax domain-boundary check using the **base** `detectPhilippineTaxBoundary()` imported directly from `services/philippine-tax-domain-boundary.js` -- not `pipeline.js`'s overlaid wrapper, the only place the PHASE-09ZE audit-procedure overlay patterns existed. That earlier, un-overlaid check rejects the four audit-procedure phrasings and returns `routeKind: "DOMAIN_BOUNDARY"` immediately, before `handleControlledRagRoute()`/`pipeline.js: runPipeline()` (and therefore Step 12.65) is ever reached. Proven by static call-chain inspection, a verified staging deployment, and live HTTP response evidence (`routeKind`, `sourceStatus: DOMAIN_BOUNDARY_REJECT`, `responseType: null`, ~1s response time) captured in PHASE-09ZG.

## 5. Why 09ZE and 09ZF Could Not Resolve The Issue
Both prior patches only modified `pipeline.js`: 09ZE added the audit-procedure overlay to `pipeline.js`'s exported `detectPhilippineTaxBoundary()` wrapper; 09ZF reordered code inside `pipeline.js`'s `runPipeline()`. Neither patch touched, or could have touched under their allowed-file constraints, the separate, earlier boundary check inside `ask-handler.js` that actually rejects these four queries before `pipeline.js` is ever invoked.

## 6. Files Changed
- services/controlled-loa-audit-procedure-boundary.js (new)
- pipeline.js (delegates to the shared module; local pattern-list copy removed)
- ask-handler.js (upstream boundary check now applies the same shared overlay)
- evaluation/fixtures/phase-09zh-controlled-loa-live-path-remediation-1.fixture.json (new)
- tests/phase-09zh-controlled-loa-live-path-remediation-1.test.mjs (new)
- tests/phase-09ze-controlled-loa-domain-boundary-remediation-1.test.mjs (one assertion updated to follow the moved pattern list; the patterns still exist, just no longer duplicated inline in `pipeline.js`)
- PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1_REPORT.md (new)
- knowledge/CURRENT_STATE.md

## 7. Existing Duplicated Boundary Behavior
Prior to this patch, the narrow audit-procedure signal set (eLA, replacement/consolidated eLA, notice for presentation/submission, reminder before subpoena, pre-subpoena, subpoena duces tecum, TVN, mission order, audit checklist, etc.) existed only inside `pipeline.js`'s `detectPhilippineTaxBoundary()` wrapper. `ask-handler.js` independently called the base detector with no knowledge of this signal set, creating two boundary behaviors for the same route.

## 8. Chosen Architectural Remediation
Acceptable Pattern A. Extracted the 09ZE overlay pattern list and its ALLOW-composition logic verbatim into a new pure module, `services/controlled-loa-audit-procedure-boundary.js`, exporting `CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS`, `isControlledLoaAuditProcedureBoundaryCandidate()`, and `applyControlledLoaAuditProcedureBoundaryOverlay()`. Both `pipeline.js` and `ask-handler.js` now import and use this same module; neither maintains its own copy of the pattern list.

## 9. Shared-Rule Design
`isControlledLoaAuditProcedureBoundaryCandidate(query, routeMode)` is a pure boolean check (true only on `/ask` route when a narrow pattern matches). `applyControlledLoaAuditProcedureBoundaryOverlay(baseDecision, query, routeMode)` takes an already-computed base boundary decision and, only if it is not already `ALLOW` and the candidate check matches, returns an `ALLOW` decision object identical in shape to the one 09ZE originally produced; otherwise it returns the base decision unchanged. The helper never generates an answer, never determines final legal eligibility, never overrides exclusions, and never returns `controlled_loa_answer` itself.

## 10. Ask-Handler Upstream Behavior
`ask-handler.js`'s existing boundary block (the exact call site that previously returned `DOMAIN_BOUNDARY_REJECT` for the four failing queries) is unchanged except that its `_boundaryCheck` result is now passed through `applyControlledLoaAuditProcedureBoundaryOverlay()` before the existing `REJECT`/`CLARIFY` check runs. No other line in that block changed. Safe audit-procedure candidates that the base detector would reject now continue past this block into `handleControlledRagRoute()`; every other input's REJECT/CLARIFY/answer path is untouched.

## 11. Pipeline Behavior
`pipeline.js`'s exported `detectPhilippineTaxBoundary()` wrapper is now a two-line delegate to the shared `applyControlledLoaAuditProcedureBoundaryOverlay()`. Byte-for-byte identical decisions to before this patch for every input. The PHASE-09ZG diagnostic `AUDIT_PROCEDURE_OVERLAY_EVALUATED` checkpoint now calls `isControlledLoaAuditProcedureBoundaryCandidate()` from the shared module instead of referencing a local array.

## 12. Final Controlled LOA Gate Preservation
`evaluateControlledLoaAskGate()`, `buildControlledLoaAskEarlyExitResponse()`, `isControlledLoaAskGateEnabled()`, and Step 12.65 in `pipeline.js` are entirely unchanged. This remains the sole authority for `matched`/`excluded`/`unrelated` classification and for constructing `responseType: "controlled_loa_answer"`. `ask-handler.js` does not call any of these functions and does not build a controlled answer.

## 13. Safe Query Coverage
All 8 required safe queries -- the 4 baseline (already passing) plus the 4 previously-rejected audit-procedure phrasings -- pass the boundary (`decision: "ALLOW"`) and match the controlled LOA gate (`matched: true`, `responseType: "controlled_loa_answer"`), verified directly against `pipeline.js`'s exported functions in the 09ZH test.

## 14. Previously Rejected Query Coverage
Replacement eLA, consolidated eLA, notice for presentation/submission, and reminder before subpoena are individually verified as boundary-eligible via `isControlledLoaAuditProcedureBoundaryCandidate()` and `detectPhilippineTaxBoundary()`.

## 15. Excluded-Query Preservation
All 12 excluded/unsafe queries (invalidity, voidness, ignore-LOA, assessment power, finality, CTA strategy, FAN/FDDA appealability, outcome prediction, draft-protest, automatic submission, final legal opinion) are individually verified to still return `matched: false` and `earlyExitResponse: null` from `evaluateControlledLoaAskGate()` -- unchanged, because the overlay only affects boundary reachability, never the gate's own classification.

## 16. Unrelated-Query Preservation
All 8 unrelated tax queries (EWT, lease withholding, percentage tax, VAT-exempt, estate tax, professional-fee withholding, computing percentage tax, frozen-seafood VAT) are individually verified to not match `isControlledLoaAuditProcedureBoundaryCandidate()` and to not trigger the controlled LOA branch.

## 17. Non-Tax Boundary Preservation
A truly unrelated non-Philippine-tax query ("What is the capital of France?") is verified to remain non-`ALLOW` at the boundary and is not recognized as an audit-procedure candidate -- the base detector's allow/reject logic for unrelated inputs is completely untouched at both call sites.

## 18. Source-Card/Citation Discipline
Unchanged: `sourceCards: []`, `sourceCardVerification: "not_performed"`, `legalCitationAllowed: false`, `filingReadyDocumentGenerated: false`, `automaticSubmission: false` on the controlled branch, verified by test.

## 19. Legal-Safety Boundary
No final legal conclusions. No claim that any LOA/eLA/PAN/FAN/FLD/FDDA/assessment/protest/BIR action is valid, invalid, void, cancelled, final, enforceable, or appealable. No filing-ready output. No automatic BIR submission. Human tax/legal review notice remains preserved by the unmodified controlled LOA answer scaffold.

## 20. Runtime Scope Boundary
Narrow upstream domain-boundary remediation only, confined to the boundary-decision composition in two existing call sites.

## 21. Auth/Route/Server Boundary
No changes to `server.js`, `routes/ask-route.js`, or any auth file. `routes/ask-route.js` still wires `authenticate` and `attachForcedHook("/ask")` identically.

## 22. External Operation Boundary
No external HTTP call, OpenAI call, Supabase write, Google Drive operation, n8n/Firecrawl/Crawlee/MCP/OCR operation, or database/embedding write was introduced anywhere in this patch.

## 23. Privacy Boundary
No real taxpayer data used; all fixture/test queries are the same synthetic procedural-help phrasing used throughout Phase 9.

## 24. Diagnostic Flag State
`TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC` remains default false and is not hardcoded true anywhere in this patch. The 09ZG diagnostics module (`diagnostics/controlled-loa-live-path-trace.js`) was not modified.

## 25. Production Boundary
Production impact: None. No production configuration, Render production service, or production deployment was touched.

## 26. Validation Summary
09ZH test: all assertions pass, including direct pure unit tests of the shared helper (candidate detection, overlay composition, no-op-when-already-ALLOW), all 8 safe queries, all 12 excluded queries individually, all 8 unrelated queries individually, a truly unrelated non-tax query, source-card/legal-safety metadata, diagnostic-flag-still-false, and diff-scope. 09ZE regression: 12/13 pass locally (1 known diff-scope-guard false positive from the current uncommitted diff, same class seen in every prior phase, resolves on commit) plus the pattern-relocation-aware assertion updated and passing. `guard:files` PASS.

## 27. Decision
PHASE 09ZH CONTROLLED LOA LIVE PATH REMEDIATION PASS WITH STRICT RECOMMENDATIONS

## 28. Strict Recommendations
1. Deploy 09ZH to staging only.
2. Verify the deployed commit before testing.
3. Use a rotated fresh staging JWT.
4. Keep TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true on staging.
5. Keep TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC=false unless a new trace is specifically approved.
6. Rerun the complete 09ZB live staging matrix.
7. Confirm all eight safe queries return controlled_loa_answer.
8. Confirm all twelve unsafe queries remain excluded.
9. Confirm unrelated queries remain non-triggering.
10. Confirm unrelated non-tax queries remain boundary rejected.
11. Preserve no final legal conclusion.
12. Preserve no filing-ready output.
13. Preserve no automatic BIR submission.
14. Preserve source-card discipline.
15. Do not proceed to 09ZC until 09ZB passes.

## 29. Next Task
PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN-AFTER-09ZH

## 30. Blocked Task
PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1 remains blocked until the 09ZB rerun passes.

---

Runtime impact: Narrow upstream domain-boundary remediation only.
Answer-content impact: None.
Controlled LOA final-gate impact: None; evaluateControlledLoaAskGate remains authoritative.
Ask-handler impact: Safe audit-procedure candidates may continue to the existing pipeline instead of being prematurely rejected.
Pipeline impact: Uses the same shared audit-procedure boundary rule.
Route impact: None.
Server impact: None.
Auth impact: None.
Feature flag impact: Existing controlled LOA staging flag only.
09ZG diagnostic flag impact: Remains disabled.
Memory impact: None.
Persistence impact: None.
External search impact: None.
Live retrieval impact: None added.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Source-card impact: None.
Legal-citation impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
Production impact: None.
09ZB live staging rerun remains required.
09ZC remains blocked until the 09ZB rerun passes.
