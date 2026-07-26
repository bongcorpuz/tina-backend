# PHASE-10A14-R20 — COMMIT 5R1-C9

## Security and Scope Attestation

Unit: decision-layer closure continuation 9 against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `a1e9505bc0fe164bd659b9f88b6bc1a5e94914c8` (parent `5c0a159b…`).

---

## Oracle integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited. No oracle conflict was found or asserted.

## Reconstruction identity

The accepted C8 dev-06 candidate was verified against all four required hashes before
being applied — analyzer `9f2dcf8c…`, domain-boundary `0c894087…`, patterns `3bdd5b85…`,
services tree digest `664eb862…` — and reproduced its result exactly: overall 3,088/3,720,
decision 3,669/3,720, with 0 discrepancies across all eight metrics.

## Write safety

The authoritative runtime-write protocol used **in-repository sibling temp files only**;
no external scratchpad was ever the source of a runtime write. Each write verified
non-zero size, parsed and imported the temp file, confirmed the nine required exports,
hashed it, atomically replaced the destination, and rehashed the live file.

One technical failure occurred and is preserved and registered truthfully: the first
reconstruction attempt used a `.c9tmp` suffix that the ESM loader cannot import for
export verification. The protocol aborted **before** any destination replace, so all three
runtime files remained at the committed baseline and continued to load with nine exports.
The orphan temp file was removed, the attempt was registered as
`technical_failure_tooling_extension_no_runtime_change` with `oracleExecuted: false`, the
temp suffix was corrected to a `.js`-terminated sibling name, and the campaign was
re-allocated as a new attempt rather than blind-retried.

No repository zero-byte, truncation or unexplained-write incident occurred.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development. The domain-boundary and boundary-pattern files were reconstructed from the
  C8 snapshot and restored unchanged.
- The production boundary was **not** integrated. No freeze was performed.
- Live services were restored to the committed COMMIT 3 baseline after preserving the
  candidate. Tracked diff over `services/` is 0 bytes; the analyzer's normalized-LF
  content equals `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- The best candidate is preserved as `COMMIT_5R1C9_BEST_CANDIDATE.patch` and inside the
  immutable attempt snapshots. It is **not** live.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Anti-overfit

Validated against executable code with comments stripped (20/20 PASS), including checks
that no cluster name from the 51-row contract is used as a runtime feature, and that a
tax-domain object is required before a compliance relation.

## Determinism

150 representative queries × 100 repetitions = 15,000 evaluations.
Decision drift 0, byte drift in decision-relevant evidence 0, mutation failures 0.

## Closed decision controls

Preserved at every accepted iteration and in the final candidate:

```text
tax_compliance_task             108 / 108
acronym_homograph_control       200 / 200
ambiguous_clarification_control 150 / 150
internal_label_proper_name      104 / 104
quoted_term_only                closed
```

## Counterfactual controls

The combined C7 v3 + C8 v4 suite (508 queries / 291 pairs) was preserved and rerun. A v5
extension of 134 new deterministic queries across 67 structural pairs and 16 families was
authored from structural rules **before** any runtime change, with expectations written by
the executor and no model-generated expectations. An automated guard rejected every query
duplicating an exact R3 row; it fired twice during authoring and those queries were
reworded. Combined suite: 642 queries / 358 pairs, best candidate 586/642. Exact R3 query
leakage: **0**.

## Iteration discipline

Five material iterations were used. Iteration 06 was **rejected**: it was net negative
against R3 (3,703 versus the accepted 3,706), introducing three new failures on richer
RMC-issuance questions without fixing the holding-period rows. It is preserved as a
rejected attempt, and the accepted iteration-05 candidate was restored as the best base.
A flat or negative R3 candidate was not accepted on generalization grounds alone.

## Boundaries observed

- No relation-lane or reason-lane remediation was started.
- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`). Its historical
  execution figures are stale; CURRENT_STATE and committed evidence control.
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 78 prior attempts and their dispositions unchanged; all prior manifests preserved.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change and contains no
  unsupported claim.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision layer was not locked; this unit is incomplete by its own success criterion.
