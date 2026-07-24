# EVIDENCE CONTRACT — PHASE-10A14-R20

> Immutable at COMMIT 1.

## Evidence-bearing invocation

Any execution whose output is cited — directly or indirectly — in support of an R20 decision. Every evidence-bearing invocation MUST be registered in the attempt registry (`ATTEMPT_REGISTRY_CONTRACT.md`) before its result may be cited.

## Controlling vs non-controlling evidence

- **Controlling**: registered invocations against the frozen runtime that determine PASS/REVISIONS REQUIRED — the 1,120-row campaign, the corrected 567 regression, the development-oracle runs, focused suites, deterministic 2/2 and staging 2/2.
- **Non-controlling**: optional Gemini 2.5 Pro static challenge, diagnostics, and any exploratory run explicitly marked non-controlling and excluded from the decision.

## Attempt allocation

Each evidence-bearing invocation is allocated an exclusive `attemptId` before it starts. Allocation records the evidence HEAD at allocation time. No two invocations share an attempt directory.

## Immutable attempt directories

Each attempt writes to its own immutable output directory. Once terminal, contents are never modified, overwritten, or deleted. Directory naming binds `attemptId`, category, gate, and cycle.

## External capture and import

stdout and stderr are captured externally to a capture path outside the tracked tree during execution, then imported into the immutable attempt directory as `stdoutPath` / `stderrPath`. No repo-local capture directory persists between attempts.

## Failed / transient attempt preservation

Every failed or transient invocation is committed and preserved before any retry. A retry never reuses or overwrites the failed attempt's directory.

## No overwrite / no best-answer rerun

- No attempt directory is ever overwritten.
- No "best-answer" rerun is permitted. The first valid controlling result stands; subsequent runs are new registered attempts, not replacements.

## Runtime / harness identity

Every attempt records `runtimeBaselineCommit`, `runtimeTreeDigest`, `harnessTreeDigest`, `dependencyLockDigest`, and `environmentFingerprint`. Anchors from PREFLIGHT: services tree `0b5453ea0fb96857e489483ec7f102476e6b213b`, runner tree `850ad78b9e094aa2288756d58b40838286d50fe6`, tests tree `0890567139d37995be11a260a93a03d46a47c84b`, package-lock `9c9b93bf4be082790c4bf99c52a66bab9bc61d88`.

## Command identity

Every attempt records the exact `command` and its `commandHash`. Two attempts with identical command hash and identical runtime/harness digests are the only valid retry pairs.

## Git-object validation

Every SHA referenced by an attempt (evidence HEAD, runtime baseline) MUST be validated as an existing Git object at registration and at manifest time.

## Manifest rules

The pre-fix evidence manifest (COMMIT 2) and the final manifest enumerate every attempt directory, its identities, its disposition, and its result paths. The manifest is **self-excluding**: it does not list itself as an attempt.

## Attempt-to-result mapping

Every controlling result file maps to exactly one `attemptId`. Every controlling `attemptId` maps to its result path(s). No orphan results; no dangling attempts.

## Evidence completeness

No controlling decision may cite an unregistered invocation. The registry must be closure-complete: pre-fix campaign, corrected 567, every oracle run, every focused batch, every rerun cited, every synthetic validator, every deterministic cycle, every staging cycle, every transient failure, every retry.

## Historical-evidence preservation

R13–R19 evidence is byte-identical and untouched (validated in PREFLIGHT: 0 modifications). No R20 work may modify any historical evidence artifact.

## Reviewability requirements

All evidence must be reproducible and reviewable by Codex 5.5 from the committed manifest, registry, identities, and result files alone, without executor narration.
