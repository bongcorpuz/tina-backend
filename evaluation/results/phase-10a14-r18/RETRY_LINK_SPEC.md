# PHASE-10A14-R18 — RETRY LINK SPECIFICATION

Frozen before implementation.

## 1. Validity conditions

A retry link `B.retryOf = A` is valid only when **every** condition holds:

1. target `A` exists in the registry;
2. no self-link (`B ≠ A`);
3. no cycle anywhere in the retry chain;
4. same `gateName`;
5. same `cycle`;
6. `B.attemptOrdinal === A.attemptOrdinal + 1`;
7. `A` failed (a retry after PASS is invalid);
8. `B.runtimeTreeDigest === A.runtimeTreeDigest`;
9. `B.harnessTreeDigest === A.harnessTreeDigest`;
10. `B.dependencyLockDigest === A.dependencyLockDigest`;
11. `B.environmentFingerprint` compatible with `A.environmentFingerprint`;
12. `B.command === A.command`;
13. `B.retryReason` is explicit, non-empty and drawn from the frozen reason set;
14. no runtime/harness/config change occurred;
15. the evidence-HEAD delta between `A.evidenceHeadAtEnd` and `B.evidenceHeadAtAllocation`
    contains only authorized evidence/report paths.

## 2. Frozen retry-reason set

Only these reasons are accepted. Each must be supported by the attempt's own captured
evidence — never by another attempt's logs.

- `TECHNICAL_TRANSPORT_ERROR` — transport/stream error proven in this attempt's own capture
- `TECHNICAL_ENVIRONMENT_ERROR` — environment/tooling error proven in this attempt's capture
- `TECHNICAL_RESOURCE_ERROR` — resource exhaustion proven in this attempt's capture

A retry reason is never `the suite failed`. A genuine assertion failure is a result, not a
technical retry, and must not be retried.

## 3. Ceiling

Per gate cycle: one initial attempt plus at most two **valid** technical retries.

A retry that fails validation does **not** establish the ceiling and is itself a blocker.
The ceiling may only be reported as reached when the links supporting it are valid. R18 must
never repeat R17's contradiction of acting on a ceiling that the validator rejects.

## 4. Mandatory negative controls

The validator must reject each of the following. Each is exercised as a synthetic test.

| # | Rejected condition | Expected error |
|---|---|---|
| 1 | changed runtime file | `RETRY_RUNTIME_CHANGED` |
| 2 | changed harness file | `RETRY_HARNESS_CHANGED` |
| 3 | changed package lock | `RETRY_DEPENDENCY_CHANGED` |
| 4 | changed command | `RETRY_COMMAND_CHANGED` |
| 5 | changed environment fingerprint | `RETRY_ENVIRONMENT_CHANGED` |
| 6 | missing target | `RETRY_TARGET_MISSING` |
| 7 | self-link | `RETRY_SELF_LINK` |
| 8 | cycle | `RETRY_CYCLE` |
| 9 | cross-gate link | `RETRY_CROSS_GATE` |
| 10 | cross-cycle link | `RETRY_CROSS_CYCLE` |
| 11 | retry after PASS | `RETRY_AFTER_PASS` |
| 12 | caller-supplied false runtime digest | `RETRY_FORGED_DIGEST` |
| 13 | caller-supplied false baseline commit | `RETRY_FORGED_BASELINE` |
| 14 | evidence-HEAD delta containing non-evidence code | `RETRY_EVIDENCE_DELTA_IMPURE` |
| 15 | bad ordinal | `RETRY_ORDINAL_INVALID` |
| 16 | missing/unsupported retry reason | `RETRY_REASON_INVALID` |

## 5. Mandatory positive control

A synthetic control must prove the exact R17 failure mode is now handled correctly:

1. attempt A1 is allocated and fails;
2. A1's evidence is committed — **evidence HEAD moves**;
3. runtime and harness digests remain identical;
4. A2 is allocated linking to A1;
5. the validator reports exactly **one valid retry**.

The positive control is synthetic and must not read, write or alter any historical evidence.
It operates on a temporary registry outside the historical tree.

## 6. Count classification (P2-R17-IR1-005)

Every attempt records exactly one `attemptCategory` from the frozen machine-readable set:

```text
deterministic_runner | staging_runner | focused_suite | domain_campaign
synthetic_validator  | other
```

Registry counts derive from `attemptCategory` only — never from command-name inference.

Negative tests are required for: missing category; unknown category; conflicting category;
and command text that resembles another category (e.g. a `focused_suite` attempt whose
command string contains `run-regressions`, which must still count as `focused_suite`).

R17 counts are not rewritten.
