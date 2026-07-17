# PHASE-10A13-FULL-FACTCHECK-RERUN-3-INDEPENDENT-REVIEW-1 Findings Table

| severity | id | finding | disposition |
|---|---|---|---|
| P1 | A13-IR-P1-001 | Q38 produced INVALID VERIFIED_CONTROLLING in all 3 rounds. The answer verified a business-registration proposition while citing withholding/foundational authorities and naming Form 1902 as a business registration form. | Confirmed. Requires source-sufficiency remediation for registration/procedural propositions. |
| P1 | A13-IR-P1-002 | Q46 round 1 produced QUESTIONABLE VERIFIED_CONTROLLING. The answer reached the correct broad VAT result but verified it on general VAT-imposition authorities, not the specific exemption/qualification authority. | Confirmed. Requires source-sufficiency remediation for exemption-vs-zero-rating and transaction-specific exception propositions. |
| P2 | A13-IR-P2-001 | Source-card evidence is label/hash based; passage-level proposition support is not committed for each decisive statement. | Carryover recommendation. Move beyond displayed source labels toward passage-level support. |
| P2 | A13-IR-P2-002 | The R6 proposition-source-sufficiency gate covers penalty/EWT classes but is not exhaustive. | Confirmed by Q38/Q46 materialization. |
| P2 | A13-IR-P2-003 | Q3 and Q34 verified results are correct baseline answers but cite general same-tax-type authorities rather than the most specific provisions. | Non-blocking citation precision. |
| P2 | A13-IR-P2-004 | Q30 states the correct 6 percent estate-tax rate but carries the prior accepted base/threshold precision issue. | Non-blocking precision carryover. |
| P2 | A13-IR-P2-005 | Trust-state instability occurred on otherwise valid answers Q1, Q3, Q6, Q13, and Q15. | Harmless for answer correctness, but should remain monitored. |
| P2 | A13-IR-P2-006 | Chronology proves manifest commit before first live request; independent proof of exact remote push timestamp is not available from local git metadata. | Evidence limitation; remote branch currently contains the manifest ancestor. |
| P3 | A13-IR-P3-001 | Three Q10 technical retries were required for degenerate 16-character generations. | Bounded retries preserved; no unfavorable canonical answer replacement found. |
| P0 | none | No secrets, production changes, runtime remediation, validator remediation, model change, deployment, reindexing, frontend change, or Dev Factory change found in reviewed A13 evidence. | Clean. |

Severity totals: P0=0, P1=2, P2=6, P3=1.
