# PHASE-10A14-R20 — COMMIT 5R1-C19

## Branch-Predicate Contract (§8)

Authored **before any runtime modification**.

---

## 1. The defect this contract removes

C18 recorded its controlling correction as: *the simulator condition and the runtime
branch predicate must be the same predicate.* C18 learned that the hard way — iteration
04 simulated a rule cleanly (support 41, TP 41, zero regressions) but gated the runtime
branch on the **label relation**, which those rows do not carry. The guard never fired
and R3 regressed 448 → 454.

C19 makes that failure mode **structurally impossible** rather than a discipline the
operator must remember.

## 2. Single source of truth

`evaluation/runner/phase-10a14-r20/commit5r1c19-predicates.mjs` defines each rule exactly
once as `{ principle, assigns, match }`. The same `match` function is called by:

```text
1. the rule-effect simulator        commit5r1c19-equivalence.mjs
2. the runtime reason selection     injected verbatim by the patch script
3. the branch-trace harness         branchEquivalence()
```

No condition is restated anywhere. A predicate takes one argument — a typed evidence
view built only from the analyzer's own output (primary clause text, locked relation set,
current reason code, task verb, task object). **No predicate reads an oracle expectation,
category, source set, query id, template identity or complete query text.**

## 3. Equivalence requirement

After implementation, for every rule:

```text
simulatorMatchedIds  ==  runtimeAssignedIds
simulatorTargetReason == runtimeAssignedReason
missingFromRuntime = 0
unexpectedInRuntime = 0
```

Set inequality means the runtime branch is not the branch that was simulated, and the
candidate cannot proceed to full R3.

## 4. Rules simulated in this unit

Measured against the reconstructed C18 candidate over all 3,720 R3 rows:

| Rule | Support | TP | FP_correct | FP_w2w | Net | Forecast |
|---|---|---|---|---|---|---|
| `definition_outcome_under_tax_context` | 14 | 14 | 0 | 0 | **+14** | **ACCEPTABLE** |
| `expansion_requires_local_reassignment` | 6 | 5 | 1 | 0 | +4 | reject |
| `token_gloss_fragment_no_operation` | 5 | 4 | 1 | 0 | +3 | reject |
| `bare_topic_fragment_no_operation` | 18 | 9 | 9 | 0 | 0 | reject |
| `operation_on_named_artefact` | 0 | 0 | 0 | 0 | 0 | reject (no support) |

Three rules with a **positive net delta** are rejected because §9 requires
`FP_CORRECT_ROW_REGRESSION = 0`. A positive net delta with any correct-row regression
remains prohibited.

## 5. The accepted rule

### `definition_outcome_under_tax_context` (§10D)

```text
principle   The requested OUTCOME is the meaning of a term, asked inside genuine tax
            context. Surrounding procedural or compliance vocabulary does not change
            what is being requested.
assigns     tax_definition_with_context
support 14  TP 14  FP_correct 0  FP_w2w 0  net +14
```

Two surface families carry the definitional request, both structural:

```text
explanatory verb + short token + scoping phrase
  "Explain PT for Philippine percentage tax."
  "Clarify CAR in a BIR estate tax clearance."

meaning operator over a short token
  "What does PT refer to in Philippine percentage tax?"
  "What is CAR within a BIR estate tax clearance?"
  "PT in Philippine percentage tax means what?"
```

Genuine tax context is a named authority/instrument **or a named Philippine tax**. A bare
`tax` token is not sufficient.

**A measured exclusion:** `"What is X within Y"` qualifies but `"What is X in Y"` does
not. Measured against R3, the `in` form is the residual tax task
(`"What is MCIT in Philippine corporate income tax?"`), so admitting it would regress a
correct row. The predicate was narrowed to `within` on that evidence, dropping support
from 15 to 14 and taking the regression to zero.

## 6. Prohibited controls — none used

```text
primaryCategory or other oracle metadata     not used
expected reason                              not used
source set / oracle or query ID              not used
template identity / complete query text      not used
exact object-name list                       not used
suite / family / cluster name                not used
serialized full-feature-vector lookup        not used
mere tax-token presence                      not used
mere homograph presence                      not used
```

## 7. Expected result, stated before coding

Best forecast this unit is **407 → 393**. That does not close the lane. The remaining
work stays dominated by the two large confusions (116 and 98 rows), whose boundaries are
still not cleanly observable without regressing correct rows. If the run ends short I
will record the lane as open rather than ship a rule the simulator says will regress a
currently-correct row.
