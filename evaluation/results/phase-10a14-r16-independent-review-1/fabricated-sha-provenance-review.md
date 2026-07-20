# Fabricated SHA Provenance Review

False SHA:

`a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7`

Git validation:

- The value is a 40-character hex string.
- `git cat-file -t` rejects it: it is not an object.

Attempts containing the false SHA:

- `R16-FOCUSED-all26-replay-A1`
- `R16-FOCUSED-r10-focused-A1`
- `R16-FOCUSED-r11-focused-A1`
- `R16-FOCUSED-r12-focused-A1`
- `R16-FOCUSED-r13-focused-A1`
- `R16-FOCUSED-r14-focused-A1`
- `R16-FOCUSED-r15-focused-A1`
- `R16-FOCUSED-r15-journal-crash-A1`
- `R16-FOCUSED-r16-domain-A1`
- `R16-FOCUSED-r16-tooling-A1`
- `R16-FOCUSED-r9-focused-A1`

Scope:

- These attempts are recovery-adjudicated as non-controlling.
- Later reruns exist.

Severity:

- P1 evidence-provenance defect for PASS purposes because the canonical registry reports `integrity.clean=true` while Git-object provenance is false.
