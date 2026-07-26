# PHASE-10A14-R20 — COMMIT 5R1-C15

## Security and Scope Attestation

Unit: reason-layer closure against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `8c1163d5b4a3f7601d1aadf2a9f57a00a1141bc1` (parent `fa2f2975…`).

---

## Outcome — reason lane NOT closed; both prior locks preserved

```text
R3 reason                     3,106 / 3,720   (mismatches 614, from a 679 baseline)
canonical overall             3,106 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         304 / 344     (from 278)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS
anti-memorization             PASS
```

Five of five permitted material iterations were used, closing **65 of 679** reason
mismatches. **The reason lock is not declared.** Per §12 a clean reason-lock verification
is authorized only after reason mismatches reach zero, so **no verification campaign was
run** — its absence is recorded truthfully rather than substituted with a partial run.

## Scoring contract established before coding

The frozen scorer computes `out.reasonFamily === r.expectedReasonCodeFamily` — strict
equality on one scalar field, case-sensitive, no normalization, no aliasing, no list
semantics, no partial credit. Decision, reason and relation are scored **independently**,
so reason cannot be repaired by altering a relation. **No relation was altered to obtain
a reason score**, and the relation lane remains exact at 3,720/3,720.

R3 authorizes `no_tax_relation` with **both** REFUSE (463 rows) and CLARIFY (100 rows).
That pairing was honoured, not rejected as unusual. All expected families lie inside the
closed set of eleven; **no family, alias or fallback code was added**.

## What was closed, and on what principle

- **Speech act separates the two REFUSE families.** `explicit_non_tax_task` requires a
  non-tax *action* to be requested; a *question* about subject matter carrying no tax
  relation is explained by `no_tax_relation`. Measured across the frozen oracle:
  12.0% interrogative vs 60.3% (REFUSE) and 100% (CLARIFY).
- **Reason follows the controlling relation.** An explicit filing/remittance frame is a
  compliance task; a definitional verb under controlling tax context is a tax definition;
  an asserted naming act is explained by the label relation; a text operation over a term
  is a quotation act.
- **What is *unresolved* selects the CLARIFY family.** A materially ambiguous topic needs
  the term disambiguated exactly as an ambiguous acronym does. Both remain CLARIFY, so
  the locked decision lane is untouched.

## Why the lane did not close — stated plainly

The 679 failures span **438 distinct templates**; the largest accounts for 10 rows and
the top thirteen cover only 130. Two candidate discriminators were tested and **rejected
on the evidence**: tax-token presence (24.4% vs 40.8%, no separation) and homograph token
on an imperative (16.7% vs 36.8%, separates in the *wrong* direction).

The two largest residual groups are **mutually contradictory on near-identical
structure** — `"Is the purchase of a cooling fan deductible for income tax?"` requires the
generic family while `"Are receipts from a medical prescription taxable?"` requires the
ordinary-object family. The oracle's `taskVerb`, `taskTarget` and `nonTaxObjects` fields
are null on every row in both, and `primaryCategory` is forbidden as a runtime feature.
Closing these would require many narrow rules of exactly the kind the anti-memorization
gate exists to reject.

Separability is not in doubt: 2,675 distinct templates, **zero mapping to two different
expected reasons**. The lane is closable in principle; it needs further structural
insight, not more narrow rules.

## Regression discipline

Three candidates regressed R3 reason during development — to 742, 687 and 685 against
the 679 baseline. Each was diagnosed and **narrowed against measured evidence within its
own iteration**; no candidate carrying a regression was registered as an accepted base.
Notable corrections: `"what records support X"` is treated by R3 as *treatment*, not
compliance; a bare `"What is <ACRONYM>?"` inside a BIR frame is the residual tax task,
not a definition-with-context; and an imperative on a code-named folder is an *action*,
not a naming act.

## Oracle and suite integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited.
- The 756-query decision suite, the 282-query relation suite and the 68 clause probes are
  **unchanged**; tracked diff on each is 0 bytes.
- The new reason suite v8 (344 queries / 172 pairs, all 11 families) was authored before
  any runtime change and **frozen after authoring**; its denominator was never increased
  to dilute a failure rate.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.

## Reconstruction identity

The locked C14 dev-02 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`e34842a9976b038ac0e8730fe7f94e5ffa9db94e2c4887b11e0f60eef763118c`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,041, decision 3,720/3,720, relation 3,720/3,720, reason 679 mismatches,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68 —
0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c15tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. No zero-byte, truncation, syntax, export or unexplained-write incident
occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No integration. No freeze. The best candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Best candidate preserved as `COMMIT_5R1C15_BEST_REASON_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- No oracle-specific logic: no oracle ID, exact query, query hash, source set, category,
  coverage class, RF rule id, cluster name or expected-reason map appears in runtime code.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 133 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision and relation layers are locked; the reason lane is open and carried to C16.
