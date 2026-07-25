# COMMIT 5R1-C4 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `4bfb41609598b145dc927eba491320f703155933`
Parent: `7246bb486ee35c73a908562b96bd5e2607caf065`

## Decision: COMMIT 5R1-C4 INCOMPLETE — ARCHITECTURE REMEDIATION NOT CLOSED

Owner-adjudicated PRESERVE INCOMPLETE, STOP. The layer-locked decision lane improved across
two accepted/rejected material iterations but the DECISION LAYER LOCK (exactly 0 decision
mismatches) was not achieved, so relation and reason lanes were not started and standalone
3,720/3,720 closure, integration and freeze were not reached. All C4 iterations are preserved
as governed attempts, the live runtime is restored to the committed baseline, and
`knowledge/CURRENT_STATE.md` is updated as the final substantive change. **Neither 2,955/3,720
(overall) nor 3,439/3,720 (decision layer) is closure or a PASS.**

## Repository context

- All backend Git commands used `git -C C:\Projects\tina-backend`. No bare `git commit`.
- `C:\Projects\tina-dev-factory` HEAD `91670029…` verified unchanged before and after; zero
  cross-repository contamination.

## Scope proof

| Assertion | Result |
|---|---|
| R3 oracle changed / edited | NO — SHA `ddf5a603…` unchanged |
| V1 / R1 / R2 oracle changed | NO (`0227a5b4` / `ba016393` / `1347a918`) |
| Runtime files changed on disk | NO — analyzer restored to `a23364bc`; boundary `97986ed7`, patterns `d98e6399` |
| Decision layer locked | NO — best decision 3,439/3,720, 281 mismatches remain |
| Relation / reason layer started | NO |
| Standalone closure reached | NO |
| Runtime integrated / frozen | NO |
| 2,955 or 3,439 accepted as closure / PASS / lock | NO |
| dev-03 accepted as next base | NO — rejected (closed-category regression tax_compliance_task 108→90) |
| Remaining material iterations spent this session | NO — stopped on owner adjudication (2 of 5 unused) |
| Exact-query / oracle-ID / source-set / scenario-number exceptions | NONE |
| Tests changed | NO |
| COMMIT 1–5R1-C3 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Model / provider / prompt / network / embeddings in classifier | NO (`gpt-4o-mini` unchanged) |
| Retrieval / LOA / corpus / DB / frontend / Dev Factory change | NO |
| Ingestion / reindexing / deployment | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| `knowledge/CURRENT_STATE.md` (sole authorized knowledge change) | UPDATED (final substantive change; no placeholders; R3 status wording made task-neutral; does not claim 10A closure) |
| Only allowlisted paths changed | YES |

## Development record (preserved)

- **dev-01 — reconstructed 2,870 vs R3** (`…commit5r1c4-dev-01…`): exact reconstruction
  **2,870 / 3,720** (snapshot analyzer SHA `e2dfdf05…`). Runtime snapshot preserved.
- **dev-02 — ACCEPTED best base** (`…commit5r1c4-dev-02…`): decision-lane iteration —
  dangling-scenario→CLARIFY precedence + label-binding detection. **Overall 2,955 / 3,720,
  decision 3,411 / 3,720.** No closed-category regression (tax_compliance_task 108/108,
  acronym_homograph_control 200/200 preserved). Snapshot + patch preserved. Accepted base for C5.
- **dev-03 — REJECTED candidate** (`…commit5r1c4-dev-03…`): contentless-referent guard —
  best decision-layer result **3,439 / 3,720** (281 mismatches) but reopened a closed category
  (**tax_compliance_task 108→90**), so rejected as the next base under the layer-lock acceptance
  rule. Snapshot + patch preserved; discriminator carried to C5.

## Best accepted base (dev-02, 2,955) mismatch matrix

```text
overall passed:            2,955 / 3,720
decision mismatches:       309
relation mismatches:       250
reason mismatches:         764
material false allows:     113
material false refusals:   143
clarify mismatches:         53
metamorphic groups passed:  72 / 100
```

Blocker: mutually-trading decision-precedence clusters (ALLOW→REFUSE, REFUSE→ALLOW,
REFUSE→CLARIFY). Tightening the concrete-subject discriminator to close REFUSE→ALLOW reopened
tax_compliance_task; the directions trade under coupled patching.

## Registry

Prior 43 attempts preserved byte-for-byte; 3 genuinely governed C4 attempts appended → 46
total (domain_campaign 11→14). `closureComplete = true`, `orphanResults = 0`,
`danglingAttempts = 0`, `cumulativeThrough = commit5r1c4-incomplete`, `runtimeClosure = false`.
No local or unregistered executions to disclose.

## Authorized changed / added paths (all within the COMMIT 5R1-C4 allowlist)

- `evaluation/runner/phase-10a14-r20/commit5r1c4-reconstruct.mjs`, `commit5r1c4-partition.mjs`,
  `commit5r1c4-lanes.mjs`, `commit5r1c4-driver.mjs`, `_c4analyze.mjs`, `_c4counts.mjs`,
  `_c4trace.mjs` — reconstruction, lane-scoring, partition and incomplete-evidence tooling
  (no runtime edit on disk after restore).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1-C4 evidence + 3 attempt directories
  (with preserved runtime snapshots and patches).
- `knowledge/CURRENT_STATE.md` — updated to COMMIT 5R1-C4 INCOMPLETE (next = COMMIT 5R1-C5).
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only.

No runtime (`services/**`), test, or oracle file was modified. No runtime freeze. R3 unchanged.
R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.
