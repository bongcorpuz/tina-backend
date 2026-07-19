// FILE: services/persistence-receipt.js
// PHASE-10A14-R13 (P1-R12-IR-003): acknowledged persistence receipt. persistenceStatus must be
// derived from the ACTUAL persistence outcome, never from the mere presence of IDs. Pure &
// deterministic so all failure/partial/timeout paths are unit-testable without a real database.
// Raw DB errors / credentials / SQL are never placed in the returned receipt.
"use strict";

/**
 * @param {object} o
 * @param {string|null} o.conversationId
 * @param {string|null} o.userId
 * @param {*} [o.userMessageData]        - truthy inserted row on success, null/undefined otherwise
 * @param {*} [o.assistantMessageData]   - truthy inserted row on success, null/undefined otherwise
 * @param {boolean} [o.memoryHookOk]
 * @param {boolean} [o.threw]            - an exception was caught during persistence
 * @param {boolean} [o.timedOut]         - the persistence operation timed out
 * @returns {{attempted:boolean, persisted:boolean, status:string, userMessagePersisted:boolean,
 *   assistantMessagePersisted:boolean, memoryHookCompleted:boolean, reasonCode:string, safeDiagnostic:string}}
 */
export function derivePersistenceReceipt({
  conversationId, userId, userMessageData, assistantMessageData, memoryHookOk, threw, timedOut
} = {}) {
  const base = (attempted, persisted, status, reasonCode, extra = {}) => ({
    attempted, persisted, status,
    userMessagePersisted: Boolean(userMessageData),
    assistantMessagePersisted: Boolean(assistantMessageData),
    memoryHookCompleted: Boolean(memoryHookOk),
    reasonCode,
    safeDiagnostic: status,
    ...extra
  });
  if (!conversationId) return base(false, false, "NOT_PERSISTED_NO_CONVERSATION", "MISSING_CONVERSATION_ID");
  if (!userId) return base(false, false, "NOT_PERSISTED_NO_USER", "MISSING_USER_ID");
  if (timedOut) return base(true, false, "PERSISTENCE_TIMEOUT", "TIMEOUT");
  if (threw) return base(true, false, "PERSISTENCE_FAILED", "EXCEPTION");
  const userOk = Boolean(userMessageData), asstOk = Boolean(assistantMessageData);
  if (userOk && asstOk) return base(true, true, "PERSISTED", "OK");
  if (userOk || asstOk) return base(true, false, "PARTIAL_PERSISTENCE", "PARTIAL_INSERT");
  return base(true, false, "PERSISTENCE_FAILED", "NO_INSERT_DATA");
}

/** True only when the receipt reflects an acknowledged, fully-successful persistence. */
export function isAcknowledgedPersistence(receipt) {
  return Boolean(receipt && receipt.persisted === true && receipt.status === "PERSISTED");
}

export default { derivePersistenceReceipt, isAcknowledgedPersistence };
