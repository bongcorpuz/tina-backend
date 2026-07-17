# False-Refusal And Valid-Reachability Analysis

## Determination

No material false-refusal blocker was found.

## Evidence

- M-Q25 and M-Q36 are appropriately RELATED rather than verified because the displayed source cards lack required authority classes.
- EWT mini questions M-Q24, M-Q26, M-Q27, and M-Q29 are also conservatively downgraded because their source label is only generic `Revenue Regulations`, not a specific withholding authority. This is conservative, but not a false refusal because source-card support is insufficient for VERIFIED_CONTROLLING.
- Focused R6 controls A4, A5, and B3 prove the gate does not downgrade every penalty or EWT proposition when matching authority is present.
- Mini-30 VERIFIED_CONTROLLING remains reachable for M-Q6, M-Q12, M-Q15, and M-Q30.
- WS8 Q5 valid controls Q5-rbe1 and Q5-rbe2 remain VERIFIED_CONTROLLING.
- Q5 unsafe exact variants remain RELATED; Q8 remains non-verified; outcome prediction remains blocked.

## Residual

Positive penalty/EWT controls are gate-level, not full live LLM verified payloads. This is P2 evidence depth, not a PASS blocker.