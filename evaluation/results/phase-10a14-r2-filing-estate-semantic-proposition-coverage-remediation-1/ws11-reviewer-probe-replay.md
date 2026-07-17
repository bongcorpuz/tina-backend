# WS11 — A14-R1 independent-review probe replay (post-R2)

Runtime `22b845a`. Each probe from the A14-R1 independent review (REVISIONS REQUIRED,
sections P1.1–P1.3) replayed through `evaluatePropositionSourceSufficiency` with
non-controlling (income-tax rate/residency) source cards. Every probe now **fails
closed** with the correct proposition class (pre-R2 all bypassed — see
`ws1-prepatch-bypass-reproduction.md`).

## P1.1 filing_obligation

| Probe | Post-R2 |
|---|---|
| "Tell me whether I still need an ITR." | CLOSED · filing_obligation |
| "Do I submit anything?" ("not required to submit a return") | CLOSED · filing_obligation |
| "Explain why no return is needed." | CLOSED · filing_obligation |
| follow-up "How about filing?" | CLOSED · filing_obligation |
| answer-introduced "…therefore no income tax return is required." | CLOSED · filing_obligation |

## P1.2 filing_deadline

| Probe | Post-R2 |
|---|---|
| "What is the last day to submit?" | CLOSED · filing_deadline |
| "Must be filed by what date?" | CLOSED · filing_deadline |
| "When does filing close for individuals?" | CLOSED · filing_deadline |
| "What date applies to the annual return?" | CLOSED · filing_deadline |
| "Is May 15 already late?" | CLOSED · filing_deadline |
| "How many days do I have?" | CLOSED · filing_deadline |
| "Confirm the filing date." | CLOSED · filing_deadline |

## P1.3 tax_computation_basis (estate)

| Probe | Post-R2 |
|---|---|
| "6% of the excess over PHP 5,000,000" | CLOSED · tax_computation_basis |
| "first PHP 5,000,000 is tax-free" | CLOSED · tax_computation_basis |
| "estate threshold is PHP 5,000,000" | CLOSED · tax_computation_basis |
| "6% of gross estate less PHP 5,000,000" | CLOSED · tax_computation_basis |

All 16 reviewer probes fail closed with the correct class. No question IDs, exact
prompts, amounts, dates, or reviewer-phrase deny lists were used — detection is by the
semantic concept + object model in `detectFilingAndEstatePropositions`.
