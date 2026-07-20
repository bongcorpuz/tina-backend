# Gate Attempt And Runner Evidence

## Preserved Review Attempts

| Attempt | Command | Result | Classification |
|---|---|---|---|
| deterministic review attempt 0 | `node scripts/run-regressions.mjs` | Codex command timed out after 120s while suites were still passing | P3 review harness timeout |
| deterministic cycle 1 | `node scripts/run-regressions.mjs` | syntax 10/0, suites 204/0, exit 0 | controlling completed gate |
| deterministic cycle 2 | `node scripts/run-regressions.mjs` | syntax 10/0, suites 204/0, exit 0 | controlling completed gate |
| staging restricted attempt | `node scripts/run-staging-smokes.mjs` | 7 run, 1 failed; phase-09r reachability assertion failed | preserved restricted-network/reachability technical attempt |
| staging cycle 1 | `node scripts/run-staging-smokes.mjs` with network allowed | 7/0, exit 0 | controlling completed gate |
| staging cycle 2 | `node scripts/run-staging-smokes.mjs` | 7/0, exit 0 | controlling completed gate |

## R14 COMMIT 6 Gate Attempt Chronology

COMMIT 6 and `R14_GATE_METHODOLOGY.md` disclose that an initial deterministic gate attempt wrote logs into the repository, observed its own output as a dirty-tree change, failed one suite, and was rerun with external logs after the in-repo logs were deleted.

Classification:

- the final successful clean-tree gates are technically valid;
- the failed in-repo gate attempts fall under every execution attempt;
- deleting their logs violates required attempt preservation;
- R14 claims of zero technical failures and zero deletions are materially false for gate governance.

