# C34 canonical replay contract

Every candidate-only and cumulative patch contains only:

`diff --git a/services/<file> b/services/<file>`
`--- a/services/<file>`
`+++ b/services/<file>`

Forward and reverse replay run in an isolated non-repository directory and an
isolated clean Git repository worktree. Candidate-only replay requires exact
bytes and raw SHA-256 for every service. Full-HEAD replay requires normalized-LF
identity for every service, exact bytes/raw SHA-256 for every patch-changed
service, and exact raw starting-HEAD restoration after reverse replay. This
explicitly preserves HEAD LF bytes for normalized-unchanged files when an
immutable candidate snapshot uses CRLF. Both policies require exact changed-path
sets and zero skipped, no-op, or unexpected files. A detached checkout is not
materializable on Windows because immutable history contains reserved `nul`
and `CON` paths; the clean worktree therefore commits exact active-base bytes
reconstructed from governed Git blobs before replay.
