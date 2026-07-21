# PHASE-10A14-R19 — EVIDENCE CONTRACT

Frozen before implementation. Adopts the R18 evidence contract in full
(`evaluation/results/phase-10a14-r18/EVIDENCE_CONTRACT.md`), restated for R19 scope.

## 1. Attempt immutability

One permanent attempt directory per attempt under
`evaluation/results/phase-10a14-r19/attempts/<attemptId>/`. Exclusive creation; no
overwrite; fsync where supported then read-back verification then byte comparison after
import; no delete/archive-conversion/compaction/replacement of failed attempts; no
best-answer selection; recovery adjudication append-only.

## 2. Counting rules

A runner invocation is one attempt; a suite inside a runner is not another invocation; a
probe is not a runner invocation; a retry is a new attempt. Controlling status requires
BOTH valid Git provenance AND a `VALID_CONTROLLING` disposition. Counts derive from
`attemptCategory` only, never command-name inference.

## 3. Provenance

Every Git SHA is validated against Git itself (format, existence, object type `commit`,
ancestry). No caller-supplied SHA or digest is accepted for any identity field.

## 4. Capture discipline

All gate output is captured OUTSIDE the repository. No evidence is imported until the
producing process has terminated. No repository-local temporary capture directory is
created at any point.

## 5. Protected paths

`.claude/`, `.vscode/`, `evaluation/factcheck/` are protected untracked paths, never
staged, modified or deleted. `check-protected-paths.mjs` runs before every commit. R13–R18
historical evidence is immutable.

## 6. Manifest

`EVIDENCE_MANIFEST.sha256` lists every R19 evidence file including failed and
non-controlling attempts, and excludes itself.

## 7. Honest-reporting rule

If tooling built by R19 rejects R19's own claim, the rejection is reported, not
suppressed. A printed PASS with a nonzero process exit is a failure, not a pass.

## 8. Oracle immutability

Once `R19_DEVELOPMENT_ORACLE.json` and `R19_EXECUTOR_UNSEEN_ORACLE.json` are frozen
(final runtime execution begins for the former; unseen campaign execution begins for the
latter), their expectations are never altered. If a probe's expectation is later found
indefensible from its own text, it is recorded as an unresolved evidence-fixture defect
(the MM-15-weak precedent from R17), never silently retrofitted.
