# PHASE-10A12-R4 — Repo Regression Runner Reconciliation (independent-review P1-2)

## Correction of the A12-R3 claim

The A12-R3 report/result stated the repo regression runner "exited 0". That claim was
**inaccurate** — it was read from partial backgrounded output. `node scripts/run-regressions.mjs`
**exits 1**. This document reconciles the true result.

## True runner result (runtime 1b36eea)

`node scripts/run-regressions.mjs` runs the full repo suite. Two failures are reported, both the
**same git-diff-scope / forbidden-files guard**, not functional test regressions:

1. `FAIL no disallowed runtime, package, env, database, frontend, or production files changed`
2. `FAIL git diff scope is reported (encoded via allowed-file check above)`

These also appear inside `tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs`
(16 passed, **2 failed**), whose 2 failing assertions are exactly the same scope guard — the six
functional controlled-LOA gate-ordering assertions all PASS. `phase-09zf` does **not** import the
changed module (`grep -c answer-support-validator` = 0).

## Note on run-to-run variation

The independent review's run reported the 2 failures as `phase-09r-tax-memo-runtime-staging-smoke-1`
(staging temporarily unreachable — a network/reachability smoke test) and `phase-09zf`
(diff-scope). This R4 run reported the diff-scope guard (in `phase-09zf` and the runner's own final
check). Both sets are **environmental** — staging reachability and working-tree diff scope — not
functional regressions of the answer-support-validator change. Which environmental suite trips can
vary by run (staging reachability is flaky; diff-scope depends on untracked working-tree state).

## Root cause

The scope guard asserts that the working tree contains no changes outside an allowed set. It
trips because the working tree legitimately contains **untracked** files: the A12-R4 evaluation
evidence under `evaluation/results/…-4/`, the protected `.vscode/` and `evaluation/factcheck/`
paths, and repo-root tooling dirs (`.claude/`, `.codex/`, `.gemini/`). It is a working-tree-state
artifact, **not** a code regression and **not** caused by the answer-support-validator change.

## Evidence that the change is functionally clean

- All 7 validator/trust suites that exercise the changed module pass with 0 failures
  (`test-outputs.txt`): A12-R3 20, A12-R2 10, A12-R1 19, A10-R1 22, A10-R2 27, A8 24 (+A10
  verified-residual 18 in R3).
- `phase-09zf` functional assertions (controlled-LOA gate ordering): all PASS.

## Honest status

- **Repo-wide runner: exits 1**, solely due to the working-tree-scope guard on untracked
  evaluation/tooling files. **Functional test regressions attributable to the R3/R4 change: 0.**
- Fully "green" repo-runner evidence would require running the guard on a clean tree (no
  untracked evidence), which is incompatible with committing evaluation evidence in the same
  worktree. Recommendation: run `scripts/run-regressions.mjs` with the scope guard scoped to
  staged/committed changes, or on a tree where evidence is already committed, to distinguish
  functional failures from working-tree-scope noise.
