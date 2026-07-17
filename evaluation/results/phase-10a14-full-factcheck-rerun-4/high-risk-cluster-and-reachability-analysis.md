# PHASE-10A14 — High-Risk Cluster Preservation, Q38/Q46 & Reachability Analysis (WS8/WS9)

## Q5/Q8/Q25/Q36/Q38/Q46 preservation (all 3 rounds)
| cluster | verified/3 | states | gate | invalid verified |
|---|---|---|---|---|
| Q5 (import VAT / CREATE MORE) | 0/3 | RRR | incentive-source-sufficiency | 0 |
| Q8 (residential lease VAT) | 0/3 | RRR | treatment-contradiction / llm | 0 |
| Q25 (EWT legal-form) | 0/3 | RRR | proposition-source-sufficiency (EWT) | 0 |
| Q36 (penalties) | 0/3 | RRR | proposition-source-sufficiency (penalty) | 0 |
| Q38 (registration/procedural) | 0/3 | RRR | proposition-source-sufficiency (registration) | 0 |
| Q46 (transaction-specific VAT exception) | 0/3 | RRR | proposition-source-sufficiency (vat_exception) | 0 |

**Q38 (each round):** answer proposes registration/form but retrieval surfaces withholding/foundational
authority (no Sec 236); the registration_procedural gate fails closed. Employee-vs-business form is not
verified; foundational BIR powers do not establish the form; invalid/questionable verified = 0.

**Q46 (each round):** "not subject to VAT" / exemption asserted on general VAT-imposition sources
(105-108, RR 16-2005); the vat_exception gate fails closed (no Sec 109 / specific exception authority).
Exemption-vs-zero-rating is not verified on general authority; invalid/questionable verified = 0.

## Valid-reachability (WS8 sidecars + live canonical)
- **Registration reachability — DEMONSTRATED LIVE:** Q1-r3 is classified `registration_procedural`,
  gate SUFFICIENT (Sec 236 present), and VERIFIED_CONTROLLING. This proves the registration gate does
  NOT blanket-suppress: a registration proposition verifies when the controlling registration authority
  (Sec 236) is in the displayed source cards. (Q6-r2/r3 also verified with Sec 236 present.)
- **Ordinary general-VAT reachability — DEMONSTRATED:** SIDE-GENVAT-POS ("VAT rate on sale of goods")
  VERIFIED on Sec 106; the vat_exception gate does not over-block the general 12% rule.
- **VAT-exception reachability — preserved (proven):** deterministic R1 tests + A13-R1 live Q46-p1
  (VAT-exempt on Sec 109) demonstrate the capability; general exemption reachability is intact.
- **SIDE-REG-POS and SIDE-VATEXC-POS RELATED (P2 retrieval-surfacing limitation, NOT blanket
  suppression):** both answers were legally correct (Form 1903; agri/marine food exempt), but retrieval
  surfaced NON-controlling authority (foundational Sec 2/3; general VAT 105-108) instead of Sec 236 /
  Sec 109, so the gate correctly failed closed (anti-laundering). The gates discriminate on displayed
  authority (proven by Q1-r3 verifying), so this is a retrieval/source-surfacing limitation
  (consistent with the standing source/passage-grounding P2), not a gate blanket-suppression defect.
