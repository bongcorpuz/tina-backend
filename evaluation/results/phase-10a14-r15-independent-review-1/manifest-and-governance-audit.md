# Manifest And Governance Audit

R15 final evidence manifest:

- `evaluation/results/phase-10a14-r15/EVIDENCE_MANIFEST.sha256` validates: 4876 entries, 0 duplicate paths, 0 missing files, 0 hash mismatches.

R15 pre-fix manifest in final working tree:

- `evaluation/results/phase-10a14-r15/PRE_FIX_EVIDENCE_MANIFEST.sha256` no longer validates against the final tree after archive conversion: 4764 entries, 4746 missing files, and 2 mismatch/parse defects were observed. This is evidence hygiene debt rather than proof that archived event content was altered.

Archive integrity:

- Integrity files for `R15-POSTFIX1` through `R15-POSTFIX6`, `R15-PREFIX`, and `R15-PREFIXLIVE` validate: archive files exist, archive hashes match, verified event counts match, and event hash mismatches are 0.

Journal archive governance:

- `R15_JOURNAL_ARCHIVE_NOTE.md` discloses a mid-execution contract amendment from one directory per attempt to JSONL archive conversion.
- It also discloses that completed generation directories were removed after archive verification.
- POSTFIX working-tree generation directories are not recoverable in directory form from final HEAD; the JSONL archives and integrity manifests are the preserved evidence.
- Because the frozen R15 contract and review charter emphasized no deletion/no lost attempts and durable per-attempt evidence, this prevents a governance supersession PASS even though event contents hash-validate.

Gate chronology and attempt accounting:

- `phase-10a14-r15-result.json` reports `gates.runnerInvocations = 4` and `preservedLogs = 4`.
- `knowledge/CURRENT_STATE.md`, executor narrative, and R15 gate directories describe five deterministic gate attempts.
- `R15_ATTEMPT_RECONCILIATION.json` totals campaign attempts/events but excludes gate-runner attempts, while result JSON reports `technicalFailures = 0` in the attempt reconciliation and failed gate attempts elsewhere.
- These scoping differences are not stated clearly enough in the formal result JSON. The formal gate/attempt counts are therefore materially inconsistent and cannot support PASS.

Protected path:

- Commit `7aba6039` briefly tracked four `evaluation/factcheck` files.
- Commit `721d8546` removed those files from tracking while leaving them locally untracked.
- Final state preserves the protected untracked path, but the historical protected-path staging/commit violation remains a bounded governance defect.
