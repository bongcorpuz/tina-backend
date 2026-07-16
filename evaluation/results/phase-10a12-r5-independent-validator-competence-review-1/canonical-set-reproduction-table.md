# Canonical Set Reproduction Table

| Check | Result | Evidence |
| --- | --- | --- |
| Deterministic selection rule | PASS | Exclude reserved IDs `{5,8,28,32,34,35,41,46,47}`, sort ascending, take first 30. |
| Selected IDs | PASS | M-Q1,M-Q2,M-Q3,M-Q4,M-Q6,M-Q7,M-Q9,M-Q10,M-Q11,M-Q12,M-Q13,M-Q14,M-Q15,M-Q16,M-Q17,M-Q18,M-Q19,M-Q20,M-Q21,M-Q22,M-Q23,M-Q24,M-Q25,M-Q26,M-Q27,M-Q29,M-Q30,M-Q31,M-Q33,M-Q36 |
| Canonical SHA-256 | PASS | `8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1` reproduced using LF-joined `id<TAB>prompt` rows with no trailing LF. |
| Selected per-question hashes | PASS | 0 mismatches. |
| Bank per-question hashes | PASS | 0 mismatches. |
| Hash file row count | PASS | 80 rows: 30 selected + 50 bank. |