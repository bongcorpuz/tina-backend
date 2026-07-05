# PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1 — Short-Term Chat Context Carryover Design Report

## 1. Patch name and purpose

**Patch:** PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1

**Purpose:** Design the safest bounded short-term chat/session context carryover
solution so TINA can correctly handle follow-up tax questions before issue
classification and retrieval. **Design-only** — not persistent memory, not a
runtime fix, not Phase 9 implementation, and no runtime changes.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `38d5b9e PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1 diagnose chat context carryover`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S:** closed (Gemini review accepted, PASS WITH
  STRICT RECOMMENDATIONS). **08X diagnostic:** complete. **Phase 9:** not started.
  **Memory:** inactive.

## 3. Diagnostic basis

Per PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1 (`38d5b9e`): issue classification
and retrieval are **current-query-only** (zero references to conversation history
in `issue-classification-engine.js` and `retrieval-engine.js`); `conversationHistory`
reaches only the final answer prompt (already context-aware, so **not** the root
cause); there is **no standalone-query rewrite stage**; and the frontend is a
separate repo, so whether it sends a `conversationId`/`sessionId` is unverified.
Root cause: **CLASSIFICATION_CONTEXT_GAP + RETRIEVAL_REWRITE_GAP**, contributing
**REQUEST_CONTRACT_GAP** and **CONVERSATION_PERSISTENCE_DISCONNECTED**.

## 4. Problem statement

Turn 1 "Is tobacco subject to VAT?" followed by Turn 2 "How about fresh frozen
seafood?" should be understood as "Is fresh frozen seafood subject to VAT in the
Philippines?". Today the classifier and retriever see only the elliptical Turn 2,
so the VAT issue is lost before answer generation.

## 5. Design decision

Adopt a **bounded short-term context carryover** using a **standaloneQuery /
rewrite stage that runs before classification and retrieval**, fed by bounded
recent turns of the active conversation/session only. Decision:
**CHAT CONTEXT CARRYOVER DESIGN PASS WITH STRICT RECOMMENDATIONS.**

## 6. Why this is not persistent memory

Short-term context is bounded to the **current active conversation/session** and
used only to disambiguate the current question. There is no durable user memory,
no profile memory, no memory DB, and no `TINA_ENABLE_MEMORY_*` flag. Persistent
memory (Phase 8) remains inactive.

## 7. Short-term context model

`currentQuery` (raw current message, always preserved); `recentTurns` (bounded
recent turns of the same session — recommended ≤ 6 for rewrite/classification,
never more than the 20 already-fetched history turns); `activeConversationId`
(optional conversationId/sessionId/x-conversation-id); optional future client
`recentTurns`/`messages` (bounded, validated, never trusted for authority);
`shortTermContext` (sanitized/bounded context needed for follow-up resolution);
`standaloneQuery` (rewritten standalone question); and `contextCarryoverDecision`
(`applied`, `reason`, `inheritedIssueType`, `inheritedTaxType`,
`inheritedJurisdiction`, `sourceTurnIndexes`, `confidence`, `riskFlags`,
`originalQuery`, `standaloneQuery`).

## 8. Input contract

The backend already supports `conversationId`/`sessionId`/`x-conversation-id`,
and server-side history via `getHistory(conversationId, 20)` is preferred. The
frontend must consistently send an active `conversationId`/`sessionId`. An
optional future `messages[]`/`recentTurns[]` payload may be added only if bounded
and validated (a separate frontend patch). If both server-side history and
client recent turns exist, the server-side trusted history takes precedence (or
merges only under strict validation). The frontend cannot be confirmed in this
backend repo.

## 9. StandaloneQuery design

The `standaloneQuery` is built **after** request parsing / history fetch and
**before** classification and retrieval. `currentQuery` is always preserved; the
`standaloneQuery` is used for classification and retrieval; the final answer
still answers the user's current query. `contextCarryoverDecision` records
whether rewrite was applied, the confidence, the inherited attributes, and the
`sourceTurnIndexes` used — with full traceability to the original query. The
standaloneQuery never creates or fabricates authority.

## 10. Follow-up detection and issue inheritance

A pure `followUpDetector` detects elliptical follow-ups ("How about X?", "What
about X?", "And X?", "Same with X?", "Does that apply to X?") and excludes
explicit new questions, jurisdiction switches, and unrelated/non-tax queries.
Inherited attributes are limited to tax/issue type (VAT, EWT, CWT, income tax,
percentage tax, NOLCO, MCIT, PEZA zero-rating, withholding on rent),
jurisdiction, and (if relevant) taxpayer/transaction type and authority family.
**Never inherited:** citations, legal conclusions, amounts, unrelated client
facts, authority currentness, or the final answer.

## 11. Pipeline placement

```text
raw request
→ normalize currentQuery
→ fetch/bound recentTurns
→ build shortTermContext
→ build standaloneQuery / contextCarryoverDecision
→ issue classification  (using standaloneQuery + currentQuery metadata)
→ retrieval             (using standaloneQuery)
→ SAE / source cards    (using retrieved authorities)
→ final prompt          (currentQuery, standaloneQuery decision if needed, retrieved sources, bounded history)
→ answer
```

## 12. Classification integration

The classifier receives the `standaloneQuery` (and may also receive the original
`currentQuery` and `contextCarryoverDecision` metadata). It must not consume long
unbounded history, should output whether context was inherited, and must remain
authority-neutral.

## 13. Retrieval integration

Retrieval uses the `standaloneQuery` for query construction; trace metadata may
include the original `currentQuery`. Retrieval must not consume raw unbounded
recent turns and must not infer authority from the conversation alone.

## 14. Prompt integration

The prompt already receives `conversationHistory` (so it was **not** the root
cause). The design adds awareness of the `standaloneQuery` decision for coherence,
but the prompt must still answer the user's current query — not only the internal
rewritten query — and should avoid exposing internal machinery unless helpful.

## 15. Source authority discipline

No citations from memory/history alone; no legal rule carried from a prior
assistant answer unless re-grounded in current retrieved sources; source cards
remain controlling; the SAE is unchanged except that it receives a better query
context; if no authority is found, TINA says so. A changed retrieval query must
still yield valid source cards.

## 16. Fallback and clarification behavior

No conversationId/history → classify the current query normally (no fabricated
context). Empty recent turns → same. Low-confidence rewrite → do not apply;
optionally ask a clarifying question. Conflicting context / jurisdiction switch /
new topic → do not inherit. Example clarification for "How about fresh frozen
seafood?" with no VAT context: "Are you asking whether fresh frozen seafood is
subject to VAT in the Philippines?".

## 17. False-positive controls

Max age / turn distance; confidence threshold; topic-change detector;
jurisdiction-change detector; explicit reset phrases ("new question", "forget
VAT", "different topic"); ambiguity clarification fallback; and no carryover when
risky (old prior turn, clear topic change, jurisdiction change, explicit new
issue, uncertain prior answer, low confidence, or an independently complete
different current query).

## 18. Security/privacy controls

Recent turns are P1/P2 sensitive depending on content: bound and sanitize/minimize
them; do not log raw recent turns; do not send P1/P2 recent turns to third-party
observability (redact before Langfuse) — aligned with
`PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1`. Preserve tenant/client isolation
constraints (`PATCH-08S-TENANT-ISOLATION-GATE-1` remains mandatory before any
persistence expansion). No persistence expansion; no memory flags.

## 19. Frontend/backend contract

Known: the backend supports `conversationId`/`sessionId`/`x-conversation-id` and
prefers server-side history. Unknown/unverifiable here: whether the live frontend
(`tina-fawn.vercel.app`, a separate repo) consistently sends a
conversationId/sessionId. A future frontend verification or integration test is
required; an optional recent-turns payload would require a separate frontend
patch.

## 20. Mode compatibility

`POST /ask` and the 11 other mode routes (`/tax /review /quiz /diagnostic /source
/audit /case /debug /patch /progress /feedback`) all delegate to `askHandler`, so
the standaloneQuery stage should be applied centrally in the askHandler/pipeline
path. Phase 9 workflows should reuse the same helper.

## 21. Test plan

Positive cases (rewrite applied): tobacco VAT → fresh frozen seafood; rental EWT
→ condominium dues; NOLCO → corporation with no income; PEZA zero-rating → local
purchases; MCIT → newly registered corporation; rent withholding → security
deposit. Negative cases (no rewrite): explicit new question; jurisdiction switch;
unrelated non-tax query; already-complete standalone tax query; stale prior
context; low-confidence follow-up.

## 22. Future patch sequence

1. **PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1** — pure helper only
   (`followUpDetector` + `standaloneQuery` builder + `contextCarryoverDecision`),
   no route/pipeline behavior change, unit tests + tax follow-up fixtures.
2. **PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1** — feature-flagged
   wiring of the standaloneQuery stage before classification/retrieval; bounded
   recent turns only; OFF by default; no persistent memory.
3. **PATCH-08X-CHAT-CONTEXT-CARRYOVER-STAGING-SMOKE-1** — live safe staging smoke
   with synthetic non-client tax follow-ups.
4. *(optional)* **PATCH-08X-CHAT-CONTEXT-CARRYOVER-FRONTEND-CONTRACT-1** — frontend
   contract verification if/when the frontend repo is available.

## 23. Risks and mitigations

Wrong issue inheritance → confidence threshold + topic/jurisdiction detectors.
Stale context → max age/turn distance. Jurisdiction contamination →
jurisdiction-change detector. Privacy/logging exposure → bounded + redacted recent
turns, no raw logs, no P1/P2 egress. Frontend not sending conversationId →
frontend contract verification patch + graceful fallback. Over-reliance on an
uncertain prior answer → do not inherit on low prior confidence. Retrieval drift /
source mismatch → source cards remain controlling; SAE unchanged. Phase 9
sensitive-workflow exposure → tenant isolation before persistence.

## 24. Validation results

```text
node tests/patch-08x-chat-context-carryover-design-1.test.mjs
PASS - 27 passed, 0 failed, 168 assertions

node tests/patch-08x-chat-context-carryover-diagnostic-1.test.mjs
PASS - 20 passed, 0 failed, 145 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
PASS - 22 passed, 0 failed, 203 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed
```

## 25. Final decision

```text
CHAT CONTEXT CARRYOVER DESIGN PASS WITH STRICT RECOMMENDATIONS
```

## 26. Strict recommendations

1. Implement the scaffold next as a pure helper only.
2. Keep implementation behind a feature flag during pipeline wiring.
3. Do not use persistent memory.
4. Do not enable `TINA_ENABLE_MEMORY_*`.
5. Do not persist new client/matter context without tenant isolation.
6. Do not log raw recent turns.
7. Do not send P1/P2 recent turns to Langfuse/third-party tools without redaction.
8. Preserve source-authority discipline.
9. Confirm the frontend conversationId/sessionId behavior before live smoke.
10. Add a staging smoke using synthetic non-client examples.
11. Keep Phase 9 not started until the 08X design/scaffold path is resolved or explicitly accepted.
12. Preserve Phase 10 and Phase 11 boundaries.

## 27. Next task

```text
PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1
```

Do not start it inside this patch.
