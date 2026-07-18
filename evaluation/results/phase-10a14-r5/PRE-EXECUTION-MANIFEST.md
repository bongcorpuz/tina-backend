# PHASE-10A14-R5 — Pre-Execution Manifest

## WS1 Preflight (verified)
- Repo: `C:\Projects\tina-backend`
- Branch: `feature/source-availability-engine-v1`
- Starting HEAD: `188860434cdc221110cb06765739e3f603f52358` ✅ matches expected
- Sync: `0 0` ✅ · tracked worktree clean ✅
- Protected untracked paths preserved (untouched): `.vscode/`, `evaluation/factcheck/`, `.claude/`
- R4 runtime ancestry present: `5d3e246` (bridge), `4768da9` (intent+routing), `95eb65e` (slot reservation) — all ancestors of HEAD.

## Runtime identity at start
- vector-store.js sha256[0:16] `cfe5938636504473`
- pipeline.js sha256[0:16] `ba4dfd2a7e999cde`
- services/answer-support-validator.js sha256[0:16] `cd2df50bfb05f0cd`
- Model: `gpt-4o-mini` (unchanged) · Corpus: `tina_vector_store` · Vector rows: **5346** (no ingestion)
- No-reindex / no-DB-write / no-vector-mutation restriction: **in force**.

## Permitted files (runtime + source + test)
- `vector-store.js` (bridge amendment-chain metadata)
- `pipeline.js` (routing unchanged unless defect reproduced)
- `services/answer-support-validator.js` (temporal sufficiency + imperative-filing proposition)
- `section51-authority-chain.js` (NEW — governed amendment-chain resolver / derived object)
- `tests/phase-10a14-r5-*.test.mjs` (NEW focused suite)
- `evaluation/results/phase-10a14-r5/**` (evidence)
- `knowledge/CURRENT_STATE.md` (append)

## Prohibited (per owner authorization)
Broad reindex, vector rebuild, re-embedding, DB write, vector metadata mutation, schema migration, source fabrication, eval-only card injection, validator weakening, question-ID/answer allowlists, model/prompt/question-bank change, another full 50×3, frontend/Dev-Factory change, production deployment.

## Probe matrix (predeclared)
- Official-source verification: RA 8424, RA 10963, RA 11976 (EOPT), RA 12214 (CMEPA) + implementing RRs.
- Current-law controls: individual filing obligation, annual deadline (Apr 15), substituted filing.
- Historical/temporal controls: pre-/post-RA 11976, pre-/post-RA 12214, transaction-specific CGT return timing, missing-period clarify.
- Imperative-filing controls: "File the annual income-tax return", "Submit the ITR", "Accomplish and file BIR Form 1701" (+ non-return overfire: file a protest, lodge a refund claim, submit invoices, register a business, return of capital).
- Replay matrices: R3 failed-positive (6), all-26 A14, prior-safeguard (R1/R2/R3/R4 + Q5/Q8/Q25/Q36/Q38/Q46/Q12/Q30/Q34/Q3/Q47/Q32).

## Retry policy
Live probes: up to 2 retries on transport/5xx only; classification/trust results are recorded as observed (no retry to "fix" a downgrade).

## Expected regression baseline
Deterministic 194/0 → 195/0 with one new R5 focused suite; staging 7/0; both lanes ×2, exit 0.
