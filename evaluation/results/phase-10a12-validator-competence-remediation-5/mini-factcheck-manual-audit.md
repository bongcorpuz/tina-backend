# PHASE-10A12-R5 — Mini Fact-Check Manual Audit

All 30 governed canonical questions audited at runtime `cd046304111d26a439c4c37321881524acd41eb6`.

| Metric | Count |
|---|---|
| invalid verified | 1 (M-Q36) |
| fabricated authority | 0 |
| false refusal | 0 |
| unrestricted outcome prediction | 0 |
| missing-answerSupport verified | 0 |
| schema-invalid verified | 0 |
| accessor bypass | 0 |
| persistence failures | 0 |
| security failures | 0 |

- **Verified VALID (PASS):** M-Q1, M-Q12, M-Q15, M-Q25, M-Q3.
- **Verified INVALID (FAIL, P1):** M-Q36 — see verified-audit.md.
- **Safe under-claim / appropriate related (PASS):** M-Q2, M-Q4, M-Q6, M-Q7, M-Q9, M-Q13, M-Q14, M-Q24, M-Q26, M-Q27, M-Q29, M-Q30, M-Q31, M-Q33.
- **Honest no-indexed-authority (PASS):** M-Q10, M-Q11, M-Q16, M-Q17, M-Q18, M-Q19, M-Q20, M-Q21, M-Q22, M-Q23.

Note: M-Q10 produced an intermittently degenerate (header-only) generation across attempts; the committed payload is a substantive NO_VERIFIED_AUTHORITY response (safe, not verified).
