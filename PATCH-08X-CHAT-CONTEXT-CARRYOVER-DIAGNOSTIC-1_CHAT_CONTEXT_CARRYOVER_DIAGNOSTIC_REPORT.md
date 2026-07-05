# PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1 — Short-Term Chat / Session Context Carryover Diagnostic Report

## 1. Patch name and purpose

**Patch:** PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1

**Purpose:** Diagnose whether TINA carries short-term conversation context across
turns for follow-up tax questions, and identify the minimal future fix path. This
is a **diagnostic / evidence patch only**.

- Not persistent memory; not a Phase 8S security patch; not Phase 9 implementation.
- No runtime changes; no server.js/route/ask-handler/classifier/retrieval/prompt/
  DB/Supabase/env/package changes; no deployment; no memory enablement.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `833e2e5 PATCH-08S-FINAL-CLOSURE-GATE-1 close Phase 8S`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S:** closed (Gemini review accepted, PASS WITH
  STRICT RECOMMENDATIONS). **Phase 9:** not started. **Memory:** inactive.

## 3. Observed behavior

- **Turn 1:** "Is tobacco subject to VAT?"
- **Turn 2 (follow-up):** "How about fresh frozen seafood?"
- **Expected:** Turn 2 inherits the **VAT** issue and is answered as
  "Is fresh frozen seafood subject to VAT in the Philippines?" (VAT
  classification / exemption / zero-rated analysis with authority caveat).
- **Suspected actual:** Turn 2 is treated as standalone / non-tax, because the
  classifier and retriever never see the prior VAT turn.

## 4. Files and routes inspected

Files: `server.js`, `routes/index.js`, `routes/ask-route.js`, `routes/tax-route.js`,
`shared/mode-guards.js`, `ask-handler.js`, `pipeline.js`,
`issue-classification-engine.js`, `retrieval-engine.js`,
`context-orchestration-engine.js`, `conversation-memory.js`.

Routes: `POST /ask` and the 11 other mode routes (all delegate to the same
`askHandler` via `attachForcedHook`); `POST /conversations`, `GET /conversations`,
`GET /conversations/:conversationId/messages`.

## 5. Request contract findings

The ask path accepts a current message (`question`/`query`), a `conversationId`
or `sessionId`, an `x-conversation-id` header, and `mode`/`hook`. It does **not**
accept a client-supplied `messages[]` / `history[]` array — prior turns are
fetched **server-side** from Supabase via `getHistory(supabase, conversationId, 20)`
in `ask-handler.js`, and **only when** a conversationId/sessionId is supplied
(`getConversationId(req) = req.body.conversationId || req.body.sessionId ||
req.headers['x-conversation-id'] || null`).

## 6. Conversation persistence findings

Conversations and messages **are** persisted, and `ask-handler.js` **does** read
persisted history into the pipeline (line 2092–2105:
`const priorMessages = conversationId ? await getHistory(...) : []; runPipeline({ ..., conversationHistory: priorMessages })`).
However, that history is connected to the **final answer prompt only** — it is
**not** connected to issue classification or retrieval query construction, and
the whole path is gated on the caller supplying a conversationId/sessionId.

## 7. Frontend contract findings

This is the `tina-backend` repo; **no frontend source files** (`.jsx/.tsx/.vue/.svelte`)
are present. Whether the live frontend (`https://tina-fawn.vercel.app`) sends a
`conversationId`/`sessionId` (or recent turns) with each `/ask` request **cannot
be verified in this patch**. If the frontend omits it, even the prompt-level
history is empty (`priorMessages = []`) and all context is lost.

## 8. Issue classification findings

**Current-query-only.** `issue-classification-engine.js` has **zero** references
to `conversationHistory`/`priorMessages`/`history`. The pipeline passes only the
current `query` into classification. There is no follow-up detection, no
elliptical-query handling, and no inheritance of the prior tax issue.

## 9. Retrieval query findings

**Current-query-only.** `retrieval-engine.js` has **zero** references to
`conversationHistory`/`priorMessages`. Retrieval operates on the current `query`
only, and there is **no standalone-query rewrite / condensation stage** anywhere
in `pipeline.js` (zero matches for standalone/rewrite/followUp/condense). So
"How about fresh frozen seafood?" is retrieved verbatim, with no VAT/tax terms.

## 10. Prompt assembly findings

**Context-aware.** `context-orchestration-engine.js` uses `conversationHistory`
(lines 676–677 and 2482: `const history = safeArray(normalized.conversationHistory)`),
and `pipeline.js` forwards `conversationHistory` into
`callOpenAIWithOrchestration` at line 3928. The final answer prompt therefore
includes recent turns — but by generation time, the classification and retrieval
decisions (mode, tax-issue, source selection / SAE) were already made from the
current message in isolation, so the answer has already been steered wrong.

## 11. Root cause classification

Primary (strong evidence): **CLASSIFICATION_CONTEXT_GAP** and
**RETRIEVAL_REWRITE_GAP** — classification and retrieval see the current message
alone, and there is no standalone-query rewrite. Contributing:
**REQUEST_CONTRACT_GAP** (dependency on the frontend supplying a conversationId;
no `messages[]` payload accepted), **CONVERSATION_PERSISTENCE_DISCONNECTED**
(persistence feeds the prompt but not classification/retrieval), and therefore
**FRONTEND_AND_BACKEND** end-to-end. It is **not** a PROMPT_CONTEXT_GAP — the
prompt is already context-aware.

**Evidence strength: strong** for the backend classification/retrieval gap
(definitive static findings: 0 references in both engines; history forwarded only
to generation; prompt use confirmed). Moderate/unverifiable for the frontend
dependency, since the frontend is a separate repo.

## 12. Why this is not persistent memory

Short-term context = bounded recent turns of the **current** chat/session used to
disambiguate the current question. Persistent memory (Phase 8, inactive) =
durable, cross-session user profile/preferences/facts. This issue must be solved
with **bounded short-term context**, not persistent memory. No
`TINA_ENABLE_MEMORY_*` flag, no memory DB, and no durable user memory are
required or permitted.

## 13. Phase 8S boundary

This is **not** a security closure issue. **Phase 8S remains closed**, and its
future security items (headers, rate limits, recon minimization, query-secret
removal, tenant isolation, logging redaction, egress controls) remain tracked.

## 14. Phase 9 implications

Phase 9 professional workflows (tax memo, BIR reply, protest letter, audit
defense matrix, compliance advisory) are inherently multi-turn with clarification.
A tax memo or BIR-reply workflow will routinely involve follow-ups like "and for
the input VAT?" or "how about the local business tax?". If TINA cannot carry
short-term context into classification and retrieval, Phase 9 UX and correctness
will suffer. This should be diagnosed/fixed before professional-workflow buildout,
and it does **not** permit client/matter persistence without tenant isolation.

## 15. Future fix options

**Option A — API recent-turns / messages payload (RECOMMENDED).** Frontend sends
bounded last-N turns (or a conversationId); backend accepts a bounded
`recentTurns`/`messages` payload and builds a **standaloneQuery** used for
classification and retrieval; the final prompt keeps bounded recent context.
*Pros:* general (handles elliptical + pronoun follow-ups); no persistent memory;
works without server-side persistence. *Cons/security:* turns must be
size-bounded/validated and may contain P1/P2 content — apply request-size policy
and logging redaction.

**Option B — conversationId-based backend fetch.** Ask route receives
conversationId; backend uses the existing `getHistory` to build a standaloneQuery
for classification/retrieval, not just the prompt. *Pros:* reuses existing
persistence and conversationId path; no client history payload. *Cons/security:*
depends on the frontend reliably sending conversationId; touches user/client/matter
data → tenant-isolation considerations before broader runtime use.

**Option C — pure follow-up rewrite helper.** A pure helper detects elliptical
follow-ups ("how about X?", "what about X?", "and X?", "same with X?") and
rewrites them with the previous tax issue, used before classification/retrieval.
*Pros:* low risk, pure/testable, no persistence; directly addresses the observed
case. *Cons:* less general (heuristic gaps); still needs the prior issue available.

## 16. Recommended next patch

**`PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1`** (design-first). Design-first is
safest: it can specify the bounded standaloneQuery/rewrite stage that runs before
classification and retrieval (Option A preferred, with Option C rewrite
heuristics as a fallback), confirm the frontend conversationId/recent-turns
contract, and set the redaction/tenant-isolation guardrails — all with no runtime
change. A scaffold/implementation patch should follow only after the design and
elliptical-follow-up test cases are approved.

## 17. Validation results

```text
node tests/patch-08x-chat-context-carryover-diagnostic-1.test.mjs
PASS - 20 passed, 0 failed, 145 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
PASS - 22 passed, 0 failed, 203 assertions

node tests/patch-08s-staging-security-smoke-1.test.mjs
PASS - 28 passed, 0 failed, 236 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed
```

## 18. Final decision

```text
CHAT CONTEXT CARRYOVER DIAGNOSTIC PASS WITH FINDINGS
```

## 19. Strict recommendations

1. Do not use persistent memory for this issue.
2. Use bounded short-term chat/session context.
3. Build a standalone-query / rewrite stage before classification and retrieval.
4. Keep authority/retrieval discipline unchanged.
5. Keep Phase 8S closed.
6. Keep Phase 9 not started until this diagnostic track is designed.
7. Add tests for elliptical tax follow-ups before implementation.
8. Do not introduce client/matter persistence without tenant isolation.
9. Do not log P1/P2 recent turns without redaction.
10. Preserve Phase 10 and Phase 11 boundaries.

## 20. Next task

```text
PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1
```

Do not start it inside this patch.
