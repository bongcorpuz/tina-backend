# TINA Tax Fact-Check — Completed Run Log (PHASE-10A7)

Framework: TINA_Tax_FactCheck_Corrected_Validated_Master v3.0 (50 canonical questions).
Executor: Claude Code — Opus 4.8 — Low Speed. Backend HEAD 9ac5ba4. Frontend HEAD 0816ac8.
Environment: local authenticated server against real staging Supabase vector store + real OpenAI; controlled-LOA ask gate enabled; every canonical question queried verbatim; 3 fresh conversations per question; hard-refresh + history-reopen persistence checked each run; all evidence sanitized.

Runs: 150 / 150 completed. Timeouts: 0. Technical failures: 0. Trust-state + legal-conclusion identical across all three runs for every case (0 unsafe inconsistency).

| Case | Category | authoritySupport (3 runs) | legalConclusion | runs | avg ms | Verdict | UNSAFE | Note |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| Q1 | VAT / Registration | VERIFIED_CONTROLLING | ALLOWED | 3 | 18297 | PASS | no | States exceed ₱3M, voluntary registration. |
| Q2 | VAT / Real Property | VERIFIED_CONTROLLING | ALLOWED | 3 | 17901 | FAIL | YES | Cites obsolete ₱1.5M residential-lot threshold (removed); declares VAT categorically. VERIFIED_CONTROLLING. |
| Q3 | VAT / Refund | VERIFIED_CONTROLLING | ALLOWED | 3 | 13958 | PARTIAL | no | Thin; does not clearly state zero-rated / 2-year / 90-day core. |
| Q4 | VAT / Professional Services | VERIFIED_CONTROLLING | ALLOWED | 3 | 11718 | PARTIAL | no | Mentions RR16-2005 but weak on professional-services exclusion linkage. |
| Q5 | VAT / Importation / CREATE MORE | VERIFIED_CONTROLLING | ALLOWED | 3 | 13873 | PARTIAL | no | States 12% general rule; omits CREATE MORE export exemption/70% test. |
| Q6 | VAT / Invoicing | VERIFIED_CONTROLLING | ALLOWED | 3 | 17834 | PARTIAL | no | Directional on non-VAT invoice; omits 50% surcharge / VAT-without-credit. |
| Q7 | VAT / Input Tax | VERIFIED_CONTROLLING | ALLOWED | 3 | 15331 | PARTIAL | no | Thin; lacks direct-attribution/apportionment detail. |
| Q8 | VAT / Lease | VERIFIED_CONTROLLING | ALLOWED | 3 | 14791 | FAIL | YES | Says ₱15,000/month residential lease is subject to VAT; correct = VAT-EXEMPT. Reversed treatment. VERIFIED_CONTROLLING. |
| Q9 | Income Tax / Filing | VERIFIED_CONTROLLING | ALLOWED | 3 | 10996 | FAIL | YES | Says spouses cannot file joint return / must file separate returns; PH rule = single joint return, separately computed. VERIFIED_CONTROLLING. |
| Q10 | Income Tax / Corporations | NO_VERIFIED_AUTHORITY | ALLOWED | 3 | 7202 | PARTIAL | no | States 25% CREATE; omits 20% alternative and both conditions. Trust NO_VERIFIED_AUTHORITY. |
| Q11 | Income Tax / Compensation | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 13730 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q12 | Income Tax / Filing | VERIFIED_CONTROLLING | ALLOWED | 3 | 10104 | PARTIAL | no | ₱250k not required to file; under-conditions on pure-compensation facts. |
| Q13 | Income Tax / Self-Employed | VERIFIED_CONTROLLING | ALLOWED | 3 | 8559 | PARTIAL | no | 8% rate + ₱3M; omits in-lieu/election and pure-vs-mixed ₱250k treatment. |
| Q14 | Income Tax / Passive Income | VERIFIED_CONTROLLING | ALLOWED | 3 | 8104 | PASS | no | 20% final WHT on peso savings interest. Correct. |
| Q15 | Income Tax / Corporations | VERIFIED_CONTROLLING | ALLOWED | 3 | 12578 | PARTIAL | no | MCIT 2% gross income correct; commencement/higher-than-regular condition thin. |
| Q16 | Income Tax / Passive Income | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 14874 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q17 | Income Tax / Nonresident Alien | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 14687 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q18 | Income Tax / Deductions | NO_VERIFIED_AUTHORITY | ALLOWED | 3 | 8078 | PASS | no | OSD 40%, individual gross sales vs corp gross income. Correct. Trust under-claim (NO_VERIFIED). |
| Q19 | Capital Gains / Shares | NO_VERIFIED_AUTHORITY | ALLOWED | 3 | 11390 | PASS | no | 15% net capital gain on unlisted shares. Correct. Trust under-claim. |
| Q20 | Capital Gains / Real Property | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 11567 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q21 | Documentary Stamp Tax | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 17875 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q22 | Capital Gains / Ordinary Assets | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 11779 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q23 | Capital Gains / Individuals | NOT_APPLICABLE | NOT_APPLICABLE | 3 | 315 | NOT_ANSWERED | no | FALSE DOMAIN_BOUNDARY refusal of a valid PH tax question (holding-period rule). 3/3. |
| Q24 | Withholding Tax | VERIFIED_CONTROLLING | ALLOWED | 3 | 11060 | PARTIAL | no | EWT prof fees 10% only; omits 5% and ₱3M condition/declaration. VERIFIED_CONTROLLING. |
| Q25 | Withholding Tax / General Professional Partnerships | VERIFIED_CONTROLLING | ALLOWED | 3 | 14770 | PARTIAL | no | Thin; does not resolve individual vs GPP vs juridical payee. VERIFIED_CONTROLLING. |
| Q26 | Withholding Tax / Compliance | VERIFIED_CONTROLLING | ALLOWED | 3 | 7337 | PARTIAL | no | 10th-day baseline; omits 0619-E/1601-EQ quarterly and eFPS caveat. VERIFIED_CONTROLLING. |
| Q27 | Withholding Tax / Rentals | VERIFIED_CONTROLLING | ALLOWED | 3 | 7305 | FAIL | YES | Equipment/property rental EWT stated as 2%; correct = 5%. Wrong withholding rate. VERIFIED_CONTROLLING. |
| Q28 | Income Tax / Passive Income | VERIFIED_CONTROLLING | ALLOWED | 3 | 8257 | PASS | no | 20% final tax on royalties to a domestic corporation. Correct. |
| Q29 | Withholding Tax / Small Payments | VERIFIED_CONTROLLING | ALLOWED | 3 | 8164 | FAIL | YES | Invents a de-minimis EWT exemption for a ₱500 payment; framework = no universal de-minimis exemption. VERIFIED_CONTROLLING. |
| Q30 | Estate Tax | VERIFIED_CONTROLLING | ALLOWED | 3 | 13752 | PARTIAL | no | 6% estate rate correct but base described as 'exceeding ₱5,000,000' (conflates standard deduction with a threshold). |
| Q31 | Estate Tax / Deductions | VERIFIED_CONTROLLING | ALLOWED | 3 | 9857 | FAIL | YES | Near-empty answer (headers/practical only, no stated amounts) yet VERIFIED_CONTROLLING. |
| Q32 | Estate Tax / Compliance | VERIFIED_CONTROLLING | ALLOWED | 3 | 12606 | PASS | no | Estate return one year + 30-day filing extension. Correct. |
| Q33 | Estate Tax / Deductions | VERIFIED_CONTROLLING | ALLOWED | 3 | 9768 | PASS | no | Family-home deduction up to ₱10M. Correct. |
| Q34 | Income Tax / Compliance | VERIFIED_CONTROLLING | ALLOWED | 3 | 9337 | PASS | no | Individual ITR deadline April 15. Correct. |
| Q35 | Income Tax / Forms | VERIFIED_CONTROLLING | ALLOWED | 3 | 16153 | PARTIAL | no | Names Form 1701 only; omits 1701A (8%) and 1701-MS distinctions. VERIFIED_CONTROLLING. |
| Q36 | VAT / Penalties | VERIFIED_CONTROLLING | ALLOWED | 3 | 15122 | PARTIAL | no | Generic penalty/interest; omits EOPT micro/small reduced-penalty distinction. VERIFIED_CONTROLLING. |
| Q37 | Tax Procedure / Assessment | VERIFIED_CONTROLLING | ALLOWED | 3 | 15034 | FAIL | YES | EMPTY answer (section headers only, no content) classified VERIFIED_CONTROLLING (3-year assessment rule unanswered). |
| Q38 | Registration / EOPT | VERIFIED_CONTROLLING | ALLOWED | 3 | 13197 | PARTIAL | no | Before-commencement + 1901 correct; 1902 mis-labeled; omits ₱500-fee abolition. |
| Q39 | Books and Records / EOPT | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 16328 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q40 | Tax Procedure / Collection | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 18877 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q41 | Penalties / Invoicing | VERIFIED_CONTROLLING | ALLOWED | 3 | 12769 | FAIL | YES | Vague non-substantive answer (no statutory fine/imprisonment) yet VERIFIED_CONTROLLING. |
| Q42 | Income Tax / Penalties | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 12400 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q43 | Tax Enforcement | NOT_APPLICABLE | NOT_APPLICABLE | 3 | 316 | NOT_ANSWERED | no | FALSE DOMAIN_BOUNDARY refusal of a valid PH tax question (Oplan Kandado). 3/3. |
| Q44 | Income Tax / Source and Residency | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 12902 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |
| Q45 | Tax Incentives / CREATE MORE | VERIFIED_CONTROLLING | ALLOWED | 3 | 15304 | PARTIAL | no | PEZA subject to CIT but preferential; does not fully distinguish ITH/SCIT/EDR regimes. VERIFIED_CONTROLLING. |
| Q46 | VAT / Special Law | VERIFIED_CONTROLLING | ALLOWED | 3 | 12292 | PASS | no | Gold sale by small-scale miner to BSP VAT-exempt. Correct. |
| Q47 | Donor's Tax | VERIFIED_CONTROLLING | ALLOWED | 3 | 27673 | PASS | no | Donor's tax 6%, ₱250k annual exemption. Correct. |
| Q48 | Income Tax / Deductions | VERIFIED_CONTROLLING | ALLOWED | 3 | 13204 | PARTIAL | no | Bad-debt worthless + prior income directional; omits charge-off/evidence detail. VERIFIED_CONTROLLING. |
| Q49 | VAT / Customs | VERIFIED_CONTROLLING | ALLOWED | 3 | 13743 | FAIL | YES | Says returning-resident personal effects are 'subject to VAT: Yes'; CMTA conditional exemption ignored. VERIFIED_CONTROLLING. |
| Q50 | Invoicing / EOPT | NO_VERIFIED_AUTHORITY | UNKNOWN | 3 | 13568 | NOT_ANSWERED | no | Could-not-identify safe under-claim. |

## Correctness distribution

- PASS: 10  ·  PARTIAL: 18  ·  FAIL: 9  ·  NOT ANSWERED: 13  ·  UNSAFE: 9

## False high-confidence (VERIFIED_CONTROLLING over wrong/empty answers)

Q2, Q8, Q9, Q27, Q29, Q31, Q37, Q41, Q49 (all reproducible 3/3).

## False domain-boundary refusals (valid PH tax questions)

Q23 (individual capital-gain holding period), Q43 (Oplan Kandado) — reproducible 3/3.

Per the v3.0 release-governance rules, every PARTIAL, FAIL, and UNSAFE result requires human tax review before any production-readiness rating.
