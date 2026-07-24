# COMMIT 4 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `ca9919c4c50fad30c460aca336cb171fa4f7e8ca`
Parent: `ebb71e4927609d441f4acaddd25360f9bb525362`

## Scope proof

| Assertion | Result |
|---|---|
| Runtime / analyzer file changed | NO (analyzer blob `a23364bc…`, legacy `97986ed7…` / `d98e6399…` unchanged) |
| COMMIT 3 tests changed | NO |
| Classifier executed to author expectations | NO |
| Analyzer executed against the oracle | NO (no oracle execution in COMMIT 4) |
| Model / network / embedding use | NO |
| Environment-based expectation generation | NO (expectations are structural/accepted-historical) |
| Retrieval / LOA / corpus / DB / frontend / Dev Factory change | NO |
| Ingestion / reindexing / deployment | NO |
| Secret or taxpayer/client data | NO (synthetic constructed rows only) |
| Protected path staged | NO (`.vscode/`, `evaluation/factcheck/`, `.claude/` never staged) |
| Node listener remains | NO |
| Port 5173 | FREE |
| Capture residue | NONE |
| R13–R19 evidence changed | NO |
| COMMIT 1 artifacts changed | NO |
| COMMIT 2 frozen evidence + attempt dirs changed | NO |
| COMMIT 3 analyzer/tests/evidence + attempt dirs changed | NO |
| Only allowed paths changed | YES |

## Analyzer-contamination proof

- Neither `commit4-oracle-builder.mjs` nor `commit4-new-rows.mjs` imports `philippine-tax-intent-analyzer.js` or `philippine-tax-domain-boundary.js` (Attempt I static contamination check).
- No frozen oracle row has `actualDecision`/`actualReason` populated (all `null`) — Attempt K `no_analyzer_output_contamination` = PASS.
- Every expectation authority is one of: `frozen_contract_construction`, `accepted_r19_controlling`, `accepted_r18_corrected`, `accepted_r17_control`.

## Authorized changed / added paths (all within `ALLOWED_FILE_INVENTORY.json`)

- `evaluation/oracles/phase-10a14-r20/**` — the frozen development oracle and its companion artifacts.
- `evaluation/runner/phase-10a14-r20/**` — COMMIT 4 builder/validators/driver/manifest tooling (no decision logic; no classifier import).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 4 evidence + 5 new attempt directories.
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; the 8 prior attempt records preserved byte-for-byte.

`COMMIT_2_EVIDENCE_MANIFEST.sha256` and `COMMIT_3_EVIDENCE_MANIFEST.sha256` were not modified.

## Freeze summary

- Frozen oracle: `evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json`
- SHA-256: `0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263`
- Rows: **3,720** (1,120 R19 + 567 corrected R18 + 210 R17 accepted + 1,823 new [1,623 compositional + 200 metamorphic]); unique exact queries 3,718 (2 inherited-source duplicates preserved).
- New-row exact duplicates: **0**; duplicate oracleIds: **0**; unresolved disputes: **0**.
- Dual 567 scoring preserved; 56 `SCORING_SEMANTICS_DIVERGENCE` rows tagged.
- Metamorphic groups: **40** (≥36), 200 member rows.
- `expectationsMutable = false`; post-commit expectation edit rule = `REVISIONS_REQUIRED`.
- **No oracle execution against the analyzer or production routing.**
