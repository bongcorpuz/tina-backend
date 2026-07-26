# PHASE-10A14-R20 — COMMIT 5R1-C12

## Security and Scope Attestation

Unit: decision-layer counterfactual closure continuation 12 against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `29c753d9850451a65d5e2d387540da2ee10b3957` (parent `8790c726…`).

---

## Outcome — decision lock achieved

All eleven lock conditions were met and independently verified in a separate clean
verification campaign against an unchanged runtime:

```text
R3 decision            3,720 / 3,720
false allows           0
false refusals         0
clarify mismatches     0
counterfactual suite     756 / 756
closed controls        all closed
rich-context guard     7 / 7
focused regression     PASS (every bucket)
anti-memorization      PASS
determinism            PASS (15,000 evaluations, drift 0)
runtime identity       unchanged across verification
```

This is **decision-layer closure only**. It is not runtime closure, not standalone
closure, and not R20 PASS.

## Anti-memorization — leakage found and removed

The C12 gate lowered the leakage threshold to three words and immediately fired:

- **Three whole counterfactual queries** ("double taxation agreement relief", "revenue
  district office registration", "deficiency interest computation") had their exact text
  in the runtime vocabulary from C9. Removed. Counterfactual fell 739 → 737 as the
  honest cost.
- **Two whole R3 rows** ("private lease weekend deadline", "deadline for homework") were
  hard-coded as homograph patterns, inherited from the pre-C7 baseline. Replaced with
  generic structural patterns.

A third category was assessed and **deliberately not removed**: 24 canonical Philippine
tax terms ("capital gains tax", "books of accounts") that coincide with bare-term R3 rows.
A tax analyzer cannot function without that vocabulary, so term-shaped overlap is recorded
as domain vocabulary rather than counted as memorization. The check now separates the two
cases explicitly and reports the terminology overlap in every attempt.

## R3 invariant enforcement

Three intermediate candidates regressed R3 — to 3,701, 3,714 and 3,715. Each regression
was diagnosed and corrected **within the same iteration**; none was accepted, and no
candidate carrying an R3 regression was registered as an accepted base. The causes were:
an ordinary-artefact guard that swallowed genuine VAT questions about ordinary activities;
a governed-predicate exemption that disabled the styling guard for CSS rows where the tax
word names the artefact; and a homograph exemption that was too broad for console output.

## Oracle integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited. No counterfactual expectation was edited; all rows in the
  pre-coding contract carried the C11 adjudication of structurally valid.
- The counterfactual denominator was **not** increased: closure is 756/756 on the existing
  suite, with no new controlling queries added.

## Reconstruction identity

The accepted C11 dev-07 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`8c0ac8337b66528883185d337300f8b24293a05e245bb839c7f02b7f65863f93`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced exactly: R3
3,720/3,720, counterfactual 739/756, 0 discrepancies across all nine metrics.

## Write safety

Every authoritative runtime write used an in-repository sibling temp file ending in `.js`,
verified non-zero, imported to confirm all nine required exports, hashed, atomically
renamed, then rehashed. No external scratchpad was ever the source of a runtime write. All
three runtime files were verified non-zero with exports intact before and after every
allocation, execution and finalization. No repository zero-byte, truncation or
unexplained-write incident occurred, and no temp residue remains.

Two patch scripts produced syntax errors — one split a regex literal across lines, one
mis-anchored an insertion. Both were caught immediately by a load check, the runtime was
restored from a verified snapshot, and the change was reapplied correctly. No broken
runtime was ever scored or registered.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No integration. No freeze. The locked candidate is **not** live.
- Live services restored to the committed COMMIT 3 baseline; tracked diff over `services/`
  is 0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Locked candidate preserved as `COMMIT_5R1C12_LOCKED_CANDIDATE.patch` and in an immutable
  attempt snapshot, services tree digest
  `184119a72d8d9589fb6d7d560a08ced8d2e2eb97831f7df09438a06daac191b2`.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No relation-lane or reason-lane remediation was started.
- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 116 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
Decision-layer closure is not runtime closure; the relation and reason lanes are pending.
