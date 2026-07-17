# PHASE-10A12-R6 — Runner Failure & Remediation Evidence (WS5/WS6)

## Deterministic lane (P1-3) — root cause & fix

The R5 independent review's deterministic runs failed twice at 09ZF:
`no disallowed runtime, package, env, database, frontend, or production files changed` /
`changed file is allowed: .claude/settings.local.json`.

**Root cause:** 09ZF's allowed-file scope check uses `git ls-files --others --exclude-standard`
(untracked files) and excluded `.vscode/`, `evaluation/factcheck/`, `.env`, and two test md files —
but NOT `.claude/`. In some environments `.claude/settings.local.json` is gitignored via a global
config; in the reviewer's environment it was not, so it appeared as untracked and the check flagged
it. This made the check ENVIRONMENT-DEPENDENT (not an R5 runner change, not a functional regression,
not a test-runner defect — a working-tree/environment assumption). Only 09ZF uses untracked ls-files.

**Fix (commit 09751a6):** add `.claude/` to the 09ZF untracked-exclusion filter. `.claude/` is a
governance-designated PROTECTED untracked path (like `.vscode/`, `evaluation/factcheck/`) and is
never a runtime/package/env/database/frontend/production change. This corrects the classification and
makes the gate deterministic across environments WITHOUT deleting a suite, weakening an assertion,
forcing exit 0, skipping, hiding stderr, or converting failures to warnings. The guard still fails on
any real disallowed change (proven by simulation: a modified tracked runtime file, or a fabricated
disallowed untracked path, still fails the allowed-file check). The simulated-reversion capability of
the 09ZF "git diff scope" assertion (R5) is preserved unchanged.

## Staging lane (P1-4) — root cause & status

The R5 review's staging runs failed twice at 09R: staging temporarily unreachable; 09R's PASS
decision requires staging to have been reachable during the run.

**Root cause:** actual transient staging unavailability during the review window — NOT a code defect,
stale expected-commit, auth/env issue, or invalid assumption. 09R correctly FAILS (does not skip)
when staging is down; that is the intended mandatory-blocking behavior.

**Status:** staging is reachable at R6 execution time; `node scripts/run-staging-smokes.mjs` passes
7/7 exit 0 (see the two committed clean-run logs). No change was made to 09R or the staging lane — it
must remain mandatory and blocking, and it was not weakened. If staging had remained unreachable, R6
would have remained REVISIONS REQUIRED per the mandate.

## Suite accounting

Deterministic lane: 189 suites (188 prior + 1 new R6 focused suite
`tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs`). Staging lane: 7 (unchanged).
Combined: 196. The +1 vs the prior 195 is the added R6 focused suite — a justified, reconciled
increase. No suite deleted, duplicated across lanes, made non-blocking, or silently skipped.
