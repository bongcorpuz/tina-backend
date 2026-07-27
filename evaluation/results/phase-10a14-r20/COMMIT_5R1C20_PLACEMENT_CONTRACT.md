# PHASE-10A14-R20 — COMMIT 5R1-C20

## Placement Contract (§8, §9)

Authored **before any runtime modification**.

---

## 1. The defect this contract removes

C19 proved that predicate identity is **necessary but not sufficient**. Its iteration 03
passed branch equivalence 6 = 6 — zero missing, zero unexpected — and still regressed
R3 393 → 403, because the branch it replaced also served 28 rows the predicate never
matched. Iteration 04 hoisted the same rule and regressed further, to 460.

Two properties must therefore hold independently:

```text
1. TARGET EQUIVALENCE          simulator and runtime apply the same predicate to the
                               same intended rows
2. PLACEMENT NON-INTERFERENCE  every row OUTSIDE the intended matched set preserves
                               baseline behaviour exactly
```

## 2. The architecture

C20 never replaces, reorders, broadens or narrows an existing branch. The original
selector is preserved **byte-identical** under a new name, and a thin wrapper adds a pure
override seam:

```js
function decideTaxBoundaryFromEvidenceOriginal(evidence) { /* unchanged */ }

function resolveGovernedReasonOverride(evidence) {
  // pure; no side effects; returns null when unmatched
}

export function decideTaxBoundaryFromEvidence(evidence) {
  const baseline = decideTaxBoundaryFromEvidenceOriginal(evidence);
  const override = resolveGovernedReasonOverride({ ...evidence, baselineReason: baseline.reasonCode });
  if (override != null) return override;
  return baseline;
}
```

Because the fallback is the untouched original, **every unmatched row executes exactly the
code path it executed before**. Placement non-interference is a property of the
architecture, not of the operator's care.

Each override predicate is **injected verbatim** from
`evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs`, so shadow mode, the
placement gate and the runtime evaluate byte-identical logic — C19's contribution, kept.

## 3. Gate definitions

**Baseline capture.** For all 3,720 R3 rows: decision, reason, relation set, and a stable
branch signature (`decision|reason|relations`) that detects any change of path.

**Shadow mode.** Compute what the override *would* assign without changing output; record
matched IDs, current reason, predicted reason, expected reason.

**Target equivalence.** `shadowMatchedIds == runtimeAssignedIds`, with
`missingFromRuntime = 0` and `unexpectedInRuntime = 0`.

**Placement non-interference.** For every unmatched row:
`reason`, `decision`, `relations` and `branchSignature` must all equal baseline.
Required drift on each: **0**.

## 4. Results — all five shipped rules

```text
rule                                         unmatched rows   reason   decision   relations   branch sig
token_gloss_assigns_no_identifier                     3,714        0          0           0            0
nominalized_transaction_head_is_tax_task              3,655        0          0           0            0
external_income_item_is_ordinary_object               3,693        0          0           0            0
filipino + issuance (iteration 05)                    3,698        0          0           0            0
```

Target equivalence passed on every rule: 4 = 4, 63 = 63, 25 = 25, 20 = 20.

**Every shipped rule landed exactly its shadow forecast: +4, +63, +25, +20.** Across four
iterations the predicted and actual R3 deltas never diverged by a single row — and no
candidate had to be reverted, in contrast to C18 and C19 which each lost iterations to
placement failures.

## 5. Rules rejected in shadow

```text
rule                                     support   TP   FP_correct   net
finite_directive_requests_operation          225    4          220  -216
nominal_fragment_requests_no_operation        21   12            9    +3
operation_on_named_artefact                   27    0           27   -27
```

The first would have regressed 220 correct rows to fix 4. The second has a **positive net
delta** and was still rejected: §10 requires `FP_CORRECT_ROW_REGRESSION = 0`.

`nominal_fragment_requests_no_operation` is worth recording as an analytical result rather
than a near-miss. Its matched set contains structurally identical pairs with opposite
expectations — `"office duty roster"` expects `no_tax_relation` while
`"office cabinet filing layout"` expects `explicit_non_tax_task`. That is a genuine
collision, not a missing feature, and it is preserved in the collision candidates file.

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
