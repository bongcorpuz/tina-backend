# COMMIT 4R2 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `3213d654b7a9d293a6a90761a370de2cb8ff91f2`
Parent: `2b44124698023a78680a4d2272d496da9001c6d1`

## Decision for this unit: COMMIT 4R2 COMPLETE

Created a new R2 oracle applying exactly the 73 independently confirmed reason-family
corrections from the committed R1S review. R1 and V1 remain immutable. R2 supersedes R1
only as the canonical development oracle for COMMIT 5 Restart 1.

## Scope proof

| Assertion | Result |
|---|---|
| V1 oracle changed | NO — SHA `0227a5b4…` unchanged |
| R1 oracle changed | NO — SHA `ba016393…` unchanged |
| R1 package / R1S review evidence changed | NO |
| Runtime changed (analyzer/domain-boundary/patterns) | NO |
| Tests changed | NO |
| COMMIT 1–5 / 4R1 / 4R1S evidence changed | NO (except cumulative `CANONICAL_*`) |
| Prior manifests changed | NO |
| R13–R19 historical change | NO |
| Analyzer/classifier imported or executed | NO |
| Production boundary imported or executed | NO |
| Runtime output (actualDecision/Reason/Relations, baseline) used to select/validate corrections | NO |
| Model / network / embeddings in builder | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| Only allowlisted paths changed | YES |

## R2 correctness proof (R1 → R2)

- Row count 3,720; **row order and oracleIds identical** (0 order changes).
- **73 rows changed, 3,647 unchanged.** All 1,823 R20 new rows byte-identical (0 changes).
- **0 unauthorized field diffs · 0 decision changes · 0 relation changes · 0 query changes.**
- Only `expectedReasonCodeFamily` (+ a `reasonCorrection` object) changed on the 73 confirmed-defect rows.
- Every changed oracleId maps to exactly one R1S-confirmed defect; 0 confirmed corrections omitted; 0 unconfirmed rows changed.
- All 73 targets are closed-set, RF-rule-consistent, and decision-compatible (0 conflicts).

## Correction source & provenance

- The 73 corrections derive exclusively from the committed R1S resolution register (`R1_DEFECT_CONFIRMED` × 73), cross-referenced to the challenge register. Runtime output was NOT used.
- Adjudicator cross-check (application aid only): 73/73 agree with the resolution targets, 0 conflicts. The resolution register is controlling. The adjudicator file was frozen at its starting-HEAD hash `8455526b…` and not modified.

## R1S source-label clerical discrepancy (owner-adjudicated)

9 corrections ("Can the expense be deducted for withholding tax return in case N?") carried a `reviewedReason` label in the challenge register (`explicit_tax_task_relation`) that differs from the actual frozen R1 reason (`tax_compliance_task`). Per owner adjudication:
- `r1ExpectedReasonCodeFamily` uses the **actual frozen R1 reason** (`tax_compliance_task`).
- `r2ExpectedReasonCodeFamily` uses the **committed resolvedReason** (`tax_treatment_of_ordinary_object`, RF-02).
- Target corrections unchanged; decision and relations unchanged. Documented in `COMMIT_4R2_R1S_SOURCE_LABEL_DISCREPANCY.json`, classification `REVIEW_SOURCE_LABEL_CLERICAL_DISCREPANCY`. R1S evidence was NOT edited.

## Mandatory independent correction-application review

- Executor self-check (Attempt Z): 73/73 VERIFIED, 0 challenges, 9 label-discrepancies verified.
- **Independent (non-executor) reviewer (Sonnet 5)**: **73/73 VERIFIED, 0 challenges, 0 missing, 0 duplicates**, all 9 label-discrepancy rows individually confirmed. Recorded in `revisions/reason-family-r2/R20_REASON_FAMILY_R2_INDEPENDENT_CORRECTION_REVIEW.json`.

## Authorized changed / added paths

- `evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/**` — the R2 oracle package (new).
- `evaluation/runner/phase-10a14-r20/commit4r2-builder.mjs`, `commit4r2-driver.mjs`, `build-commit4r2-manifest.mjs` — tooling (no analyzer import).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 4R2 evidence + 5 attempt directories.
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; 24 prior records preserved byte-for-byte; `cumulativeThrough = commit4r2`.

**No oracle execution against the analyzer.** R2 canonical SHA-256: `1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd`.
