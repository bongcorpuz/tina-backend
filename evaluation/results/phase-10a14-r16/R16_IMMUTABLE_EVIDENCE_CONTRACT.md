# PHASE-10A14-R16 — FINAL IMMUTABLE EVIDENCE CONTRACT (FROZEN AT COMMIT 1)

**This contract is final. It is frozen at COMMIT 1, before any implementation, any test
execution and any runtime change. It will not be amended during execution.**

R15 froze one permanent directory per attempt and then amended that contract
mid-execution, converting completed generations into JSONL archives and removing their
per-attempt directory form from the final tree. The archive bytes validate, but the
amendment is why R15 remains **NOT SUPERSEDED**. R16 does not repeat it.

If this contract becomes operationally impracticable, R16 must **preserve the failure,
self-assess REVISIONS REQUIRED and stop** — it may not improvise an amendment.

## 1. Canonical location

```
evaluation/results/phase-10a14-r16/attempts/<attemptId>/
```

One permanent directory per attempt. This is the governed evidence.

## 2. Required immutable files

| File | Required |
|---|---|
| `00-allocated.json` | always, written before execution |
| `10-started.json` | when execution begins |
| exactly one `20-*.json` terminal | unless the process was killed first |
| `command.txt` | always |
| `stdout.raw.txt`, `stderr.raw.txt` | always (may be empty) |
| `environment.json` | always |
| `tree-before.txt`, `tree-after.txt` | always |
| `hashes.sha256` | always, covering every other file in the directory |
| `30-retry-of.json` / `30-supersedes.json` | when applicable |

Permitted terminal files: `20-completed-pass.json`, `20-completed-fail.json`,
`20-technical-failure.json`, `20-timeout.json`, `20-killed.json`, `20-cancelled.json`.

## 3. Prohibited operations — absolute

No canonical attempt directory may be **deleted, archived, converted, compacted,
overwritten, regenerated, or renamed to conceal chronology.** There is no tooling path
that performs any of these. This holds for failed, noisy, environmental, superseded and
non-controlling attempts alike.

## 4. Killed-before-terminal

A process killed before a terminal event can be written leaves `00-allocated.json` and
`10-started.json` and **no** `20-*`. Recovery review classifies it `KILLED_OR_INCOMPLETE`.
A separate `40-recovery-adjudication.json` may be **added**; existing event files are
never modified.

## 5. External capture, then canonical import (WS3)

During any clean-tree-sensitive process, **nothing** may be written inside the repository —
no log, journal, report, marker, temporary file or generated summary.

1. Allocate in an external root (`%TEMP%\tina-r16-capture\<attemptId>\`) with exclusive
   creation; fsync and read back.
2. Capture HEAD, sync and tree state; stream stdout/stderr to external files.
3. Run the process to completion.
4. Write the terminal event; finalize `hashes.sha256`.
5. **Copy** the complete directory to the canonical repository path.
6. **Verify every hash after copy.** A mismatch aborts the import; nothing is deleted.
7. Do not delete the external copy until canonical import is hash-verified, committed,
   pushed, and sync is `0 0`.

The external copy is a transient acquisition copy. The canonical repository copy is the
governed evidence.

## 6. Retry rules

A technical retry is permitted only when the first attempt is durably preserved, the
failure is objectively technical or environmental, the retry receives a **new** attemptId,
and `30-retry-of.json` links it to the prior attempt.

An unfavourable legal or semantic result may **never** be replaced by rerunning until
favourable.

**Maximum for the same gate on the same unchanged runtime: one initial attempt plus two
technical retries.** After three unsuccessful clean attempts, self-assess REVISIONS
REQUIRED and stop that gate. No indefinite looping.

## 7. Counting definitions (frozen — WS9)

| Term | Definition |
|---|---|
| `runnerInvocations` | actual `node scripts/run-regressions.mjs` process launches |
| `stagingRunnerInvocations` | actual `node scripts/run-staging-smokes.mjs` process launches |
| `focusedSuiteInvocations` | directly launched focused test processes |
| `campaignAttempts` | individual semantic / routing / persistence / live probe attempts |
| `technicalFailures` | attempts ended by code, harness, process, network or environment |
| `completedFailures` | completed attempts whose result failed the frozen expectation |
| `killedAttempts` | processes confirmed terminated by signal |
| `incompleteAttempts` | allocated attempts with no valid terminal event and no verified killed classification |

A runner invocation is **one** attempt. A suite inside a runner is **not** another runner
invocation. A probe is **not** a runner invocation. A retry **is** a new attempt.

Every summary must state its scope. `technicalFailures: 0` may never be reported without
stating whether gate-runner attempts are included.

## 8. Canonical registry is the single source of truth

`CANONICAL_ATTEMPT_REGISTRY.json` is machine-generated from the immutable attempt
directories. Every count in the report, result JSON, CURRENT_STATE, gate summary and
attempt reconciliation is derived from it. **No manually typed competing total is
permitted anywhere.** This is the direct remediation of P1-R15-IR-005, where a narrative
said five gate attempts and the formal result JSON said four.

## 9. Final manifest

`EVIDENCE_MANIFEST.sha256` excludes itself and includes **every** attempt file. Zero
missing, zero mismatched, zero duplicate entries.
