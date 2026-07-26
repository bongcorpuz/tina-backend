# PHASE-10A14-R20 — COMMIT 5R1-C16

## Reason Suite v8 Failure Contract (§10)

Reason suite v8 is **frozen**: 344 queries, 172 pairs, 11 families. Current 304/344,
required 344/344. No expectation is edited and the denominator is not increased.

The 40 failing rows reduce to **7 distinct structural shapes**. Each is mapped to a rule
from `COMMIT_5R1C16_REASON_DECISION_TABLE.md` and to its overlapping R3 residual family.

---

### S1 — `compliance_vs_treatment` (11 rows)

```text
expected  tax_treatment_of_ordinary_object
actual    explicit_tax_task_relation
query     "Is the sailmaker fee subject to percentage tax?"
relations ASKS_TAX_TREATMENT_OF
```

**Discriminator (runtime):** `reasonPredicateClass = taxability` with the tax predicate
governing an **external object** (a fee/service), not the tax concept itself.
**Rule:** R6. **R3 overlap:** vector `question|taxability|ASKS_TAX_TREATMENT_OF|none`
(n=21, separable) and `question|tax_concept|ASKS_TAX_TREATMENT_OF|none` (n=16, separable).

### S2 — `compliance_vs_treatment` (1 row)

```text
expected  tax_treatment_of_ordinary_object
actual    explicit_non_tax_task
query     "Is the ferry gangway subject to percentage tax?"
```

Same shape as S1, but a homograph in the object ("gangway") pushed it into the non-tax
lane. **Rule:** R6 must be reached before the REFUSE split. **R3 overlap:** same vectors.

### S3 — `nontax_action_vs_label` (7 rows)

```text
expected  explicit_non_tax_task
actual    non_tax_label_or_name
query     "Rename the badminton net folder."
relations REQUESTS_NON_TAX_ACTION_ON
```

**Discriminator:** the action head is `rename` — a non-naming operation on an object that
merely *is* a folder. **Rule:** R1's exclusion, §9B ("the action head controls").
**R3 overlap:** the 41-row `explicit_non_tax_task <- non_tax_label_or_name` group.

### S4 — `nontax_action_vs_label` (8 rows)

```text
expected  non_tax_label_or_name
actual    explicit_non_tax_task
query     "The phrase VQZ is only an internal label for our badminton net."
relations NAMES_AS_INTERNAL_LABEL
```

**Discriminator:** an **asserted naming act** with no action head. **Rule:** R1
(precision 1.000, 0 counterexamples). **R3 overlap:** the 23-row
`non_tax_label_or_name <- explicit_non_tax_task` group and the separable vector
`assertion|procedure|NAMES_AS_INTERNAL_LABEL|acronym` (n=23).

### S5 — `quotation_vs_label` (1 row)

```text
expected  non_tax_label_or_name
actual    explicit_non_tax_task
query     "Our badminton net project is code-named VQZ in the tracker."
```

Same as S4 via the `code-named` form. **Rule:** R1.

### S6 — `no_tax_refuse_vs_clarify` (7 rows)

```text
expected  no_tax_relation
actual    explicit_non_tax_task
query     "Translate the badminton net handbook into plain English."
relations REQUESTS_NON_TAX_ACTION_ON
```

**Discriminator:** the requested operation targets a *document about* an ordinary object;
no tax relation is present anywhere. **Rule:** R8. **R3 overlap:** the dominant
`no_tax_relation <- explicit_non_tax_task` group (232 rows) and the separable vectors
`question|procedure|REQUESTS_NON_TAX_ACTION_ON|none` (n=26) and
`assertion|procedure|REQUESTS_NON_TAX_ACTION_ON|none` (n=13).

### S7 — `no_tax_refuse_vs_clarify` (5 rows)

```text
expected  no_tax_relation
actual    quoted_tax_term_only
query     "Translate the harmonica case handbook into plain English."
```

The C15 quotation rule (`into plain english`) over-fires when the object is a *handbook*
rather than a term. **Rule:** R3 must require the operand to be a **term**, not a
document. This is a narrowing of an existing rule, not a new one.

---

## Acceptance condition

Every accepted candidate must improve or preserve 304/344 while holding all locked gates:
R3 decision 3,720/3,720, R3 relation 3,720/3,720, decision suite 756/756, relation suite
282/282, clause probes 68/68, closed controls, guard 7/7, anti-memorization PASS.

## Overlap summary

All seven shapes overlap R3 residual families that the separability analysis marks
**separable**. None requires a rule confined to the suite: closing S1–S7 generically
should move R3 in the same direction. If a fix helps the suite but harms R3, the
candidate is rejected — the frozen oracle controls.
