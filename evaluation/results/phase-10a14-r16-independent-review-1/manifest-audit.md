# Manifest Audit

Manifest: `evaluation/results/phase-10a14-r16/EVIDENCE_MANIFEST.sha256`.

Independent validation:

- Entries: 454.
- Unique paths: 454.
- Missing files: 0.
- Hash mismatches: 0.
- Duplicate paths: 0.
- Parse defects: 0.

Important limitation:

- The manifest proves final bytes are stable. It does not prove the bytes are semantically valid. The corrupted `tree-before.txt` in `R16-FOCUSED-r15-journal-crash-A3` hashes successfully because the manifest records the corrupted canonical bytes.
