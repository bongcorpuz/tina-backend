# RELATION AND PRECEDENCE SPEC — PHASE-10A14-R20

> Immutable at COMMIT 1. Defines the deterministic decision order and the closed set of final reason codes.

## Decision order (strict precedence)

1. **Identify the primary task** — select the primary task clause (`role = primary_task`).
2. **Identify the task target** — extract `taskObject` / `requestedTarget`.
3. **Link tax predicates to the task target** — establish relations from tax predicates to the target.
4. **Distinguish tax questions about ordinary objects from non-tax tasks** — a tax question about an ordinary object (e.g. "VAT on a bicycle") is a tax task; a non-tax action on any object (e.g. "translate this") is not.
5. **Detect labels, quotations, names, and alternate meanings** — internal labels, quoted-only terms, proper names, and non-tax expansions do not create tax relevance.
6. **Handle acronym definition intent** — distinguish a genuine tax-acronym question from a non-tax expansion or an ambiguous acronym.
7. **Handle negation and contradiction** — explicit negation of tax relevance; but an explicit request for tax review overrides an incidental negation.
8. **Resolve ambiguity** — unresolved ambiguity routes to `CLARIFY`.
9. **Produce decision and reason code** — emit `ALLOW | REFUSE | CLARIFY` with exactly one final reason code.

## Final reason codes (closed set)

```text
explicit_tax_task_relation            ALLOW  — direct tax task on a target via a tax relation
tax_treatment_of_ordinary_object      ALLOW  — genuine tax question about an ordinary object
tax_compliance_task                   ALLOW  — filing/withholding/remittance/compliance task
tax_definition_with_context           ALLOW  — tax definition requested with tax context
ambiguous_tax_acronym                 CLARIFY— acronym could be tax or non-tax; needs clarification
explicit_non_tax_task                 REFUSE — primary task is a non-tax action
non_tax_label_or_name                 REFUSE — tax-like token is an internal label/proper name
non_tax_expansion                     REFUSE — acronym expands to a non-tax meaning
quoted_tax_term_only                  REFUSE — tax term only quoted/mentioned, not the task
tax_negation_but_tax_review_requested ALLOW  — negation present but tax review explicitly requested
no_tax_relation                       REFUSE — no relation links any tax predicate to the task target
```

## Controlling-explanation rule

A generic `strong_tax_signal` MAY remain as **supporting** evidence but MUST NOT be the controlling final explanation (addresses P1-IR19-005). Every ALLOW/REFUSE/CLARIFY decision MUST carry exactly one of the closed-set reason codes above as its controlling explanation, grounded in a relation with an `evidenceSpan`.

## Determinism

Given identical `TaxBoundaryEvidence`, the precedence walk MUST yield a byte-identical `(decision, reasonCode)` pair. Precedence is total and terminating: the first satisfied rule in the order above wins.
