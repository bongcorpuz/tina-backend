# COMMIT 5R1-C1 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `d210c224fe41ae2754bb8293e830eff0ee252043`
Parent: `677eb0e4bb83d3d37de4f4eeefab062c088191f5`

## Decision: COMMIT 5R1-C1 INCOMPLETE — FROZEN R2 TEMPLATE-WIDE REASON CONFLICT

Standalone 3,720/3,720 closure is **logically unreachable** by any deterministic analyzer:
R2 contains **14 query templates (140 rows)** with conflicting expected reason families for
byte-identical query structures, capping the deterministic maximum at **3,706/3,720**.

Per owner adjudication: 3,706 is **not** accepted as PASS, **no** runtime exceptions were
created, the runtime was **not** integrated or frozen, and R2 was **not** edited. Evidence
is preserved; the next unit is COMMIT 4R3 (template-wide re-freeze).

## Root cause

COMMIT 4R1S reviewed a stratified sample and challenged **one instance per repeating
template**; COMMIT 4R2 applied each R1S-confirmed correction to only that single challenged
oracleId, leaving the structurally-identical sibling instances (typically 9 per template)
with the original, now-inconsistent reason family. Example: `S1-IR19-0751 "What about gross
receipts for scenario 1?"` → `no_tax_relation` (corrected) vs `S1-IR19-0766 "…scenario 16?"`
→ `ambiguous_tax_acronym` (uncorrected). Full inventory in
`COMMIT_5R1C1_R2_TEMPLATE_CONFLICT_INVENTORY.json`; all 14 families proven
same-decision + same-relations + same-coverage-class (differ only by an incrementing integer).

## Scope proof

| Assertion | Result |
|---|---|
| R2 oracle changed / edited | NO — SHA `1347a918…` unchanged |
| V1 / R1 oracle changed | NO |
| Runtime files changed on disk | NO — analyzer restored to `a23364bc`; boundary `97986ed7`, patterns `d98e6399` |
| Runtime frozen | NO |
| Runtime integrated into production boundary | NO |
| 3,706 accepted as PASS | NO |
| Runtime exceptions for the 14 rows created | NO |
| Tests changed | NO |
| COMMIT 1–5 / 4R1 / 4R1S / 4R2 / 5R1 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Model / network / embeddings in classifier | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |

## Development record (preserved)

- **Reconstructed candidate** (Attempt `…commit5r1c1-dev-01…`): the preserved COMMIT 5R1 dev-01 snapshot re-run under the governed wrapper → **2,674 / 3,720** (matches the earlier local score; governed score controlling). Runtime snapshot preserved.
- **Development iteration dev-02** (Attempt `…commit5r1c1-dev-02…`): further clause-level/relation architecture remediation this cycle (category homograph veto, clear-tax-content residual ALLOW, Filipino VAT/withholding relations, negation-scope non-tax-action relations, genuine-tax-question guard) → **2,777 / 3,720**. Preserved in its attempt `runtime-snapshot/` with SHA-256 and a diff from the reconstructed candidate; **NOT applied to `services/`**.
- Both candidates remain below the 3,706 ceiling; the residual gap to 3,706 is genuine remaining analyzer work, but closure at 3,720 is blocked by the R2 conflict regardless.

## Authorized changed / added paths

- `evaluation/runner/phase-10a14-r20/commit5r1c1-driver.mjs`, `build-commit5r1c1-manifest.mjs` — tooling (no runtime edit on disk after restore).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1-C1 evidence (preflight, conflict inventory, iteration register, decision, reconciliation) + 2 attempt directories with runtime snapshots.
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; 31 prior records preserved byte-for-byte; `cumulativeThrough = commit5r1c1`.

**No oracle execution altered R2.** COMMIT 5R1-C1 restarts only after a frozen, validated R3.
