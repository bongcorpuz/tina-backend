# PHASE-10A14-R6 — Section 51 Temporal Card Propagation, Substituted Filing & Complete Governed Evidence Remediation

Executor: Claude Code — Opus 4.8. Self-assessed decision: **REVISIONS REQUIRED** (the formal decision belongs to the mandatory independent reviewer). No unqualified PASS is claimed.

## Preflight
Branch `feature/source-availability-engine-v1`; starting HEAD `5d3e2ad` (matches); sync `0 0`; tracked tree clean; R3/R4/R5 ancestry intact; protected paths untouched; no reindex / DB write / vector mutation.

## Findings status

| Finding | Status | Evidence |
|---|---|---|
| **P1-R5-001** public-card metadata loss | **CLOSED** | Public sanitizer re-derives the governed amendment-chain summary from a Section 51 card's own provision. Live matrix: `chainReviewed=true` on every Section 51 card (obligation, deadline, substituted, historical); non-Section-51 (corporate) card `chainReviewed=false`. Focused tests assert public-card propagation + no internal-identifier leak. |
| **P1-R5-002** substituted not VERIFIED in governed matrix | **CLOSED** | Governed live **VERIFIED_CONTROLLING** for substituted filing with Section 51 **and** Section 51-A displayed (SUBST-1, SUBST-4), on fact-complete formulations. No best-answer retry of RELATED results. |
| **P1-R5-003** Section 51-A origin wrong | **CLOSED** | `originatingLaw = RA 10963` (created 51-A); `baseCode = RA 8424` (lineage only); `officialLaws` include RA 10963. Deterministic tests. |
| **P1-R5-004** historical not resolved | **CLOSED** | Event-aware resolver partitions reviewed laws into applicable / reviewedButNotApplicable / **notYetEffective** by resolved period (`taxableYear`/`filingEventDate`/`transactionDate`/`legalAsOfDate`). TY2023 obligation → `HISTORICAL_COMPLETE_CHAIN`, RA 11976/12214 not applied; live TEMP-hist-2023 VERIFIED on Sec 51 (period-correct). |
| **P1-R5-005** incomplete governed live safeguard package | **PARTIAL** | Focused R6 live matrix (13 probes) captured; deterministic all-26 replay preserved from prior phases. The exhaustive governed live R1/R2/R3/R4/R5 safeguard matrix (100+ model calls) with per-probe answers/cards/persistence/hashes was **not** executed as one reconciled package. |

## Remediation
- `section51-authority-chain.js` — `originatingLaw`/`baseCode` distinction + event-aware resolver (P1-R5-003, P1-R5-004).
- `services/ask-handler-public-source-sanitizer.js` — re-derives sanitized amendment-chain summary for Section 51 cards via the governed resolver, guaranteeing `chainReviewed=true` reaches the public card and persisted response (P1-R5-001); non-Section-51 cards get none; no internal identifiers leak.
- Focused suite `tests/phase-10a14-r6-...` **15/0**. Preserved: R3 35/0, R4 20/0, R5 25/0, R6-penalty 18/0 (incl. imperative-filing regression preservation, P2-R4-003).

## Gates
- Deterministic **196/0 ×2** (clean tree); staging **7/0 ×2** — all exit 0. (See gate logs.)

## Counts
invalidVerified=0, questionableVerified=0, fabricatedAuthority=0, crossTaxLaundering=0, staleCurrentVerification=0, notYetEffectiveApplied=0, materialFalseRefusal=0.

## Honest gap (why REVISIONS REQUIRED)
**P1-R5-005** — the complete governed live R1–R5 safeguard matrix (WS10, 100+ model calls) and a freshly-executed governed all-26 live replay (WS11) were not produced as one reconciled package in this task. Four of five P1 findings are closed with live + deterministic evidence; this exhaustive live-replay package is the remaining release-blocking item and is the primary reason no unqualified PASS is claimed.

## Security & scope
No secrets/env/DB/schema/vector-mutation/reindex/model/prompt/frontend/Dev-Factory/production changes. Protected paths untouched. Runtime changes confined to `section51-authority-chain.js` and `services/ask-handler-public-source-sanitizer.js` (+ new focused test).

## Remaining for an unqualified R6 PASS
1. Execute the complete governed live R1/R2/R3/R4/R5 safeguard matrix (100+ calls) with full per-probe payloads, and a freshly-executed governed all-26 live replay (block exactly 9, preserve 17), reconciled into one evidence package (P1-R5-005).

Independent review (Codex GPT-5) is the separately authorized next task and renders the formal decision.
