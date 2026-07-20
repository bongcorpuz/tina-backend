# Count And Retry-Link Reconciliation

Registry:

- `totalAttempts = 47`
- `runnerInvocations = 4`
- `stagingRunnerInvocations = 2`
- `focusedSuiteInvocations = 37`
- `campaignAttempts = 1`
- `otherAttempts = 3`
- `technicalFailures = 0`
- `environmentFailures = 0`
- `killedAttempts = 0`
- `retries = 0`

Mandatory inconsistency adjudication:

- A1 is `R16-GATE-deterministic-cycle1-A1`, from the single-cycle gate runner commit `4726bcd6`; it belongs to deterministic gate history and should not disappear from narrative retry-ceiling accounting.
- A2/A3/A4 are not registry retries because every `retryOf` is null and no `30-retry-of.json` exists.
- The report statement "one attempt plus two technical retries" is not supported by the canonical registry.
- `technicalFailures=0` and `environmentFailures=0` are internally consistent with runner attempts modeled as `COMPLETED_FAIL`, but the report's environmental/network explanation is misleading unless suite-level cause is separately counted.
- `killedAttempts=0` is internally consistent because child SIGKILLs occur inside focused suite processes rather than as top-level canonical attempts; it cannot independently support the crash claim without the focused raw logs and independent harness.

Adjudication: retry ceiling was not validly applied under the frozen contract's retry-link rule.
