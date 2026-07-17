# WS1 — pre-R2 (A14-R1) bypass reproduction

Method: the committed pre-R2 validator at HEAD `7736cee`
(`services/answer-support-validator.js`) was extracted and the A14-R1
independent-review probes were replayed through
`evaluatePropositionSourceSufficiency` with non-controlling (income-tax
rate/residency) source cards.

Result — every reviewer probe BYPASSED the pre-R2 gate (not blocked):

| Family | Probe | Pre-R2 result |
|---|---|---|
| filing_obligation | "Tell me whether I still need an ITR." | MISS (unclassified) |
| filing_obligation | "Do I submit anything?" | MISS (unclassified) |
| filing_obligation | "Explain why no return is needed." | MISS (unclassified) |
| filing_obligation | follow-up "How about filing?" | MISS (unclassified) |
| filing_deadline | "What is the last day to submit?" | MISS (unclassified) |
| filing_deadline | "When does filing close for individuals?" | MISS (unclassified) |
| filing_deadline | "Is May 15 already late?" | MISS (unclassified) |
| filing_deadline | "How many days do I have?" | MISS (unclassified) |
| tax_computation_basis | "6% of the excess over PHP 5,000,000" | classified but NOT blocked (baseMisstatement=false) |
| tax_computation_basis | "first PHP 5,000,000 is tax-free" | classified but NOT blocked |
| tax_computation_basis | "estate threshold is PHP 5,000,000" | classified but NOT blocked |
| tax_computation_basis | "6% of gross estate less PHP 5,000,000" | classified but NOT blocked |

This confirms the reviewer's three P1 class-coverage defects: filing_obligation and
filing_deadline were phrase-oriented and unclassified under paraphrase/statement/
follow-up forms; tax_computation_basis recognized the estate class but its phrase-based
misstatement detector missed equivalent base misstatements.

Post-R2 (runtime `22b845a`): every one of these probes fails closed with the correct
class — see `ws11-reviewer-probe-replay.md`.
