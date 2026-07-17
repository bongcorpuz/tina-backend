# PHASE-10A14-R1 — Design Records (WS3/WS4/WS5/WS6) + Authority-Class Mapping (WS7)

Three class-based sub-gates added to `evaluatePropositionSourceSufficiency`
(services/answer-support-validator.js). No question IDs, exact prompts, income amounts, dates, or
answer deny lists. Source-card keyed; deterministic; runs before the gpt-4o-mini validator; fails
closed; never upgrades trust. The model validator cannot override a failed deterministic gate (each
fail-closed returns before the LLM stage).

## WS3 filing_obligation
- Proposition (QUESTION-led, reinforced by answer): required/not-required to file, obligation to file,
  exempt from filing, substituted filing, joint/separate return, "file a(n) (income tax/annual) return".
  Question-led so a refund/rate answer that mentions filing in passing is not gated (Q3/Q47 preserved).
- Required authority: filing provisions -- NIRC Sec 51/51-A/52/56/74/75; substituted-filing RRs
  (2-98/11-2018/8-2018). Fail closed on rate (Sec 24/27) / residency (Sec 23) / corporate / withholding
  only. Distinguishes no-tax-due vs no-filing-required.

## WS4 filing_deadline
- Proposition (question-led): deadline / due date / "when is X due" / "filed on or before" / return-due.
  Classified BEFORE filing_obligation so a deadline question is not mistaken for an obligation.
- Required authority: return/deadline provisions per tax type -- Sec 51 (individual ITR), 52/75/77
  (corporate), 90/91 (estate return + payment), 103 (donor), 114 (VAT), plus filing RRs. Fail closed on
  rate/residency only. Estate-return deadline on Sec 90/91 remains reachable (Q32 verified live).

## WS5 tax_computation_basis (estate base misstatement)
- Proposition: estate-tax computation (question/answer mentions "estate tax" + a rate/percent).
- Fail closed when the answer applies the rate to "the (value of the) estate / gross estate ... exceeding
  [amount]" -- treating the standard deduction as a threshold and misstating the NET-estate base (Q30).
- A correctly-stated "6% of the NET estate; a standard deduction applies" computation does NOT trip the
  gate and remains reachable. Donor's-tax "6% over ₱250,000" (a real Sec 99 threshold) is not
  misclassified (requires literal "estate tax").

## WS6 compound-proposition completeness
The gate evaluates each proposition class sequentially and fails closed on the FIRST unsupported
decisive component; the diagnostics record all detected propositions (penalty/EWT/registration/
vat_exception/filing_obligation/filing_deadline/estate) and the supplied authority classes. A
strongly-supported component (e.g. a correct rate) cannot launder a weaker unsupported component (e.g.
an unsupported filing/deadline/base claim) into VERIFIED_CONTROLLING.

## WS7 authority classes (deterministic, source-card keyed)
FILING_OBLIGATION (Sec 51/51-A/52/56/74/75, substituted-filing RRs); FILING_DEADLINE (Sec 51/52/56/74/
75/77/90/91/103/114, filing RRs); ESTATE base/deduction (Sec 84 rate, 85/86 gross/net/deductions/standard
deduction). A keyword in a title is not automatically sufficient; a correct-tax-type-but-wrong-proposition
provision (e.g. income RATE for a filing/deadline conclusion) remains insufficient.

## Passage grounding
Not implemented (would require retrieval/corpus change) -- standing continuing P2; the control uses
displayed source-card labels only, which suffices to close the Q12/Q30/Q34 laundering classes.
