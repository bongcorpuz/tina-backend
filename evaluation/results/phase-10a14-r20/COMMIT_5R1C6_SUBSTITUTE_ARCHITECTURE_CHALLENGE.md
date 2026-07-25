# COMMIT 5R1-C6 — Substitute Architecture Challenge (non-controlling)

Gemini 2.5 Pro is unavailable in this environment (`COMMIT_5R1C6_AGENT_AVAILABILITY.json`).
Sonnet 5 is the substitute non-controlling challenger. Advisory only: it did not alter R3,
runtime or tests, and did not issue the controlling decision (Opus 4.8 retains it).

## Inputs inspected

- The reconstructed 305 decision mismatches; the C6 confusion matrix (diagonal 3,415).
- The C6 non-overlapping 11-cluster partition.
- The existing (169/200) and new (153/200) counterfactual results.
- The typed target-completeness model and evidence lattice behaviour.
- The accepted C5 dev-02 vs rejected C5 dev-03 differential.

## Challenge findings (advisory, for C6 decision lane)

1. **Do the priority-1 clusters first (no trade risk).** QUOTATION_SCOPE (27) and
   NON_TAX_ACTION_MISREAD_AS_TAX (26) are all REFUSE-expected rows where a tax relation is
   wrongly built. Closing them removes false-allows with no ALLOW-side risk. They must be
   fixed structurally: a text operation (count/repeat/alphabetize/spell) on a **quoted** tax
   term is `PRIMARY_QUOTATION_ACTION`; a tax-shaped token whose object is a UI/software/private
   -contract noun (text box, CSS class, private lease, computer file, function) is a
   `PRIMARY_NON_TAX_ACTION`, not a tax relation.

2. **The quotation guard must precede the genuine-tax-question predicate.** Currently
   "Count the letters in \"withholding tax\"" builds ASKS_WITHHOLDING_ON before the quote
   handler runs. Order the quotation-action detection ahead of the tax-predicate block.

3. **LABEL_BINDING_MISSED (13) needs the naming-verb + label-noun forms** ("We named the
   product code MCIT", "Name the variable name BIR", "Keep DST as the report filename"),
   guarded by absence of a genuine tax question predicate.

4. **CONTEXTUAL_ACRONYM_MISCLASSIFIED (102) is the hard cluster and carries trade risk** —
   split it: (a) concrete tax subject not anchored ("input VAT for a culture class",
   "transfer pricing documentation apply") → require a controlling tax predicate/action on a
   concrete or resolved target; (b) bare tax phrase → CLARIFY vs ALLOW needs a structural
   (head-noun) anchor, not the lexical `clearTaxContent` list that over-allowed in C5 dev-03.

5. **Preserve the decision/reason-relation decoupling.** Keep contentless suppression at the
   decision lane; do not let reason-family choice drive the decision.

## Non-controlling status

Recommendations for the C6 decision lane. The controlling decisions in this unit are made by
the primary executor (Opus 4.8), not this challenge.
