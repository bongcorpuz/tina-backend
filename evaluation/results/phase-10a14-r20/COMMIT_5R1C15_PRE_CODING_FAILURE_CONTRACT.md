# PHASE-10A14-R20 — COMMIT 5R1-C15

## Pre-Coding Failure Contract (reason lane)

Authored **before** any runtime modification, against the reconstructed locked C14
candidate (services tree digest `e34842a9…`, decision 3,720/3,720, relation 3,720/3,720,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68).

---

## 1. Controlling scoring semantics

The frozen scorer computes:

```js
reasonPass = out.reasonFamily === r.expectedReasonCodeFamily
```

Verified by probe and recorded in `COMMIT_5R1C15_REASON_SCORING_CONTRACT.json`:

- **Strict `===` on one scalar field.** Case-sensitive, no normalization, no aliasing.
- **Single controlling code.** No list, no set, no partial credit.
- Every R3 row carries exactly one expected family; there is no empty/null case.
- All expected families lie inside the closed set of 11 (`familiesOutsideClosedSet = []`).
- Decision, reason and relation are scored **independently**. Reason therefore cannot be
  repaired by altering a relation, and the relation lane is already locked at 3,720/3,720.

**Decision/reason pairings authorized by R3** (observed, not assumed):

```text
no_tax_relation -> REFUSE (463) and CLARIFY (100)
```

All other families pair with exactly one decision. The `no_tax_relation` + `CLARIFY`
pairing is authorized by frozen evidence and must not be rejected as unusual.

## 2. Baseline

```text
R3 decision      3,720 / 3,720      R3 relation   3,720 / 3,720
R3 reason        3,041 / 3,720      mismatches      679
canonical overall 3,041 / 3,720
decision counterfactual 756 / 756   relation counterfactual 282 / 282
clause probes 68 / 68
```

## 3. The 679 mismatches — complete structural partition

Inventory integrity: rows 679, missing 0, duplicate 0, unclassified 0, possible oracle
conflict 0, **decision/reason incompatible 0**.

| Structural cause | Rows |
|---|---|
| `no_tax_relation_pairing` | 324 |
| `specific_instead_of_explicit_tax_task` | 117 |
| `generic_instead_of_ordinary_object_treatment` | 52 |
| `ambiguous_acronym_versus_no_tax_relation` | 50 |
| `wrong_nontax_family` | 44 |
| `generic_instead_of_compliance` | 41 |
| `nontax_action_instead_of_label` | 23 |
| `nontax_action_instead_of_quotation` | 11 |
| `generic_instead_of_definition` | 8 |
| `wrong_specific_allow_family` | 8 |
| `nontax_action_instead_of_expansion` | 1 |

Confusion (expected → emitted instead):

```text
no_tax_relation        318   explicit_non_tax_task 291, non_tax_expansion 22, label 5
explicit_tax_task_rel  157   tax_treatment_of_ordinary_object 117, compliance 40
tax_treatment_of_obj    52   explicit_tax_task_relation 52
ambiguous_tax_acronym   50   no_tax_relation 50
explicit_non_tax_task   49   non_tax_label_or_name 41, no_tax_relation 5, expansion 3
tax_compliance_task     41   explicit_tax_task_relation 41
non_tax_label_or_name   24   explicit_non_tax_task 23, no_tax_relation 1
tax_definition_w_ctx    16   tax_compliance_task 8, explicit_tax_task_relation 8
quoted_tax_term_only    11   explicit_non_tax_task 11
non_tax_expansion        1   explicit_non_tax_task 1
```

**Every one of the 679 rows already carries the correct decision and the correct
relations.** Both prior locks hold on all of them; this is purely reason-family selection.

## 4. Separability — established before coding

Normalizing away trailing enumeration devices yields **2,675 distinct templates** over
3,720 rows, and **zero templates map to more than one expected reason family**. The lane
is therefore separable in principle: no two structurally identical queries demand
different reasons. It is nevertheless fine-grained — the 679 failures span **438 distinct
templates**, so there is no small set of high-yield rules.

Two hypotheses were tested and recorded honestly:

- **Tax-token presence** does *not* separate `explicit_non_tax_task` from
  `no_tax_relation` (24.4% vs 40.8% token-bearing). **Rejected.**
- **Specific relation present** separates the two ALLOW families strongly
  (16% for `explicit_tax_task_relation` vs 89% for `tax_treatment_of_ordinary_object`).
  This is already the shipped rule, so the residual failures are cases where the
  *evidence* is mis-derived, not where the rule is wrong.

The oracle's own structured fields (`taskVerb`, `taskTarget`, `nonTaxObjects`) are
**null on every row** in both ALLOW families, so they supply no discriminator.
`primaryCategory` and `coverageClass` do correlate but are **forbidden as runtime
features** and are used here only as analysis evidence.

## 5. Failure contract — what rejects a candidate

A candidate is **rejected outright**, regardless of reason score, if any holds:

```text
R3 decision != 3,720 / 3,720
R3 relation != 3,720 / 3,720
FA != 0, FR != 0, or clarify != 0
decision counterfactual != 756 / 756
relation counterfactual != 282 / 282
clause probes != 68 / 68
any closed control not closed
rich-context guard != 7 / 7
anti-memorization fails
an invalid reason code, or a decision/reason pairing R3 does not authorize
a reason family or alias outside the closed set of 11
the reason-focused suite regresses
reason mismatches do not decrease (except a flat candidate that closes a
  demonstrated structural dependency with no regression)
```

A relation must **never** be changed merely to obtain a reason score (§8F). Reason must
follow the controlling relation and the immutable precedence order — never the oracle
expectation, category, source set, query identity, final score or counterfactual family.

## 6. Prohibited runtime features

Oracle IDs, exact queries, query hashes, source sets, categories, coverage classes,
**RF rule ids**, cluster names, scenario numbers and expected-reason maps are analysis
evidence only and must never appear in runtime logic. No reason family, alias or fallback
code may be added; the closed set of 11 is fixed.

## 7. Realistic assessment stated up front

The 679 failures span 438 templates with a long tail: the largest single template
accounts for 10 rows, and the top 13 templates cover only 130 rows. Closing the lane
completely within five material iterations would require either many narrow rules — which
the anti-memorization gate is designed to reject — or a genuine structural insight per
family. I will pursue the structural route family by family, report the honest score
after each iteration, and if the ceiling is reached I will record the lane as **not
closed** rather than manufacture a pass.
