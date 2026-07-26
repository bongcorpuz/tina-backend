# PHASE-10A14-R20 — COMMIT 5R1-C9

## Decision Evidence Contract

The decision layer operates on typed evidence tied to the primary requested task and its
target. Reason codes never determine the boundary.

## A. Clause hierarchy controls

The main requested task is resolved before subordinate descriptions.

- A tax-treatment or computation question over a sale, payment, income or import keeps
  control even when a subordinate clause states that a token is a product code.
- A naming, tagging, storing or display action keeps control when it is the primary task.
- A metadata suffix creates neither tax context nor a target.
- A governed tax predicate over the primary target outranks a competing non-tax action
  relation that is incidental or subordinate to it.
- A definition request over a recognised instrument in explicit BIR context is a governed
  tax definition regardless of an incidental explanatory verb.

## B. Tax procedure separated from ordinary-language homographs

A tax-compliance relation requires a tax-domain object, institution or procedure. The
procedural word alone is never sufficient, because each has an ordinary sense that keeps
its own domain: `return`, `due`, `file`, `filing`, `claim`, `registration`, `list`,
`output`, `assessment`.

Ordinary senses that remain REFUSE include return of goods, library-loan return dates,
alphabetically sorted student lists, function and console output, stylesheet classes and
typefaces, and ordinary insurance or civil claims.

Tax senses are recognised through the governing relation and target: BIR registration,
PAN reply or response, refund-claim prescription, tax-return filing and deadlines, and
assessment or audit procedure.

**An explicit tax predicate governing the target always defeats the ordinary reading.**
The governing relation decides, not the object noun — so "Is importation of X subject to
customs duty?" stays a customs question whatever X names. No global lexical veto and no
global tax-token vote is used.

## C. Concise tax-domain noun phrases

Short professional phrases are valid tax requests without a full sentence: taxable
compensation, capital gains tax computation, import-duty treatment under customs law,
refund claim prescription, BIR registration, PAN response, and a recognised unambiguous
tax acronym used as the requested tax concept. Recognition is by coherent tax-domain
phrase or procedure, never row-specific wording.

## D. Typed acronym ambiguity

No expansion is ever invented, and no bare acronym is automatically tax or automatically
ambiguous.

```text
tax-canonical acronym, no material competing ordinary sense -> tax concept may be ALLOW
materially polysemous acronym without controlling context   -> CLARIFY
explicit tax procedure or treatment context                 -> ALLOW
explicit non-tax expansion                                  -> REFUSE
label / name / code use as the primary task                 -> REFUSE
quoted or text manipulation                                 -> REFUSE
```

The canonical set is deliberately narrow (MCIT, RCIT, NOLCO, IAET, SLSP). DST and VAT are
**excluded**: the frozen evidence treats them as materially polysemous, so they still
CLARIFY without context. Capitalization is never controlling. This is recognition using
committed evidence, not the future Phase 10B-T registry, and contains no exact-row
acronym exception.

## E. Target completeness remains decisive

```text
CONCRETE | RESOLVED_FROM_SAME_QUERY | CONTENTLESS_DEICTIC | LABEL_OR_NAME
QUOTED_TEXT | EXPLICIT_NON_TAX_EXPANSION | AMBIGUOUS
```

Metadata suffixes never resolve a target. A tax predicate over a contentless referent is
not enough for ALLOW; a concrete same-query antecedent remains valid; and a query naming
a concrete tax instrument supplies its own subject.

## F. Legal titles are not label binding

A statute, code, agency or procedure named inside a tax question is subject matter. Only
a user instruction to name, tag, store or label an object is label binding. The action and
object control, never capitalization.

## Prohibitions observed

No exact-query, oracle-ID, source-set, category, cluster-name, fixture, metamorphic-marker
or scenario-number branch exists in runtime. No reason-code-driven decision shortcut. No
blanket "tax word + concrete noun = ALLOW" rule. No model, network, I/O, time or
randomness. Verified by the C9 static and anti-overfit validator (20/20) against
executable code with comments stripped.

## Status

The decision layer was **not** locked in C9. This contract describes the architecture in
force in the best governed candidate (decision 3,706 / 3,720), preserved as an immutable
attempt snapshot and **not** integrated into the live runtime.
