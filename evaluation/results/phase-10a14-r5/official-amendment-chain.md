# PHASE-10A14-R5 — Official Section 51 / 51-A Amendment-Chain Verification (WS2)

Verification standard: official Philippine sources only (LawPhil, Official Gazette, BIR). No AI-generated consolidation is presented as official. Acquisition date: 2026-07-18.

## Amendment inventory

| Law | Title | Approved | Effectivity | Amends Sec 51? | Official source |
|---|---|---|---|---|---|
| RA 8424 | NIRC of 1997 | 1997-12-11 | 1998-01-01 | base | lawphil ra_8424_1997 |
| RA 10963 | TRAIN | 2017-12-19 | 2018-01-01 | yes (rates, 4-page ITR, 51-A context) | lawphil ra_10963_2017 |
| RA 11976 | Ease of Paying Taxes (EOPT) | 2024-01-05 | **2024-01-22** | **yes** | lawphil ra_11976_2024; officialgazette 2024/01/05 |
| RA 12214 | Capital Markets Efficiency Promotion Act (CMEPA) | **2025-05-29** | 15 days after publication (mid-2025); transitory rates before 2025-07-01 | **yes** | lawphil ra_12214_2025; bir.gov.ph/CMEPA; RR 20-2025, RR 21-2025 |

## Per-proposition effect (officially verified)

RA 11976 (EOPT) amends Section 51 **manner/venue only**: file/pay anywhere via any AAB, RDO through RCO, or **authorized tax software provider**; 4-page ITR; explicit OCW/OFW filing exemption. It does **not** change the ordinary annual filing obligation rule, the April-15 annual deadline (51(C)(1)), or Section 51-A substituted filing. (Verified against lawphil ra_11976_2024.)

RA 12214 (CMEPA, §13) amends **Section 51(C)(2)** — the capital-gains / transaction-specific returns (30-day return on sale of unlisted shares under Sec 24(B)(3), and real property under Sec 24(B)(4)); updates cross-references. It does **not** change the ordinary annual filing obligation, the April-15 annual deadline, or Section 51-A. (Verified against lawphil ra_12214_2025; approved 2025-05-29.)

The governed corpus `NIRC-1997-RA-10963 (BIR).pdf` is a **consolidated** text whose footnote appendix cites RA 11976, RA 12066 (CREATE MORE), RA 12023, RA 12079, and RA 12214, and whose Section 51 body already contains the EOPT manner-of-filing language and the CMEPA-updated 51(C)(2) cross-references. The surfaced text is therefore current; the R4 defect (P1-R4-001) is that the source card is **labeled "RA 10963"** and does not record that the later amendment chain was reviewed.

## Proposition-level temporal matrix

```
[
  { propositionClass: "filing_obligation", subprovision: "51(A)",
    applicableFrom: "1998-01-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51 (RA 8424)",
    amendingAuthorities: ["RA 10963", "RA 11976"],
    currentAuthoritySet: ["NIRC Sec. 51"],
    chainStatus: "BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED",
    note: "EOPT changed manner/venue + OCW exemption only; obligation rule intact through RA 12214." },

  { propositionClass: "filing_deadline", subprovision: "51(C)(1)",
    applicableFrom: "1998-01-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51(C)",
    amendingAuthorities: [],
    currentAuthoritySet: ["NIRC Sec. 51(C)"],
    chainStatus: "CURRENT_COMPLETE_CHAIN",
    note: "April 15 annual deadline unchanged by RA 11976/12214." },

  { propositionClass: "filing_deadline_transaction", subprovision: "51(C)(2)",
    applicableFrom: "2025-07-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51(C)(2) (RA 10963)",
    amendingAuthorities: ["RA 12214"],
    currentAuthoritySet: ["NIRC Sec. 51(C)", "RA 12214"],
    chainStatus: "LATER_AMENDMENT_REQUIRED",
    note: "CGT/transaction-specific 30-day return updated by CMEPA (RA 12214); later law is part of controlling set." },

  { propositionClass: "substituted_filing", subprovision: "51-A",
    applicableFrom: "1998-01-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51-A",
    amendingAuthorities: [],
    currentAuthoritySet: ["NIRC Sec. 51-A"],
    chainStatus: "CURRENT_COMPLETE_CHAIN",
    note: "Substituted filing conditions unchanged by RA 11976/12214." }
]
```

Sources: lawphil ra_11976_2024, lawphil ra_12214_2025, officialgazette RA 11976 (2024-01-05), bir.gov.ph/EOPT, bir.gov.ph/CMEPA, RR 20-2025 / RR 21-2025.
