# COMMIT 4R1S SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `2b44124698023a78680a4d2272d496da9001c6d1`
Parent: `93783a818f06f0009da75d123735bc025f72ef7e`

## Decision for this unit: COMMIT 4R1S COMPLETE — R1 DEFECTS FOUND

The full 1,897-row independent review is complete. 73 confirmed reason-family defects were
found in R1. Per the frozen COMMIT 4R1S contract, **R1 was NOT edited**. R1 remains frozen
and canonical at its existing SHA. The next unit is a new **COMMIT 4R2** versioned re-freeze.

## Scope proof

| Assertion | Result |
|---|---|
| R1 oracle changed | NO — SHA `ba016393…` unchanged |
| V1 oracle changed | NO — SHA `0227a5b4…` unchanged |
| Runtime changed (analyzer/domain-boundary/patterns) | NO |
| Tests changed | NO |
| COMMIT 1–5 / COMMIT 4R1 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Analyzer/classifier imported or executed | NO |
| Baseline pass/fail exposed to reviewer | NO |
| Actual decisions/reasons/relations exposed to reviewer | NO |
| Prior challenge/change status exposed to reviewer | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| Only allowlisted paths changed | YES |

## Blind review packet

- 1,897 inherited rows, exactly 7 authorized fields each (`oracleId`, `query`, `expectedDecision`, `expectedRelations`, `r1ExpectedReasonCodeFamily`, `ruleId`, `primaryRationale`).
- Audit: **0 prohibited field occurrences** (no sourceSet, v1Reason, changedFromV1, actualDecision/Reason, baseline status, or prior-challenge status present).

## Full independent review

- **10 parallel blind Sonnet reviewers**, one per ~190-row chunk, each with zero visibility into analyzer output, V1, baseline results, or prior challenge history.
- **Coverage: 1,897 / 1,897 reviewed. Missing: 0. Duplicates: 0.**
- Result: **1,824 AGREE / 73 CHALLENGE**.
- Every challenge cites a specific RF rule (RF-01 through RF-11) and a row-specific rationale.
- All 73 alternatives validated as **decision-compatible** (0 invalid challenges) against the frozen ALLOW/REFUSE/CLARIFY reason-compatibility table.

## Challenge patterns (73 total, 7 distinct)

| From → To | Rule | Count |
|---|---|---|
| explicit_tax_task_relation → tax_compliance_task | RF-01 | 30 |
| explicit_tax_task_relation → tax_treatment_of_ordinary_object | RF-02 | 20 |
| ambiguous_tax_acronym → no_tax_relation | RF-11 | 10 |
| quoted_tax_term_only → no_tax_relation | RF-11 | 9 |
| no_tax_relation → non_tax_expansion | RF-07 | 2 |
| tax_compliance_task → explicit_tax_task_relation | RF-10 | 1 |
| tax_compliance_task → tax_treatment_of_ordinary_object | RF-02 | 1 |

All are reason-family precision refinements. **None propose a decision change.**

## Adjudicator fix (prepared, not yet applied to any frozen artifact)

The `commit4r1-adjudicator.mjs` structural rules were refined to correctly resolve all 73
challenged patterns (verified 73/73 match the reviewer's confirmed alternative) with 0
regressions among the 1,824 AGREE rows relative to their own query structure — including
correctly generalizing fixes to same-template sibling rows the reviewer did not individually
flag. This corrected adjudicator is available for use when COMMIT 4R2 is authorized; it was
**not** used to modify R1 or any frozen artifact in this unit.

## Authorized changed / added paths

- `evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/review-completion/**` — blind packet, 10 review chunks/results, consolidated review, challenge/resolution registers (new).
- `evaluation/runner/phase-10a14-r20/commit4r1s-packet.mjs`, `commit4r1s-finalize.mjs`, `build-commit4r1s-manifest.mjs` — tooling (no analyzer import).
- `evaluation/runner/phase-10a14-r20/commit4r1-adjudicator.mjs` — refined (fix prepared for future use; not applied to any oracle in this unit).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 4R1S evidence + 5 attempt directories.
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; 19 prior records preserved byte-for-byte; `cumulativeThrough = commit4r1s`.

**No oracle execution against the analyzer.** R1 remains canonical for COMMIT 5 gating purposes
until COMMIT 4R2 supersedes it with the confirmed corrections.
