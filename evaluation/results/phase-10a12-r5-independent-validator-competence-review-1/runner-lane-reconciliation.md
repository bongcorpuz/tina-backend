# Runner Lane Reconciliation

## Code Structure

R5 split the prior mixed runner into two blocking lanes:

- `node scripts/run-regressions.mjs`: deterministic/non-staging lane.
- `node scripts/run-staging-smokes.mjs`: mandatory staging lane.

The review confirmed that seven staging-smoke suites are preserved in the staging lane and 188 deterministic suites are discovered in the deterministic lane, for 195 total suites.

## Independent Live Result

The split design is acceptable in principle, but the live gates failed the required acceptance criteria.

| Command | Required | Independent result | Decision |
| --- | --- | --- | --- |
| `node scripts/run-regressions.mjs` | Run twice, exit 0, 188 suites, 0 failures | Ran twice, exit 1 both times, 188 suites, 1 failure | FAIL |
| `node scripts/run-staging-smokes.mjs` | Run twice, exit 0, 7 suites, 0 failures | Ran twice, exit 1 both times, 7 suites, 1 failure | FAIL |

## Failed Suites

- Deterministic lane: `tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs` failed the allowed-file assertion on `.claude/settings.local.json`.
- Staging lane: `tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs` failed staging reachability consistency.

## Determination

R5's claim of deterministic 188/0 exit 0 and staging 7/7 exit 0 is not independently reproduced. Under LIVE EVIDENCE > CLAIMS, both runner gates fail.