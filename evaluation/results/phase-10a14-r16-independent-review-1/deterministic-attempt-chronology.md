# Deterministic Attempt Chronology

Executor canonical attempts:

- `R16-GATE-deterministic-cycle1-A1`: exit 1, `COMPLETED_FAIL`, runtime/head `4726bcd6`, `retryOf:null`.
- `R16-GATE-det-cycle1-A2`: exit 1, `COMPLETED_FAIL`, runtime/head `cd160795`, `retryOf:null`.
- `R16-GATE-det-cycle1-A3`: exit 1, `COMPLETED_FAIL`, runtime/head `5c69a47c`, `retryOf:null`.
- `R16-GATE-det-cycle1-A4`: exit 1, `COMPLETED_FAIL`, runtime/head `bc395985`, `retryOf:null`.

Independent attempts:

- `deterministic-cycle-1.raw.txt`: exit 1, syntax 10/0, suites 208 run / 2 failed.
- `deterministic-cycle-2.raw.txt`: exit 1, syntax 10/0, suites 208 run / 2 failed.

Independent failed suites:

- `patch-07b-clarification-final-gate-1-track-closure.test.mjs`
- `phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs`

Contrary to executor narrative, the six claimed OpenAI/network suites passed in both independent runs.
