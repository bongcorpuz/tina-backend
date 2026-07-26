# PHASE-10A14-R20 — COMMIT 5R1-C8

## Decision Evidence Contract

The decision layer operates on typed evidence tied to the primary requested task and its
target. Reason codes never determine the boundary.

## A. Typed target completeness

| Type | Structural test |
|---|---|
| `CONCRETE` | a named object or instrument is the subject |
| `RESOLVED_FROM_SAME_QUERY` | a deictic with a concrete antecedent supplied earlier in the same query |
| `CONTENTLESS_DEICTIC` | a deictic or bare attribute with nothing in the query to resolve it |
| `LABEL_OR_NAME` | the token is being assigned as a name, code, filename, column or folder |
| `QUOTED_TEXT` | the token is the object of a text operation |
| `EXPLICIT_NON_TAX_EXPANSION` | the query itself binds the token to a stated non-tax meaning |
| `AMBIGUOUS` | a lone materially ambiguous acronym with no controlling context |

An enumerated metadata suffix never creates a target. The family is recognised
generically — an enumeration keyword followed by an index, optionally letter-prefixed —
so no single keyword is privileged and none of them can resolve a deictic.

## B. Primary-task control

The primary requested action is resolved before subordinate clauses.

- A tax-treatment question keeps control even when a subordinate clause states that a
  token is a product code.
- A naming, tagging or storing action keeps control even when the assigned token is
  tax-shaped, including filename-with-extension and quoted column/field assignment.
- A text operation over a quoted token keeps control whether the token is spelled out or
  a recognized acronym.
- An ordinary imperative data-handling action governing a destination keeps control even
  when its object is a tax-shaped token.
- An ordinary noun phrase whose head names a non-tax activity keeps control even when the
  phrase carries a tax-shaped modifier.

## C. Tax relation over a valid target

ALLOW requires a controlling relation over a concrete or resolved target: deductibility,
VAT treatment, withholding, taxability, final tax, capital-gains treatment, customs duty,
tax computation, tax rate, BIR filing/form/deadline, or assessment/audit procedure.

An unambiguous spelled-out Philippine tax instrument or doctrine is self-resolving subject
matter and carries a relation on its own, unless an explicit non-tax object borrows the
words for another domain. A recognized tax acronym carries a relation when combined with a
governed relation word. An explicit Filipino/Taglish tax predicate is a governed relation,
not an ordinary action.

No global tax-word veto and no global non-tax-token veto is used. All domain matching is
word-boundary based.

## D. Contentless referent guard

A bare attribute with an enumerated suffix and no subject stays REFUSE. A genuine
same-query antecedent, or a query naming a concrete tax instrument, defeats the guard.

## E. Acronym definition and context

```text
bare materially ambiguous token, no context      -> CLARIFY
recognized tax acronym with tax subject matter   -> ALLOW
tax procedure or treatment involving the acronym -> ALLOW
explicit non-tax expansion                       -> REFUSE
label / name / code assignment as primary task   -> REFUSE
quoted or text operation                         -> REFUSE
```

A lone acronym inside a definition frame is materially ambiguous **even when the token is
tax-recognised**: only surrounding subject matter, never the token itself, supplies
controlling context. Capitalization is never controlling. No expansion is ever invented.

## Prohibitions observed

No exact-query, oracle-ID, source-set, category, fixture, metamorphic-marker or
scenario-number branch exists in runtime. No reason-code-driven decision shortcut. No
blanket "tax word + concrete noun = ALLOW" rule. No model, network, I/O, time or
randomness. Verified by the C8 static and anti-overfit validator (18/18) against
executable code with comments stripped.

## Latent defects corrected in C8

1. `TREATMENT_ATTRIBUTE_RE` carried a trailing word boundary after a stem, so `deductib`
   could never match `deductible`. The attribute family now uses `\w*` stems.
2. Quotation-operation detection required singular nouns, so "count the letters",
   "format the words" and "repeat the phrase" were unmatched.
3. `QUOTES_TERM` was emitted only for literal tax words, so acronym text operations fell
   through to acronym-ambiguity handling.

## Status

The decision layer was **not** locked in C8. This contract describes the architecture in
force in the best governed candidate (decision 3,669 / 3,720), preserved as an immutable
attempt snapshot and **not** integrated into the live runtime.
