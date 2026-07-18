# Official Amendment-Chain Legal Review

Primary sources consulted:

- RA 8424, Supreme Court E-Library: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3896
- RA 10963, Supreme Court E-Library: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/80559
- RA 11976, Supreme Court E-Library: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/96948
- RA 11976, Lawphil: https://lawphil.net/statutes/repacts/ra2024/ra_11976_2024.html
- RA 12214, Supreme Court E-Library: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/99213
- BIR EOPT/CMEPA/RR context: https://www.bir.gov.ph/home

## Legal Conclusions

- Ordinary individual filing obligation: RA 11976 amended Sec. 51 but did not change the core ordinary filing obligation for business/professional/self-employed and other non-exempt individual taxpayers. Current chain must still disclose later review.
- Individuals not required to file: RA 10963 changed the low-income and compensation-only framework; RA 11976 added/clarified OFW/OCW exemption language. Current answers must be sensitive to taxpayer type.
- Self-employed/professionals: the filing obligation remains; threshold-only reasoning is unsafe without Sec. 51.
- Compensation-only taxpayers: Sec. 51-A substituted filing remains the special rule where one-employer/correct-withholding conditions are met.
- Multiple-employer/mixed-income taxpayers: not substituted filing; Sec. 51 obligation remains relevant.
- Ordinary annual deadline: April 15 rule under Sec. 51(C)(1) remains unchanged by RA 11976/RA 12214.
- Transaction-specific Sec. 51(C)(2): RA 12214 later amendment is required for current capital-gains transaction timing.
- Substituted filing: Sec. 51-A was created by RA 10963, not RA 8424.

## Review Classification

The legal thesis can support BASE_LANGUAGE_UNCHANGED_CHAIN_REVIEWED for ordinary current filing propositions, and LATER_AMENDMENT_REQUIRED for current transaction-specific Sec. 51(C)(2). R5 implementation does not fully encode that chain correctly for Sec. 51-A and does not handle historical ordinary filing periods cleanly.
