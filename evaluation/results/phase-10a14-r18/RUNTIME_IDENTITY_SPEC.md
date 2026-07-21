# PHASE-10A14-R18 — RUNTIME IDENTITY SPECIFICATION

Frozen before implementation.

## 1. Defect being remediated (P1-R17-IR1-001)

R17 stored repository HEAD as `runtimeCommit`. Committing each failed attempt — which the
immutable-evidence sequence *requires* — moved HEAD, so the retry validator rejected A2 and
A3 as `RETRY_RUNTIME_CHANGED` even though every runtime file was byte-identical. R17 ended
with `validRetryCount = 0`, `retryErrors = 2`, no governably valid retry ceiling, and
registry integrity not clean.

The defect is that **repository HEAD is not runtime identity.** HEAD is evidence identity.

## 2. Four separated identities

| Identity | Question it answers | Source |
|---|---|---|
| Evidence identity | Which commit is the evidence tree at? | `git rev-parse HEAD` |
| Runtime identity | Is the code under test the same? | digest over frozen runtime manifest |
| Harness identity | Is the measuring apparatus the same? | digest over frozen harness manifest |
| Environment identity | Is the execution context the same? | node/platform/arch + lock digest |

Evidence identity may move freely between attempts. Runtime, harness and environment
identity must not move across a retry link.

**This model is prospective. It applies to R18 and later only. It does not retroactively
validate R17 A2/A3, and R17 remains NOT SATISFIED.**

## 3. Required recorded fields

Each governed R18 attempt records exactly:

```text
attemptId  attemptType  attemptCategory  gateName  cycle  attemptOrdinal
retryOf  retryReason

evidenceHeadAtAllocation  evidenceHeadAtStart  evidenceHeadAtEnd

runtimeBaselineCommit  runtimeScopeManifestPath  runtimeScopeManifestSha256
runtimeTreeDigest  runtimeFilesCount

harnessScopeManifestPath  harnessScopeManifestSha256
harnessTreeDigest  harnessFilesCount

dependencyLockDigest  nodeVersion  platform  architecture  environmentFingerprint

command  startedAt  endedAt  exitCode  signal  status  disposition  controlling
```

## 4. Runtime identity definition

`runtimeBaselineCommit` is the exact commit at which the R18 final runtime is frozen. It is
recorded for provenance and validated as a real Git commit object; it is **not** used as the
identity value itself.

`runtimeTreeDigest` is computed from a frozen, explicit, sorted manifest
(`RUNTIME_SCOPE_MANIFEST.json`) of all runtime-relevant files. The digest is
`sha256` over the concatenation of `path\n<sha256 of file bytes>\n` for every manifest entry
in sorted path order. It is therefore independently recomputable by any reviewer from the
working tree alone, with no Git dependency.

The manifest includes at minimum: runtime JavaScript modules; pipeline and handlers;
domain-boundary files; workflow runtime files on the tested path; `package.json`;
`package-lock.json`; configuration files affecting execution; feature-flag interpretation
code.

Repository HEAD is never used as runtime identity.

A missing manifest file is a hard error, never a silently skipped entry — otherwise deleting
a runtime file would preserve the digest.

## 5. Harness identity definition

`harnessTreeDigest` is computed identically over `HARNESS_SCOPE_MANIFEST.json`, covering the
gate runner, the relevant test files, the R18 attempt runner, the retry validator, the
registry builder, and any wrapper able to affect output or classification.

Runtime and harness are digested separately so that a harness-only change is visible as a
harness-only change and can never masquerade as runtime stability.

## 6. Anti-forgery rule

No caller may supply `runtimeTreeDigest`, `harnessTreeDigest`, `runtimeBaselineCommit` or any
Git SHA. Every such field is computed inside the attempt allocator at allocation time and
recomputed at validation time from the manifests. A caller-supplied value is rejected.

All Git SHA fields are validated as existing commit objects in this repository (format,
existence, object type `commit`, ancestry).

## 7. Evidence-HEAD movement rule

Evidence HEAD may differ between a retry and its target **only** because earlier immutable
attempt evidence was committed. The validator computes the changed-file set between
`evidenceHeadAtEnd` of the target and `evidenceHeadAtAllocation` of the retry, and requires
every changed path to be confined to authorized evidence/report paths:

- `evaluation/results/phase-10a14-r18/**`
- `evaluation/results/phase-10a14-r18-result.json`
- the R18 report
- `knowledge/CURRENT_STATE.md`

Any non-evidence path in that set — any runtime, harness, package, config or historical
evidence file — invalidates the link. This is what makes evidence-HEAD movement safe to
permit rather than merely tolerated.
