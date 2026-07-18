# PHASE-10A14-R5 — Section 51 Current-Law Chain, Imperative Filing & Complete Evidence Remediation

Executor: Claude Code — Opus 4.8. Self-assessed decision: **REVISIONS REQUIRED** (the formal decision belongs to the mandatory independent reviewer). No unqualified PASS is claimed.

## WS1 Preflight
Branch `feature/source-availability-engine-v1`; starting HEAD `188860434` (matches); sync `0 0`; tracked tree clean; R4 ancestry (`5d3e246`,`4768da9`,`95eb65e`) intact; protected paths untouched; no reindex / DB write / vector mutation.

## WS2 Official amendment chain (verified — lawphil / Official Gazette / BIR)
- **RA 11976 (EOPT)**, eff. 2024-01-22: amends Section 51 **manner/venue only** (file/pay anywhere incl. authorized tax software provider; 4-page ITR; explicit OCW/OFW filing exemption). Ordinary filing obligation, April-15 annual deadline (51(C)(1)), and Section 51-A substituted filing **unchanged**.
- **RA 12214 (CMEPA)**, approved 2025-05-29: amends **Section 51(C)(2)** capital-gains / transaction-specific returns only. Ordinary obligation / annual deadline / 51-A **unchanged**.
- The governed corpus NIRC is already **consolidated through RA 12214**; the R4 defect P1-R4-001 is that the card is labeled "RA 10963" without recording the chain review.

Full matrix + sources: `evaluation/results/phase-10a14-r5/official-amendment-chain.md`.

## Remediation
| WS | Change | Status |
|---|---|---|
| 3 | `section51-authority-chain.js` — governed resolver + derived object (CURRENT / BASE_UNCHANGED_CHAIN_REVIEWED / LATER_AMENDMENT_REQUIRED / HISTORICAL / period-missing) | ✅ |
| 4-5 | Sec 51 bridge rows carry amendment-chain metadata; public sanitizer passes a sanitized chain summary | ⚠️ partial — see gap |
| 6 | Narrow temporal-sufficiency gate: current CGT/transaction 51(C)(2) timing fails closed (`section_51_later_amendment_missing`) without RA 12214; the 3 main propositions are officially unchanged and unaffected | ✅ |
| 7 | Directive-mood imperative tax-return filing detection (P2-R4-003) with overfire guard | ✅ |
| 8 | Focused suite `tests/phase-10a14-r5-...` **25/0** | ✅ |

Non-regression: R3 35/0, R4 20/0, R6 18/0; clean-tree deterministic **195/0** (functional). A regression-caught defect (imperative detector overfiring on penalty "late filing" descriptive text) was fixed in COMMIT 2b before it could ship.

## Live evidence (governed matrix, R5 runtime — `evaluation/results/phase-10a14-r5/live-matrix.txt`)
- Individual filing **obligation** → `VERIFIED_CONTROLLING` (Sec 51), 2 formulations
- Individual filing **deadline** → `VERIFIED_CONTROLLING` (Sec 51), 2 formulations
- **Substituted filing** → `RELATED_AUTHORITY_ONLY` this run (Sec 51 + 51-A surfaced in one formulation; VERIFIED in R4)
- Temporal CGT-current → `NO_VERIFIED_AUTHORITY` (correctly not verified)
- Overfire (corporate / estate / protest) → **no Sec 51 leakage**

## Findings / gaps (honest)
- **P1-R4-001 — PARTIALLY REMEDIATED.** The functional core (official verification + resolver + temporal-sufficiency gate + amendment metadata on bridge rows/derived object) is in place and tested. **Gap:** the amendment-chain *reviewed flag does not yet reach the outgoing public source card* — the pipeline `finalSourceCards` projection between the bridge rows and the public sanitizer drops the top-level amendment fields (`chainReviewed=false` observed live). One pipeline-projection hop remains.
- **P1-R4-002 — PARTIAL.** A governed 12-probe live matrix + R3 failed-positive formulations + focused suite are captured, but the **exhaustive all-26 A14 replay and full R1/R2/R3/R4 prior-safeguard live matrix were not run as one reconciled package**, and substituted filing did not reach VERIFIED in this matrix run (LLM variance).
- **P2-R4-003 — REMEDIATED.** Bare imperative tax-return instructions are decisive filing_obligation propositions requiring compatible authority; non-return imperatives and penalty-descriptive text do not overfire.

## Security & scope
No secrets/env/DB/schema/vector-mutation/reindex/model/prompt/frontend/Dev-Factory/production changes. Protected paths (`.claude/`,`.vscode/`,`evaluation/factcheck/`) untouched. Runtime changes confined to `vector-store.js`, `services/answer-support-validator.js`, `services/ask-handler-public-source-sanitizer.js`, and new `section51-authority-chain.js` + focused test.

## Remaining for an unqualified R5 PASS
1. Thread the amendment-chain flag through the pipeline `finalSourceCards` projection so `chainReviewed` reaches the public card (P1-R4-001 visible representation).
2. One genuine main-matrix VERIFIED_CONTROLLING for substituted filing on the R5 runtime.
3. Exhaustive all-26 A14 replay (block exactly 9, preserve 17) + full prior-safeguard live matrix in one reconciled package (P1-R4-002).
4. Staging-smoke lane ×2 gate logs.

Independent review (Codex GPT-5) is the separately authorized next task and renders the formal decision.
