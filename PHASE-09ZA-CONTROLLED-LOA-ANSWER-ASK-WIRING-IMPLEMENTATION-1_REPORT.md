# PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1 — Report

## 1. Patch name

PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1

## 2. Purpose

Implement the actual controlled `/ask` wiring for the narrow LOA/eLA
procedural-help query family "I received a BIR LOA, what should I do?"
by adding a single narrow, feature-flag-gated, fail-open gate in
`pipeline.js` that calls only the pure 09Y scaffold
(`workflow/controlled-loa-answer-runtime-scaffold.js`) and returns a
procedural-guidance-only answer for classified-safe queries, while every
other `/ask` query (including validity/finality/prescription/CTA-
strategy/filing-ready/automatic-submission/legal-opinion requests)
continues on the existing, unchanged `/ask` path.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `75d90b2 PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1 gate controlled loa ask wiring`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 9 formally CLOSED, scaffold-complete, governance-safe. Phase 9X
  design complete. Phase 9Y scaffold complete. Phase 9Z ask-wiring gate
  complete (09Y scaffold readiness for future `/ask` wiring: PASS; live
  `/ask` LOA behavior changed in 09Z: No; runtime activation approved in
  09Z: No; runtime governance recommendation:
  PASS_WITH_ASK_WIRING_IMPLEMENTATION_DEFERRED).

## 4. Files changed

- `pipeline.js` (modified — narrow controlled-LOA `/ask` gate added)
- `evaluation/fixtures/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.fixture.json` (new)
- `tests/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.test.mjs` (new)
- `PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

`workflow/controlled-loa-answer-runtime-scaffold.js` was imported by
`pipeline.js` but not modified. `ask-handler.js`, `server.js`, route
files, auth files, CORS/security-header files, database/migration files,
package files, and frontend files were not modified.

## 5. Implementation type

Narrow controlled `/ask` wiring implementation. Feature-flag-gated,
fail-open, off by default.

## 6. Chosen runtime hook point

`pipeline.js`, inside `runPipeline()`, immediately after the existing
Step 12.6 clarification route gate block and before Step 13 (adaptive
master prompt construction).

## 7. Reason for chosen hook point

An already-approved, structurally identical narrow safety gate
(`evaluateClarificationRouteGate`, added by a prior patch) exists at
exactly this point in `runPipeline()`, where `query`, `ctx`, and `hook`
are already resolved and before prompt construction/OpenAI generation.
The new controlled-LOA gate (`evaluateControlledLoaAskGate`) mirrors that
exact structure: feature-flag-gated (default OFF via
`TINA_ENABLE_CONTROLLED_LOA_ASK_GATE`), fails open on any internal error
(falls through to the existing `/ask` flow), and runs only after the
clarification gate has not already early-exited. It calls only the pure,
zero-import 09Y scaffold — no external calls, no I/O, no authority
retrieval. Its early-exit response reuses the exact same response-object
shape already produced by `buildClarificationFallback` (already tested
and already flowing correctly through `ask-handler.js` to the client), so
`ask-handler.js` requires zero changes. This required touching only one
runtime file (`pipeline.js`).

## 8. Controlled `/ask` branch behavior

1. Extracts the user query from the same `query`/`ctx`/`hook` variables
   already resolved earlier in `runPipeline()`.
2. Calls `normalizeControlledLoaAnswerInput` then `classifyControlledLoaIntent`
   from the 09Y scaffold.
3. If the gate is disabled (default), or the hook is not `/ask`, or the
   classification is not `supported === true` with `excluded === false`
   and a response mode in `{SAFE_BASIC_LOA_GUIDANCE,
   REPLACEMENT_ELA_REVIEW_GUIDANCE, CONSOLIDATED_ELA_REVIEW_GUIDANCE,
   DOCUMENT_CHECKLIST_GUIDANCE, PRE_SUBPOENA_ESCALATION_GUIDANCE,
   UNKNOWN_BIR_NOTICE_GUIDANCE}`, the gate returns `matched: false` and
   the pipeline continues its existing flow unchanged.
4. Otherwise it calls `createControlledLoaAnswerRuntimeScaffoldResult`,
   verifies `runtimeActive === false` and `liveAskWired === false` on the
   scaffold result (fail-open if not), and builds an early-exit response
   from `scaffoldResult.safeResponsePreview` plus adapter metadata.
5. Any thrown error anywhere in this sequence is caught and the gate
   fails open (falls through to the existing `/ask` flow) with a warning
   logged to `trace.warnings`.

## 9. Safe LOA/eLA query behavior evidence

All 8 sample safe queries (basic LOA, basic eLA, Letter-of-Authority
first-steps, documents-to-prepare, replacement eLA, consolidated eLA,
notice-for-presentation, pre-subpoena) return `matched: true` with a
`controlled_loa_answer` early-exit response when the gate is enabled —
verified by test.

## 10. Excluded unsafe query behavior evidence

All 9 sample excluded queries (LOA invalidity, eLA voidness, ignore-the-
LOA, BIR-assessment-power, assessment finality, CTA strategy, filing-
ready protest, automatic BIR submission, final legal opinion) return
`matched: false` with `earlyExitResponse: null` even when the gate is
enabled, meaning they fall through to the existing `/ask` flow and never
receive the controlled safe LOA answer — verified by test.

## 11. Unrelated query non-trigger evidence

3 unrelated generic tax queries (EWT rate, VAT applicability, estate tax
computation) all return `matched: false` — the controlled LOA branch is
never triggered for queries outside its narrow scope — verified by test.

## 12. Controlled answer content evidence

The controlled response's `answer` field (built from the 09Y scaffold's
`safeResponsePreview`) includes "This is procedural guidance only.",
human tax/legal review notice, preserve-date-of-receipt, taxpayer/TIN/
taxable-period/tax-types detail-check, LOA/eLA verification via REVIE/LOA
Verifier under RMC No. 5-2026, document compliance matrix, controlled
transmittal, proof of submission, do-not-fabricate warning, avoid-
unnecessary-admissions guidance, and the NOD/DOD/PAN/FAN/FLD/protest/
FDDA/CTA appeal-watch stage-monitoring list — verified by test.

## 13. Source-card/citation discipline evidence

The controlled response's `sourceCards` array is always empty. Its
`controlledLoaAnswer` metadata always sets `sourceCardVerification:
"not_performed"` and `legalCitationAllowed: false`. No live retrieval is
performed and no source card is ever presented as verified controlling
authority; the answer text only states that official-source verification
is required and references the BIR verification process (REVIE/LOA
Verifier) in non-verified, procedural-safe phrasing.

## 14. Response shape compatibility evidence

The controlled early-exit response reuses the exact same top-level field
set already produced by the pre-existing, tested `buildClarificationFallback`
function (`answer`, `sources`, `sourcesUsed`, `sourceCards`,
`retrievedSourceCount`, `displayedSourceCount`, `responseType`,
`answerAllowed`, `mode`, `pipelineVersion`, `trace`, `openaiCalls`, plus a
new `controlledLoaAnswer` adapter-metadata field), so `ask-handler.js`
requires no changes to surface it to the existing frontend contract.

## 15. Security/auth boundary evidence

`auth.js` was not modified. No route file was modified. `server.js` was
not modified. CORS/security-header behavior is untouched. Unauthenticated
`/ask` behavior, OPTIONS `/ask` behavior, `/health`, and `/routes` are all
unaffected because none of those code paths were touched — confirmed by
`git diff --name-only` showing only `pipeline.js` as the runtime file
changed, verified by test.

## 16. Runtime scope boundary evidence

The new gate is off by default (`TINA_ENABLE_CONTROLLED_LOA_ASK_GATE`
unset). It does not wire 09L, 09M, 09O, 09P, 09Q, or 09S directly into
`/ask` — the 09Y scaffold remains the sole runtime-facing adapter. The
09Y scaffold's own `runtimeActive`/`liveAskWired` fields remain `false` in
every result; only the new pipeline-level adapter metadata (`controlledLoaAnswer`)
is added outside the 09Y scaffold result object.

## 17. External operation boundary evidence

No live retrieval, external search, scraping, download, OCR, ingestion,
embedding, database write, OpenAI/Supabase/Google Drive/n8n/Firecrawl/
Crawlee/MCP call, or new external HTTP call was added — confirmed by a
static scan restricted to the newly added lines in `pipeline.js` (via
`git diff`), which contains none of these patterns.

## 18. Privacy boundary evidence

No real taxpayer names, TINs, LOA/eLA numbers, audit case numbers, BIR
officer names, or exact assessment amounts appear anywhere in the new
fixture, this report, or any generated controlled response — verified by
test using a split-token-constructed scan list.

## 19. Legal-safety boundary evidence

The controlled response never claims that any LOA/eLA/PAN/FAN/FLD/FDDA/
assessment/protest/BIR action is valid, invalid, void, cancelled, final,
enforceable, or appealable, and contains none of the 18 documented
prohibited claim phrases — verified by test. No filing-ready output is
ever generated and no automatic BIR submission is ever performed.

## 20. Future 09ZB staging smoke boundary

PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 is the next expected
task if controlled live LOA answering remains the immediate priority. It
should observe the controlled branch's behavior on staging (with the
feature flag deliberately enabled in a controlled staging environment
only) before any production activation is considered.

## 21. Phase 10 boundary

Not implemented by this patch. Phase 10 — Evaluation / Fact-Check /
Legal-Tax QA System — remains an alternative next phase.

## 22. Authority ingestion boundary

No live authority ingestion, search, or retrieval is implemented or
performed by this patch.

## 23. Memory/persistence boundary

Memory remains inactive; no persistence, client/matter storage, or
generated-work-product storage is introduced by this patch.

## 24. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced by this patch.

## 25. Mobile app deferral evidence

Mobile app work remains deferred until after Phase 13. No mobile app
artifacts were introduced by this patch.

## 26. Required exact and conditional report statements

Ask-handler impact: None.
Pipeline impact: Controlled narrow LOA branch only.
Runtime impact: Controlled narrow /ask LOA branch only.
Route impact: None.
Server impact: None.
Feature flag impact: None.
Memory impact: None.
Persistence impact: None.
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Production deployment impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
Live LOA /ask behavior changed: Yes, controlled narrow branch only.

## 27. Validation summary

```
node tests/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.test.mjs
  → PASS / 20 passed / 0 failed / 275 assertions

node tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs
  → PASS / 25 passed / 0 failed / 320 assertions

node tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs
  → PASS / 30 passed / 0 failed / 629 assertions

node tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 180 assertions

node tests/phase-09-gate-closure-1.test.mjs
  → PASS / 29 passed / 0 failed / 1562 assertions

node tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs
  → PASS / 76 passed / 0 failed / 363 assertions

node tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 467 assertions

node tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs
  → PASS / 36 passed / 0 failed / 333 assertions

node tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 605 assertions

node tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs
  → PASS / 35 passed / 0 failed / 336 assertions

node tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs
  → PASS / 47 passed / 0 failed / 398 assertions

node tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 184 assertions

node tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs
  → PASS / 36 passed / 0 failed / 179 assertions

node tests/phase-09r-tax-memo-runtime-wiring-integration-design-1.test.mjs
  → PASS / 54 passed / 0 failed / 202 assertions

node tests/phase-09r-tax-memo-runtime-wiring-scaffold-1.test.mjs
  → PASS / 113 passed / 0 failed / 212 assertions

node tests/phase-09i-requirements-request-letter-schema-scaffold-1.test.mjs
  → PASS / 56 passed / 0 failed / 333 assertions

node tests/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.test.mjs
  → PASS / 69 passed / 0 failed / 172 assertions

node tests/phase-09g-workflow-output-governance-gate-1.test.mjs
  → PASS / 73 passed / 0 failed / 213 assertions

node tests/phase-09f-client-advisory-checklist-scaffold-1.test.mjs
  → PASS / 75 passed / 0 failed / 404 assertions

node tests/phase-09e-bir-reply-draft-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 243 assertions

node tests/phase-09d-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 203 assertions

node tests/phase-09c-tax-memo-schema-scaffold-1.test.mjs
  → PASS / 47 passed / 0 failed / 149 assertions

node tests/phase-09b-workflow-mode-registry-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 363 assertions

node tests/phase-09a-professional-workflow-copilot-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 75 assertions

node tests/patch-08s-followup-index-secret-header-auth-staging-smoke-1.test.mjs
  → PASS / 23 passed / 0 failed / 92 assertions

node tests/patch-08x-chat-context-carryover-final-gate-1.test.mjs
  → PASS / 17 passed / 0 failed / 127 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
  → PASS / 22 passed / 0 failed / 203 assertions

node tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs
  → PASS / 13 passed / 0 failed

node tests/patch-027n-wht-jurisprudence-sae-guard.test.mjs
  → PASS / 26 passed / 0 failed

node tests/patch-027o-generic-ewt-acronym-guard.test.mjs
  → PASS / 87 passed / 0 failed

node tests/patch-035b-ra10963-bridge.test.mjs
  → PASS / 14 passed / 0 failed

node tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
  → PASS / 5 passed / 0 failed

npm run guard:files
  → PASS: No protected files modified

npm test
  → GATE PASSED / 169 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 28. Decision

**PHASE 09ZA CONTROLLED LOA ANSWER ASK WIRING IMPLEMENTATION PASS WITH STRICT RECOMMENDATIONS**

## 29. Strict recommendations

1. Proceed to PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 before
   treating the live behavior as confirmed.
2. Keep 09ZA narrowly scoped to LOA/eLA procedural-help queries only.
3. Preserve excluded-query fallback for validity, finality, prescription,
   CTA strategy, protest strategy, filing-ready requests, automatic
   submission, and legal-opinion requests.
4. Preserve no final legal conclusion.
5. Preserve no filing-ready document generation.
6. Preserve no automatic BIR submission.
7. Preserve source-card discipline: no legal citation unless verified
   source cards are available.
8. Preserve auth/security headers/route behavior.
9. If broader reliability is preferred after 09ZB, proceed to Phase 10.

## 30. Next task

**PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1**

## 31. Alternative next phase

**PHASE 10 — Evaluation / Fact-Check / Legal-Tax QA System**.
