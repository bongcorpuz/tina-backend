# PHASE-10A14-R20 — COMMIT 5R1-C11

## Security and Scope Attestation

Unit: decision-layer counterfactual closure against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `8790c726413e1ef4eddf04e6ccf0f8c30df1baa9` (parent `9d4182ff…`).

---

## Outcome

The exact R3 decision ceiling of **3,720 / 3,720** was preserved through every accepted
iteration and reproduced in a separate clean verification campaign, with zero false
allows, zero false refusals, zero clarify mismatches, all closed controls intact, the
seven-shape rich-context guard passing, and a stable runtime identity.

**Seven of eight lock conditions are met.** The lock additionally requires the complete
combined counterfactual suite to pass; 17 of 756 queries still fail, so the decision lock
is **not declared**. That condition is recorded as unmet, not waived.

## Anti-overfit finding — leakage found and removed

A new gate check (`no_complete_counterfactual_query`) was added in this unit and it
fired. Two v4 counterfactual entries — themselves bare tax phrases — had their exact text
added to the runtime vocabulary during C9. Those two queries were therefore passing **by
name rather than by structure**.

Both strings were removed from `CONCISE_TAX_PHRASE_RE` and `BARE_TAX_TOPIC_RE`. The
generic alternatives still cover the concept structurally. The counterfactual score fell
from 741/756 to 739/756 as a direct result, and that cost was accepted rather than
concealed: a score that depends on memorised suite text is not a real score. R3 was
unaffected and anti-overfit now passes 21/21.

## Counterfactual expectation adjudication

All 58 failures in the pre-coding contract were assessed against their own family rule
and the governing architecture. **All 58 were found structurally valid**, so no suite
defect was demonstrated and **no counterfactual expectation was edited**. The original
expectations stand unchanged; the adjudication artifact records the policy and the result.

## Oracle integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited. No oracle conflict was found or asserted.
- Every accepted candidate held R3 decision at exactly 3,720/3,720. One intermediate
  candidate regressed R3 to 3,639 and was corrected immediately rather than accepted.

## Reconstruction identity

The accepted C10 dev-06 candidate was verified file-by-file, against the recorded
identity manifest, and against the required services tree digest
`42360feadc5be5f1f7d203551ed5296eb0f4338eb59ba8b9fc6ecea2d6fe61ce`. Only an authorized
runtime file differed from the live baseline. It reproduced its result exactly, including
the 698/756 counterfactual score: 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp file ending in
`.js`, verified non-zero, imported to confirm all nine required exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a runtime
write. All three runtime files were verified non-zero with exports intact before and after
every allocation, execution and finalization. No repository zero-byte, truncation or
unexplained-write incident occurred, and no temp residue remains.

Several patch scripts failed on stale anchors or produced syntax errors; in each case the
failure was detected immediately by a load check, the runtime was restored from a verified
snapshot, and the change was reapplied. No broken runtime was ever scored or registered as
a result.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No integration. No freeze.
- Live services restored to the committed COMMIT 3 baseline; tracked diff over `services/`
  is 0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- The candidate is preserved as `COMMIT_5R1C11_BEST_CANDIDATE.patch` and in immutable
  attempt snapshots. It is **not** live.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Gates

- **Decision-focused regression:** PASS on every bucket.
- **Anti-overfit:** PASS 21/21 on executable code with comments stripped, including the
  new checks that no complete counterfactual query and no counterfactual family name is
  embedded in runtime.
- **Determinism:** PASS — 150 queries × 100 repetitions = 15,000 evaluations, decision
  drift 0, byte drift 0, mutation failures 0.
- **Rich-context guard:** PASS on all seven shapes.

## Boundaries observed

- No relation-lane or reason-lane remediation was started.
- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 98 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change and contains no
  unsupported claim.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision layer was not locked; this unit is incomplete by its own success criterion.
