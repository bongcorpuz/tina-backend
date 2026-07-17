# PHASE-10A12-R6 — Mini Fact-Check Manual Audit

All 30 governed canonical questions audited at runtime `09751a6e038bde9324af9a05213d9c92295e3eb9`.

| Metric | Count |
|---|---|
| invalid verified | 0 |
| questionable verified | 0 |
| fabricated authority | 0 |
| false refusal | 0 |
| unrestricted outcome prediction | 0 |
| missing-answerSupport verified | 0 |
| schema-invalid verified | 0 |
| accessor bypass | 0 |
| persistence failures | 0 |
| security failures | 0 |

- **Verified VALID (PASS):** M-Q12, M-Q15, M-Q30, M-Q6.
- **P1 remediation confirmed:** M-Q25 -> RELATED_AUTHORITY_ONLY (was invalid VERIFIED_CONTROLLING); M-Q36 -> RELATED_AUTHORITY_ONLY (was invalid VERIFIED_CONTROLLING). Both now fail closed at stage `proposition-source-sufficiency`.
- **Safe under-claim / appropriate related (PASS):** M-Q1, M-Q2, M-Q3, M-Q4, M-Q7, M-Q9, M-Q13, M-Q14, M-Q24, M-Q25, M-Q26, M-Q27, M-Q29, M-Q31, M-Q33, M-Q36.
- **Honest no-indexed-authority (PASS):** M-Q10, M-Q11, M-Q16, M-Q17, M-Q18, M-Q19, M-Q20, M-Q21, M-Q22, M-Q23.
