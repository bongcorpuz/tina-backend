# PHASE-10A14-R18 — EVIDENCE CONTRACT

Frozen before implementation. Not amendable after implementation begins.

## 1. Attempt immutability

One permanent attempt directory per attempt, under
`evaluation/results/phase-10a14-r18/attempts/<attemptId>/`.

- **Exclusive creation.** Directory creation uses exclusive semantics; an existing
  `attemptId` is a hard error, never a reuse.
- **No overwrite.** Every evidence file is written once. A second write to an existing
  evidence path is a hard error.
- **fsync where supported**, then **read-back verification**, then **byte comparison** after
  import. An import that does not compare byte-identical is a hard error.
- **No delete. No archive conversion. No compaction. No replacement of failed attempts.**
- **No best-answer selection.** Every attempt executed is preserved and registered,
  including failures, non-controlling attempts and attempts that embarrass the executor.
- **Recovery adjudication is append-only** and never edits a prior terminal event.

## 2. Counting rules

- A runner invocation is one attempt.
- A suite inside a runner is not another runner invocation.
- A probe is not a runner invocation.
- A retry is a new attempt.
- Controlling status requires **both** valid Git provenance **and** a `VALID_CONTROLLING`
  disposition. A raw terminal PASS alone never confers controlling status.
- Counts derive from `attemptCategory` only, never from command-name inference.

## 3. Provenance

Every Git SHA field is validated against Git itself: format, existence, object type
`commit`, repository membership, ancestry. No caller-supplied SHA or digest is accepted for
any identity field; all are computed at allocation and recomputed at validation.

All runtime and harness digests must be independently recomputable by a reviewer from the
frozen manifests and the working tree alone.

## 4. Capture discipline

All gate output is captured **outside the repository**. No evidence is imported into the
repository until the producing process has terminated. No gate runs with an in-progress
untracked evidence directory in the tree.

No repository-local temporary capture directory is created at any point.

## 5. Protected paths

`.claude/`, `.vscode/` and `evaluation/factcheck/` are protected untracked paths. They are
never staged, modified or deleted. A protected-path check runs before **every** commit and
fails the commit if any staged path falls under them. `git add evaluation/` and other broad
pathspecs are never used; every commit stages explicit paths.

R13–R17 historical evidence is immutable. It is never modified, regenerated, normalized,
backdated or deleted. Git history is never amended.

## 6. Manifest

`EVIDENCE_MANIFEST.sha256` lists every R18 evidence file including failed and non-controlling
attempts, and **excludes itself**. A manifest that lists itself is invalid.

## 7. Honest-reporting rule

If tooling built by R18 rejects R18's own claim, the rejection is reported, not suppressed
and not engineered around. Redefining a count, a threshold or a validity rule after seeing it
reject the executor's own result is retrofitting and is forbidden — it is the exact defect
class that P1-R16-IR-005 and P1-R17-IR1-001 were raised for.

A printed PASS with a nonzero process exit code is a failure, not a pass.
