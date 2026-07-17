# Independent Runner Logs

Deterministic regression:
- Command: node scripts/run-regressions.mjs.
- Exit code: 0.
- Syntax checks: 10 run, 0 failed.
- Deterministic suites: 191 run, 0 failed.
- Confirmed +1 suite: tests/phase-10a14-r1-filing-deadline-taxbase-source-sufficiency.test.mjs.

Staging smoke:
- Sandbox run: 7 run, 1 failed due staging reachability assertion in phase-09r tax memo smoke.
- Approved network-enabled rerun: exit code 0; staging suites 7 run, 0 failed.

Combined verified total: 191 deterministic + 7 staging = 198 passed, 0 failed.