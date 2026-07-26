# PHASE-10A14-R20 — COMMIT 5R1-C13

## Security and Scope Attestation

Unit: relation-layer closure against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `c75d19f5e8895df5e4189008d25d5e3d2f3a7734` (parent `29c753d9…`).

---

## Outcome — R3 relation lane closed; relation lock not declared

A separate clean verification campaign against an unchanged runtime met **thirteen of
fourteen** lock conditions:

```text
R3 decision                 3,720 / 3,720
R3 relation                 3,720 / 3,720   (mismatches 0, from a baseline of 162)
false allows / refusals     0 / 0
clarify mismatches          0
decision counterfactual       756 / 756
relation counterfactual       274 / 282     <-- UNMET
closed controls             all closed
rich-context guard          7 / 7
focused relation regression PASS (every relation type fully satisfied)
anti-memorization           PASS
reason integrity            PASS
determinism                 PASS (15,000 evaluations; decision drift 0, relation drift 0)
runtime identity            unchanged across verification
```

The lock requires the complete relation-focused suite to pass. Eight of 282 controlling
queries fail, so the **relation lock is not declared** and that condition is recorded as
**unmet, not waived**. This is decision-layer closure plus R3 relation closure — not
runtime closure, not standalone closure, and not R20 PASS.

## Scoring contract established before coding

The frozen scorer computes `expectedRels.every(rt => actual.includes(rt))` — containment
on the `relation` field only. `source`, `target`, `clauseId` and `evidenceSpan` do not
affect scoring; order and duplicates are irrelevant; empty expectations pass. Therefore
all 162 baseline mismatches were **missing-only** (`extraOnlyRows = 0`), and the lane was
closed by emitting absent relations, never by suppressing present ones. No relation type
and no alias was added; the closed set of 12 is unchanged.

## Decision-lock enforcement

Two candidates regressed the decision lock and were **rejected outright**:

- R3 decision 3,714 with 6 false refusals — "Define X as used in a BIR assessment" was
  read as a local redefinition rather than a definition ask.
- R3 decision 3,710 with 10 clarify mismatches — a bare ambiguous acronym was grounded
  as ordinary subject matter instead of remaining in the clarification lane.

Each was corrected within its own iteration. No candidate carrying a decision regression
was registered as an accepted base.

## Oracle integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited. The 756-query decision suite is unchanged.
- The relation suite denominator was **not** increased to dilute a failure rate: 9
  withdrawn expectations were marked non-controlling and **retained in the file**, so the
  withdrawal remains visible, and the 8 open rows remain failing and reported.
- Two authored expectations that contradicted R3 were corrected **in R3's favour**, and
  one integrity gate of my own was found wrong against R3 and corrected.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.

## Reconstruction identity

The locked C12 dev-05 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest `184119a72d8d…`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**: R3
decision 3,720/3,720, relation 3,558/3,720, reason 631, counterfactual 756/756 —
0 discrepancies across all nine metrics.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c13tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. All three runtime files were verified non-zero with exports intact before
and after every allocation, execution and finalization. No zero-byte, truncation or
unexplained-write incident occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No integration. No freeze. The accepted candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Candidate preserved as `COMMIT_5R1C13_RELATION_CANDIDATE.patch` and in an immutable
  attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Known open item carried to C14

The `primary_vs_subordinate` family (8 queries) is a **genuine gap against §8B**, not a
suite defect: a leading concessive clause is not split into its own `context` clause by
the segmenter, so the tax reading displaces the ordinary primary imperative. Correcting
it is a clause-layer change beyond the relation lane and beyond the C13 iteration
ceiling. R3 has no row of this shape. Recorded as OPEN, not written off.

## Boundaries observed

- No reason-lane remediation. Reason mismatches (679) are recorded as diagnostic only,
  and no reason-specific branch was added.
- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 122 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
Relation closure against R3 is not runtime closure; the relation lock is not declared
and the reason lane is pending.
