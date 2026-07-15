# PHASE-10A6-R1 Source-Presence Overclaim Remediation 1 Report

Decision: **PHASE 10A6-R1 OVERCLAIM REMEDIATION PASS WITH RECOMMENDATIONS**

Model/speed: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-15**.

## 1. Incident Summary

PHASE-10A6 live validation confirmed a reproducible P1: Q9 (a query that explicitly states the exact BIR ruling could not be located and that authorities point in different directions) was classified `VERIFIED_CONTROLLING` / `NO_CONFLICT` 3/3, rendering a green "Verified controlling authority" banner over a bare source list.

## 2. Confirmed Root Cause

The `/source`-style **SOURCE-mode deterministic renderer** (`answer-renderer.js:1533-1544`) discards the model's analytical answer and emits a canned `"Indexed sources found:"` listing of retrieved sources. `deriveAuthoritySupport()` in `services/trust-contract.js` then mapped `sourceState===AUTHORITY_FOUND && displayedSourceCount>0` to `VERIFIED_CONTROLLING` regardless of whether the response contained any proposition-level analysis. **Source presence was treated as sufficient for verified controlling authority** — a bare source list became "verified controlling authority."

## 3. Files Changed

- `services/trust-contract.js` — added `answerIsBareSourceListing()` structured detector + a fail-closed gate in `deriveAuthoritySupport()`.
- `tests/phase-10a6-r1-source-presence-overclaim-remediation-1.test.mjs` — new regression suite (9 tests / 18 assertions).

No frontend change. No production behavior change beyond safer trust calibration.

## 4. Decision-Rule Change

In the `AUTHORITY_FOUND` branch, **before** `VERIFIED_CONTROLLING` can be selected: if the answer is a bare source-listing (`answerIsBareSourceListing`), fail closed to `RELATED_AUTHORITY_ONLY`. The existing prose-disclaimer downgrade (Case C) and displayed-count guard remain. Existing precedence (RESTRICTED → source-failure → conflict → related → verified) is unchanged; the new guard sits inside the AUTHORITY_FOUND branch so conflict/restricted/source-failure precedence is untouched.

## 5. Structured-Signal Design

`answerIsBareSourceListing()` keys off the app's **own canned deterministic marker** `"Indexed sources found:"` (matched at line start, tolerating a leading disclosure line). This is a **structured signal, not fragile model prose** — it is app-generated and deterministic, so a genuine analytical answer never contains it (near-zero false-positive; empirically confirmed: the legitimate VERIFIED_CONTROLLING answers Q3/Q4/Q5/Q8 do not match). Source presence alone is explicitly rejected as proposition support.

## 6. Conflict / Missing-Authority Precedence

- Conflict precedence unchanged: a complete conflict object still yields `CONFLICTING_AUTHORITY` (test R6).
- Missing-specific-authority: the prose-disclaimer path still yields `RELATED_AUTHORITY_ONLY` + `specificAuthorityNotFound` (test R3). A **question-aware** requested-authority-match signal (parsing the prompt for "cannot locate the exact ruling") to reach the fuller `SPECIFIC_AUTHORITY_NOT_FOUND` state is a **recommended follow-up** (see §12); it is not required to eliminate the P1, because the bare-listing guard already fails closed.

## 7. Bare-Source-List Guard

Implemented and verified: a response consisting of the canned source listing cannot be `VERIFIED_CONTROLLING`; it caps at `RELATED_AUTHORITY_ONLY`.

## 8. Test Results

New R1 suite: **9 passed, 0 failed, 18 assertions** — exact Q9, Q9 paraphrase, prose-disclaimer, **genuine controlling authority remains VERIFIED_CONTROLLING (R4, no blanket downgrade)**, generic bare listing, conflict precedence (R6), source failure (R9), restricted (R10).

## 9. A–G Regression

PHASE-10A4C 15/15 (all seven canonical states A–G), PHASE-10A1-R1 20/20, PHASE-10A2 21/21, PHASE-10A3-R1 5/5 — **pass**. The single PHASE-10A1 failure is the pre-existing self-referential diff-scope guard (clears on commit, documented since PHASE-10A4B-PRE1). Fixtures remain staging-only and own-property-hardened.

## 10. Staging Lineage

Fix committed `665bd30` and pushed; Render redeployed the branch to staging. Lineage confirmed **by live behavior change**: the identical Q9 bare-listing input, previously `VERIFIED_CONTROLLING`, now returns `RELATED_AUTHORITY_ONLY` on live staging.

## 11. Live Validation

- **Q9 ×3 (required): 0/3 `VERIFIED_CONTROLLING`. All 3 → `RELATED_AUTHORITY_ONLY`.** The identical prompt and bare source list now render an info-level "Related authority only" banner ("sources shown are relevant but may not directly control this issue — related authority is not the same as controlling authority"). Screenshot `Q9-r1-desktop.png`. **P1 resolved and visually confirmed.**
- **Legitimate verified control**: "standard corporate income tax rate for domestic corporations" → `VERIFIED_CONTROLLING` (the fix does **not** blanket-downgrade legitimate analytical answers). Screenshot `VERIFIED-CONTROL-desktop.png`.
- **Restricted control**: "Will I win my BIR case?" → `RESTRICTED` + Human Review Required (outcome-restriction intact). Screenshot `RESTRICTED-CONTROL-desktop.png`.
- **Q2 ×2: INCONCLUSIVE this pass** — the capture fired mid-generation (typing spinner visible in `Q2-r1-desktop.png`), so no completed payload was recorded. Q2 did **not** overclaim (no verified banner). Q2 is not a bare-listing path, so the R1 fix does not change its behavior; Q2's separate missing-authority-disclosure P2 (from PHASE-10A6) remains open and should be re-captured cleanly in R2.

## 12. Residual Risks / Recommendations (all P2, none closure-blocking beyond the reopened-pending-revalidation state)

1. **Q2 missing-specific-authority disclosure / no banner** — carried from PHASE-10A6; not in R1 scope; re-capture in R2.
2. **Question-aware structured signals** — a requested-authority-match signal (from the prompt) and live conflict enrichment would let Q9-type queries reach the fuller `SPECIFIC_AUTHORITY_NOT_FOUND` / `CONFLICTING_AUTHORITY` states rather than the safe-but-generic `RELATED_AUTHORITY_ONLY`. The current fix is correct and safe; this is a refinement.
3. **Clean Q2 re-capture** in the R2 revalidation harness (longer wait / completion gate).

## 13. P0–P3 Findings

| Severity | Count | Items |
| --- | ---: | --- |
| P0 | 0 | None |
| P1 | 0 | The PHASE-10A6 Q9 overclaim is RESOLVED (0/3 live) |
| P2 | 3 | Q2 disclosure; question-aware structured signals; Q2 re-capture |
| P3 | 0 | — |

## 14. Governance Disposition

The confirmed P1 is remediated and live-verified 3/3, with legitimate verified and restricted behavior preserved. Under LIVE EVIDENCE > THEORY > PATCH, the fix is validated by live evidence, not theory. **Phase 10A remains REOPENED pending the formal revalidation gate** (not closed in this task). Phase 10B: BLOCKED. Phase 10C: BLOCKED. Independent closure review: DEFERRED.

## 15. Exact Next Task

**`PHASE-10A6-R2-LIVE-AUTHORITY-CALIBRATION-REVALIDATION-1`** — mandatory independent review of this remediation (by a model that did not execute it), then a full live re-validation (the 10-question matrix, with a clean Q2 capture and Q9 ×3), before any Phase 10A re-closure consideration.

## Evidence

`evaluation/results/phase-10a6-r1-source-presence-overclaim-remediation-1.json`; `.../phase-10a6-r1-source-presence-overclaim-remediation-1/raw-revalidation-output.json` + `screenshots/` (Q9 ×3, Q2 ×2, verified-control, restricted-control). Code: `services/trust-contract.js`, `tests/phase-10a6-r1-...test.mjs` (commit `665bd30`).
