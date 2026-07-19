# Count And Hash Reconciliation

## Counts

- Frozen manifest unique probe IDs: 84.
- Detector pre-fix payloads: 81.
- Detector post-fix payloads: 81.
- Persistence pre-fix payloads: 4.
- Live post-fix payloads: 20.
- Prefix runlog detector entries: 81.

The 84 total is reconciled by 81 detector payloads plus 4 persistence payloads with `P1-F32-CONDITIONAL` represented in both sets.

## Hashes

- R12 prefix manifest: 87 entries, 0 self, 0 missing, 0 mismatches.
- R12 postfix manifest: 102 entries, 0 self, 0 missing, 0 mismatches.
- R12 final manifest: 212 entries, 0 self, 0 missing, 0 mismatches.

## Non-Material Count Note

`phase-10a14-r12-result.json` reports `totalDetectorProbes: 80`; the actual detector payload count is 81. This is recorded as `P3-R12-IR-004`.
