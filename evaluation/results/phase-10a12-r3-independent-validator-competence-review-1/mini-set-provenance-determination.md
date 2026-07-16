# Mini-Set Provenance Determination

Determination: P1 blocker.

The R3 evidence proves that 30 mini fact-check payloads were committed at runtime commit 6ce2d6fd613e7f3109022f5a0f5ea006e9122546. It does not prove that the exact 30 IDs were the pre-existing canonical mini-set before R3.

Evidence supporting payload completion:

- R3 payload enumeration found 30 mini payloads.
- All R3 payloads record the same runtime commit.
- The SHA-256 manifest verified without mismatches.
- No duplicate mini IDs were found.

Evidence against canonical exact-membership proof:

- The R3 report states that the intended 30-set had never been enumerated beyond 20.
- CURRENT_STATE repeats that the intended 30-set had never been enumerated beyond 20.
- Prior A12-R2 artifacts contain only 20 mini question IDs.
- No pre-R3 canonical list with the exact R3 30 IDs was found during review searches.
- The added 10 appear to be real master fact-check questions, but full-corpus membership is not the same as pre-existing canonical mini-set membership.

Conclusion: 30/30 completion is proven. Exact pre-existing canonical membership is not proven. The user assignment says this condition remains P1 and prevents A12-R3 pass.
