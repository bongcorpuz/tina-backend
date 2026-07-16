# TINA Tax Fact-Check v3.0 - Completed Run Log (PHASE-10A11 rerun 2)

Framework v3.0 (50 questions). Executor: Claude Code - Opus 4.8 - Low Speed. Backend HEAD 1a8bcc1 (runtime 728aba6+2e636a1+3de68f8). Real staging Supabase retrieval + real OpenAI gpt-4o-mini (generation + validator). 3 fresh conversations/question; persistence sampled; evidence sanitized.

Runs 150/150. Timeouts 0. Technical failures 0. Persistence failures 0.

VERIFIED_CONTROLLING runs: 24 (valid 13, questionable 10, invalid 1 -> Q8-r2). Verified WITHOUT valid attestation: 0. Clusters Q5/Q35/Q41 verified: 0/0/0. Safe under-claims: 52.

| Case | Category | authoritySupport (3 runs) | verifiedRuns | attestation | verified validity |
| --- | --- | --- | ---: | --- | --- |
| Q1 | VAT / Registration | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q2 | VAT / Real Property | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q3 | VAT / Refund | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q4 | VAT / Professional Services | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q5 | VAT / Importation / CREATE MORE | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q6 | VAT / Invoicing | VERIFIED_CONTROLLING | 3 | ok | questionable,questionable,questionable |
| Q7 | VAT / Input Tax | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q8 | VAT / Lease | RELATED_AUTHORITY_ONLY/VERIFIED_CONTROLLING | 1 | ok | invalid |
| Q9 | Income Tax / Filing | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q10 | Income Tax / Corporations | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q11 | Income Tax / Compensation | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q12 | Income Tax / Filing | VERIFIED_CONTROLLING | 3 | ok | valid,valid,valid |
| Q13 | Income Tax / Self-Employed | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q14 | Income Tax / Passive Income | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q15 | Income Tax / Corporations | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 2 | ok | valid,valid |
| Q16 | Income Tax / Passive Income | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q17 | Income Tax / Nonresident Alien | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q18 | Income Tax / Deductions | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q19 | Capital Gains / Shares | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q20 | Capital Gains / Real Property | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q21 | Documentary Stamp Tax | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q22 | Capital Gains / Ordinary Assets | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q23 | Capital Gains / Individuals | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q24 | Withholding Tax | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q25 | Withholding Tax / General Professional Partnerships | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q26 | Withholding Tax / Compliance | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q27 | Withholding Tax / Rentals | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q28 | Income Tax / Passive Income | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q29 | Withholding Tax / Small Payments | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q30 | Estate Tax | VERIFIED_CONTROLLING | 3 | ok | questionable,questionable,questionable |
| Q31 | Estate Tax / Deductions | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q32 | Estate Tax / Compliance | VERIFIED_CONTROLLING | 3 | ok | valid,valid,valid |
| Q33 | Estate Tax / Deductions | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q34 | Income Tax / Compliance | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q35 | Income Tax / Forms | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q36 | VAT / Penalties | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q37 | Tax Procedure / Assessment | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q38 | Registration / EOPT | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 2 | ok | questionable,questionable |
| Q39 | Books and Records / EOPT | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q40 | Tax Procedure / Collection | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q41 | Penalties / Invoicing | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q42 | Income Tax / Penalties | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q43 | Tax Enforcement | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q44 | Income Tax / Source and Residency | NO_VERIFIED_AUTHORITY | 0 | ok | - |
| Q45 | Tax Incentives / CREATE MORE | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q46 | VAT / Special Law | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 2 | ok | valid,valid |
| Q47 | Donor's Tax | VERIFIED_CONTROLLING | 3 | ok | valid,valid,valid |
| Q48 | Income Tax / Deductions | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 2 | ok | questionable,questionable |
| Q49 | VAT / Customs | RELATED_AUTHORITY_ONLY | 0 | ok | - |
| Q50 | Invoicing / EOPT | NO_VERIFIED_AUTHORITY | 0 | ok | - |

## Prior nine
Q2/Q9/Q27/Q29/Q31/Q37/Q41/Q49 -> 0 invalid verified. Q8 -> 1/3 invalid verified (Q8-r2 reversed VAT) = residual P1.

## Prior false refusals
Q23/Q43 -> NO_VERIFIED_AUTHORITY across all 3 runs (no refusal).

Every VERIFIED_CONTROLLING run and every non-PASS case received manual review.
