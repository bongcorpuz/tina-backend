# PHASE-10A14-R12 — NOT_APPLICABLE / Domain-Boundary Persistence Contract (WS8)

## Root cause of P1-R11-IR-002 (F32)
F32 ("When is someone considered late?" — and the frozen P2 domain-boundary probe) is routed by the
Philippine-tax **domain-boundary** guard in `ask-handler.js` (the `routeKind: "DOMAIN_BOUNDARY"` early return at
~line 3256). That branch does `return res.json({...})` with the boundary message but **never calls
`saveConversationTurn`** — unlike the main `/ask` path (which persists user+assistant turns). Consequently the
public API answer is non-empty while the conversation history is empty → `apiEqualsHistory: false`.

Classification (WS1.9): **unhandled response-type branch** (missing persistence call), not a persistence-write
failure, not a history-query filter, not a harness error.

## Contract (implemented in ordinary application behavior)
For a user-visible NOT_APPLICABLE / domain-boundary chat response, R12 adopts the **PERSISTED RESPONSE** path
(WS8-A), preferred by the packet:
- The exact public boundary answer and its trust state are persisted via `saveConversationTurn` whenever a
  `conversationId` is present (ordinary application behavior; no direct SQL, no schema change).
- The response declares `persistenceStatus`:
  - `"PERSISTED"` when a `conversationId` is present and the turn is written;
  - `"NOT_PERSISTED_NO_CONVERSATION"` when no conversation context exists (nothing to attach the turn to) — an
    explicit, governed state, not an implicit empty-history failure.
- History read-back then returns the same boundary answer → `publicApiAnswer == persistedAnswer == historyAnswer`.

This contract exists in the runtime (`ask-handler.js`), not only in the evaluation harness.
