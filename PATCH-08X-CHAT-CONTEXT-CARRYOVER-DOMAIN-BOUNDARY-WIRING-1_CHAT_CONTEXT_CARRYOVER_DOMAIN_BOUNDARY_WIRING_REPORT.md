# PATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1 — Feature-Flagged Domain Boundary Carryover Wiring Report

## 1. Patch name and purpose

**Patch:** PATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1

**Purpose:** Wire the existing pure chat-context carryover helper into the
Philippine-tax **domain boundary** pre-check (in `ask-handler.js`) so that, when
the feature flag is ON, an eligible elliptical tax follow-up is evaluated as its
bounded standalone query and is not fail-closed-rejected before the pipeline can
run. The flag remains **OFF by default**; with the flag off, behavior is
unchanged. No persistent memory; no Phase 9; no deployment.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `16b35fe PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1 wire flag-gated standalone query`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S:** closed. **Phase 9:** not started. **Memory:** inactive.

## 3. Live-log evidence summary

- Turn 1 "Is tobacco subject to VAT?" reached the pipeline and classified as VAT.
- Turn 2 "How about fresh frozen seafood?" was rejected at the domain boundary:
  `detectedDomain: UNCLASSIFIED`, `isPhilippineTax: false`, `decision: REJECT`,
  `reason: fail_closed_no_tax_signal`, `blocked: true`, `pipelineReached: false`,
  `retrievalReached: false`, `openAIReached: false`.
- The route log included a `sessionId` (e.g. `d989e360-…`), so the session path
  is present, but the boundary rejected the follow-up before the pipeline (and
  its 16b35fe carryover) could run.
- **Root cause:** `DOMAIN_BOUNDARY_CONTEXT_GAP` — the boundary was
  current-query-only.

## 4. Diagnostic / design / scaffold / pipeline-wiring basis

Diagnostic (`38d5b9e`) → classification/retrieval current-query-only. Design
(`dae4128`) → bounded standaloneQuery stage. Scaffold (`ff07be7`) → pure helper
`helpers/chat-context-carryover.js`. Pipeline wiring (`16b35fe`) → flag-gated
`effectiveQuery` for classification/retrieval inside `pipeline.js`. This patch
extends the same flag and helper to the domain boundary pre-check that runs
**before** the pipeline.

## 5. Runtime files changed

- `ask-handler.js` — the only runtime file modified.

`pipeline.js`, `server.js`, `routes/index.js`, `shared/mode-guards.js`,
`services/philippine-tax-domain-boundary.js`, `issue-classification-engine.js`,
`retrieval-engine.js`, `source-availability-engine.js`,
`context-orchestration-engine.js`, `conversation-memory.js`, and the helper were
**not** modified.

## 6. Feature flag

- **Name:** `TINA_ENABLE_CHAT_CONTEXT_CARRYOVER` — reused from the pipeline-wiring
  patch (single source of truth via `isChatContextCarryoverEnabled()` imported
  from `pipeline.js`).
- **Default:** OFF. **Env changed:** no. **Staging/production enabled:** no.

## 7. Domain boundary wiring summary

In `ask-handler.js` `handleAsk`, immediately before the fail-closed boundary
check:

- `isChatContextCarryoverEnabled()` (imported from `./pipeline.js`) and
  `buildShortTermContextCarryover` (imported from
  `./helpers/chat-context-carryover.js`) are used.
- When the flag is ON **and** a `conversationId` is present, a **narrow, bounded,
  read-only** `getHistory(supabase, conversationId, 20)` supplies recent turns
  (reusing the existing function; no persistence, no writes). The helper bounds
  it further to 6 turns for rewrite.
- The boundary query is resolved as
  `_boundaryQuery = decision.applied ? decision.standaloneQuery : _originalBoundaryQuery`.
- The existing `detectPhilippineTaxBoundary(_boundaryQuery, hook_code)` still runs
  and still decides ALLOW/REJECT — there is **no unconditional bypass**. An
  eligible tax follow-up is allowed only because its standalone query itself
  passes the boundary's PH-tax criteria.
- A safe trace is added to the existing `[DOMAIN BOUNDARY CHECK]` log with only:
  `domainBoundaryCarryoverEnabled`, `domainBoundaryCarryoverApplied`,
  `domainBoundaryStandaloneQueryUsed`, `inheritedTaxType`,
  `inheritedJurisdiction`, `boundedTurnCount` — **no raw recent turns / no prior
  message contents**.

## 8. Flag-off behavior

With the flag OFF (default), `isChatContextCarryoverEnabled()` is false, so no
`getHistory` fetch runs and the boundary evaluates the original query exactly as
before. **Live behavior is unchanged by default** — confirmed by the full
regression gate (all suites pass; only the Phase 8 memory diff-guard suites
required the change to be staged, per the established repo convention).

## 9. Flag-on behavior

For "Is tobacco subject to VAT?" then "How about fresh frozen seafood?", the
helper builds `standaloneQuery = "Is fresh frozen seafood subject to VAT in the
Philippines?"`, which becomes the boundary query; `detectPhilippineTaxBoundary`
returns ALLOW (`isPhilippineTax: true`), so the follow-up reaches the pipeline,
where 16b35fe applies the same carryover for classification/retrieval. The final
answer still answers the original user query.

**Verified against the real boundary** (`detectPhilippineTaxBoundary`):
- raw "How about fresh frozen seafood?" → REJECT (the live bug);
- rewritten "Is fresh frozen seafood subject to VAT in the Philippines?" → ALLOW.

## 10. Rejection behavior preserved

Non-tax ("What is the weather?", "Tell me about seafood recipes.") → the helper
does not apply (not a tax follow-up), so the boundary query stays original and is
REJECTED. Reset ("Forget VAT, explain EWT.") and jurisdiction switch ("In the US,
how is this taxed?") → the helper does not inherit (`applied: false`), so no
Philippine-VAT is injected. A follow-up with no prior tax context → not
auto-allowed. The standalone query must itself pass the boundary.

## 11. Source authority discipline

No citations from history; no legal conclusion from the helper; no source
availability from history. The SAE and source cards are unchanged; retrieval must
still find valid authority. Domain-boundary carryover only determines whether an
eligible follow-up may **reach** the pipeline.

## 12. Security/privacy controls

No persistent memory; no `TINA_ENABLE_MEMORY_*` flags; no raw recent-turn
logging; no P1/P2 third-party (Langfuse) egress added; no DB/persistence
expansion. The added history read is read-only and bounded (20), gated on the
flag and a present `conversationId`.

## 13. Frontend contract limitation

The route log shows a `sessionId` exists, and the backend supports
`conversationId`/`sessionId`/`x-conversation-id`. The frontend
(`tina-fawn.vercel.app`, a separate repo) is **not fully verified** here — if the
session id is missing, the carryover harmlessly no-ops. Staging smoke is still
needed.

## 14. Staging/production status

No deployment in this patch. The staging flag is OFF/not set; the production flag
is OFF/not set. The live issue is **not** considered fixed until the flag is
enabled in staging and a staging smoke passes.

## 15. Validation results

```text
node tests/patch-08x-chat-context-carryover-domain-boundary-wiring-1.test.mjs
PASS - 18 passed, 0 failed, 130 assertions

node tests/patch-08x-chat-context-carryover-pipeline-wiring-1.test.mjs
PASS - 19 passed, 0 failed, 138 assertions

node tests/patch-08x-chat-context-carryover-scaffold-1.test.mjs
PASS - 15 passed, 0 failed, 231 assertions

node tests/patch-08x-chat-context-carryover-design-1.test.mjs
PASS - 27 passed, 0 failed, 168 assertions

node tests/patch-08x-chat-context-carryover-diagnostic-1.test.mjs
PASS - 20 passed, 0 failed, 145 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
PASS - 22 passed, 0 failed, 203 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed (run with ask-handler.js staged; the Phase 8 memory
diff-guard suites assert an empty unstaged `git diff --name-only`. ask-handler.js
is not in any guard's forbidden protected-file list.)
```

The focused test does not import `ask-handler.js`/`pipeline.js`/the services
boundary (all have module-load side effects); it imports the pure helper, mirrors
the boundary-query resolution, and statically verifies the `ask-handler.js`
wiring.

## 16. Final decision

```text
CHAT CONTEXT CARRYOVER DOMAIN BOUNDARY WIRING PASS WITH STRICT RECOMMENDATIONS
```

## 17. Strict recommendations

1. Do not enable the feature flag in production.
2. Enable only in staging after review.
3. Run `PATCH-08X-CHAT-CONTEXT-CARRYOVER-STAGING-SMOKE-1` with synthetic examples.
4. Confirm frontend/session behavior during smoke.
5. Do not use persistent memory.
6. Do not log raw recent turns.
7. Preserve source authority discipline.
8. Keep Phase 9 not started until context carryover is smoke-tested or explicitly accepted.
9. Preserve Phase 10 and Phase 11 boundaries.

## 18. Next task

```text
PATCH-08X-CHAT-CONTEXT-CARRYOVER-STAGING-SMOKE-1
```

Only after the staging flag is explicitly enabled. Do not start it inside this patch.
