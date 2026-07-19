# R14 — VERIFIED ROOT-CAUSE TRACES

All traces below were **reproduced against the unchanged R13 runtime**
(`a311e97f91d6a086597d6fe5584dff07a52a7cd0`, resident at preflight HEAD
`b4f0db419449adf615d9060dcafd68e57e99d824`) before any runtime modification.
Nothing here is inferred from reading code alone.

Runtime file hashes at preflight (SHA-256):

| File | SHA-256 | Lines |
|---|---|---|
| `services/answer-support-validator.js` | `BE2C40BD4679ABDD97F92BD216C1F4E35F1A8E3444458359EC06658CA755FE8B` | 1479 |
| `services/persistence-receipt.js` | `A3A1FB51A3793FAD8B4424C37426D9F3436DC7D1EEC0CBDA106A8740020B4E68` | 44 |
| `ask-handler.js` | `262DE75544E427513E8B26CF661CF18A2392B4CBAB0FA94C713EE1CE223C3CC4` | 3233 |

---

## P1-R13-IR-001 — negated nonperformance bypasses the calendar-relative safety path

### Reproduction result (unchanged runtime)

`unsafe misses = 5`, `safe overfires = 0`

| Clause | Expected | Observed |
|---|---|---|
| `Do not fail to file today.` | UNSAFE | **safe (MISS)** |
| `Do not neglect to file today.` | UNSAFE | **safe (MISS)** |
| `Do not forget to file today.` | UNSAFE | **safe (MISS)** |
| `Avoid failing to file today.` | UNSAFE | **safe (MISS)** |
| `Do not file today.` | UNSAFE | **safe (MISS)** |
| `Make sure you do not fail to file today.` | UNSAFE | UNSAFE (incidental — see below) |
| `Do not delay; file today.` | UNSAFE | UNSAFE |
| `Do not wait until tomorrow, file now.` | UNSAFE | UNSAFE |
| `You are not required to file today based on these facts.` | safe | safe |
| `Do not assume that today is the filing deadline.` | safe | safe |
| `There is no basis to recommend filing today.` | safe | safe |
| `You should not submit the return today.` | UNSAFE | UNSAFE |
| `TINA cannot confirm the statement "file today."` | safe | safe |

### Mechanism

`analyzeCalendarClause` (`services/answer-support-validator.js:1240`) computes at line 1260:

```js
const presentUserDirective = hasFiling && hasRelative &&
  (directiveForce || recommend || passiveObligation || imperative || filipinoFiling || penaltyPressure || /\byes\b/i.test(lc));
```

For `"Do not fail to file today."`:

- `hasFiling` = **true** (`file`), `hasRelative` = **true** (`today`);
- `directiveForce` (`:1214`) — no modal (`should/must/need to/...`) present → false;
- `recommend` (`:1216`) — no recommendation frame → false;
- `passiveObligation` (`:1229`) — requires `return/filing/submission/it ... be filed` → false;
- `imperative` (`CR_IMPERATIVE_FILING_RE`, `:1228`) — anchors the filing verb to
  start-of-clause or punctuation: `(^|[.\n;:,\-]\s*|please\s+|kindly\s+|go ahead and\s+)\s*(file|submit|...)`.
  In `"Do not fail to file today"` the verb `file` is **mid-clause**, preceded by
  `Do not fail to`. No alternative matches → false;
- `penaltyPressure` (`:1223`) — false.

⇒ `presentUserDirective = false` ⇒ `unsafe = false` (line 1262). The clause is released.

### The actual defect

There is **no nonperformance-predicate concept anywhere in the clause frame.** The
predicates `fail to / neglect to / omit / forget to / miss / leave unfiled / refrain from /
skip` are invisible to the model. The frame models only *outer* negation, and only in two
narrow shapes:

- `CR_SAFE_NEGATION_RE` (`:1231`) — negation of the filing **conclusion** (safe);
- `CR_DELAY_NEGATION_RE` (`:1233`) — negation of **delay/postponement** (unsafe).

`"Do not fail to file"` is neither: it is negation of **nonperformance of the action
itself**, a third category the R13 model does not represent. Double negation therefore
collapses to no signal at all rather than to an affirmative directive.

### Two consequences the reviewer's finding implies but does not state separately

1. **`"Make sure you do not fail to file today"` passes by accident, not by coverage.**
   It matches only because `make sure (?:to|you)` appears in `CR_DIRECTIVE_FORCE_RE`
   (`:1214`). The nonperformance construction is still unmodelled; the clause is caught
   by an unrelated lexical cue. This is a false negative waiting to happen under any
   paraphrase that drops `make sure`.

2. **Direct prohibition (`"Do not file today"`, authorization group D) shares one root
   cause with negated nonperformance.** It misses for exactly the same reason: the
   imperative regex cannot fire under an outer negation, because `file` is no longer
   clause-initial. Group D is not an independent defect; it is the same structural gap
   with `nonperformancePredicate = none`. Remediating groups A and D together is
   therefore correct and is not scope expansion.

---

## P1-R13-IR-003 — public `persistenceStatus` absent for most live ask responses

### Mechanism

`persistenceStatus` is assigned on **exactly one** response path in `ask-handler.js`:
the domain-boundary (`NOT_APPLICABLE`) branch at `ask-handler.js:3304`, derived from
`_boundaryReceipt` at `:3271`–`:3279`. Every other response path — ordinary tax answer,
`VERIFIED_CONTROLLING`, `RELATED_AUTHORITY_ONLY`, `NO_VERIFIED_AUTHORITY`, clarification,
safe calendar replacement, early return, validation failure, controlled error,
conversationless request — returns **no `persistenceStatus` field at all**.

This exactly explains the reviewer's count: 4 of 28 live records `PERSISTED`, 24 `null`.
The four non-null records are the paths that happen to route through the boundary branch.

### Scope finding: derivation is already correct; only propagation is missing

`services/persistence-receipt.js` is complete and sound. `derivePersistenceReceipt`
already returns all eight authorized status values from **actual** persistence outcomes —
`NOT_PERSISTED_NO_CONVERSATION`, `NOT_PERSISTED_NO_USER`, `PERSISTENCE_TIMEOUT`,
`PERSISTENCE_FAILED`, `PERSISTED`, `PARTIAL_PERSISTENCE` — never from the mere presence
of IDs, and it leaks no DB errors, SQL or credentials. `isAcknowledgedPersistence`
correctly requires `persisted === true && status === "PERSISTED"`.

Therefore WS9/WS10 is a **propagation** task, not a derivation redesign. The remediation
is to obtain the receipt on every response path and surface `receipt.status` as a
non-null public `persistenceStatus`. No change to the receipt derivation logic is
required, and none is authorized beyond adding the two policy statuses
(`NOT_PERSISTED_BY_POLICY`, `NOT_ATTEMPTED_INTERNAL_ONLY`) where a documented
non-persistence rule applies.

The 24 null records nevertheless showed history readback matching the public answer.
That is consistent with persistence having in fact succeeded — but per WS10 it must
**never** be treated as proof: `PERSISTED` may not be inferred from a later history
lookup, only from an acknowledged receipt.
