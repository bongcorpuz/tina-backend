# R14 — IMMUTABLE ATTEMPT-JOURNAL CONTRACT

This contract exists because P1-R13-IR-002 established that a disclosed failed attempt
was lost before its corrective commit. R14's answer is not a promise of care; it is a
mechanical rule: **an attempt record is written before the attempt runs, and is never
edited afterwards.**

## Journal location

`evaluation/results/phase-10a14-r14/journal/<campaignId>/<attemptId>.json`

The journal is append-only at the filesystem level: one immutable file per attempt.
There is no aggregate file that is rewritten in place; aggregates
(`*_SUMMARY.json`, manifests) are **derived** artifacts regenerated from the journal.

## Attempt identity

Every execution attempt receives a stable `attemptId` **before execution begins**:

```
<campaignId>-<probeId>-A<attemptSequence>
```

`attemptSequence` starts at 1 and increments per (campaignId, probeId). The ID is
allocated and the record skeleton written to disk *before* the call is made, so that a
crash, hang or process kill still leaves the attempt visible.

## Campaign generations

`campaignId` encodes the runtime it ran against:

```
R14-<phase>-<runtimeCommit12>
```

where `phase` ∈ `PREFIX`, `POSTFIX1`, `POSTFIX2`, … , `FINAL`, `LIVE`.

**Every runtime change starts a new campaign generation.** Attempts from an earlier
generation are never re-run in place, never relabelled, and never deleted. They remain
part of the chronology permanently.

## Required record fields

```jsonc
{
  "task":                     "PHASE-10A14-R14-...",
  "campaignId":               "R14-PREFIX-a311e97f91d6",
  "probeId":                  "X1-...",
  "attemptId":                "R14-PREFIX-a311e97f91d6-X1-...-A1",
  "attemptSequence":          1,
  "runtimeCommit":            "a311e97f91d6a086597d6fe5584dff07a52a7cd0",
  "deploymentId":             null,
  "executionMode":            "DETERMINISTIC | LIVE_HANDLER | SIMULATION",
  "exactQuestion":            "...",
  "answerFixtureOrRawAnswer": "...",
  "expectedClassification":   "UNSAFE | SAFE",
  "actualClassification":     "UNSAFE | SAFE | ERROR",
  "validatorStage":           "calendar-relative-deadline | ...",
  "publicAnswer":             null,
  "persistenceStatus":        null,
  "persistenceReceipt":       null,
  "persistedAnswer":          null,
  "historyAnswer":            null,
  "technicalFailure":         false,
  "failureReason":            null,
  "requestHash":              "sha256:...",
  "responseHash":             "sha256:...",
  "payloadHash":              "sha256:...",
  "startedAt":                "ISO-8601 UTC",
  "completedAt":              "ISO-8601 UTC",
  "supersededByAttemptId":    null
}
```

## Rules

1. **Append-only.** A written attempt file is never modified after `completedAt` is set.
2. **No overwrite.** Allocating an `attemptId` that already exists on disk is a hard
   error, not an overwrite.
3. **No deletion.** No attempt file is removed for any reason, including "it was a
   mistake", "it was a duplicate", or "it was noise".
4. **No relabelling a legal failure as a technical failure.** `technicalFailure = true`
   is reserved for transport/process faults (timeout, socket error, non-JSON response,
   process crash). A correctly-executed probe that produced a wrong classification is a
   **legal failure** and must be recorded with `technicalFailure = false`.
5. **No best-answer retries.** Re-running a probe because the result was unwelcome is
   prohibited. Re-running is permitted only for `technicalFailure = true`, and the retry
   is a **new attempt** with `attemptSequence + 1`; the failed attempt remains visible.
6. **Every technical retry remains visible.** `supersededByAttemptId` on the earlier
   record points forward to the retry. The earlier record is not deleted and its content
   is not altered — this field is written once, at the moment the retry is allocated,
   and is the sole exception to rule 1.
7. **Only final-runtime attempts may control PASS.** Attempts from `PREFIX` or any
   intermediate `POSTFIX<n>` generation are chronology, not gate evidence.
8. **All earlier attempts remain part of chronology** and must reconcile in the counts.

## Preservation-before-correction rule

This is the rule whose absence caused P1-R13-IR-002:

> Any defect discovered after a runtime commit must be written to the journal **and
> committed and pushed** — with raw payload, diagnostics, runtime commit, request/
> response/payload hashes, attempt ID and failure classification — **before** any
> further runtime change is made.

A corrective commit is authorized only after the failed-attempt evidence commit is
pushed and `0 0` synchronization is verified. After any corrective commit, the **full**
frozen campaign is re-run uniformly against the new runtime as a new generation.

## Manifest self-exclusion

Every `EVIDENCE_MANIFEST.sha256` hashes every evidence file **except itself**. Manifests
must validate with zero missing and zero mismatched entries, and must include every
material attempt.
