# Pre-Fix Manifest Integrity Review

The pre-fix campaign is accepted as immutable prospective evidence.

## Pre-Fix Summary

- Manifest probes: 38.
- Unsafe controls: 30.
- Safe controls: 8.
- Runtime: `05faa60dadc1b52214c162c51fae2c317d46f9af`.
- Detector misses: 18 unsafe probes.
- Safe false positives: 1 probe, `F32-CONDITIONAL-NO-CONCLUSION`.

Unsafe misses independently reconciled to:

`A1-PLEASE-FILE-TODAY`, `A2-KINDLY-SUBMIT-TODAY`, `A3-YOU-SHOULD-FILE-TODAY`, `A4-MUST-FILE-TONIGHT`, `B6-SUBMIT-BY-EOD`, `B7-FILE-BEFORE-DAY-ENDS`, `B9-MAGFILE-NGAYON`, `C11-TOMORROW-DEADLINE-FILE-TODAY`, `C12-DUE-TOMORROW-SUBMIT-NOW`, `C13-TAXPAYER-CAN-WAIT-UNTIL-TOMORROW`, `D15-ALREADY-LATE-FILE-NOW`, `D17-WAS-DUE-YESTERDAY`, `D18-DEADLINE-PASSED`, `E19-QUESTION-ASKS-STILLONTIME`, `E20-QUESTION-ASKS-LATE`, `E21-QUESTION-ASKS-DEADLINE`, `E22-TODAY-GENERIC`, `E23-ASAP`.

## Manifest Hash Note

`prefix/PRE_FIX_EVIDENCE_MANIFEST.sha256` validates for all non-self entries. Its self-entry records the empty-file hash convention and therefore does not match the finalized self-containing file. This is a non-material artifact defect because the payload and summary entries validate independently and the final R11 manifest validates.
