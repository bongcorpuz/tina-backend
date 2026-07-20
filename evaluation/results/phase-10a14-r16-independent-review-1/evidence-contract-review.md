# Evidence Contract Review

Accepted:

- `R16_IMMUTABLE_EVIDENCE_CONTRACT.md` exists at COMMIT 1 before R16 implementation.
- `evidence.mjs` uses exclusive create for event writes.
- `evidence.mjs` exposes no delete/archive/convert/compact API.
- Final R16 manifest validates 454/454, with 0 missing, 0 mismatches, 0 duplicate paths.

Blocked:

- Registry integrity does not validate Git object existence for commit fields.
- Registry counts `R16-FOCUSED-r15-journal-crash-A3` as `COMPLETED_PASS` and `controlling:true` even though its recovery adjudication says `INVALID_PARTIAL_IMPORT_NON_CONTROLLING`.
- Retry links required by the contract are absent for deterministic retry-ceiling claims.

Adjudication: the contract design is improved, but implementation/accounting is not sufficient for PASS.
