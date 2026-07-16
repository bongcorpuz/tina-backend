# PHASE-10A12-R3 — Safe-Under-Claim Accounting (STEP 14)

RELATED_AUTHORITY_ONLY is NOT equated wholesale with "safe under-claim". Each of the 47
RELATED results across the 66-payload final set is classified by the stage that withheld the
badge.

| Category | Stage(s) | Count | Classification |
|---|---|---|---|
| Deterministic guard downgrade (wrong/incomplete/unsafe answer correctly blocked) | material-exception-omission (8), incentive-source-sufficiency (7), treatment-contradiction (3), outcome-prediction (1) | 19 | Appropriate related-authority state — NOT a false refusal (a substantive answer was returned; the badge was correctly withheld). |
| Structural incompleteness | structural (7) | 7 | Appropriate downgrade (headers-only / non-substantive body). |
| LLM validator judged incomplete/unsupported | llm ve=false (16) | 16 | Appropriate related-authority state (answer not materially complete or not fully supported). |
| Validator unavailable / API error → fail closed | error (3) | 3 | **Conservative safe under-claim** — a correct answer may have been downgraded because the gpt-4o-mini validator call errored (fail-closed by design). |
| Restriction / outcome-prediction, no answerSupport | none (2: RES-1, RES-3) | 2 | Appropriate — substantive procedural explanation returned, badge correctly withheld. |
| **Total RELATED** | | **47** | |

## NO_VERIFIED_AUTHORITY (7)

`M-Q11, M-Q17, M-Q19, M-Q21, M-Q23, M-Q43, Q8-agg2` — retrieval surfaced no indexed
authority matching the specific claim; TINA returned an honest no-verified state. Not a false
refusal (a responsive answer/limitation was given, not a domain-boundary rejection of a valid
tax question).

## Metrics

- **Conservative safe under-claims (bounded):** 3 (validator-error downgrades). A broader
  reading (correct-but-not-fully-complete answers the strict gpt-4o-mini validator declined)
  is captured by the 16 llm-stage downgrades; these are appropriate under the fail-closed
  contract, not defects.
- **False refusals: 0** — every question received a substantive tax answer; none was
  wrongly domain-bounded or refused.
- **Excessive conservative downgrades of a KNOWN-correct verifiable answer: 0 confirmed**
  (validator-error cases are unavoidable fail-closed, not a calibration defect).
