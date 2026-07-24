# COMMIT 2 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `78cf7ea7adf0f84edda767bef89c665b69bea0ff`
Parent: `f0efc377a77de0b7f69913c4977333d1fb5fff8d`

## Scope proof

| Assertion | Result |
|---|---|
| Runtime file changed | NO — `git status services/` empty; blobs identical to HEAD and to R19 campaign runtime `69383f6a` |
| `services/philippine-tax-intent-analyzer.js` | Remains ABSENT (not created) |
| Model / provider / prompt change | NO — runtime model `gpt-4o-mini`, untouched |
| Retrieval / reranking change | NO |
| sourceAvailability change | NO |
| LOA workflow change | NO |
| Corpus / vector / index change | NO |
| Database / schema change | NO |
| Frontend change | NO |
| Dev Factory change | NO (`C:\Projects\tina-dev-factory` untouched) |
| Source ingestion / reindexing | NO |
| Deployment | NO |
| Secret captured | NO — environment fingerprint excludes secrets |
| Taxpayer / client data used | NO — synthetic oracle probes only |
| Protected path staged | NO — `.vscode/`, `evaluation/factcheck/`, `.claude/` never staged |
| Node listener remains | NO |
| Port 5173 | FREE |
| Repository-local capture residue | NONE — stdout/stderr captured in OS temp, imported, external capture removed after byte-equality check |
| R13–R19 historical evidence | BYTE-IDENTICAL (0 modifications) |
| COMMIT 1 contract | BYTE-IDENTICAL (verified against committed blobs in `COMMIT_1_ARTIFACT_IDENTITY.json`) |

## Authorized changed paths (all within `ALLOWED_FILE_INVENTORY.json`)

- `evaluation/runner/phase-10a14-r20/**` — governed attempt-wrapper & registry tooling (pre-authorized governed-tooling extension; no decision logic).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 2 evidence + attempt directories.

No path outside the frozen allowlist was created or modified.

## Runtime-unchanged / divergence note

The unchanged runtime reproduces the historical R19 1,120 baseline **exactly** (729 passed; 179 false allows; 162 false refusals; 50 clarify mismatches; 36 metamorphic failed groups) with **0 raw-decision discrepancies** vs the historical record. The corrected-567 regression shows a **scoring-semantics divergence** (strict-canonical 511/567 vs historical-lenient 567/567) with **0 raw-decision discrepancies** — the runtime output is byte-identical; only the CLARIFY-vs-REFUSE scoring rule differs. Owner-adjudicated disposition: record both, proceed. See `CORRECTED_SEMANTIC_567_RESULT.json`.
