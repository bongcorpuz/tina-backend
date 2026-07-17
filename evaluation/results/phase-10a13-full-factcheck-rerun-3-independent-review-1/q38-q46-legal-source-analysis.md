# Q38 And Q46 Legal Source Analysis

This review used repository evidence first, then checked current official/legal public sources for the controlling propositions. External sources consulted:

- BIR e-Registration FAQ: https://etinquery.bir.gov.ph/html/ereg_faqs.html
- BIR 1701 help page referencing Form 1901 for self-employed/mixed-income individuals: https://efps.bir.gov.ph/EFPSWeb_war/forms2013Version/1701/includes/1701_help.html
- RA 10963, Section 34 amending NIRC Section 109 to list sale of gold to BSP as VAT-exempt: https://issuances-library.senate.gov.ph/legislative%2Bissuances/Republic%20Act%20No.%2010963
- RA 11256 text on registered small-scale miners/accredited traders and tax exemptions: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/95834
- BSP Gold Buying Guidelines and RA 11256 certification requirements: https://www.bsp.gov.ph/Pages/CoinsAndNotes/PoliciesAndPrograms/GoldAndSilverBuyingAndSelling.aspx

## Q38 - Business Registration And Form

Question: "Is a new business required to register with the BIR, and what form is used?"

A13 answer pattern in all three rounds:

- Correctly says a new business must register with the BIR before operations.
- Names Form 1901 for self-employed individuals.
- Also names Form 1902 for employees earning compensation income.
- Does not state Form 1903 for corporations, partnerships, and other juridical entities.
- Cites RR 11-2018, RR 2-1998, NIRC Sec. 2, and NIRC Sec. 3.
- Does not cite the frozen-bank controlling registration authority, NIRC Sec. 236, or current business-registration guidance.

Independent determination:

- Form 1902 is not a business-registration form; it is for individuals earning purely compensation income.
- The frozen source bank itself requires Forms 1901/1903 and NIRC Sec. 236 as the governing registration authority.
- BIR public guidance distinguishes single proprietors/professionals/mixed-income earners from local employees, and the BIR 1701 guidance identifies Form 1901 for self-employed and mixed-income individuals, estates, and trusts.
- The cited A13 Q38 sources are materially mismatched. RR 2-1998 and RR 11-2018 are withholding regulations; NIRC Secs. 2 and 3 are foundational BIR powers/organization provisions. None controls the decisive form-selection proposition for new business registration.

Classification:

| run | classification | reason |
|---|---|---|
| Q38-r1 | INVALID VERIFIED_CONTROLLING | Wrong/incomplete form treatment plus source-card laundering on withholding/foundational authorities. |
| Q38-r2 | INVALID VERIFIED_CONTROLLING | Same defect. |
| Q38-r3 | INVALID VERIFIED_CONTROLLING | Same defect. |

Severity: P1.

Systemic class:

- Registration propositions.
- Taxpayer/entity legal-form classification.
- Procedural form selection.
- Foundational-authority laundering.
- Withholding-authority laundering.
- Effective registration/form-version sufficiency.

## Q46 - Gold Sale To BSP

Question: "Is the sale of gold by a small-scale miner to the Bangko Sentral ng Pilipinas subject to VAT?"

A13 round 1 answer pattern:

- Says the sale is "not subject to VAT."
- Cites only NIRC Secs. 105, 106, 107, 108, and RR 16-2005.
- Reasons from general VAT imposition and a broad BSP/government-role theory.
- Uses hedged language: transactions involving BSP "may be exempt" under specific provisions or interpretations.
- Does not cite the specific VAT-exemption authority or RA 11256 qualification framework.

Independent determination:

- The broad result is directionally correct only if stated as VAT-exempt and tied to the correct transaction and qualifications.
- RA 10963 amended NIRC Section 109 to include sale of gold to the BSP as VAT-exempt.
- RA 11256 addresses income and excise tax treatment for registered small-scale miners/accredited traders and requires implementing rules covering registration/accreditation to avail of exemptions. BSP guidance requires certification and a valid/effective small-scale mining contract for tax-exempt transactions.
- General VAT-imposition provisions in NIRC Secs. 105-108 do not themselves support the specific exception/exemption conclusion.
- "Not subject to VAT" is less precise than "VAT-exempt" and can obscure exemption-vs-zero-rating consequences, especially input VAT treatment.

Classification:

| run | classification | reason |
|---|---|---|
| Q46-r1 | QUESTIONABLE VERIFIED_CONTROLLING | Correct broad direction, but verified on general VAT provisions without controlling exemption/qualification authority and with imprecise terminology. |
| Q46-r2 | RELATED_AUTHORITY_ONLY | Safely not verified. |
| Q46-r3 | RELATED_AUTHORITY_ONLY | Safely not verified. |

Severity: P1 as an unresolved questionable VERIFIED_CONTROLLING result.

Systemic class:

- Exemption-vs-zero-rating confusion.
- Transaction-specific VAT treatment.
- General VAT-authority laundering.
- Missing taxpayer qualification.
- Missing controlling exception authority.
- Effective-period and statutory-amendment sufficiency.

## Additional Defect Search

All 30 VERIFIED_CONTROLLING runs were reviewed. No additional invalid or blocker-level questionable verified result was found. Non-blocking observations:

- Q3 and Q34 are correct baseline answers but use general same-tax-type citations rather than the most specific source.
- Q30 is correct on the 6 percent rate but retains prior accepted base/threshold wording imprecision.
- Q1/Q3/Q6/Q13/Q15 show trust-state variation without material legal inconsistency in the verified answers.

Risk-based non-verified sample:

- Q5 remained non-verified by incentive-source-sufficiency; no invalid verified import-VAT incentive answer.
- Q8 bad substantive VAT answer remained RELATED, including one treatment-contradiction stage; no invalid verified lease answer.
- Q25 and Q36 remained non-verified by proposition-source-sufficiency; prior EWT/penalty gates preserved.
- Q46 rounds 2 and 3 were not verified, so the questionable special-transaction treatment did not repeat as VERIFIED_CONTROLLING.

## Generalizable Remediation Recommendation

Do not patch by question ID or exact phrase. Extend source-sufficiency controls by proposition class:

1. Registration/procedural source sufficiency

- Detect decisive registration, taxpayer form, procedural filing, and entity-classification propositions.
- Require registration/form/procedure authority, including NIRC Sec. 236 and current BIR registration/form guidance, not merely BIR powers or withholding regulations.
- Require legal-form qualification: self-employed/single proprietor, employee, corporation, partnership, association, estate/trust, etc.
- Reject foundational-authority and withholding-authority laundering for business-registration answers.

2. Exemption-vs-zero-rating / transaction-specific exception sufficiency

- Detect exemption, zero-rating, "not subject to VAT", special VAT treatment, and transaction-specific exception propositions.
- Require the specific exemption/zero-rating/exception authority and applicable qualification facts.
- For gold-to-BSP propositions, require current NIRC Sec. 109 treatment plus RA 11256/implementing qualification context when the question mentions small-scale miners/traders.
- Reject general VAT imposition authority when the answer depends on a transaction-specific exception.

3. Evidence architecture

- Move from displayed source-card labels toward passage-level proposition support.
- Preserve current fail-closed behavior: if controlling passage support is absent, the answer may be RELATED_AUTHORITY_ONLY or NO_VERIFIED_AUTHORITY, but not VERIFIED_CONTROLLING.
