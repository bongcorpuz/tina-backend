# Independent Runner Logs

Sandbox deterministic rerun initially timed out at 120s after many passes; this was preserved as a timeout and rerun with a longer timeout.

Final deterministic rerun:
- Command: node scripts/run-regressions.mjs
- Exit code: 0
- Syntax checks: 10 run, 0 failed
- Deterministic suites: 190 run, 0 failed

Sandbox staging rerun:
- Command: node scripts/run-staging-smokes.mjs
- Exit code: 1
- Suites: 7 run, 1 failed
- Failure: staging temporarily unreachable / reachability decision assertion.

Approved network-enabled staging rerun:
- Command: node scripts/run-staging-smokes.mjs
- Exit code: 0
- Staging suites: 7 run, 0 failed

Combined final runner count: 190 deterministic + 7 staging = 197 passed, 0 failed.
