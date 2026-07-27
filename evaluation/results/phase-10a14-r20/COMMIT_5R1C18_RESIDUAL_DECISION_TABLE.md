# PHASE-10A14-R20 — COMMIT 5R1-C18

## Residual-Conditioned Reason Decision Table (§7, §8)

Authored **before any runtime modification**. Every rule below was simulated against the
accepted C17 runtime over all 3,720 R3 rows and scored by what it would **actually
change**, using the four mandated classes.

---

## 1. The C17 methodological correction, applied

C17 rejected three rules that measured well family-wide but regressed already-correct
rows. C18 therefore scores every candidate on the rows its exact runtime condition
matches. The simulator vindicates that correction immediately:

```text
rule                                    support   TP   FP_correct   net
tax_concept_is_the_requested_subject        204    7          197  -190
external_object_governed_by_tax_predicate    92   25           67   -42
expansion_requires_local_reassignment       104   20           81   -61
generic_placeholder_subject_is_tax_task      44   15           29   -14
```

Each of these has **high family-wide precision** and would have looked attractive under
the C16/C17 statistic. `tax_concept_is_the_requested_subject` alone would have destroyed
**197 correct rows** to fix 7. None was implemented.

## 2. Baseline

```text
R3 rows                3,720
correct reason rows    3,243   (the safety set)
residual rows            477
```

Residual confusion, largest first:

```text
116  no_tax_relation            <- explicit_non_tax_task
108  explicit_tax_task_relation <- tax_treatment_of_ordinary_object
 60  explicit_non_tax_task      <- no_tax_relation
 52  tax_treatment_of_ordinary_object <- explicit_tax_task_relation
 41  explicit_non_tax_task      <- non_tax_label_or_name
 23  non_tax_label_or_name      <- explicit_non_tax_task
 22  no_tax_relation            <- non_tax_expansion
 21  tax_compliance_task        <- explicit_tax_task_relation
 14  tax_definition_with_context <- (two sources)
```

## 3. Rules ACCEPTED for implementation

All three forecast **zero** correct-row regressions and **zero** wrong-to-different-wrong
moves.

### R1 — a requested procedural outcome is a compliance task (§9E)

```text
principle   the requested OUTCOME controls: filing, registration, remittance, form
            selection, deadline or late-compliance penalty is a procedural act.
condition   target role = procedure AND the compliance relation is emitted
            AND the reason currently falls to the residual tax-task family
support 21   TP 21   FP_correct 0   FP_w2w 0   net +21
```

### R2 — a naming ASSIGNMENT assigns an identifier (§9B)

```text
principle   the primary act assigns or changes an identifier (name it X, call it X,
            "is only an internal label"). An operation on an ALREADY named artefact
            is not a naming act — the verb's argument structure controls.
condition   naming-assignment surface form AND no imperative head
            AND the label relation is emitted
support 46   TP 10   FP_correct 0   FP_w2w 0   net +10
```

### R3 — a bare generic placeholder subject leaves the tax concept as the topic (§9D)

```text
principle   "the transaction / the taxpayer / the corporation" immediately carrying the
            predicate names no particular thing; the sentence is about the tax concept.
            A MODIFIED noun phrase ("the company vehicle") names a real object and is
            excluded — that exclusion is what makes this rule safe.
condition   bare placeholder head immediately followed by the predicate
            AND the reason currently falls to the ordinary-object family
support 10   TP 10   FP_correct 0   FP_w2w 0   net +10
```

**Combined forecast: +41 mismatches closed, 0 correct rows regressed.**

## 4. Rules REJECTED, with the reason recorded

```text
topic_fragment_without_any_tax_token   sup 121  TP 14  FP_correct 7  FP_w2w 3  net +7
    Rejected: §7 requires FP_CORRECT_ROW_REGRESSION = 0. Regresses "office cabinet
    filing layout" and "chess club tournament penalty", which R3 explains as requested
    actions. The fragment/operation boundary is not yet cleanly observable.

expansion_excludes_question_and_denial sup   6  TP  5  FP_correct 1  FP_w2w 0  net +4
    Rejected on the same rule. "Is the BOC a band of chords?" is expected as an
    expansion despite being interrogative, so speech act alone does not govern here.

assertion_fragment_over_artefact_is_action, deontic_modal_directs_an_operation,
local_equational_reassignment, definition_operator_with_tax_context
    Rejected: zero or negative net delta at their exact conditions.
```

## 5. §8 compliance

Each implemented rule states a human-readable linguistic principle, matches ≥ 10 R3 rows
across multiple normalized templates and lexical fillers, and branches on no serialized
feature vector, oracle id, template identity, complete query, object-name list or
suite/family name. No rule matches fewer than three rows.

## 6. Expected result, stated before coding

Best forecast this unit is **477 → 436**. That does **not** close the lane, and the
remaining work is dominated by two confusions (116 and 108 rows) whose boundaries are not
yet cleanly observable. If the run ends short I will record the lane as open rather than
implement a rule the simulator says will regress correct rows.
