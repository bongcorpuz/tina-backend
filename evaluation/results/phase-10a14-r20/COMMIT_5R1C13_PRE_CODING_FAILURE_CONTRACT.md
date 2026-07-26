# PHASE-10A14-R20 — COMMIT 5R1-C13

## Pre-Coding Failure Contract (relation lane)

Authored **before** any runtime modification, against the reconstructed locked C12
candidate (services tree digest `184119a7…`, R3 decision 3,720/3,720,
decision counterfactual 756/756).

---

## 1. Controlling scoring semantics

The frozen scorer (`commit5r1-oracle-runner.mjs`) computes:

```js
relationPass = expectedRels.every((rt) => out.relations.includes(rt))
```

Consequences, verified by probe and recorded in
`COMMIT_5R1C13_RELATION_SCORING_CONTRACT.json`:

- Comparison is on the **`relation` field only**. `source`, `target`, `clauseId` and
  `evidenceSpan` do **not** affect scoring.
- Semantics are **set containment**, not equality. Extra relations never fail a row;
  order and duplicates are irrelevant; an empty expectation passes unconditionally.
- Therefore **every one of the 162 mismatches is missing-only**. The inventory confirms
  `extraOnlyRows = 0`. The lane closes by *emitting relations that are absent*, never by
  suppressing relations.
- `ASKS_TAX_TREATMENT_OF` is **never required** by any R3 row. Suppressing a required
  specific relation is fatal; emitting the generic alongside it is scoring-neutral.

Object-field quality is unscored, so §8F is enforced separately by
`relationObjectIntegrity`, which is a gate in its own right.

---

## 2. Baseline

```text
R3 relation passed     3,558 / 3,720      mismatches 162
R3 decision            3,720 / 3,720      FA 0  FR 0  CL 0
decision counterfactual  756 / 756
relation suite v7        176 / 296        (296 queries, 148 pairs, 12/12 types)
reason mismatches        631              (diagnostic only in C13)
```

## 3. The 162 mismatches — complete structural partition

| Missing relation | Rows | Emitted instead |
|---|---|---|
| `EXPANDS_AS_NON_TAX` | 48 | none 36, `REQUESTS_NON_TAX_ACTION_ON` 9, `ASKS_DEFINITION_OF` 3 |
| `REQUESTS_NON_TAX_ACTION_ON` | 46 | none 41, `ASKS_TAX_TREATMENT_OF` 5 |
| `ASKS_VAT_TREATMENT_OF` | 45 | `ASKS_TAX_COMPLIANCE_FOR` 40, `ASKS_WITHHOLDING_ON` 5 |
| `ASKS_DEFINITION_OF` | 23 | `ASKS_TAX_TREATMENT_OF` 20, `ASKS_TAX_COMPLIANCE_FOR` 3 |

Partition: `wrong_definition_or_acronym_relation` 71, `wrong_non_tax_relation` 46,
`wrong_specific_relation` 45. Inventory integrity: rows 162, missing 0, duplicate 0,
unclassified 0, possible oracle conflict 0.

**Every one of the 162 rows already has the correct decision and is a pure
relation-emission gap.** No decision change is required to close this lane.

## 4. Structural causes (stated before coding)

1. **Declarative acronym expansion.** `RE.expansion` recognises verb/interrogative forms
   and a closed list of expansions, but not the declarative equational family:
   `X stands for Y` (without a following "the"), `X = Y`, `we use X for Y`,
   `treat X as Y`, `by X we mean Y`, `set X to mean Y`, `X, i.e. Y, ...`. These assert an
   expansion rather than asking about one.
2. **Bare non-tax noun phrases.** `REQUESTS_NON_TAX_ACTION_ON` is gated on
   `RE.nonTaxAction`, a **verb** list. A verbless ordinary noun phrase
   ("basketball match final buzzer") emits no relation at all.
3. **Specific-relation selection order.** `isCompliance` is tested *before* the VAT
   branch, so a VAT ask inside a form-shaped frame yields `ASKS_TAX_COMPLIANCE_FOR`;
   the Filipino `i-withhold ang buwis sa X` frame reaches the withholding branch first.
   Both are ordering defects, not detection failures.
4. **Definition intent in tax context.** `RE.definition` lacks the in-context forms
   `X refer to in Y`, `X within Y`, `X in Y means what`.

## 5. Failure contract — what rejects a candidate

A candidate is **rejected outright**, regardless of relation score, if any holds:

```text
R3 decision != 3,720 / 3,720
FA != 0, FR != 0, or clarify != 0
decision counterfactual != 756 / 756
any closed control not closed
rich-context guard != 7 / 7
anti-memorization fails
an invalid reason code, or a decision/reason pairing R3 does not authorize
a relation type outside the closed 12 is emitted
relation-object integrity regresses
the relation-focused suite regresses
relation mismatches do not decrease (except a flat candidate that closes a
  demonstrated structural dependency with no regression)
```

Reason mismatches are **diagnostic**. A relation-correct candidate is **not** rejected
because reason mismatches remain or change. No reason-specific branch may be added.

## 6. Adjudication of the two authored expectations that contradicted R3

Two v7 expectations were authored from the schema and then found to contradict the
frozen oracle. **R3 controls; the authored expectation was corrected**, not the oracle:

- `Kailangan bang i-withhold ang buwis sa X?` — authored as `ASKS_WITHHOLDING_ON`;
  R3 requires `ASKS_VAT_TREATMENT_OF` for this frame. The pair now contrasts it against
  an explicit English withholding-agent ask.
- `no_tax_relation` with `CLARIFY` — flagged by the first integrity gate as
  incompatible. R3 authorizes that pairing in 100 rows; the **gate** was wrong and was
  corrected to admit exactly the pairings R3 authorizes.

No R3 expectation was edited. The counterfactual denominators were not increased to
dilute any failure rate.

## 7. Pre-existing object-quality defects (unscored, in scope under §8F)

`relationObjectIntegrity` fails at baseline with `placeholderTarget` 120 and
`wholeQuerySpan` 200 over a 400-row probe. These do not affect scoring and are recorded
here as pre-existing. They are remediation targets under §8F, and they may not be
allowed to regress.
