# Suite Lane Reconciliation

| Lane | Count | Result |
| --- | ---: | --- |
| Deterministic test files under `tests/` excluding staging smokes | 183 | Present |
| Root `_stage*_test.mjs` suites | 6 | Present |
| Deterministic total | 189 | Passed twice |
| Staging-smoke suites | 7 | Passed twice with network access |
| Combined total | 196 | Reconciled |

Prior R5 accounting was 188 deterministic + 7 staging = 195. R6 adds one deterministic focused suite: `tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs`. No old suite was found deleted, duplicated across lanes, made optional, or moved out of both lanes.

Staging smokes discovered:

- `patch-08k-memory-staging-smoke-1.test.mjs`
- `patch-08s-followup-backend-routes-health-minimization-staging-smoke-1.test.mjs`
- `patch-08s-followup-backend-security-headers-rate-limits-staging-smoke-1.test.mjs`
- `patch-08s-followup-index-secret-header-auth-staging-smoke-1.test.mjs`
- `patch-08s-followup-index-secret-query-removal-staging-smoke-1.test.mjs`
- `phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs`
- `phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs`