# R14 — GATE EXECUTION METHODOLOGY

Both mandatory runners were executed **twice each against a clean tracked worktree**, at
final runtime `31f2326c1ebfa5acea8871361db97323f61c644e`.

| Cycle | Result | Exit |
|---|---|---|
| deterministic 1 | syntax 10/0, suites 204/0 | 0 |
| deterministic 2 | syntax 10/0, suites 204/0 | 0 |
| staging 1 | 7 run, 0 failed | 0 |
| staging 2 | 7 run, 0 failed | 0 |

## Why the logs were captured outside the repository

Several patch-scope guards (e.g. `phase-09zf`, `phase-10a1`, `patch-08j`) shell out to
`git diff --name-only` / compare against `HEAD` and fail when the working tree is dirty.
Writing a gate log **into** the repository while the gate is running makes the gate
observe its own output as an unexpected changed file, which caused a spurious 1-suite
failure on a first attempt.

The runners were therefore re-executed with stdout redirected to a temporary directory
outside the repository, so each gate observed a genuinely clean tree. The logs were copied
into evidence only **after** all four cycles completed. No script was modified, and no
guard was bypassed or weakened — the guards were allowed to see the true tree state.

`204` = the 203-suite baseline plus the new R14 focused suite.

Restricted-network failures: none. Staging was reachable for every cycle, and was also
verified reachable before the first commit of this task.
