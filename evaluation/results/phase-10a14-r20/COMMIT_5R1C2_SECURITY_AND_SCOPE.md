# COMMIT 5R1-C2 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `14a9e14ccdc4c7de54abb66ebc49c9d6a76573cc`
Parent: `5c1fb4b2b529070a9c0560c48ac64ae6ac892c90`

## Decision: COMMIT 5R1-C2 INCOMPLETE — ARCHITECTURE REMEDIATION NOT CLOSED

Standalone R3 closure (3,720/3,720 on decision + reason + relation) was not reached. Per the
incomplete-architecture discipline: both candidates are preserved as governed attempts, the
live runtime is restored to the committed COMMIT 3 baseline, `knowledge/CURRENT_STATE.md` is
updated, and the unit STOPS. No integration, no freeze, no R3 edit. 2,819/3,720 is NOT closure.

## Scope proof

| Assertion | Result |
|---|---|
| R3 oracle changed / edited | NO — SHA `ddf5a603…` unchanged |
| V1 / R1 / R2 oracle changed | NO |
| Runtime files changed on disk | NO — analyzer restored to `a23364bc`; boundary `97986ed7`, patterns `d98e6399` |
| Runtime frozen | NO |
| Runtime integrated into production boundary | NO |
| 2,819 accepted as closure/PASS | NO |
| Runtime exceptions for hard rows created | NO |
| Tests changed | NO |
| COMMIT 1–4R3 / 5R1 / 5R1-C1 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Model / provider / prompt change | NO |
| Model call / network / embeddings in classifier | NO |
| Retrieval / LOA / corpus / DB / frontend / Dev Factory change | NO |
| Ingestion / reindexing / deployment | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| `knowledge/CURRENT_STATE.md` (sole authorized knowledge change) | UPDATED (no placeholders; does not claim 10A closure) |
| Only allowlisted paths changed | YES |

## Development record (preserved)

- **Reconstructed dev-02 against R3** (Attempt `…commit5r1c2-dev-01…`): the preserved COMMIT 5R1-C1 dev-02 snapshot, re-scored against R3 (governed): **2,716 / 3,720** (historical R2 score was 2,777; the R3 governed score controls). Runtime snapshot preserved.
- **Development iteration dev-02** (Attempt `…commit5r1c2-dev-02…`): further clause-level/relation architecture remediation this cycle → **2,819 / 3,720**. Preserved in its attempt `runtime-snapshot/` with SHA-256 and a diff from the reconstructed candidate; **NOT applied to `services/`**. Architectural changes: scenario-dangling → `no_tax_relation` (R3 alignment), genuine-tax-question predicate builds the tax relation before the homograph veto, withholding/VAT specific relation typing, negation non-tax-action relation, expanded non-tax domain-noun homograph veto.

## Best-candidate (2,819) mismatch matrix

```text
total passed:              2,819 / 3,720
total failed:              901
decision mismatches:       461
reason mismatches:         900
relation mismatches:       315
material false allows:     169
material false refusals:   182
clarify mismatches:        110
metamorphic groups passed:  72 / 100
```

Remaining failures are dominated by competing clause/task/target/relation constraints:
genuine mixed-domain tax questions vs homograph traps, and `explicit_tax_task_relation` vs
`tax_treatment_of_ordinary_object` reason granularity on inherited rows.

## Authorized changed / added paths (all within the COMMIT 5R1-C2 allowlist)

- `evaluation/runner/phase-10a14-r20/commit5r1c2-oracle-runner.mjs`, `commit5r1c2-driver.mjs`, `build-commit5r1c2-manifest.mjs` — R3 scoring runner and incomplete-evidence driver/manifest tooling (no runtime edit on disk after restore).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1-C2 evidence + 2 attempt directories (with preserved runtime snapshots).
- `knowledge/CURRENT_STATE.md` — updated to COMMIT 5R1-C2 INCOMPLETE (next = COMMIT 5R1-C3).
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; 39 prior records preserved byte-for-byte; `cumulativeThrough = commit5r1c2-incomplete`, `runtimeClosure = false`.

No runtime (`services/**`), test, or oracle file was modified. No runtime freeze. R3 unchanged.
