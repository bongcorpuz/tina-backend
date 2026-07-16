# Repository Runner Failure Analysis

Required command: `node scripts/run-regressions.mjs`.

The command was run twice in clean Node processes during this independent review. Both runs exited 1.

Both runs reported:

- Syntax checks: 10 run, 0 failed.
- Test suites: 195 run, 2 failed.
- Gate failed.

Failing suite A: `tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs`.

- Result: 35 passed, 1 failed, 115 assertions.
- The suite logged staging temporarily unreachable.
- Failing assertion: fixture staging validation summary is consistent with the decision and observed reachability.
- Test source states staging assertions are skipped when staging is temporarily unreachable, but the fixture decision consistency check still requires PASS decisions to have reachable staging.

Failing suite B: `tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs`.

- Result: 16 passed, 2 failed, 177 assertions.
- Functional controlled-LOA assertions pass.
- Failing assertions are working-tree/diff-scope checks.
- The test's diffNames function uses `git diff --name-only` plus `git ls-files --others --exclude-standard`, filters `.vscode/`, `evaluation/factcheck/`, `.env`, and two legacy test files, but does not filter `.claude/`, `.codex/`, `.gemini/`, or review/evaluation result artifacts generally.
- Runner output included `.claude/settings.local.json` and the assertion that `pipeline.js` is part of the reported diff scope.

Determination: these failures may be environmental or legacy guard failures, but the assignment says that is insufficient. The exact command still exits 1, so the repository-wide runner requirement fails.