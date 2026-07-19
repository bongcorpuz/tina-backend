# Focused And Runner Evidence

## Focused Suites

- `node tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs` -> 39 passed, 0 failed.
- `node tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs` -> 22 passed, 0 failed.
- `node tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs` -> 15 passed, 0 failed.

## Deterministic Runner

- Cycle 1: `node scripts/run-regressions.mjs` -> syntax checks 10 run, 0 failed; deterministic suites 201 run, 0 failed.
- Cycle 2: `node scripts/run-regressions.mjs` -> syntax checks 10 run, 0 failed; deterministic suites 201 run, 0 failed.

## Staging Runner

- Restricted sandbox attempt: `node scripts/run-staging-smokes.mjs` -> 7 run, 1 failed. The phase-09r fixture recorded staging as temporarily unreachable and failed its decision/reachability consistency assertion.
- Network-enabled cycle 1: `node scripts/run-staging-smokes.mjs` -> 7 run, 0 failed; STAGING GATE PASSED.
- Network-enabled cycle 2: `node scripts/run-staging-smokes.mjs` -> 7 run, 0 failed; STAGING GATE PASSED.
