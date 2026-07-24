# RETRY RULES — PHASE-10A14-R20

> Immutable at COMMIT 1.

## A retry is valid ONLY when ALL hold

- The `retryOf` target attempt exists.
- No self-link and no cycle.
- Same `attemptCategory`, `gateName`, and `cycle` as the target.
- The prior attempt **failed** or was **technically incomplete**.
- `runtimeTreeDigest` identical to the target.
- `harnessTreeDigest` identical to the target.
- `dependencyLockDigest` identical to the target.
- `command` (and `commandHash`) identical to the target.
- Environment compatible.
- Only authorized evidence paths changed between attempts.
- An objective `retryReason` exists.

## Real defect ≠ retry

A real runtime defect requires a **new development iteration** (new runtime freeze cycle), NOT a retry. A retry may not mask a logic change.

## Limits

```text
one initial attempt
plus at most two valid technical retries per cycle
```

Exceeding this, or any retry failing a validity condition above, is a governance violation requiring disclosure and REVISIONS REQUIRED.
