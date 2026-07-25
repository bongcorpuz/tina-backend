# COMMIT 5R1-C3 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `7246bb486ee35c73a908562b96bd5e2607caf065`
Parent: `14a9e14ccdc4c7de54abb66ebc49c9d6a76573cc`

## Decision: COMMIT 5R1-C3 INCOMPLETE — ARCHITECTURE REMEDIATION NOT CLOSED

Standalone R3 closure (3,720/3,720 on decision + reason + relation) was not reached. Per owner
adjudication and the incomplete-architecture discipline: the reconstructed 2,819 candidate and
the improved 2,870 candidate are preserved as separate governed attempts (with snapshots,
patch, identities, full 3,720-row results and mismatch matrices); the live runtime is restored
to the committed baseline; `knowledge/CURRENT_STATE.md` is updated as the final substantive
change; and the unit STOPS. No integration, no freeze, no R3 edit. **2,870 / 3,720 is NOT
closure and NOT a PASS.**

## Scope proof

| Assertion | Result |
|---|---|
| R3 oracle changed / edited | NO — SHA `ddf5a603…` unchanged |
| V1 / R1 / R2 oracle changed | NO |
| Runtime files changed on disk | NO — analyzer restored to `a23364bc`; boundary `97986ed7`, patterns `d98e6399` |
| Runtime frozen | NO |
| Runtime integrated into production boundary | NO |
| 2,870 accepted as closure / PASS | NO |
| Iterated beyond owner-adjudicated stop | NO — owner directed PRESERVE INCOMPLETE, STOP |
| Exact-query / oracle-ID / source-set exceptions created | NO |
| Tests changed | NO |
| COMMIT 1–5R1-C2 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Model / provider / prompt / network / embeddings in classifier | NO |
| Retrieval / LOA / corpus / DB / frontend / Dev Factory change | NO |
| Ingestion / reindexing / deployment | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| `knowledge/CURRENT_STATE.md` (sole authorized knowledge change) | UPDATED (final substantive change; no placeholders; does not claim 10A closure; does not call 2,870 a PASS) |
| Only allowlisted paths changed | YES |

## Development record (preserved)

- **Reconstructed 2,819 vs R3** (Attempt `…commit5r1c3-dev-01…`): the preserved COMMIT 5R1-C2
  dev-02 snapshot, re-scored against R3 (governed) — exact reconstruction **2,819 / 3,720**,
  R17 = 107/210. Runtime snapshot preserved.
- **Development iteration dev-02** (Attempt `…commit5r1c3-dev-02…`): further clause-level /
  relation remediation this continuation → **2,870 / 3,720**. Preserved in its attempt
  `runtime-snapshot/` with SHA-256 and a diff from the reconstructed candidate; **NOT applied
  to `services/`**. Architectural changes: narrow acronym-non-tax-redefine veto (OSD/monitor,
  MCIT/plugin, RCIT/robotics, VAT-as-variable-name), tax-expansion-in-parens + context ALLOW
  (RMC/PAN/SLSP), explicit code-label detection, expanded clear-tax-terms bare-term ALLOW
  (net estate, books of accounts, official receipt, authority to print, etc.).

## R17 count reconciliation

`COMMIT_5R1C3_R17_COUNT_RECONCILIATION.json`: authoritative R17 for the 2,819 candidate is
**107/210**; the human report of 106 was off by one; the separately-recorded 105 belongs to
the earlier 2,716 reconstruction, not the 2,819 candidate.

## Best-candidate (2,870) mismatch matrix

```text
total passed:              2,870 / 3,720
total failed:              850
decision mismatches:       404
reason mismatches:         849
relation mismatches:       315
material false allows:     155
material false refusals:   143
clarify mismatches:        106
metamorphic groups passed:  72 / 100
```

Remaining failures are dominated by persistent decision-layer tradeoffs between genuine
mixed-domain tax questions and homograph traps, together with inherited reason-family
granularity that oscillates under coupled patching (each gain trades a loss).

## Registry

Prior 41 attempts preserved byte-for-byte; 2 genuinely governed C3 attempts appended → 43
total. `closureComplete = true`, `orphanResults = 0`, `danglingAttempts = 0`,
`cumulativeThrough = commit5r1c3-incomplete`, `runtimeClosure = false`. No local or
unregistered executions to disclose.

## Authorized changed / added paths (all within the COMMIT 5R1-C3 allowlist)

- `evaluation/runner/phase-10a14-r20/commit5r1c3-driver.mjs`, `commit5r1c3-r17-recon.mjs` —
  incomplete-evidence driver and R17 reconciliation tooling (no runtime edit on disk after restore).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1-C3 evidence + 2 attempt directories
  (with preserved runtime snapshots).
- `knowledge/CURRENT_STATE.md` — updated to COMMIT 5R1-C3 INCOMPLETE (next = COMMIT 5R1-C4).
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended
  only; 41 prior records preserved; `cumulativeThrough = commit5r1c3-incomplete`, `runtimeClosure = false`.

No runtime (`services/**`), test, or oracle file was modified. No runtime freeze. R3 unchanged.
R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.
