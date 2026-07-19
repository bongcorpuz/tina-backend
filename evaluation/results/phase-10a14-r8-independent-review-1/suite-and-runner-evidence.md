# Suite And Runner Evidence

Focused independent executions:

| Command | Result |
| --- | --- |
| node tests/phase-10a14-r5-section51-current-law-chain-and-imperative-filing.test.mjs | 25 passed, 0 failed |
| node tests/phase-10a14-r6-temporal-card-propagation-and-51a-origin.test.mjs | 15 passed, 0 failed |
| node tests/phase-10a14-r7-exact-date-section51c2-effectivity.test.mjs | 14 passed, 0 failed |
| node tests/phase-10a14-r8-ra12214-qualifying-publication-strict-date-fail-closed.test.mjs | 26 passed, 0 failed |
| node tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs | 18 passed, 0 failed |
| node tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs | 35 passed, 0 failed |
| node tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs | 20 passed, 0 failed |

Full deterministic runner:

Cycle 1: node scripts/run-regressions.mjs
- Syntax checks: 10 run, 0 failed.
- Test suites: 198 run, 0 failed.
- Exit: 0.

Cycle 2: node scripts/run-regressions.mjs
- Syntax checks: 10 run, 0 failed.
- Test suites: 198 run, 0 failed.
- Exit: 0.

Staging runner:

Restricted sandbox attempt: node scripts/run-staging-smokes.mjs
- Staging-smoke suites: 7 run, 1 failed.
- phase-09r-tax-memo-runtime-staging-smoke-1 reported staging temporarily unreachable and failed the required reachability assertion.
- Preserved as restricted-sandbox environmental failure.

Network-enabled cycle 1: node scripts/run-staging-smokes.mjs
- Staging-smoke suites: 7 run, 0 failed.
- Exit: 0.

Network-enabled cycle 2: node scripts/run-staging-smokes.mjs
- Staging-smoke suites: 7 run, 0 failed.
- Exit: 0.

