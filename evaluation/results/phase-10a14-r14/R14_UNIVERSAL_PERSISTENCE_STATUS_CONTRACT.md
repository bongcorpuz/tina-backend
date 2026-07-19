# R14 — UNIVERSAL PUBLIC PERSISTENCE-STATUS CONTRACT

Closes P1-R13-IR-003: of 28 R13 live-handler records, 4 declared `PERSISTED` and 24
declared `null`. R13 therefore did not prove that every public ask response truthfully
declares its persistence disposition.

## The rule

> **Every ordinary public ask response MUST contain a non-null `persistenceStatus`.**

Null, `undefined`, or an omitted field is **not permitted** for a public ask response.

## Allowed values

| Status | Meaning | Persistence attempted? |
|---|---|---|
| `PERSISTED` | User + assistant messages acknowledged written | yes |
| `PARTIAL_PERSISTENCE` | One of the two messages written, not both | yes |
| `PERSISTENCE_FAILED` | Attempted; exception or no rows returned | yes |
| `PERSISTENCE_TIMEOUT` | Attempted; timed out before acknowledgement | yes |
| `NOT_PERSISTED_NO_CONVERSATION` | No conversation ID available | no |
| `NOT_PERSISTED_NO_USER` | No user ID available | no |
| `NOT_PERSISTED_BY_POLICY` | A documented rule suppresses persistence | no |
| `NOT_ATTEMPTED_INTERNAL_ONLY` | Documented internal-only response branch | no |

`NOT_ATTEMPTED_INTERNAL_ONLY` **must never** be returned for an ordinary user-visible
chat answer unless a documented internal-only response branch is involved.

## Derivation rules

1. **Receipt-derived only.** `persistenceStatus` is derived from an acknowledged
   persistence receipt (`derivePersistenceReceipt` in `services/persistence-receipt.js`)
   or from an **explicit** documented non-persistence rule. It is never derived from the
   presence of IDs, and never from the shape of the request.
2. **No inference from history.** `PERSISTED` must **never** be inferred from a later
   history lookup succeeding. The R13 evidence showed 24 records whose history readback
   matched the public answer while `persistenceStatus` was null — matching history is
   *consistent with* persistence but is **not an acknowledgement** and must not be
   treated as one.
3. **No false success.** No path may report `PERSISTED` unless
   `isAcknowledgedPersistence(receipt)` is true — i.e. `persisted === true` **and**
   `status === "PERSISTED"`.
4. **Late completion after timeout stays `PERSISTENCE_TIMEOUT`.** If a write is
   acknowledged after the timeout has already been reported, the public status remains
   `PERSISTENCE_TIMEOUT`. Retroactively upgrading it to `PERSISTED` would make a
   previously-returned public statement false. This preserves the bounded P2-R13-IR-004
   limitation rather than redesigning transactions or idempotency.
5. **No duplicate persistence.** A response path must attempt persistence at most once;
   obtaining the receipt must not itself trigger a second write.
6. **History equality claims are conditional.** Where status is `PERSISTED`, evidence
   must show `publicAnswer === persistedAnswer === historyAnswer`. Where status is
   anything else, **no history-equality claim may be made**, and no unexpected history
   entry may appear.
7. **No leakage.** Raw database errors, SQL, connection strings and credentials must
   never reach the public status, the receipt, or the `safeDiagnostic` field.

## Response paths in scope (WS10)

Every path below must return a non-null status:

`RC1` VERIFIED_CONTROLLING · `RC2` RELATED_AUTHORITY_ONLY · `RC3` NO_VERIFIED_AUTHORITY ·
`RC4` NOT_APPLICABLE domain boundary · `RC5` clarification · `RC6` safe calendar
replacement · `RC7` ordinary successful tax answer · `RC8` conversationless request ·
`RC9` no user ID · `RC10` validation failure · `RC11` controlled error response.

## Current state (pre-fix, verified)

`persistenceStatus` is set on exactly **one** path — the domain-boundary branch at
`ask-handler.js:3304`. All other paths omit the field entirely.

`services/persistence-receipt.js` is already correct: it derives all statuses from actual
outcomes and leaks nothing. **The remediation is propagation, not derivation.** No change
to receipt-derivation semantics is authorized or required, beyond surfacing the two
policy statuses where a documented non-persistence rule applies.
