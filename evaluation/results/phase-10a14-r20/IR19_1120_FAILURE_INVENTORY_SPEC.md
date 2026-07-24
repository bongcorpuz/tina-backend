# IR19 1,120-ROW FAILURE-INVENTORY SPECIFICATION — PHASE-10A14-R20

> Specification only. **No oracle execution belongs in COMMIT 1.** The actual 1,120-row campaign runs in COMMIT 2 against the unchanged runtime.

## Purpose

Define the exact schema and reconciliation requirements for the complete inventory of the 1,120 controlling R19 independent-semantic-oracle rows, so COMMIT 2 can produce `COMPLETE_IR19_FAILURE_INVENTORY.json` and `PRE_FIX_FAILURE_MATRIX.json` deterministically.

## Required row fields

```text
probeId              stable unique id per row
query                exact probe text
coverageClass        e.g. mixed_domain | explicit_non_tax | capitalization_expansion | metamorphic | core
expectedDecision     ALLOW | REFUSE | CLARIFY
actualDecision       ALLOW | REFUSE | CLARIFY (from unchanged runtime)
actualReason         runtime-emitted reason code / text
primaryTaskClause    identified primary task clause text
taskVerb             verb of the primary task
taskTarget           object/target of the primary task
taxPredicates        list of tax predicates detected
taxEntities          list of tax entities detected
nonTaxObjects        list of ordinary/non-tax objects detected
quotedTerms          list of quoted-only terms
negation             boolean / negation spans
relationEvidence     the relation(s) linking tax predicates to task target
rootCauseFamily      false_allow | false_refuse | clarify_mismatch | metamorphic | none
materiality          material | immaterial
metamorphicGroup     group id when part of a metamorphic set (else null)
```

## Reconciliation requirements (must sum and cross-tie exactly)

```text
1,120  total rows
  729  historical passes (baseline preserved)
  179  material false allows
  162  material false refusals
   50  clarify mismatches
   36  metamorphic failures
102/210  mixed-domain failures (of 210 mixed-domain rows)
 74/260  explicit non-tax failures (of 260 explicit non-tax rows)
110/200  capitalization / expansion failures (of 200 such rows)
```

- The inventory MUST reproduce `729/1120` historical passes against the unchanged runtime, or document and prove every discrepancy row-by-row.
- Failure subtotals (179 + 162 + 50 + 36) and category subtotals (102 + 74 + 110) are cross-checks; overlaps between category views and root-cause views MUST be reconciled explicitly (a row may appear in a coverage-class count and a root-cause count).
- Every one of the 1,120 rows MUST carry a disposition; no row may be unaccounted for.

## Output artifacts (produced in COMMIT 2, not here)

- `COMPLETE_IR19_FAILURE_INVENTORY.json` — all 1,120 rows, full schema.
- `PRE_FIX_FAILURE_MATRIX.json` — reconciliation matrix with the subtotals above.
