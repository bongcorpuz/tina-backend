# COMMIT 5R1-C6 SECURITY AND SCOPE — PHASE-10A14-R20

Starting HEAD: `23df8e8aa098bd4518fbbccbebfd50c3ee14b7da`
Parent: `08990106993262cc5fdb4ad8b77b17aa3cf479dd`

## Decision: COMMIT 5R1-C6 INCOMPLETE — DECISION LAYER REMEDIATION NOT CLOSED

Owner-adjudicated PRESERVE INCOMPLETE, STOP. The bounded objective was the Decision Layer Lock
(exactly 0 decision mismatches). One accepted decision-lane material iteration (two coherent
steps) improved decisions from 3,415 to **3,464 / 3,720** (256 remaining) while preserving all
decision controls; the lock was not achieved, so relation and reason lanes were not started and
no integration or freeze occurred. All C6 attempts and the full decision-analysis package are
preserved as governed attempts, the live runtime is restored to the committed baseline, and
`knowledge/CURRENT_STATE.md` is updated as the final substantive change. **3,464 / 3,720 is not
a Decision Layer Lock and not a PASS.**

## Repository context

- All backend Git commands used `git -C C:\Projects\tina-backend`. No bare `git commit`.
- `C:\Projects\tina-dev-factory` HEAD `91670029…` verified unchanged before and after; zero
  cross-repository contamination.

## Atomic-write safety

- In-repo atomic source-write protocol (`commit5r1c6-atomic.mjs`): replacement written to an
  in-repo `.c6tmp.mjs` sibling, verified non-zero + parses + exports + SHA-256, atomically
  renamed, re-verified; the global scratchpad Temp dir was never the authoritative write path.
- `guardRuntimeFiles()` ran before/after every evidence-bearing execution: all three runtime
  files size > 0, hashes matched the allocated identity. **No zero-byte or truncation incident.**
- One transient `.c6tmp` file (from a first run before the temp extension was corrected to
  `.mjs`) was removed immediately; it never reached the runtime.

## Agents

- Primary executor: Opus 4.8 (issued all controlling decisions).
- Gemini 2.5 Pro: **unavailable** — no review fabricated (`COMMIT_5R1C6_AGENT_AVAILABILITY.json`).
- Substitute challenger: Sonnet 5, non-controlling (`COMMIT_5R1C6_SUBSTITUTE_ARCHITECTURE_CHALLENGE.md`).
- Codex 5.5: reserved for final R20 Independent Review 1; not used.

## Scope proof

| Assertion | Result |
|---|---|
| R3 oracle changed / edited | NO — SHA `ddf5a603…` unchanged |
| V1 / R1 / R2 oracle changed | NO (`0227a5b4` / `ba016393` / `1347a918`) |
| Runtime files changed on disk (final) | NO — analyzer restored to `a23364bc`; boundary `97986ed7`, patterns `d98e6399` |
| Decision layer locked | NO — best 3,464/3,720, 256 mismatches remain |
| Relation / reason layer started | NO |
| Standalone closure reached | NO |
| Runtime integrated / frozen | NO |
| 3,464 accepted as lock / PASS | NO |
| Decision controls preserved (accepted candidate) | YES — tax_compliance 108/108, homograph 200/200, ambiguous_clarification 150/150, internal_label 104/104 |
| Combined counterfactual on accepted candidate | 369/400 (improved from base 322/400; 400/400 target belongs to the unreached lock candidate) |
| Exact-query / oracle-ID / source-set / scenario-number exceptions | NONE |
| Tests changed | NO |
| COMMIT 1–5R1-C5 evidence changed | NO (except cumulative `CANONICAL_*`) |
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

- **dev-01 — reconstructed accepted 2,959 base** (`…commit5r1c6-dev-01…`): exact reconstruction
  overall **2,959 / 3,720**, decision **3,415 / 3,720**, 305 mismatches (snapshot SHA `86e0b222`).
- **dev-02 — ACCEPTED decision candidate** (`…commit5r1c6-dev-02…`): two coherent decision-lane
  steps — (1) priority-1 clusters: quotation-scope guard, non-tax-domain-noun expansion,
  extended label-binding with a bare-acronym-label carve-out; (2) Context-N contentless referent.
  Overall **3,009 / 3,720**, decision **3,464 / 3,720**. All decision controls preserved;
  false-refusals held 143; relation/reason improved as side effects (250→209, 760→710).
  Snapshot + patch preserved (SHA `7801adda`). Accepted base for C7.

## Decision analysis (preserved)

- C6 confusion matrix reconciled: diagonal 3,415, off-diagonal 305, 0 duplicates.
- 305 decision mismatches partitioned into 11 non-overlapping clusters, 0 duplicates,
  0 possible-oracle-conflicts.
- Existing C5 counterfactual suite rerun (baseline 169/200); C6 extension authored
  (200 new queries / 100 new pairs / 10 families); combined v2 = 400 queries / 200 pairs.

## Registry

Prior 51 attempts preserved byte-for-byte; 4 genuinely governed C6 attempts appended → 55 total
(domain_campaign 17→19, focused_suite 2→3, other 8→9; challenge is the second non-controlling
attempt). `closureComplete = true`, `orphanResults = 0`, `danglingAttempts = 0`,
`cumulativeThrough = commit5r1c6-incomplete`, `runtimeClosure = false`, `decisionLayerClosure = false`.

## Authorized changed / added paths (all within the COMMIT 5R1-C6 allowlist)

- `evaluation/runner/phase-10a14-r20/commit5r1c6-*.mjs` — atomic-write, reconstruction, analysis,
  counterfactual-extension, driver tooling (no runtime edit on disk after restore).
- `evaluation/results/phase-10a14-r20/**` — COMMIT 5R1-C6 evidence + 4 attempt directories.
- `knowledge/CURRENT_STATE.md` — updated to COMMIT 5R1-C6 INCOMPLETE (next = COMMIT 5R1-C7).
- `CANONICAL_ATTEMPT_REGISTRY.json` / `CANONICAL_COUNT_SUMMARY.json` — cumulative, appended only.

No runtime (`services/**`), test, or oracle file was modified in the final tree. No runtime
freeze. R3 unchanged. R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.
