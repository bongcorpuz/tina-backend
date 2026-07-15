# PHASE-10A6-R3 Missing-Authority & Conflict Disclosure Remediation 1 Report

Decision: **PHASE 10A6-R3 DISCLOSURE REMEDIATION PASS WITH RECOMMENDATIONS**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-15**.
Backend start HEAD `78fe04a`, final HEAD `2259dec`, sync 0 0. Frontend `0816ac8` (untouched). Dev Factory `9167002` (untouched).

## 1. Incident Summary

PHASE-10A6-R2 confirmed the residual P1: Q9 (a query that states the exact BIR ruling cannot be located and that authorities point in different directions) no longer overclaimed VERIFIED_CONTROLLING after R1, but all three live responses were **bare source listings** — they disclosed neither the missing requested ruling nor the stated conflict, and gave no calibrated analysis. A bare source list is not a practitioner-safe answer.

## 2. Confirmed Root Cause

Source-seeking analytical questions are orchestration-routed to `SOURCE_LOOKUP`, whose `answer-renderer.js` SOURCE-mode branch ([answer-renderer.js:1533](answer-renderer.js#L1533)) discards the model's analytical answer and emits the canned `"Indexed sources found:"` listing. R1's trust gate stopped this from being classified VERIFIED_CONTROLLING, but nothing enriched the **answer body**. This is an answer-generation/response-assembly defect, not a UI defect.

## 3. Files Changed

- `services/source-fallback-disclosure.js` (new) — pure, deterministic composer of a structured explanatory body + query-intent detectors + payload disclosure metadata. No I/O, no model call, no fabricated facts.
- `services/trust-contract.js` — added an **enrichment-proof** structured `sourceOnlyFallback` gate in `deriveAuthoritySupport` (reads an input boolean, not prose, so the enriched body cannot regress to VERIFIED_CONTROLLING), and extended `specificAuthorityNotFound` to the fallback path.
- `ask-handler.js` — when the rendered answer is a bare source listing and sources exist, replaces it with the structured body, threads `result.sourceOnlyFallback` for the trust contract, and attaches `payload.sourceFallbackDisclosure`.
- `tests/phase-10a6-r3-...test.mjs` (new) — 11 tests / 54 assertions.

No frontend change. **The canonical trust-contract top-level shape was deliberately not expanded** (it is exact-equality-guarded across phases); the informational structured fields live on the payload (`sourceFallbackDisclosure`), not inside the frozen trust object.

## 4. Structured Explanatory Fallback Design

When triggered, the body contains: (1) result summary; (2) missing-authority disclosure when a specific authority was requested but not matched — worded to **explicitly not** claim the issuance does not exist; (3) conflict/uncertainty disclosure when the question frames competing authorities; (4) an authority-hierarchy explanation (statute > controlling jurisprudence > regulations > circulars/rulings; facts/period/issue dependent); (5) the related-authority list; (6) a limitation + professional-review recommendation.

## 5. Missing-Authority Disclosure

`querySeeksSpecificAuthority()` (structural, not overfit) detects a requested named authority; when unmatched, the body states "The specific issuance requested was not located or verified…" and `trust.specificAuthorityNotFound`/`payload.sourceFallbackDisclosure.specificAuthorityNotFound` are set true.

## 6. Conflict Disclosure

`queryFramesAuthorityConflict()` detects competing/uncertain/unlocatable framing (Q9's `NO_CONFLICT` pipeline state is the documented `conflictMetadataIsComplete()` limitation, so query-aware framing is used). When present, the body presents the conflict as unresolved and `sourceFallbackDisclosure.conflictDetected` is set.

## 7. Authority-Hierarchy Handling

The fallback always includes the governing hierarchy so the reader can weigh competing authorities rather than treat any as settled.

## 8. Decision Precedence

Unchanged and preserved: RESTRICTED → SOURCE_FAILURE → CONFLICTING_AUTHORITY (verified) → RELATED_AUTHORITY_ONLY → VERIFIED_CONTROLLING. The `sourceOnlyFallback` gate sits inside the AUTHORITY_FOUND branch and caps at RELATED_AUTHORITY_ONLY; it never fires for genuine analytical answers, so VERIFIED_CONTROLLING remains reachable.

## 9. Test Results

New R3 suite: **11 passed / 0 failed / 54 assertions** (T1 exact Q9, T2 paraphrase, T3 missing RMC, T4 conflict-without-missing, T5 generic bare list, T6 genuine verified control preserved, T7 restricted, T8 source failure, T9 general related-only not falsely flagged, T10 persistence fields, detector unit checks). The integration helper mirrors the real ask-handler enrichment block, executing the real trust contract + disclosure module.

## 10. Regression

phase-10a 18/18, phase-10a1 18/18, phase-10a1-r1 20/20, phase-10a2 21/21, phase-10a3-r1 persistence 5/5, phase-10a4b-pre1 11/11, phase-10a4c A–G 15/15, phase-10a6-r1 9/9 — **all green post-commit**. (The two diff-scope guards fail only while uncommitted, as documented since R1, and clear on commit — verified.)

## 11. Staging Lineage

Runtime fix committed `2259dec` and pushed; live validation ran against a server on that exact HEAD (not stale). Render staging auto-deploys the same commit.

## 12. Live Validation (10 runs, real Supabase vector-store retrieval + real OpenAI, authenticated, gate-enabled to match staging)

| Run | authoritySupport | Substantive | Missing disclosed | Conflict disclosed | Persistence |
| --- | --- | --- | --- | --- | --- |
| **Q9-r1/r2/r3** | **RELATED_AUTHORITY_ONLY (0/3 verified)** | ✅ | ✅ | ✅ (+hierarchy) | consistent |
| **Q2-r1/r2/r3** | RELATED_AUTHORITY_ONLY (0/3 verified) | ✅ | — (see §14) | — | consistent |
| Q5 (verified control) | VERIFIED_CONTROLLING | ✅ | — | — | consistent |
| Q3 (verified control) | VERIFIED_CONTROLLING | ✅ | — | — | consistent |
| Q8 (conflict control) | VERIFIED_CONTROLLING + `POTENTIAL_CONFLICT` limitation | ✅ | — | surfaced | consistent |
| Q10 (restricted control) | RESTRICTED / humanReviewRequired | ✅ | — | — | consistent |

- **Q9 ×3: 0/3 VERIFIED_CONTROLLING; all substantive; all disclose the missing ruling AND present the conflict AND explain the hierarchy.** `sourceFallbackDisclosure.sourceOnlyFallback=true`, `specificAuthorityNotFound=true`, `conflictDetected=true` on every run. **The R2 P1 is resolved via the R3 code path, verified live.**
- **Q2 ×3: 3/3 substantive, 0/3 verified, safely RELATED_AUTHORITY_ONLY.**
- **Legitimate verified controls (Q5, Q3): 2/2 VERIFIED_CONTROLLING** — no blanket downgrade.
- **Restricted control (Q10): RESTRICTED + human review.**
- **Persistence: 0/10 failures** (hard-refresh and history-reopen message counts consistent).

## 13. Security

Evidence secret-scan clean: no JWTs, cookies, Authorization headers, tokens, private keys, Supabase host, conversation UUIDs, or taxpayer/client data. The harness sanitizes payloads (UUID/host/JWT redaction) and stores only a SHA-256-derived conversation reference. A dummy `GOOGLE_SERVICE_ACCOUNT_JSON` (no real key) was used solely to boot the ingestion-only Drive module; it is not in any evidence. **0 security failures.**

## 14. P0–P3 Findings

| Severity | Count | Items |
| --- | ---: | --- |
| P0 | 0 | None |
| P1 | 0 | **The R2 Q9 missing-ruling/conflict-disclosure P1 is RESOLVED (0/3 live).** No new P1. |
| P2 | 2 | (a) Q2 structured `specificAuthorityNotFound` stays false when the pipeline yields a non-bare substantive answer (safe related-only, no overclaim; carryover). (b) Competing-treatment analytical answers (Q8/Q4-class) classified VERIFIED_CONTROLLING while only `POTENTIAL_CONFLICT` surfaces — documented `conflictMetadataIsComplete()` limitation, not introduced by R3. |
| P3 | 0 | — |

## 15. Governance Disposition

The confirmed R2 P1 is remediated and live-verified 3/3 with substantive missing-authority + conflict + hierarchy disclosure, while legitimate verified, conflict, and restricted controls are preserved and persistence holds. Under LIVE EVIDENCE > THEORY > PATCH the fix is validated by live evidence. **Phase 10A remains REOPENED pending the full revalidation gate** (not closed here). Phase 10B: BLOCKED. Phase 10C: BLOCKED. Independent closure review: DEFERRED.

## 16. Whether Phase 10A7 May Proceed

Not yet. The next authorized task is the full live revalidation, **`PHASE-10A6-R4-FULL-LIVE-REVALIDATION-1`** (full 10-question matrix, independent of the R3 executor). Phase 10A7 (factcheck capability evaluation) remains gated behind R4.

## 17. Exact Next Task

**`PHASE-10A6-R4-FULL-LIVE-REVALIDATION-1`** — mandatory independent review of this remediation (by a model that did not execute R3) plus a full live re-validation of the complete matrix before any Phase 10A re-closure consideration.

## Evidence

`evaluation/results/phase-10a6-r3-missing-authority-conflict-disclosure-remediation-1.json`; `.../phase-10a6-r3-missing-authority-conflict-disclosure-remediation-1/` (execution-manifest.json, run-log.json, evidence-manifest.json with SHA-256, payloads/ ×10, html/ ×10). Code commit `2259dec`.
