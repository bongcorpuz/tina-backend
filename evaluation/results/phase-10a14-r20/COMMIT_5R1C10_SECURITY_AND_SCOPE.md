# PHASE-10A14-R20 — COMMIT 5R1-C10

## Security and Scope Attestation

Unit: decision-layer closure continuation 10 against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `9d4182ff95006406367fea3c40cd74265e67b9be` (parent `a1e9505b…`).

---

## Headline outcome

R3 reached an exact **3,720 / 3,720** decision result with zero false allows, zero false
refusals and zero clarify mismatches, reproduced in a **separate clean verification
campaign** against an unchanged runtime. All closed decision controls held.

The decision lock was nevertheless **not declared**, because the lock condition also
requires the complete combined decision counterfactual suite to pass. 58 of 756
counterfactual queries still fail. That condition is recorded as unmet rather than
waived, and no lock artifact claims success.

## Oracle integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited. No oracle conflict was found or asserted.

## Reconstruction identity

The accepted C9 dev-05 candidate was verified file-by-file and against the required
services tree digest `878b9bb2ce877d6124933bb0d662aaf9e91f7ffac463e06545e4e0325d55c003`
before being applied, and it was proven that only an authorized runtime file differed from
the live baseline. It reproduced its result exactly: overall 3,097/3,720, decision
3,706/3,720, 0 discrepancies.

## Write safety

Every authoritative runtime write used an **in-repository sibling temp file ending in
`.js`**, verified non-zero, imported to confirm all nine required exports, hashed,
atomically renamed, then rehashed at the destination. No external scratchpad was ever the
source of a runtime write. All three runtime files were verified non-zero with exports
intact before and after every allocation, execution and finalization.

No repository zero-byte, truncation or unexplained-write incident occurred. No temp
residue remains. The diagnostic tracer wrote only to a runner-directory dotfile, never
over `services/`, and was removed.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- The production boundary was **not** integrated. No freeze was performed.
- Live services were restored to the committed COMMIT 3 baseline after preserving the
  candidate. Tracked diff over `services/` is 0 bytes; the analyzer's normalized-LF
  content equals `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- The candidate is preserved as `COMMIT_5R1C10_BEST_CANDIDATE.patch` and inside the
  immutable attempt snapshots. It is **not** live.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Rich-context regression guard

C9 iteration 06 had regressed richer RMC-issuance questions, so every residual rule in
this unit was checked against the full context ladder. Final state of all seven shapes:

```text
bare_term                     ALLOW
recognized_acronym            CLARIFY
acronym_with_issuance_context ALLOW
acronym_with_procedure_context ALLOW
ordinary_homograph            REFUSE
richer_tax_sentence           ALLOW
metadata_suffixed_contentless REFUSE
```

No accepted candidate reopened a richer-context failure.

## Gates

- **Decision-focused regression:** every bucket passes, not only the closed controls.
- **Anti-overfit:** PASS 21/21 against executable code with comments stripped, including
  checks that no cluster name from the 14-row contract is a runtime feature, that a
  tax-domain object is required before a compliance relation, and that the canonical
  acronym set stays narrow.
- **Determinism:** PASS — 150 queries × 100 repetitions = 15,000 evaluations, decision
  drift 0, byte drift 0, mutation failures 0.

## Closed decision controls

```text
tax_compliance_task             108 / 108
acronym_homograph_control       200 / 200
ambiguous_clarification_control 150 / 150
internal_label_proper_name      104 / 104
quoted_term_only                closed
```

## Counterfactual controls

The combined C7 v3 + C8 v4 + C9 v5 suite (642 queries / 358 pairs) was preserved and
rerun. A v6 extension of 114 new deterministic queries across 61 structural pairs and 13
families was authored from structural rules **before** any runtime change, with
expectations written by the executor and no model-generated expectations. An automated
guard rejected every query duplicating an exact R3 row; it fired twice during authoring
and those queries were reworded. Combined suite: **756 queries / 419 pairs**, best
candidate **698/756**. Exact R3 query leakage: **0**.

## Boundaries observed

- No relation-lane or reason-lane remediation was started.
- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`). Its historical
  execution figures remain stale; CURRENT_STATE and committed evidence control.
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 88 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change and contains no
  unsupported claim.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision layer was not locked; this unit is incomplete by its own success criterion.
