# COMMIT 4R1 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `93783a818f06f0009da75d123735bc025f72ef7e`
Parent: `2c4354ce0954a1659a15cb3b99cbfe2d6620bce8`

## Decision for this unit: COMMIT 4R1 COMPLETE

Re-froze the inherited-row reason families as a new versioned oracle (R1) that supersedes V1
only as the canonical development oracle for the COMMIT 5 restart. V1 remains immutable.

## Scope proof

| Assertion | Result |
|---|---|
| V1 oracle changed | NO — SHA `0227a5b4…` unchanged |
| Original COMMIT 4 oracle package changed | NO (only new `revisions/reason-family-r1/` subdir added) |
| Runtime changed (analyzer/domain-boundary/patterns) | NO — analyzer `a23364bc…`, services working tree clean |
| Tests changed | NO |
| COMMIT 1–5 evidence changed | NO (except cumulative `CANONICAL_*`) |
| COMMIT 2/3/4/5 manifests changed | NO |
| R13–R19 historical change | NO |
| Analyzer/classifier imported by any R1 builder/validator | NO |
| Analyzer executed | NO |
| Actual runtime output used to author expectations | NO |
| Model / network / embeddings in builders | NO |
| Secret / taxpayer data | NO (synthetic/historical committed rows only) |
| Protected path staged | NO |
| Node listener | none · Port 5173 | free |
| Capture residue | none |
| Only allowlisted paths changed | YES |

## R1 correctness proof (V1 → R1)

- Row count 3,720; **row order and oracleIds identical**.
- **New rows changed: 0** (all 1,823 byte-identical).
- **Inherited prohibited-field diffs: 0** — expectedDecision diffs 0, expectedRelations diffs 0, query/provenance/metadata diffs 0.
- **Only `expectedReasonCodeFamily` (+ new `reasonAdjudication` object) changed** on inherited rows.
- Inherited reason families re-adjudicated: **984 changed, 913 unchanged** (all 1,897 reviewed).
- Decision/reason incompatibilities: **0**. All 11 closed reason families now used (V1 used only 4 coarse families).

## Independent oracle-map review

- Independent reviewer: **Sonnet 5** (Opus 4.8 was primary executor). Reviewer received query + frozen decision + proposed reason + RF rule only — **no analyzer output, no baseline pass/fail**.
- Stratified sample of 201 rows across all 10 active RF rules: **199 AGREE / 2 CHALLENGE**.
- Both challenges accepted and resolved by broadening RF-06/RF-07 detectors across the full 1,897-row set (5 rows corrected: RCIT/FLD label; RR/SLSP/CMTA expansion). **Unresolved challenges: 0.**

## Authorized changed / added paths (all within the COMMIT 4R1 allowlist)

- `evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/**` — the R1 oracle package (new).
- `evaluation/runner/phase-10a14-r20/**` — R1 adjudicator/driver/finalize/manifest tooling (no analyzer import).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 4R1 evidence + 5 attempt directories.
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only; 14 prior records preserved byte-for-byte; `cumulativeThrough = commit4r1`.

**No oracle execution against the analyzer.** R1 canonical SHA-256: `ba0163932fc64d59070d8bba93a23645d03598abb07d612cea25607684503f1f`.
