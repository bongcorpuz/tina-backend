# COMMIT 5R1-C5 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `08990106993262cc5fdb4ad8b77b17aa3cf479dd`
Parent: `4bfb41609598b145dc927eba491320f703155933`

## Decision: COMMIT 5R1-C5 INCOMPLETE — DECISION LAYER REMEDIATION NOT CLOSED

Owner-adjudicated ATTEMPT DECISION-LANE, THEN PRESERVE. The active objective was the Decision
Layer Lock only. Two material decision-lane iterations ran (one accepted, one rejected); the
lock (exactly 0 decision mismatches) was not achieved (best 3,415/3,720, 305 remaining), so
relation and reason lanes were not started and standalone closure, integration and freeze were
not reached. All C5 iterations and the full decision-analysis package are preserved as governed
attempts, the live runtime is restored to the committed baseline, and `knowledge/CURRENT_STATE.md`
is updated as the final substantive change. **Neither 2,959/3,720 (overall) nor 3,415/3,720
(decision layer) is closure or a PASS.**

## Repository context

- All backend Git commands used `git -C C:\Projects\tina-backend`. No bare `git commit`.
- `C:\Projects\tina-dev-factory` HEAD `91670029…` verified unchanged before and after; zero
  cross-repository contamination.

## Agents

- Primary executor: Opus 4.8 (issued all controlling decisions).
- Gemini 2.5 Pro: **unavailable** in this environment — no review fabricated
  (`COMMIT_5R1C5_AGENT_AVAILABILITY.json`).
- Substitute challenger: Sonnet 5, non-controlling, advisory only
  (`COMMIT_5R1C5_SUBSTITUTE_ARCHITECTURE_CHALLENGE.md`).
- Codex 5.5: reserved for final R20 Independent Review 1; not used.

## Scope proof

| Assertion | Result |
|---|---|
| R3 oracle changed / edited | NO — SHA `ddf5a603…` unchanged |
| V1 / R1 / R2 oracle changed | NO (`0227a5b4` / `ba016393` / `1347a918`) |
| Runtime files changed on disk | NO — analyzer restored to `a23364bc`; boundary `97986ed7`, patterns `d98e6399` |
| Decision layer locked | NO — best 3,415/3,720, 305 mismatches remain |
| Relation / reason layer started | NO |
| Standalone closure reached | NO |
| Runtime integrated / frozen | NO |
| 2,959 or 3,415 accepted as closure / PASS / lock | NO |
| dev-03 accepted as next base | NO — rejected (net decision regression + false-allows) |
| Decision-level closed controls preserved (accepted base) | YES — tax_compliance_task 108/108, acronym_homograph_control 200/200 |
| Exact-query / oracle-ID / source-set / scenario-number exceptions | NONE |
| Tests changed | NO |
| COMMIT 1–5R1-C4 evidence changed | NO (except cumulative `CANONICAL_*`) |
| R13–R19 historical change | NO |
| Model / provider / prompt / network / embeddings in classifier | NO (`gpt-4o-mini` unchanged) |
| Retrieval / LOA / corpus / DB / frontend / Dev Factory change | NO |
| Ingestion / reindexing / deployment | NO |
| Secret / taxpayer data | NO |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| `knowledge/CURRENT_STATE.md` (sole knowledge change) | UPDATED (final substantive change; no placeholders; does not claim 10A closure; does not call any candidate a PASS) |
| Only allowlisted paths changed | YES |

## Development record (preserved)

- **dev-01 — reconstructed accepted 2,955 base** (`…commit5r1c5-dev-01…`): exact reconstruction
  **2,955 / 3,720** (snapshot analyzer SHA `6a7d20af…`). Runtime snapshot preserved.
- **dev-02 — ACCEPTED best decision base** (`…commit5r1c5-dev-02…`): typed target-completeness
  model — a CONTENTLESS bare tax-attribute is suppressed at the DECISION lane (rule 0b) while
  compliance relations are left intact. **Overall 2,959 / 3,720, decision 3,415 / 3,720.**
  Decision-level closed controls preserved (tax_compliance_task 108/108, acronym_homograph_control
  200/200); false-refusals held at 143. Snapshot + patch preserved. Accepted base for C6.
- **dev-03 — REJECTED candidate** (`…commit5r1c5-dev-03…`): bare-tax-topic ALLOW before the
  CLARIFY fallback. Net decision regression **3,415 → 3,409** (over-allowed 8 non-tax rows that
  merely contain a clear-tax term). Rejected as next base; preserved as diagnostic — C6 needs a
  tighter structural anchor.

## Decision analysis (preserved, controlling)

- 3×3 confusion matrix reconciled: diagonal 3,411, off-diagonal 309, 0 duplicates.
- 309 decision mismatches partitioned into 10 non-overlapping structural clusters, 0 duplicates,
  0 possible-oracle-conflicts.
- dev-02 vs dev-03 differential: established the key lane-decoupling insight (the C4 dev-03
  tax_compliance damage was reason/relation-only, not a decision regression).
- 200-query / 100-pair / 10-family counterfactual controls, authored from frozen structural
  rules (no model, no exact R3 query); 169/200 pass on the accepted base.
- Target-completeness contract + decision-evidence-lattice spec.

## Registry

Prior 46 attempts preserved byte-for-byte; 5 genuinely governed C5 attempts appended → 51 total
(domain_campaign 14→17, focused_suite 1→2, other 7→8; the substitute challenge is the single
non-controlling attempt). `closureComplete = true`, `orphanResults = 0`, `danglingAttempts = 0`,
`cumulativeThrough = commit5r1c5-incomplete`, `runtimeClosure = false`. No local or unregistered
executions to disclose.

## Authorized changed / added paths (all within the COMMIT 5R1-C5 allowlist)

- `evaluation/runner/phase-10a14-r20/commit5r1c5-*.mjs`, `_c5*.mjs` — reconstruction, confusion,
  partition, differential, counterfactual, decision-lane, driver and aux-attempt tooling
  (no runtime edit on disk after restore).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1-C5 evidence + 5 attempt directories
  (with preserved runtime snapshots and patches).
- `knowledge/CURRENT_STATE.md` — updated to COMMIT 5R1-C5 INCOMPLETE (next = COMMIT 5R1-C6).
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only.

No runtime (`services/**`), test, or oracle file was modified. No runtime freeze. R3 unchanged.
R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.
