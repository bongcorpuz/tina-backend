# PHASE-10A14-R11 — WS10 Governance Supersession Assessment

## Self-assessed classification: **SUPERSEDED BY COMPLETE R11 PROSPECTIVE EVIDENCE**
(The independent R11 reviewer makes the binding determination.)

## Basis (all conditions met)
- **Pre-fix evidence committed BEFORE remediation** — pre-fix campaign committed at `16205d2`
  (COMMIT 2); the R11 runtime change landed at `90d70fe` (COMMIT 3). `16205d2` is a strict ancestor of `90d70fe`.
- **All raw failures preserved** — 18 unsafe detector misses + 1 safe false-positive captured as immutable
  per-probe payloads under `prefix/payloads/` with a `PRE_FIX_EVIDENCE_MANIFEST.sha256`.
- **Remediation chronology linear** — COMMIT 1 (manifest/gap) → COMMIT 2 (pre-fix) → COMMIT 3 (runtime/tests)
  → COMMIT 4 (post-fix) → COMMIT 5 (adjudication) → COMMIT 6 (gates). No overwrite of pre-fix payloads.
- **Entire frozen campaign rerun** — all 38 probes re-executed post-fix (not only the failures); pre/post
  reconcile 1:1.
- **Counts and hashes reconcile** — pre 18 misses + 1 FP → post 0 + 0; 38/38 mapping complete.

## What is NOT claimed
- The original first-run R10-DUETOMORROW intermediate payload is **still not present** and was **not recovered,
  reconstructed, backdated or simulated**. The R10 independent-review finding (P1-R10-IR-001) **remains
  historically accurate** and is **not** marked "historically disproven."
- R11 provides a **new, prospective, fully-auditable** discover→fix→rerun sequence for the same defect class.
  Whether this supersedes the R10 governance deficit for Phase 10A release-gate purposes is the independent
  R11 reviewer's decision.
