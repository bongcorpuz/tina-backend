# C34 full-HEAD patch blocker root cause

- Blocker: `C34_FULL_HEAD_PATCH_INVALID`
- Determination: **FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE**
- Existing NT01 disposition: **TECHNICAL_INCOMPLETE_EXECUTOR_STOP**
- Semantic disposition: **NOT_A_SEMANTIC_REJECTION**

The full HEAD-to-NT01 patch was generated correctly: 203665 bytes,
SHA-256 `b41b2b0f69d9d73bbb0a5d3397378109862d97157cb3bac0cfcbe7721f3a1b4f`, with the exact one-file changed set and
canonical repository-relative headers. The internal `git diff --no-index` status
was 1, which means differences were emitted.

The failed runner then applied its forbidden-path expression to the entire patch
body. 6 harmless source/context lines matched
`evaluation/results/` or escaped JavaScript regular-expression backslashes.
No canonical header contained a forbidden path.

The remediation parses only structural header positions. Hostile, missing,
malformed, and extra headers fail closed. Candidate-only and full-HEAD patches
both replay forward and reverse in an isolated non-repository directory and an
isolated clean Git worktree with zero skipped patches, no-ops, or unexpected files.

The original terminal attempt remains immutable. It consumed one allocation and
no semantic result; the direct semantic gates were never reached.
