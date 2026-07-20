# PHASE-10A14-R17 — FROZEN EVIDENCE AND ACCOUNTING CONTRACT

**Frozen at COMMIT 1, before any implementation or governed execution. It will not be
amended during execution.** If it proves impracticable, R17 preserves the failure,
self-assesses REVISIONS REQUIRED and stops — it does not improvise an amendment.

R17 inherits the R16 immutable-attempt structure (one permanent directory per attempt,
exclusive creation, fsync, byte read-back, external capture then verified canonical
import, no delete/archive/convert path) and adds three enforcement layers that R16 lacked.

---

## 1. Git-derived provenance only (P1-R16-IR-006)

R16 validated internal consistency and file hashes but **never asked Git whether a
recorded SHA was real**. A fabricated SHA
(`a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7`) sits in 11 attempts while the R16 registry
still reports `integrity.clean: true`.

**No human-constructed SHA is accepted.** The tooling obtains repository identity from Git
itself. A caller may not supply a controlling SHA field unless the tooling independently
verifies it.

Every controlling SHA must satisfy **all** of:

| Check | Requirement |
|---|---|
| format | exactly 40 hexadecimal characters |
| existence | `git cat-file -t <sha>` succeeds |
| type | object type is exactly `commit` |
| repository | resolvable in this repository |
| ancestry | in the required ancestry relation to the expected base |
| tree consistency | consistent with the recorded tree where a claim is made |

Required registry fields per attempt: `provenanceValid`, `provenanceErrors`,
`headAtStartVerified`, `headAtEndVerified`, `runtimeCommitVerified`, `ancestryVerified`,
`treeEquivalenceVerified`.

**Any false controlling SHA is P1 and blocks PASS.** Non-controlling historical attempts
carrying a false SHA are listed and excluded from controlling evidence, never deleted.

`git cat-file -t <sha>` is used rather than `<sha>^{commit}`, because `execSync` goes
through cmd.exe on Windows where `^` is the escape character and mangles the expression.

## 2. Recovery-disposition precedence (P1-R16-IR-004)

R16 derived status solely from the terminal-event filename and never read
`40-recovery-adjudication.json`, so an attempt adjudicated
`INVALID_PARTIAL_IMPORT_NON_CONTROLLING` was still counted `COMPLETED_PASS`,
`controlling: true`, `malformed: false`.

Precedence, in order:

1. raw attempt events establish the **historical** lifecycle;
2. a verified recovery adjudication may classify an import or attempt as invalid, partial,
   corrupt or non-controlling;
3. **registry controlling status follows the authoritative adjudication**, not the raw
   terminal status;
4. manifest validity does not make corrupt content semantically valid — a file can hash
   perfectly and still be garbage.

Permitted dispositions: `VALID_CONTROLLING`, `VALID_NON_CONTROLLING`,
`INVALID_PARTIAL_IMPORT`, `CORRUPTED_EVIDENCE`, `INVALID_PROVENANCE`,
`SUPERSEDED_TECHNICAL_ATTEMPT`, `UNADJUDICATED`.

**Corruption must be detectable in non-JSON files.** `tree-before.txt` in the R16 attempt
is 186 NUL bytes; a JSON-parse check can never see that. Detection therefore includes: NUL
bytes in a text evidence file, all-whitespace content where a record was expected, and
zero-length files where content was required.

## 3. Retry linkage (P1-R16-IR-005)

R16 reported `retries: 0` with every `retryOf: null`, while its narrative described two
attempts as "technical retries" and claimed a ceiling was reached. Those were **unlinked
reruns**.

A retry record must contain: current attempt ID, prior attempt ID, objective retry reason,
prior status, unchanged-runtime proof, retry sequence number, timestamp.

Validation **rejects**: a null link described as a retry; a missing target; a forward link
to a nonexistent attempt; cycles; a retry after a material legal mismatch without
remediation; and a retry on a changed runtime described as a same-runtime retry.

**An unlinked rerun is not a retry**, cannot count toward a ceiling, and must not be
described as one.

## 4. Retry ceiling

Per required cycle on an unchanged runtime: **one initial attempt plus at most two linked
technical retries**. The ceiling is computed **only from valid links**. A completed
deterministic test failure is **not** automatically an environmental retry. When the
ceiling is reached, stop that gate and report REVISIONS REQUIRED.

## 5. Counting definitions (frozen)

| Term | Definition |
|---|---|
| `runnerInvocations` | actual `node scripts/run-regressions.mjs` process launches |
| `stagingRunnerInvocations` | actual `node scripts/run-staging-smokes.mjs` process launches |
| `focusedSuiteInvocations` | directly launched focused test processes |
| `campaignAttempts` | individual probe attempts |
| `technicalFailures` | attempts ended by code, harness, process, network or environment |
| `completedFailures` | completed attempts whose result failed the frozen expectation |
| `controllingAttempts` | attempts whose disposition is `VALID_CONTROLLING` **and** whose provenance is valid |

A runner invocation is one attempt. A suite inside a runner is not another runner
invocation. A probe is not a runner invocation. A retry is a new attempt.

Every summary must state its scope. `technicalFailures: 0` may never be reported without
stating whether gate-runner attempts are included.

## 6. Single source of counts

`CANONICAL_ATTEMPT_REGISTRY.json` is machine-generated from the immutable attempt
directories plus the three enforcement layers above. Every count in the report, result
JSON, CURRENT_STATE, gate summaries and reconciliation derives from it. **No manually
typed competing total is permitted anywhere.**

## 7. No repository writes during clean-tree gates

All live logs, markers, journals and temporary files remain outside the repository while a
clean-tree-sensitive runner is active. Immutable evidence is imported only after process
termination, and every hash is re-verified after copy.

## 8. Protected-path command rule

`git add evaluation/` is **prohibited**. Explicit file pathspecs only. Before every commit
a protected-path index check must run and fail if any staged path starts with `.claude/`,
`.vscode/` or `evaluation/factcheck/`. No protected path may enter any R17 commit.

## 9. No retrofitting

The frozen probe inventory and PASS thresholds are fixed at COMMIT 1. Expectations are
never adjusted after outcomes are known.
