# TINA Tax Fact-Check v3.0 - Completed Run Log (PHASE-10A9 rerun)

Framework: TINA_Tax_FactCheck_Corrected_Validated_Master v3.0 (50 canonical questions). Executor: Claude Code - Opus 4.8 - Low Speed. Backend HEAD bb1f1af (runtime 104bcee, answer-support validator active). Frontend 0816ac8. Environment: local authenticated server vs real staging Supabase retrieval + real OpenAI (gpt-4o-mini generation + validator); every question queried verbatim; 3 fresh conversations per question; persistence sampled each run; evidence sanitized.

Runs: 150/150. Timeouts: 0. Technical failures: 0. Persistence failures: 0. Legal conclusion identical across all 3 runs for every case (0 unsafe inconsistency).

VERIFIED_CONTROLLING runs: 36 (valid 14, questionable 21, invalid 1 -> Q41-r3). Safe under-claims: 41 runs.

| Case | Category | A9 authoritySupport (3 runs) | verifiedRuns | trust-state consistent | A7 verdict | verified validity |
| --- | --- | --- | ---: | --- | --- | --- |
| Q1 | VAT / Registration | RELATED_AUTHORITY_ONLY | 0 | yes | PASS | - |
| Q2 | VAT / Real Property | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q3 | VAT / Refund | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 2 | NO | PARTIAL | valid,valid |
| Q4 | VAT / Professional Services | RELATED_AUTHORITY_ONLY | 0 | yes | PARTIAL | - |
| Q5 | VAT / Importation / CREATE MORE | VERIFIED_CONTROLLING | 3 | yes | PARTIAL | questionable,questionable,questionable |
| Q6 | VAT / Invoicing | VERIFIED_CONTROLLING | 3 | yes | PARTIAL | questionable,questionable,questionable |
| Q7 | VAT / Input Tax | RELATED_AUTHORITY_ONLY | 0 | yes | PARTIAL | - |
| Q8 | VAT / Lease | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q9 | Income Tax / Filing | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q10 | Income Tax / Corporations | NO_VERIFIED_AUTHORITY | 0 | yes | PARTIAL | - |
| Q11 | Income Tax / Compensation | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q12 | Income Tax / Filing | RELATED_AUTHORITY_ONLY/VERIFIED_CONTROLLING | 1 | NO | PARTIAL | valid |
| Q13 | Income Tax / Self-Employed | RELATED_AUTHORITY_ONLY | 0 | yes | PARTIAL | - |
| Q14 | Income Tax / Passive Income | RELATED_AUTHORITY_ONLY | 0 | yes | PASS | - |
| Q15 | Income Tax / Corporations | RELATED_AUTHORITY_ONLY/VERIFIED_CONTROLLING | 1 | NO | PARTIAL | valid |
| Q16 | Income Tax / Passive Income | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q17 | Income Tax / Nonresident Alien | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q18 | Income Tax / Deductions | NO_VERIFIED_AUTHORITY | 0 | yes | PASS | - |
| Q19 | Capital Gains / Shares | NO_VERIFIED_AUTHORITY | 0 | yes | PASS | - |
| Q20 | Capital Gains / Real Property | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q21 | Documentary Stamp Tax | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q22 | Capital Gains / Ordinary Assets | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q23 | Capital Gains / Individuals | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q24 | Withholding Tax | RELATED_AUTHORITY_ONLY | 0 | yes | PARTIAL | - |
| Q25 | Withholding Tax / General Professional Partnerships | RELATED_AUTHORITY_ONLY | 0 | yes | PARTIAL | - |
| Q26 | Withholding Tax / Compliance | RELATED_AUTHORITY_ONLY/VERIFIED_CONTROLLING | 2 | NO | PARTIAL | questionable,questionable |
| Q27 | Withholding Tax / Rentals | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q28 | Income Tax / Passive Income | RELATED_AUTHORITY_ONLY | 0 | yes | PASS | - |
| Q29 | Withholding Tax / Small Payments | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q30 | Estate Tax | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 2 | NO | PARTIAL | questionable,questionable |
| Q31 | Estate Tax / Deductions | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q32 | Estate Tax / Compliance | VERIFIED_CONTROLLING | 3 | yes | PASS | valid,valid,valid |
| Q33 | Estate Tax / Deductions | RELATED_AUTHORITY_ONLY | 0 | yes | PASS | - |
| Q34 | Income Tax / Compliance | VERIFIED_CONTROLLING | 3 | yes | PASS | valid,valid,valid |
| Q35 | Income Tax / Forms | VERIFIED_CONTROLLING | 3 | yes | PARTIAL | questionable,questionable,questionable |
| Q36 | VAT / Penalties | RELATED_AUTHORITY_ONLY | 0 | yes | PARTIAL | - |
| Q37 | Tax Procedure / Assessment | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 1 | NO | FAIL | questionable |
| Q38 | Registration / EOPT | VERIFIED_CONTROLLING | 3 | yes | PARTIAL | questionable,questionable,questionable |
| Q39 | Books and Records / EOPT | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q40 | Tax Procedure / Collection | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q41 | Penalties / Invoicing | RELATED_AUTHORITY_ONLY/VERIFIED_CONTROLLING | 1 | NO | FAIL | invalid |
| Q42 | Income Tax / Penalties | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q43 | Tax Enforcement | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q44 | Income Tax / Source and Residency | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |
| Q45 | Tax Incentives / CREATE MORE | VERIFIED_CONTROLLING/RELATED_AUTHORITY_ONLY | 1 | NO | PARTIAL | questionable |
| Q46 | VAT / Special Law | RELATED_AUTHORITY_ONLY/VERIFIED_CONTROLLING | 1 | NO | PASS | valid |
| Q47 | Donor's Tax | VERIFIED_CONTROLLING | 3 | yes | PASS | valid,valid,valid |
| Q48 | Income Tax / Deductions | VERIFIED_CONTROLLING | 3 | yes | PARTIAL | questionable,questionable,questionable |
| Q49 | VAT / Customs | RELATED_AUTHORITY_ONLY | 0 | yes | FAIL | - |
| Q50 | Invoicing / EOPT | NO_VERIFIED_AUTHORITY | 0 | yes | NOT_ANSWERED | - |

## Prior nine false-high-confidence cases (A7 -> A9)
Q2,Q8,Q9,Q27,Q29,Q31,Q49: 0/3 VERIFIED_CONTROLLING (fully resolved). Q37: 1/3 verified (that run correct for the exact question; questionable completeness). Q41: 1/3 verified and that run is INVALID (non-responsive; Section 238 mis-cite) = residual P1.

## Prior two false refusals
Q23, Q43: now NO_VERIFIED_AUTHORITY (safe fallback) across all 3 runs -- no longer DOMAIN_BOUNDARY refusals.

Per v3.0 governance, every PARTIAL/FAIL/UNSAFE and every VERIFIED_CONTROLLING run received manual review.
