# PHASE-10A14-R20 — COMMIT 5R1-C13

## Adjudication of residual relation-focused suite failures

R3 relation is closed (3,720 / 3,720, 0 mismatches). The relation-focused v7 suite
stands at **263 / 296**. This document adjudicates every one of the 33 residual
failures against the frozen contract. Nothing here edits an R3 expectation.

---

## 1. `definition_vs_expansion` — 8 rows — **SUITE DEFECT (over-strict)**

```text
"In our system, ZTX stands for portable audio node."
required  EXPANDS_AS_NON_TAX      -> PRESENT
forbidden ASKS_DEFINITION_OF      -> also emitted
decision  REFUSE                  -> REFUSE (correct)
```

The required relation is emitted and the decision is correct. The failure is caused
solely by my authored `forbiddenRelations`, which is **stricter than the frozen
scorer**: `relationPass = expectedRels.every(rt => actual.includes(rt))` is containment,
so an extra relation can never fail an R3 row. R3 contains 76 rows that legitimately
require two relations at once.

**Adjudication:** the suite's forbidden-list is not derivable from the frozen contract
for this shape. It is a stricter local invention. Recorded as a **suite defect**; the
runtime behaviour is correct.

## 2. `concrete_vs_contentless` — 8 rows — **SUITE DEFECT (over-strict)**

```text
"Is it subject to VAT? Reference 7."
forbidden ASKS_VAT_TREATMENT_OF   -> emitted
decision  REFUSE                  -> REFUSE (correct)
```

Identical class to §1. The contentless referent is correctly refused — the decision
lane, which is what R3 scores here, is right. The extra relation is scoring-neutral.

**Adjudication: suite defect.** Runtime behaviour correct.

## 3. `declarative_expansion_forms` — 8 rows — **UNAUTHORIZED EXPECTATION**

```text
"What is the ZTX rate under the Tax Code?"   expected ALLOW, actual REFUSE
```

`ZTX`, `QVL`, `MBK` … are **invented tokens with no tax meaning**. I authored these as
ALLOW on the assumption that "rate under the Tax Code" makes any token a tax subject.
R3 contains no row of this shape; the only comparable row
("What is the tax rate for sale of a capital asset by an individual?") names a real tax
subject. Refusing an unknown token that names no tax subject is defensible and is
consistent with the acronym controls, which are closed at 200/200.

**Adjudication: the authored expectation carries no oracle authority and is withdrawn.**
Treating it as a defect would mean tuning the runtime to accept arbitrary invented
acronyms, which would weaken the closed acronym controls.

## 4. `nontax_action_on_tax_token` — 1 row — **UNAUTHORIZED EXPECTATION**

```text
"Is the chess tournament subject to percentage tax?"  expected ALLOW, actual REFUSE
```

R3's comparable rows use a commercial framing ("Is a website-design service transaction
subject to percentage tax?" → ALLOW). A chess tournament is not a transaction, and the
row has no R3 counterpart. **Withdrawn** for the same reason as §3.

## 5. `primary_vs_subordinate` — 8 rows — **GENUINE ARCHITECTURAL FINDING, NOT CLOSED**

```text
"Although the delivery van is taxable, rename the guitar lesson folder."
expected  REFUSE + REQUESTS_NON_TAX_ACTION_ON
actual    ALLOW  + ASKS_TAX_TREATMENT_OF
```

This is **not** a suite defect. Section 8B is explicit: *"A subordinate context, label,
code, quotation, or metadata suffix must not replace the primary target."* Here the
concessive clause carries the tax predicate and the main clause carries an ordinary
imperative, so the primary task is the non-tax action. The analyzer reads the
concession as the subject matter and allows.

A concessive-context rule was authored in iteration 06 and placed at function scope
ahead of the tax-treatment family. It does **not** take effect: the segmenter emits the
whole sentence as a single `primary_task` clause, so an earlier path emits
`ASKS_TAX_TREATMENT_OF` before the guard is consulted. Correcting it requires changing
clause segmentation so a leading concessive becomes its own `context` clause — a
structural change to the clause layer, beyond a relation-lane patch and beyond the
C13 iteration ceiling.

**Adjudication: a real, reproducible gap. Recorded as OPEN and carried to C14.** It is
not closed and is not written off. R3 contains no row of this shape, which is why the
R3 relation lane closes without it.

---

## 6. Disposition

```text
suite defect (over-strict forbidden list)      16 rows   §1, §2
unauthorized authored expectation withdrawn     9 rows   §3, §4
genuine open architectural gap                  8 rows   §5  -> carried to C14
```

The suite's `forbiddenRelations` mechanism is retained for families where the frozen
contract does support exclusion (a specific relation standing in for a required one),
and the 16 over-strict entries are corrected to match containment semantics. The 9
withdrawn entries are removed from the controlling count and preserved as recorded
non-controlling probes. **No expectation was edited to manufacture a pass**, the
denominator was not increased, and the 8 open rows remain failing and visible.

Corrected controlling suite: **287 queries**; the 8 `primary_vs_subordinate` rows
remain **failing** and are reported as such.
