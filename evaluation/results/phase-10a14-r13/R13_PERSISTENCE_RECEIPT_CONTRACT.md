# PHASE-10A14-R13 — Acknowledged Persistence Receipt Contract (WS11) + Root Cause (P1-R12-IR-003)

## Root cause
The R12 domain-boundary branch set `persistenceStatus` from `Boolean(conversationId && userId)`, and
`saveConversationTurn` swallowed persistence errors and returned `undefined`. So the API could report
`persistenceStatus: "PERSISTED"` even when a message insert failed, returned no rows, timed out, or threw.

## Contract
`saveConversationTurn` (via the pure `derivePersistenceReceipt` in `services/persistence-receipt.js`) returns:
```
{ attempted, persisted, status, userMessagePersisted, assistantMessagePersisted, memoryHookCompleted, reasonCode, safeDiagnostic }
```
Status values: `PERSISTED`, `NOT_PERSISTED_NO_CONVERSATION`, `NOT_PERSISTED_NO_USER`, `PERSISTENCE_FAILED`,
`PARTIAL_PERSISTENCE`, `PERSISTENCE_TIMEOUT`.

Rules:
- `PERSISTED` **only** when BOTH the user and assistant message inserts returned truthy data (acknowledged).
- No/false insert data → `PERSISTENCE_FAILED` (`NO_INSERT_DATA`); one of two → `PARTIAL_PERSISTENCE`.
- Caught exception → `PERSISTENCE_FAILED` (`EXCEPTION`); timeout → `PERSISTENCE_TIMEOUT`.
- Missing conversation/user → `NOT_PERSISTED_NO_CONVERSATION` / `NOT_PERSISTED_NO_USER`.
- Raw DB errors / credentials / SQL are never placed in the receipt (`safeDiagnostic` = status only); internal
  logs retain `error.message` for diagnosis.
- `memoryHookCompleted` is informational and does NOT downgrade `PERSISTED` (memory hooks are best-effort).
- The domain-boundary handler derives `persistenceStatus` from `receipt.status`, never from ID presence.
- Existing callers that ignore the return value are unaffected (backward compatible).
