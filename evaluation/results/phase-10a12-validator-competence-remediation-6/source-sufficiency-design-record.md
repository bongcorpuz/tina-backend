# PHASE-10A12-R6 — Proposition-Specific Source-Sufficiency Design Record (WS3)

## Problem class (R5 review root cause)

A decisive legal proposition of one type received VERIFIED_CONTROLLING on source cards that are
topically adjacent but do not control that proposition (source-card laundering). Class-level, not a
single-question bug. The LLM validator can approve a legal rule unsupported by the cited cards, and
the prior deterministic gates (Q5 import-VAT incentive, Q8 residential lease) are cluster-specific.

## Control (`evaluatePropositionSourceSufficiency`, services/answer-support-validator.js)

A deterministic pre-gate that runs BEFORE the gpt-4o-mini validator and fails closed regardless of
LLM approval. It classifies the answer's decisive proposition and requires the DISPLAYED SOURCE
CARDS to carry authority of the matching class. It is generalizable — keyed on proposition class and
authority class, NOT question IDs, exact strings, prompt-specific hardcoding, or answer-specific deny
lists.

### Proposition classes (question-led, reinforced by answer)

- `penalty_procedural`: penalty / surcharge / interest-as-penalty / compromise penalty / late filing
  / late payment / failure to file/pay / delinquency / deficiency. Question-led so an answer merely
  mentioning penalties in passing does not trip it. Bare "interest" (passive-income interest) and
  generic "filing deadline" are deliberately excluded to avoid over-firing (protects VC-Q32/Q34
  deadline reachability and M-Q14 final-WHT).
- `withholding_ewt`: expanded / creditable withholding (EWT) on professional/service fees.
  Distinguished from FINAL withholding tax on passive income (different authority: Sec 24(B)/27(D)) —
  `final withholding` is excluded so M-Q14 is not misclassified.

### Required authority classes (SOURCE CARD labels only — anti-laundering)

- Penalty authority: NIRC Sec 248/249/250/253/254/255, RA 11976 / EOPT, RR 6-2024, RMC 52-2023,
  compromise penalty. General VAT/income imposition sections are NOT penalty authority.
- Withholding authority: RR 2-1998 / 2-98 / 11-2018 / 14-2002 / 17-2003 / 6-2001, RMC 50-2018,
  NIRC Sec 57/58, expanded/creditable withholding. VAT registration/invoicing authority is NOT
  withholding authority.

### Fail-closed rule

- Penalty proposition asserted with no penalty authority in the cards -> fail closed
  (`penalty_proposition_without_penalty_authority`).
- EWT proposition asserted with no withholding authority in the cards -> fail closed
  (`ewt_proposition_without_withholding_authority`).

### Why this is a legal-risk CLASS control (not only M-Q36/M-Q25)

The gate fires on ANY penalty/procedural computation or EWT conclusion lacking matching authority.
Live R6 confirms it deterministically hardened the entire EWT cluster (M-Q24, M-Q26, M-Q27, M-Q29)
and the penalty question (M-Q36) — not just the two flagged IDs. It never fires on a question ID or
prompt string.

### Reachability preservation

Verified reachability is preserved when the matching authority is cited: a penalty answer citing
Sec 248/249 is sufficient; an EWT answer citing RR 2-1998/11-2018 is sufficient (focused tests A4,
A5, B3). The gate NEVER upgrades trust — it can only withhold eligibility (fail closed). The LLM
validator remains a secondary check, not the sole source-sufficiency decision-maker.

## Extensibility

The framework maps proposition class -> required authority class. Additional classes (filing-deadline
/ form-obligation procedural, percentage tax, DST, etc.) can be added with their authority sets. R6
implements the two proven-defect classes (penalty, EWT) as the minimum generalizable controls.
