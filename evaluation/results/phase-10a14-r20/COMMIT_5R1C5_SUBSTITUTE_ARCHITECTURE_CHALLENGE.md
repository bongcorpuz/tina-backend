# COMMIT 5R1-C5 — Substitute Architecture Challenge (non-controlling)

Gemini 2.5 Pro is unavailable in this execution environment (see
`COMMIT_5R1C5_AGENT_AVAILABILITY.json`). Per the C5 fallback, the non-executor full model
(Sonnet 5) is the substitute non-controlling challenger. This challenge is advisory only: it
did not alter R3, runtime or tests, and did not issue the controlling decision (Opus 4.8, the
primary executor, retains it).

## Inputs inspected

- The 309 accepted-base decision mismatches and the reconciled 3×3 confusion matrix.
- The non-overlapping 10-cluster decision partition.
- The dev-02 (accepted) vs dev-03 (rejected) differential.
- The concrete-subject / contentless-referent / homograph / label-binding logic.
- The current parser → task → target → relation → decision separation.
- The 200-query counterfactual controls.

## Challenge findings (advisory)

1. **Decouple decision from reason/relation (confirmed by the differential).** The rejected C4
   dev-03 guard was decision-safe (net +28 decisions, 0 decision regressions); its
   tax_compliance damage was reason/relation-only. The C5 target-completeness model correctly
   applies the contentless suppression in the DECISION lane (rule 0b), leaving compliance
   relations intact. This is the right separation and should be preserved into C6.

2. **The bare-tax-topic ALLOW needs a structural anchor, not a lexical one.** The rejected C5
   dev-03 used `clearTaxContent` (a term list) and over-allowed non-tax rows that merely
   contain a tax term. A structural anchor (a bare noun phrase whose HEAD is a tax entity/
   procedure, with no non-tax domain noun and no dangling `for item N` referent) is required
   to separate "RMC guidance"/"RCIT" (ALLOW) from non-tax rows.

3. **CONTEXTUAL_ACRONYM_MISCLASSIFIED (103) is two problems.** (a) concrete tax subject not
   anchored ("input VAT for a culture class", "transfer pricing documentation apply") — the
   non-tax domain noun ("culture class") suppresses a genuine tax predicate; the genuine-tax
   predicate should win over a co-occurring domain noun on the SAME target. (b) bare tax
   phrases → CLARIFY — see finding 2.

4. **QUOTATION_SCOPE (27) and NON_TAX_ACTION (26) are clean, low-risk closures** — a text
   operation on a quoted tax term is QUOTED_TEXT → REFUSE; "Input VAT into a text box" is a
   non-tax action on a UI object → REFUSE. Recommend C6 tackle these first (no trade risk).

5. **Do not use exact vocabulary tied to R3 rows.** Keep the referent model keyed on
   structural type (determiner, procedure, quotation, label-binding, acronym-context), which
   the target-completeness contract already specifies.

## Non-controlling status

These are recommendations for C6. The controlling decisions in this unit (accept dev-02,
reject dev-03, preserve incomplete) were made by the primary executor, not this challenge.
