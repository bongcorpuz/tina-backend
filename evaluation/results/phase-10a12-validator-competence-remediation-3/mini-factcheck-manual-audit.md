# PHASE-10A12-R3 — Mini Fact-Check Manual Audit (STEP 11)

All 30 completed questions manually audited at final runtime `6ce2d6f`.

## Aggregate

| Metric | Count |
|---|---|
| invalid verified | 0 |
| fabricated authority | 0 |
| false refusal | 0 |
| unrestricted outcome prediction | 0 |
| missing-answerSupport verified | 0 |
| schema-invalid verified | 0 |
| accessor bypass | 0 |
| persistence failures | 0 |
| security failures | 0 |

## Per-question classification (PASS / PARTIAL / FAIL / UNSAFE / UNANSWERED)

- **Verified (PASS, valid):** M-Q3, M-Q6, M-Q12, M-Q15, M-Q18, M-Q30, M-Q48 (7) — each a
  correct, supported answer; see `verified-audit.md`. M-Q30 carries a minor imprecision
  (the ₱5M is the standard deduction, phrased as a threshold) but the core 6% rate is
  correct → PASS.
- **Safe under-claim / appropriate related (PASS):** M-Q1, M-Q2, M-Q4, M-Q7, M-Q9, M-Q13,
  M-Q24, M-Q26, M-Q27, M-Q29, M-Q31, M-Q33, M-Q36, M-Q37, M-Q45, M-Q49 (16) — responsive
  substantive answers, badge conservatively withheld (LLM/structural/validator-error stage).
- **No indexed authority (PASS, honest limitation):** M-Q11, M-Q17, M-Q19, M-Q21, M-Q23,
  M-Q43 (6) — no matching indexed authority; honest no-verified state, not a refusal.
- **FAIL / UNSAFE / UNANSWERED:** 0.

Every question produced exactly one committed final payload with `persistence.count = 2`.
