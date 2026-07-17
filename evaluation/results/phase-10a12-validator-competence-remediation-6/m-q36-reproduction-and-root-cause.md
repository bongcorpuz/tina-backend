# PHASE-10A12-R6 — M-Q36 Exact Reproduction & Root Cause (WS1)

## Exact reproduction (from governed R5 payload + R6 runtime)

- **Prompt (frozen manifest):** "What penalties apply to late filing of a VAT return?"
- **R5 committed answer (verbatim):** "Penalties for late filing of a VAT return include a fine of
  PHP 1,000 and an additional 25% of the tax due for each month of delay, not exceeding 50% of the
  total tax due."
- **R5 source cards:** NIRC Sec. 105, 106, 107, 108, RR 16-2005 (general VAT-imposition provisions).
- **R5 trust:** VERIFIED_CONTROLLING; answerSupport stage `llm`, verifiedEligible=true.

## Independent legal defect

The answer is materially wrong on the penalty structure:
- The **25% surcharge** (NIRC Sec 248) is a **one-time** addition to the tax, not "25% of the tax due
  **for each month** of delay, not exceeding 50%". There is no monthly-25%-capped-50% surcharge.
- The **time-based** charge is **interest** at 12% p.a. (NIRC Sec 249, double the legal rate), not a
  monthly surcharge.
- A **compromise penalty** (a fixed schedule amount) may also apply.
- EOPT (RA 11976) changes penalty treatment (reduced rates for micro/small taxpayers).
So the answer confuses **surcharge (one-time) vs interest (periodic)** and fabricates a periodic
surcharge cap. Category confusions present: surcharge↔interest, one-time↔periodic, statutory rate,
statutory base.

## Source relevance

The cited authorities are **general VAT-imposition provisions** (Sec 105-108 define the nature/rate
of VAT and RR 16-2005 implements VAT). **None** is a penalty/procedural provision. Under the frozen
bank, penalty computations require penalty/procedural authority (NIRC Sec 114/248/249, RA 11976,
RR 6-2024, RMC 52-2023). **A general VAT provision cannot support a specific penalty amount or
computation.** This is source-card laundering: topical (VAT) but non-controlling (not penalty).

## R6 outcome

The deterministic `proposition-source-sufficiency` gate now classifies this as a
`penalty_procedural` proposition and, finding no penalty authority in the source cards, fails
closed (`penalty_proposition_without_penalty_authority`). Live R6 rerun: M-Q36 -> RELATED_AUTHORITY_ONLY,
verifiedEligible=false. Invalid verified eliminated.
