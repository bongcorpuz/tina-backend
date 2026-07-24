# ATTEMPT-WRAPPER SPECIFICATION — PHASE-10A14-R20

> Immutable at COMMIT 1. **Specification only.** No wrapper implementation belongs in COMMIT 1. Implementation, if any, is authorized no earlier than COMMIT 2 and only under `evaluation/runner/phase-10a14-r20/` per `ALLOWED_FILE_INVENTORY.json`.

## Responsibilities

1. **Exclusive attempt allocation** — allocate a unique `attemptId` and immutable output directory before execution; record `evidenceHeadAtAllocation`.
2. **Immutable output directory** — one directory per attempt; never reused, overwritten, or deleted once terminal.
3. **External capture** — capture stdout/stderr to a capture path outside the tracked tree, then import into the attempt directory.
4. **stdout/stderr preservation** — persist both as `stdoutPath` and `stderrPath`.
5. **Runtime/harness identity capture** — record `runtimeBaselineCommit`, `runtimeTreeDigest`, `harnessTreeDigest`, `dependencyLockDigest`, `environmentFingerprint`.
6. **Command hash** — record exact `command` and `commandHash`.
7. **Pre/post tree state** — record `evidenceHeadAtStart` and `evidenceHeadAtEnd`.
8. **Exit code and signal** — record `exitCode` and `signal`.
9. **Result import** — import result artifacts into the immutable directory and record `resultPaths`.
10. **Terminal disposition** — set immutable `status` and `disposition`.
11. **Failure commit before retry** — a failed/transient attempt is committed and preserved before any retry.
12. **Rejection of unregistered controlling evidence** — refuse to treat any unregistered invocation as controlling.
13. **Rejection of overwritten attempts** — refuse to write into an existing terminal attempt directory.
14. **Registry completeness check** — verify registry ⇄ manifest closure before a decision.

## Prohibitions

- No decision logic in the wrapper.
- No modification of runtime files.
- No best-answer rerun; each execution is a new registered attempt.
