# ATTEMPT-REGISTRY CONTRACT — PHASE-10A14-R20

> Immutable at COMMIT 1. Addresses P1-IR19-004 (complete governed attempt registry closure).

## Principle

Every evidence-bearing invocation MUST be registered before its result may be cited. The registry MUST be closure-complete: no controlling result without a registered attempt; no registered controlling attempt without a mapped result.

## Attempt categories (closed set)

```text
domain_campaign
focused_suite
deterministic_runner
staging_runner
synthetic_validator
other
```

## Required fields (per attempt)

```text
attemptId
attemptCategory
gateName
cycle
attemptOrdinal
retryOf
retryReason
evidenceHeadAtAllocation
evidenceHeadAtStart
evidenceHeadAtEnd
runtimeBaselineCommit
runtimeTreeDigest
harnessTreeDigest
dependencyLockDigest
environmentFingerprint
command
commandHash
startedAt
endedAt
exitCode
signal
status
disposition
controlling
stdoutPath
stderrPath
resultPaths
```

## Required registered invocations (closure list)

- Pre-fix 1,120 campaign.
- Corrected semantic 567 campaign.
- Every development-oracle execution.
- Every focused batch.
- Every standalone focused rerun cited as evidence.
- Every synthetic validator.
- Every deterministic cycle.
- Every staging cycle.
- Every transient failure.
- Every retry.
- Every result-builder invocation used for governance where the frozen contract requires it.

## Integrity rules

- `retryOf` MUST reference an existing prior attempt; no self-link, no cycle.
- Every referenced SHA (`evidenceHead*`, `runtimeBaselineCommit`) MUST be a valid Git object.
- `disposition` is terminal and immutable once set.
- The registry is validated against the manifest; the manifest is self-excluding.
- No unregistered controlling command may influence the decision.
