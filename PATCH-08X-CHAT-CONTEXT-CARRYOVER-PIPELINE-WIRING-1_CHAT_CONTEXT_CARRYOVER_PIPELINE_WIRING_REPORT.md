# PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1 — Feature-Flagged StandaloneQuery Pipeline Wiring Report

## 1. Patch name and purpose

**Patch:** PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1

**Purpose:** Wire the pure short-term context carryover helper into the runtime
pipeline behind a new feature flag so that, when explicitly enabled, a bounded
`standaloneQuery` is built and used for issue classification and retrieval. The
flag is **OFF by default**; with the flag off, behavior is byte-identical to
prior behavior. No persistent memory; no Phase 9; no deployment.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `ff07be7 PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1 add pure follow-up rewrite helper`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S:** closed. **08X diagnostic/design/scaffold:** complete.
  **Phase 9:** not started. **Memory:** inactive.

## 3. Diagnostic / design / scaffold basis

Per the 08X diagnostic (`38d5b9e`), classification and retrieval were
current-query-only (root cause **CLASSIFICATION_CONTEXT_GAP + RETRIEVAL_REWRITE_GAP**).
Per the design (`dae4128`), the fix is a bounded `standaloneQuery` stage before
classification and retrieval. Per the scaffold (`ff07be7`), the pure helper
`helpers/chat-context-carryover.js` was implemented and unit-tested. This patch
wires that helper into `pipeline.js` behind a feature flag.

## 4. Feature flag

- **Name:** `TINA_ENABLE_CHAT_CONTEXT_CARRYOVER`
- **Default:** OFF.
- **Enabled values:** `1` / `true` / `on` / `yes` (case-insensitive).
- **Disabled values:** absent / empty / `0` / `false` / `off` / `no`.
- **Env changed:** no. **Staging enabled:** no. **Production enabled:** no.

The parser mirrors the existing `isClarificationRouteGateEnabled` convention in
`pipeline.js`.

## 5. Runtime files changed

- `pipeline.js` — the only runtime file modified.

`ask-handler.js` was **not** changed: it already fetches `priorMessages` via
`getHistory(conversationId, 20)` and passes `conversationHistory` into
`runPipeline`, so no ask-handler change was required. `server.js`, routes,
`issue-classification-engine.js`, `retrieval-engine.js`,
`context-orchestration-engine.js`, `source-availability-engine.js`,
`conversation-memory.js`, and the helper were **not** modified.

## 6. Wiring summary

- **Helper import:** `import { buildShortTermContextCarryover } from "./helpers/chat-context-carryover.js";`.
- **Flag parser + resolver** added next to the existing clarification-gate flag:
  `isChatContextCarryoverEnabled(env = process.env)` and the pure
  `resolveChatContextCarryoverForPipeline({ enabled, currentQuery,
  conversationHistory, conversationId, sessionId })`.
- **Recent turns:** the resolver uses the already-fetched `conversationHistory`
  (bounded to 20 by the ask flow), and the helper bounds it further to 6 turns
  for rewrite. No new DB reads; no persistence expansion.
- **Effective query** is computed once near the top of `runPipeline`:
  `const effectiveQuery = _chatContextCarryover.effectiveQuery;` where
  `effectiveQuery = decision.applied ? decision.standaloneQuery : query`.
- **Classification** uses it: `classify(effectiveQuery)` (previously `classify(query)`).
- **Retrieval** uses it: `retrieveRelevantSources({ query: effectiveQuery, … })`
  (previously `{ query, … }`).
- **Original query preserved:** generation still receives the original `query`
  (`callOpenAIWithOrchestration({ … query, userQuery: query, … })`), unchanged.
- A safe trace is attached at `ctx.chatContextCarryover` with only:
  `chatContextCarryoverEnabled`, `chatContextCarryoverApplied`,
  `standaloneQueryUsed`, `inheritedTaxType`, `inheritedJurisdiction`,
  `riskFlags`, `boundedTurnCount` — **no raw recent-turn content**.

## 7. Flag-off behavior

With the flag OFF (default), `resolveChatContextCarryoverForPipeline` returns
`effectiveQuery === query` and does not invoke the helper for rewrite, so
`classify(effectiveQuery)` and `retrieveRelevantSources({ query: effectiveQuery })`
receive the original query exactly as before. **Live behavior is unchanged by
default.** This is confirmed by the full regression gate: every pipeline
behavior suite passed unchanged (only the Phase 8 memory diff-guard suites, which
assert an empty unstaged `git diff`, required the change to be staged — the
established repo convention).

## 8. Flag-on behavior

With the flag ON, for "Is tobacco subject to VAT?" then "How about fresh frozen
seafood?", the resolver builds
`standaloneQuery = "Is fresh frozen seafood subject to VAT in the Philippines?"`,
so `effectiveQuery` becomes that standalone query for **classification** and
**retrieval**. The final answer still answers the original current query, using
retrieved/source-backed authorities. When no bounded follow-up applies (non-tax,
reset, jurisdiction switch, no prior issue), `effectiveQuery` falls back to the
original query.

## 9. Source authority discipline

No citations are created from history; the helper returns no legal conclusion;
SAE and source-card behavior are unchanged; retrieval must still find valid
source-backed authority; if no authority is found, TINA still says so. The
effective query only improves the query fed to the existing classifier/retriever.

## 10. Security/privacy controls

No persistent memory; no `TINA_ENABLE_MEMORY_*` flags; no raw recent-turn
logging; no P1/P2 third-party (Langfuse) egress added; no DB/persistence
expansion. Tenant isolation remains required before any future client/matter
persistence (Phase 8S tenant-isolation gate).

## 11. Frontend contract limitation

The backend supports `conversationId`/`sessionId`/`x-conversation-id`, and the
carryover uses server-side `conversationHistory`. The frontend
(`tina-fawn.vercel.app`, a separate repo) is **not verified** in this patch — if
it omits a `conversationId`/`sessionId`, the fetched history (and therefore
recent turns) may be empty, and the carryover harmlessly no-ops. Frontend
verification remains required before staging smoke or deployment confidence.

## 12. Staging/production status

No deployment in this patch. The staging flag is OFF/not set; the production
flag is OFF/not set. The live issue is **not** considered fixed until the flag is
enabled in staging and a staging smoke passes with the flag on.

## 13. Validation results

```text
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
GATE PASSED - 0 failed (run with the patch staged; the Phase 8 memory diff-guard
suites assert an empty unstaged `git diff --name-only`, so the gate is run with
`pipeline.js` staged, per the established repo convention. `pipeline.js` is not in
any guard's forbidden protected-file list.)
```

The focused wiring test does **not** import `pipeline.js` (which has module-load
side effects and reads env); it imports the pure helper, mirrors the resolver's
effective-query semantics, and statically verifies the `pipeline.js` wiring in
source text.

## 14. Final decision

```text
CHAT CONTEXT CARRYOVER PIPELINE WIRING PASS WITH STRICT RECOMMENDATIONS
```

## 15. Strict recommendations

1. Do not enable the feature flag in production.
2. Enable only in staging after review.
3. Confirm the frontend `conversationId`/`sessionId` behavior.
4. Run `PATCH-08X-CHAT-CONTEXT-CARRYOVER-STAGING-SMOKE-1` with synthetic examples.
5. Do not use persistent memory.
6. Do not log raw recent turns.
7. Do not send P1/P2 recent turns to Langfuse/third-party tools.
8. Preserve source authority discipline.
9. Keep Phase 9 not started until context carryover is smoke-tested or explicitly accepted.
10. Preserve Phase 10 and Phase 11 boundaries.

## 16. Next task

```text
PATCH-08X-CHAT-CONTEXT-CARRYOVER-STAGING-SMOKE-1
```

Only after the staging flag is explicitly enabled and the frontend
`conversationId`/`sessionId` behavior is confirmed or testable. Do not start it
inside this patch.
