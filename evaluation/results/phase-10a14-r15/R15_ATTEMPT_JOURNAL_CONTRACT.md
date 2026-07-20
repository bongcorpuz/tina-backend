# PHASE-10A14-R15 — CRASH-VISIBLE ATTEMPT JOURNAL CONTRACT (FROZEN)

**This contract is frozen at COMMIT 1.** The implementation ships at COMMIT 2, the
journal test harness at COMMIT 2, and the first governed campaign at COMMIT 3. No
implementation, no execution and no evidence governed by this contract exists in this
commit. This ordering is the direct remediation of P1-R14-IR-005.

## Why R14's journal failed

R14's contract stated the record skeleton was "written to disk before the call is made,
so that a crash, hang or process kill still leaves the attempt visible." The
implementation built the record **in memory**, ran the function, and appended only on
return or throw. A `SIGKILL` during execution left nothing. The contract text was
aspirational; the code did not implement it. R15 makes the durable write a mechanical
precondition of execution, and proves it by killing real processes (WS3).

## Layout — one directory per attempt

```
evaluation/results/phase-10a14-r15/journal/<campaignId>/<attemptId>/
```

Immutable event files (each written exactly once, never edited):

| File | Meaning |
|---|---|
| `00-allocated.json` | ID reserved; written **before** the governed action begins |
| `10-started.json` | governed action entered |
| `20-completed.json` | terminal: normal completion |
| `20-technical-failure.json` | terminal: transport/process fault |
| `20-timeout.json` | terminal: deadline exceeded |
| `20-cancelled.json` | terminal: deliberately cancelled |
| `20-crashed-or-incomplete.json` | terminal: written **only** by deterministic recovery review, never by the executing process |
| `30-retry-linked.json` | optional: forward link to a retry attempt |
| `30-superseded-by.json` | optional: forward link to a superseding attempt |

Exactly **one** `20-*` terminal event may exist per attempt.

## Allocation rule (the crash-visibility guarantee)

Before the governed call, in this order:

1. allocate a unique `attemptId`;
2. create `00-allocated.json` with **exclusive creation** (`flag: "wx"`) — an existing
   file is a hard error, never an overwrite;
3. `fsync` the file descriptor;
4. `fsync` the containing directory where the platform supports it;
5. `stat` the file to verify it exists;
6. **only then** begin execution.

If any step fails, the governed action must not run.

## Immutability rule

No event file is ever edited, truncated, renamed or deleted. Completion is a **new
event file**, never a rewrite of an earlier one. Recording a retry link is a new event.
There is no operation in the journal API that opens an existing event for writing.

## Crash rule

A process kill during the governed action must leave:

- `00-allocated.json` present;
- `10-started.json` present if execution had begun;
- **no** `20-*` terminal event.

Recovery review classifies such an attempt `INCOMPLETE_OR_CRASHED` and it is counted in
every summary. An attempt directory with no terminal event is **never** silently dropped.

## Retry rule

A retry receives a **new** `attemptId`, and:

- links to the prior attempt via `30-retry-linked.json` on the prior attempt and a
  `retryOf` field on the new attempt's `00-allocated.json`;
- never deletes or rewrites the prior attempt;
- is permitted **only** for a technical or environmental failure;
- may **never** be used to replace an unfavourable legal answer.

A legal failure (a correctly-executed probe that produced a wrong classification) is
terminal. There is no best-answer retry.

## Gate rule (remediates P1-R14-IR-006)

Every runner invocation is a journaled attempt under this same lifecycle — including
attempts that fail. This explicitly covers: timeout; dirty-tree self-observation; a
runner observing its own log output; restricted network; unavailable staging; syntax
failure; suite failure; and the successful rerun.

**No attempt log may be deleted because it is noisy, mistaken, environmental or
non-controlling.** R14 deleted two failed deterministic gate logs; R15 preserves them all.
Where a runner is clean-tree-sensitive, its stdout is captured outside the repository and
**copied into governed evidence after the runner ends** — copied, never discarded.

## Summary rule

Every summary must report, and never omit:

allocated · started · completed · technical failures · timeouts · cancelled ·
incomplete/crashed · legal mismatches · retries · supersession links · controlling vs
non-controlling generations.

A malformed or partial event file must be **reported as malformed**, not skipped. A
summary that cannot parse an event is a summary failure, not a silent zero.

## Campaign and attempt identity

```
campaignId = R15-<PHASE>-<runtimeCommit12>          PHASE ∈ PREFIX | JOURNALTEST | POSTFIX<n> | FINAL | LIVE | GATE
attemptId  = <campaignId>-<probeId>-A<sequence>
```

Every runtime change starts a new campaign generation. Attempts from earlier generations
are immutable chronology and never re-run in place. **Only final-runtime attempts may
control PASS.**

## Controlling-evidence rule

An attempt controls PASS only if all hold: it belongs to the FINAL or LIVE generation;
its `runtimeCommit` equals the single final runtime; for live attempts the
server-reported runtime SHA equals that same commit (WS10); and it has a
`20-completed.json` terminal event.
