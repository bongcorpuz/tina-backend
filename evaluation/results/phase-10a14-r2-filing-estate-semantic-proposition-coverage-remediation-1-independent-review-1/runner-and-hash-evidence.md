# Runner And Hash Evidence

## Deterministic Runner

Command:

```text
node scripts/run-regressions.mjs
```

Result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   192 run, 0 failed
Exit code: 0
```

## Staging Runner

Restricted sandbox command:

```text
node scripts/run-staging-smokes.mjs
```

Result:

```text
Staging-smoke suites: 7 run, 1 failed
Exit code: 1
Failure cause: phase-09r staging fixture reported staging temporarily unreachable.
```

Network-enabled rerun:

```text
node scripts/run-staging-smokes.mjs
```

Result:

```text
Staging-smoke suites: 7 run, 0 failed
STAGING GATE PASSED
Exit code: 0
```

## Executor Evidence Manifest

Recomputed:

```text
evaluation/results/phase-10a14-r2-filing-estate-semantic-proposition-coverage-remediation-1/EVIDENCE_MANIFEST.sha256
MANIFEST_OK count=59
```
