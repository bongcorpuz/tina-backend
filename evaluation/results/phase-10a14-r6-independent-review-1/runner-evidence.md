# Runner Evidence

- Focused R6 suite: `node tests/phase-10a14-r6-temporal-card-propagation-and-51a-origin.test.mjs` -> 15 passed, 0 failed.
- Deterministic cycle 1: `node scripts/run-regressions.mjs` -> syntax checks 10/0; deterministic suites 196/0; exit 0.
- Deterministic cycle 2: `node scripts/run-regressions.mjs` -> syntax checks 10/0; deterministic suites 196/0; exit 0.
- Restricted staging attempt: `node scripts/run-staging-smokes.mjs` -> 6/7 suites passed, 1 failed because staging was temporarily unreachable in the tax-memo runtime staging smoke.
- Network-enabled staging cycle 1: `node scripts/run-staging-smokes.mjs` -> 7/0; exit 0.
- Network-enabled staging cycle 2: `node scripts/run-staging-smokes.mjs` -> 7/0; exit 0.

Combined governed runner count satisfied for local/staging lanes: 196 deterministic + 7 staging = 203 suites per successful cycle.
