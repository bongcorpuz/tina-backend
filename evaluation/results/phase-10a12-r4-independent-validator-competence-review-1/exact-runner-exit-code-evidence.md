# Exact Runner Exit-Code Evidence

Command run exactly: `node scripts/run-regressions.mjs`.

| Run | Exit code | Duration | Syntax checks | Test suites | Failed suites |
| --- | ---: | ---: | --- | --- | --- |
| 1 | 1 | about 160.9s | 10 run, 0 failed | 195 run, 2 failed | phase-09r, phase-09zf |
| 2 | 1 | about 160.9s | 10 run, 0 failed | 195 run, 2 failed | phase-09r, phase-09zf |

Run 1 failing assertions:

- `tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs`: `fixture staging validation summary is consistent with the decision and observed reachability`; sub-message `decision requires staging to have been reachable during this test run`.
- `tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs`: `no disallowed runtime, package, env, database, frontend, or production files changed`; `git diff scope is reported (encoded via allowed-file check above)`.

Run 2 failing assertions:

- Same two suites and same failing assertions as run 1.

Decision rule application: the requirement is not satisfied because neither clean process exited 0.