# DEVELOPMENT-ORACLE DESIGN — PHASE-10A14-R20

> Immutable at COMMIT 1. Design only. **No oracle execution in COMMIT 1.** Expectations freeze at COMMIT 4.

## Nature (mandatory terminology)

This is **development evidence only**. It MUST NEVER be described as unseen, independent, blind, or holdout. The only independent review is Codex 5.5 Independent Review 1.

## Composition

- The exact **1,120 controlling R19 rows**, included **unchanged**.
- The **corrected semantic R18 567** rows, included as regression.
- The **accepted R15–R19 controls**, included as regression.
- At least **1,200 new compositional rows** authored for R20 (clause-level, object-relation, mixed-domain, acronym, quotation, negation coverage).
- **Minimum total: 2,500 rows.**

## Category quotas (new compositional rows must cover, at minimum)

```text
mixed_domain (genuine tax about ordinary objects)   >= 250
explicit_non_tax_tasks                              >= 250
capitalization / acronym-expansion                  >= 200
quoted-term-only                                     >= 100
negation / contradiction                             >= 100
internal-label / proper-name                         >= 100
metamorphic groups                                   >= 36 groups
tax-compliance tasks                                 >= 100
```

## Row schema

Each oracle row uses the inventory schema (`IR19_1120_FAILURE_INVENTORY_SPEC.md`) plus:

```text
oracleId
sourceSet        ir19_1120 | r18_567 | r15_r19_control | r20_new
expectedDecision
expectedReasonCodeFamily
metamorphicGroup (nullable)
```

## Disputed-row handling

Any row whose expected decision is disputed MUST be recorded with the dispute, resolved before COMMIT 4 freeze, and never silently changed. Post-freeze, no expectation may change.

## Freeze point

Development-oracle expectations freeze at **COMMIT 4**. No expectation edits after COMMIT 4. No runtime refinement after the final runtime freeze at COMMIT 5.

## Non-negotiables

- Exact 1,120 rows unchanged.
- Corrected 567 included.
- No expectation changes after freeze.
- No runtime refinement after final runtime freeze.
- No executor holdout claim.
