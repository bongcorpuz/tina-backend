# Pre-Patch Reproduction Review

The original A14 payloads Q12-r1/r2/r3, Q30-r1/r2/r3, and Q34-r1/r2/r3 were inspected.

Confirmed pre-patch defects:
- Q12: all three were VERIFIED_CONTROLLING. The answer converted no-tax-due/rate-table treatment into no-filing-required without filing-return authority. Displayed sources were Sec. 23/24/27-type classification/rate sources, not filing-treatment authority.
- Q30: all three were VERIFIED_CONTROLLING. The answer stated estate tax as 6% on the estate value exceeding PHP 5,000,000, conflating rate, net estate, standard deduction and threshold concepts.
- Q34: all three were VERIFIED_CONTROLLING. The answer stated the April 15 individual AITR deadline without filing/deadline authority; displayed sources were rate/residency/corporate provisions.

The defects were genuine runtime trust failures, not merely report-classification disagreements.