# Copy-Corruption Review

Attempt: `R16-FOCUSED-r15-journal-crash-A3`.

Recovery adjudication says:

- defect: `ABORTED_IMPORT_CORRUPTED_COPY`
- disposition: `INVALID_PARTIAL_IMPORT_NON_CONTROLLING`
- corrupt file: `tree-before.txt`
- claimed corruption: 186 spaces instead of the real 186 bytes.

Independent inspection:

- `tree-before.txt` is still present in the canonical attempt directory.
- It is 186 bytes of NUL bytes, not a valid tree-state record.
- Manifest validates because it hashes the corrupted canonical bytes.
- `readCanonicalAttempt()` reports the attempt as `COMPLETED_PASS`, `malformed:false`, `controlling:true`.

Adjudication:

- Preserving the partial directory is appropriate.
- Counting it as a normal controlling pass is not appropriate.
- `0 malformed` is incomplete because the registry does not model invalid/corrupted non-JSON evidence files or recovery-adjudication disposition.
