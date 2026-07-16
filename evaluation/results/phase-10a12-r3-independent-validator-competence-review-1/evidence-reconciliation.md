# Evidence Reconciliation

## Repo And Lineage

| Check | Result |
| --- | --- |
| Branch | feature/source-availability-engine-v1 |
| Evidence/final HEAD reviewed | 09087cb8e3fc8c63741e584aec183f2dc6055c84 |
| Runtime commit reviewed | 6ce2d6fd613e7f3109022f5a0f5ea006e9122546 |
| Runtime commit ancestor of evidence HEAD | Yes |
| Backend sync at review start | 0 ahead / 0 behind |
| Protected untracked paths | .vscode/ and evaluation/factcheck/ left untouched |

## Payload Counts

| Dimension | Count |
| --- | ---: |
| Total payloads | 66 |
| VERIFIED_CONTROLLING | 12 |
| RELATED_AUTHORITY_ONLY | 47 |
| NO_VERIFIED_AUTHORITY | 7 |
| Duplicate payload IDs | 0 |
| Duplicate payload hashes | 0 |
| Runtime commits observed in payloads | 1, all 6ce2d6fd613e7f3109022f5a0f5ea006e9122546 |
| SHA-256 manifest lines checked | 82 |
| SHA-256 mismatches | 0 |

## Payload Groups

| Group | Count |
| --- | ---: |
| mini | 30 |
| q5exact | 5 |
| q5para | 10 |
| q5r2exact | 3 |
| q8aggregate | 2 |
| q8exact | 2 |
| q8incomplete | 2 |
| q8para | 4 |
| restriction | 3 |
| vcontrol | 5 |

## Verified IDs

M-Q12, M-Q15, M-Q18, M-Q3, M-Q30, M-Q48, M-Q6, Q5-par2, Q5-par7, VC-Q32, VC-Q34, VC-Q47.

## Mini IDs Observed In R3

M-Q1, M-Q2, M-Q3, M-Q4, M-Q6, M-Q7, M-Q9, M-Q11, M-Q12, M-Q13, M-Q14, M-Q15, M-Q17, M-Q18, M-Q19, M-Q21, M-Q23, M-Q24, M-Q26, M-Q27, M-Q29, M-Q30, M-Q31, M-Q33, M-Q36, M-Q37, M-Q43, M-Q45, M-Q48, M-Q49.

## Test Reconciliation

| Suite | Review rerun result |
| --- | --- |
| phase-10a12-r3 | 20 passed, 0 failed, 46 assertions |
| phase-10a12-r2 | 10 passed, 0 failed, 31 assertions |
| phase-10a12-r1 | 19 passed, 0 failed, 42 assertions |
| phase-10a10-r1 | 22 passed, 0 failed, 37 assertions |
| phase-10a10-r2 | 27 passed, 0 failed, 33 assertions |
| phase-10a verified | 18 passed, 0 failed, 30 assertions |
| phase-8 | 24 passed, 0 failed, 37 assertions |
| scripts/run-regressions.mjs | Exit 1; 195 suites run, 2 failed |

## Report Claim Reconciliation

| R3 claim | Independent review result |
| --- | --- |
| Q5-p1 invalid fixed | Supported by runtime code, reproduction evidence, and Q5 payloads. |
| 66 payloads/counts | Supported. |
| Mini 30/30 payload completion | Supported as committed payload completion. |
| Mini exact canonical 30 provenance | Not supported; P1 under user assignment. |
| All focused suites pass | Supported by rerun. |
| repo run-regressions.mjs exit 0 | Not supported by live rerun; P1. |
| sourceExcerptGrounded=false | Confirmed and treated as honest P2 limitation. |
| Security clean | Supported for reviewed R3 artifacts. |
