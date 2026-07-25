# COMMIT 5R1 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `677eb0e4bb83d3d37de4f4eeefab062c088191f5`
Parent: `3213d654b7a9d293a6a90761a370de2cb8ff91f2`

## Decision for this unit: COMMIT 5 RESTART 1 INCOMPLETE — ARCHITECTURE REMEDIATION NOT CLOSED

The clause-level/relation runtime did not reach exact 3,720/3,720 canonical closure
(decision + reason + relation) against R2. Per the frozen COMMIT 5R1 failure discipline,
evidence is preserved and the unit STOPS **without a runtime freeze**. The analyzer on
disk remains the committed COMMIT 3 baseline (blob `a23364bc`).

## Scope proof

| Assertion | Result |
|---|---|
| R2 oracle changed | NO — SHA `1347a918…` unchanged |
| V1 / R1 oracle changed | NO |
| Runtime files changed on disk | NO — analyzer `a23364bc…`, domain-boundary `97986ed7…`, patterns `d98e6399…` all unchanged |
| Runtime frozen | NO (closure not reached) |
| Production integration performed | NO |
| Tests changed | NO |
| COMMIT 1–5 / 4R1 / 4R1S / 4R2 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Model / provider / prompt change | NO |
| Model call / network / embeddings in classifier | NO |
| Retrieval / LOA / corpus / DB / frontend / Dev Factory change | NO |
| Ingestion / reindexing / deployment | NO |
| Secret / taxpayer data | NO (synthetic oracle probes only) |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| Capture residue | none |

## Development record

- **Stage A R2 baseline** (Attempt `…commit5r1-baseline…`): unchanged COMMIT 3 standalone analyzer vs frozen R2, canonical lane: **1,089 / 3,720**. Runtime snapshot preserved.
- **Development iteration dev-01** (Attempt `…commit5r1-dev-01…`): an in-progress clause-level/relation remediation reached **2,674 / 3,720** (decision+reason+relation). This iteration is preserved **inside its attempt directory's `runtime-snapshot/`** (with its SHA-256) and was **NOT applied to `services/`** because the unit is INCOMPLETE and no freeze occurs. It provides a resumable starting point for the authorized continuation.
- Remaining ~1,046 failures span all source sets and involve competing structural constraints (e.g. tightening non-tax-homograph REFUSE without regressing genuine ordinary-object-tax ALLOW) that require further methodical convergence before closure.

## Authorized changed / added paths (all within the COMMIT 5R1 allowlist)

- `evaluation/runner/phase-10a14-r20/commit5r1-oracle-runner.mjs`, `commit5r1-baseline-driver.mjs`, `build-commit5r1-manifest.mjs` — R2 scoring runner and incomplete-evidence driver/manifest tooling (no runtime edit).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1 baseline/decision/register evidence + 2 attempt directories (with preserved runtime snapshots).
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; 29 prior records preserved byte-for-byte; `cumulativeThrough = commit5r1`.

No runtime (`services/**`), test, or oracle file was modified. No runtime freeze. Original COMMIT 5 V1 baseline evidence remains distinct and immutable.
