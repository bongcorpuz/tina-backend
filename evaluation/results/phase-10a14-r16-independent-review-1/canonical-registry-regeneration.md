# Canonical Registry Regeneration

Independent regeneration from `evaluation/results/phase-10a14-r16/attempts`:

- Total attempts: 47.
- By type: FOCUSED_SUITE 37, DETERMINISTIC_GATE 4, STAGING_GATE 2, CAMPAIGN 1, CRASH 3.
- By status: COMPLETED_PASS 40, COMPLETED_FAIL 7.
- Retries: 0.
- Controlling: 38.

These match the registry's surface counts.

Defects not represented in registry counts:

- Git-object provenance invalid for one fabricated SHA in 11 attempts.
- `R16-FOCUSED-r15-journal-crash-A3` has an invalid partial-import recovery adjudication but is still counted as controlling pass.
- Deterministic A2/A3/A4 are described narratively as retry attempts, but `retryOf` is null for all.
