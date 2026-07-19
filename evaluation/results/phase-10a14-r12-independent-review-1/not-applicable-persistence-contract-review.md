# NOT_APPLICABLE Persistence Contract Review

R12 correctly moved the domain-boundary branch from empty-history behavior to a successful-path persistence attempt when `conversationId` and `userId` exist. The live `P2-DOMAIN-BOUNDARY` payload records `persistenceStatus: "PERSISTED"` and API/history equality.

The implementation is not a reliable persistence contract on failure paths:

- `saveConversationTurn` returns early when IDs are absent.
- `saveConversationTurn` catches save errors and logs `Conversation save skipped`, but does not return a failure status.
- The domain-boundary branch computes `_boundaryPersisted = Boolean(conversationId && userId)` before the save and returns `PERSISTED` based on IDs, not confirmed writes.

Actual behavior by condition:

- Save succeeds: API can correctly return `PERSISTED`.
- Missing conversationId or userId: API returns `NOT_PERSISTED_NO_CONVERSATION`.
- Insert throws, update/saveMemoryHooks throws, timeout surfaces as a thrown error, or insert returns no persisted row without an error: `saveConversationTurn` does not provide a confirmed failure signal, so the domain-boundary branch can still return `PERSISTED`.

Classification: `P1-R12-IR-003`.
