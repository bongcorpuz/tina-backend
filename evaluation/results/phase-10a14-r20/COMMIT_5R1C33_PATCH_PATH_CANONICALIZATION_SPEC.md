# C33 Patch Path Canonicalization

C33 builds isolated base/services and candidate/services trees, validates raw git diff headers, then transforms only validated exact headers to canonical service-relative paths. Every material patch uses:

`diff --git a/services/<file> b/services/<file>`
`--- a/services/<file>`
`+++ b/services/<file>`

Replay requires a non-empty expected changed-file set, check/apply status zero, no skipped/no-op diagnostics, exact candidate hashes after forward application, and exact base hashes after reverse application in both isolated environments.
