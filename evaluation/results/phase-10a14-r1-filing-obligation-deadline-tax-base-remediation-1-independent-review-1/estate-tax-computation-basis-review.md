# Estate-Tax Computation-Basis Review

Implementation reviewed at services/answer-support-validator.js:627 and 681-684.

Strengths:
- The exact Q30 wording pattern ('6% ... value of the estate ... exceeding') is blocked.
- Donor's tax 6% over PHP 250,000 is not over-blocked.
- Correct '6% of the net estate; standard deduction separately applies' wording remains reachable.

Material defect:
The estate-base misstatement detector is materially phrase-dependent. Independent probes that remained sufficient included:
- 'Estate tax is 6% of the excess over PHP 5,000,000.'
- 'The first PHP 5,000,000 of the estate is tax-free and the rest is taxed at 6%.'
- 'The estate threshold is PHP 5,000,000; estate tax is 6% above that threshold.'
- 'Estate tax is 6% of gross estate less PHP 5,000,000.'

Official source check: RA 10963 Sec. 84 imposes estate tax at 6% based on the value of the net estate, while Sec. 86 separately provides deductions, including the PHP 5,000,000 standard deduction for citizen/resident estates and PHP 500,000 for nonresident noncitizen estates. Treating the deduction as a taxable threshold remains a material bypass.