# Repository, Scope, Runner, And Hash Evidence

Reviewed HEAD: 31a4070a705b8e78f58693f2bcbe519d7f605598
Branch: feature/source-availability-engine-v1
Initial sync: git rev-list --left-right --count HEAD...@{u} -> 0 0
Initial status: only protected untracked .claude/, .vscode/, evaluation/factcheck/

## R4 Diff Scope

- PHASE-10A14-R4-...-REMEDIATION-1_REPORT.md added.
- evaluation/results/phase-10a14-r4/* evidence files added.
- knowledge/CURRENT_STATE.md modified.
- pipeline.js modified.
- tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs added.
- vector-store.js modified.

No package, env, DB migration, frontend, Dev Factory, source-bank, corpus, or model/prompt files are changed in the R4 runtime diff.

## Runner Results

- node tests\phase-10a14-r4-sec51-filing-authority-bridge.test.mjs -> 20 passed, 0 failed.
- node scripts\run-regressions.mjs -> syntax 10/0, deterministic suites 194/0, exit 0.
- node scripts\run-staging-smokes.mjs restricted sandbox -> 7 run, 1 failed due staging reachability.
- node scripts\run-staging-smokes.mjs network-enabled rerun -> 7/0, exit 0.
- git diff --check b3b8714c68eb6e5079852f575b70f7773f273426..HEAD -> exit 0.

## Executor Manifest Recompute

The committed R4 EVIDENCE_MANIFEST.sha256 entries recomputed exactly for the six listed files:

- 211f2966abc9619f3b616aef20a34621982deac3f754c901a89d67fc0c487c6d  evaluation/results/phase-10a14-r4/live-positive-negative-matrix.txt
- 84262c70baeab7082978b5281d7bd25c329d3377a3a827a1957ab9e990303bc1  evaluation/results/phase-10a14-r4/deterministic-gate-cycle1.txt
- 3ffbfe8d7485db07f5cf6c9966cadb008ef55e0c8b9303397a7f5bc802c3025a  evaluation/results/phase-10a14-r4/deterministic-gate-cycle2.txt
- 457447583dd7985751a729dc9dce9103bdcdd5a66a97a948e8a0a6ec9eddc366  evaluation/results/phase-10a14-r4/staging-gate-cycle1.txt
- f49d94bc28315f7131585fceb3dd3c7242c5388065218cd48883345dee5faa29  evaluation/results/phase-10a14-r4/staging-gate-cycle2.txt
- cb1cd7e4a28f2ce074504b5e3c800a49c1d667c8e416a16a09e966d6db77a3b9  PHASE-10A14-R4-...-REMEDIATION-1_REPORT.md

The manifest reconciliation is OK for the files it lists, but it does not supply the missing all-26/prior-safeguard/end-to-end matrix artifacts required for PASS.
