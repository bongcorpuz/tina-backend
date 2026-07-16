# Independent Runner Logs

The independent reviewer ran the required commands twice each.

## `node scripts/run-regressions.mjs`

Run 1:

- Exit code: 1
- Duration: approximately 160.1 seconds
- Syntax checks: 10 run / 0 failed
- Suites: 188 run / 1 failed
- Failed suite: `tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs`
- Failure: `no disallowed runtime, package, env, database, frontend, or production files changed`; `changed file is allowed: .claude/settings.local.json`

Run 2:

- Exit code: 1
- Duration: approximately 161.5 seconds
- Syntax checks: 10 run / 0 failed
- Suites: 188 run / 1 failed
- Failed suite: same 09ZF suite and same `.claude/settings.local.json` allowed-file assertion.

## `node scripts/run-staging-smokes.mjs`

Run 1:

- Exit code: 1
- Suites: 7 run / 1 failed
- Failed suite: `tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs`
- Failure: staging temporarily unreachable; PASS decision required staging to have been reachable during the test run.

Run 2:

- Exit code: 1
- Suites: 7 run / 1 failed
- Failed suite: same 09R staging reachability consistency failure.

## Preserved Suite Accounting

The staging lane includes seven suites:

- `patch-08k-memory-staging-smoke-1.test.mjs`
- `patch-08s-followup-backend-routes-health-minimization-staging-smoke-1.test.mjs`
- `patch-08s-followup-backend-security-headers-rate-limits-staging-smoke-1.test.mjs`
- `patch-08s-followup-index-secret-header-auth-staging-smoke-1.test.mjs`
- `patch-08s-followup-index-secret-query-removal-staging-smoke-1.test.mjs`
- `phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs`
- `phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs`

Total accounting: 188 deterministic + 7 staging = 195 preserved suites.