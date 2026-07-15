# PHASE-10A8 Trust-Calibration & Answer-Correctness Remediation 1 Report

Decision: **PHASE 10A8 TRUST-CALIBRATION REMEDIATION PASS WITH RECOMMENDATIONS**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-15**.
Backend start HEAD `eaa7f66`, final HEAD `104bcee`, sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched).

## 1. PHASE-10A7 Findings Addressed

PHASE-10A7 confirmed a systemic defect: `VERIFIED_CONTROLLING` was awarded from retrieval/source presence even when the answer was empty, wrong, incomplete, or unsupported — 9 reproducible false-high-confidence cases (Q2, Q8, Q9, Q27, Q29, Q31, Q37, Q41, Q49) — plus 2 valid questions falsely refused (Q23, Q43).

## 2. Root-Cause Matrix

All nine shared one root cause: `deriveAuthoritySupport` (trust-contract.js) returned `VERIFIED_CONTROLLING` for `AUTHORITY_FOUND` + displayed sources with no answer-level gate. Two sub-classes:

| Case | Sub-class | Runtime signal that produced verified | Missing guard |
| --- | --- | --- | --- |
| Q37 | Empty (headers-only, 59 chars) | AUTHORITY_FOUND + 1 source | substantive/completeness |
| Q31, Q41 | Near-empty / vague (empty primary section) | AUTHORITY_FOUND + sources | empty-primary-section |
| Q2 | Obsolete threshold | AUTHORITY_FOUND + sources | proposition support |
| Q8 | Reversed VAT treatment | AUTHORITY_FOUND + 5 sources | proposition support |
| Q9 | Reversed filing rule | AUTHORITY_FOUND + sources | proposition support |
| Q27 | Wrong withholding rate | AUTHORITY_FOUND + source | proposition support |
| Q29 | Invented de-minimis exemption | AUTHORITY_FOUND + source | unsupported-proposition |
| Q49 | Wrong VAT treatment | AUTHORITY_FOUND + sources | proposition support |

Q23/Q43: the domain-boundary classifier REJECTed valid tax questions containing no standalone "tax" token ("capital gain on personal property"; "Oplan Kandado").

## 3. Architecture Changes

- **`services/answer-support-validator.js` (new).** Retrieval confidence is now separated from answer confidence. Two stages: (1) a deterministic structural gate — empty / headers-only / **empty-primary-section** / bare-source-listing / refusal / non-substantive; (2) a **controlled** post-generation LLM evaluator (constrained JSON rubric, temperature 0). It judges the given answer; it never re-answers (governance: no unrestricted second free-form answer as sole validator). Any error/unavailability **fails closed**.
- **`services/trust-contract.js`.** `VERIFIED_CONTROLLING` now requires `result.answerSupport.verifiedEligible === true` when an attestation is present. Absent attestation (internal deterministic callers/fixtures only) preserves the legacy retrieval-level contract so unit tests stay meaningful; the live path always sets `answerSupport` and fails closed.
- **`ask-handler.js`.** Runs the validator only for verified-CANDIDATE responses and exposes `payload.answerSupport`.
- **`services/philippine-tax-boundary-patterns.js`.** Added allow-patterns for core tax concepts that appear without the word "tax".

## 4. Retrieval-vs-Answer Confidence Separation

Retrieval success (AUTHORITY_FOUND) and source display are now **necessary but not sufficient**. Answer confidence is a distinct, structurally-gated attestation (`answerSupport`) that the trust contract requires before verified.

## 5. Proposition-Support Gate

The LLM evaluator returns `propositionSupported`, `contradictsSources`, `hasUnsupportedProposition`; verified requires all positive. **Model limitation (material):** the only validator model available on the API key is `gpt-4o-mini`. Tuned to catch reversals/inventions/obsolete-thresholds reliably (9/9 on the captured wrong answers), it also **over-flags some correct recency-sensitive rate answers** (hallucinating rate errors). This is a precision cost, not a safety failure — see §13 and Recommendations.

## 6. Answer-Completeness Gate

Structural `empty-primary-section` detection (a primary heading immediately followed by another heading) plus the evaluator's `materiallyComplete`. Catches Q31/Q37 deterministically (zero false-downgrade).

## 7. Citation-Support Gate

The evaluator flags a cited authority that plainly does not support the stated proposition; when support cannot be established the response fails closed to `RELATED_AUTHORITY_ONLY` (safe under-claim), it is not suppressed.

## 8. False-Completeness Guard

Empty / headers-only / near-empty answers cannot be verified (deterministic).

## 9. False-Refusal Remediation

Added tax-specific allow-patterns (`capital gains`, `holding period`, `Oplan Kandado`, `capital/ordinary asset`, `closure of business`, etc.). Q23/Q43 now `ALLOW` → `PHILIPPINE_TAX` and enter the pipeline (no longer `DOMAIN_BOUNDARY`). Genuine outcome-prediction restriction was **not** weakened.

## 10. Targeted Tests

`tests/phase-10a8-...test.mjs`: **24 passed / 0 failed / 37 assertions** — F1–F9 (nine cases fail closed), F10 empty, F11 wrong-with-source, F12 unsupported, F13 bare list, F14 false-refusal fixed, F15 restricted preserved, F16 legitimate verified available, F17 omission, F18 conflict, F19 missing authority, F20 citation-not-supporting, plus validator unit behavior (structural short-circuit, unavailable/malformed → fail closed) and the legacy seam. The LLM stage is exercised with an injected mock client so tests are deterministic and not overfit to live model behavior.

## 11. Regression Suites

phase-10a 18/18, phase-10a1 18/18, phase-10a1-r1 20/20, phase-10a2 21/21, phase-10a3-r1 5/5, phase-10a4b-pre1 11/11, phase-10a4c 15/15, phase-10a6-r1 9/9, phase-10a6-r3 11/11 — **all green post-commit**.

## 12. Staging Lineage

Runtime committed `104bcee` and pushed; live validation ran against a server on that exact HEAD (not stale).

## 13. Live Validation (30 runs, real Supabase retrieval + real OpenAI, authenticated)

- **Nine prior false-high-confidence cases: 0/9 VERIFIED_CONTROLLING** — all → `RELATED_AUTHORITY_ONLY` (Q31/Q37 via the structural gate, the rest via the LLM proposition gate). **Systemic P1 resolved live.**
- **False refusals: 2/2 fixed** — Q23/Q43 now answered (returned `NO_VERIFIED_AUTHORITY` due to thin retrieval, no longer `DOMAIN_BOUNDARY`).
- **Legitimate verified controls: 1/3 preserved live** — Q46 stayed `VERIFIED_CONTROLLING`; **Q14 and Q28 (both correct — 20% final tax) were SAFELY downgraded** because gpt-4o-mini hallucinated "20% should be 15%". Verified remains reachable (F16), but availability is reduced on recency-sensitive rate answers. Offline against the 7 captured PASS answers the validator preserved 3/7.
- **Restricted controls: 1/2** — RESTRICT-1 (void-LOA outcome prediction) held `RESTRICTED` + human review; RESTRICT-2 (generic CTA prediction, no LOA trigger) returned an analytical `ALLOWED` response — a pre-existing coverage gap, not introduced here.
- **20-question mini fact-check: 0 false VERIFIED_CONTROLLING.**

## 14. Security

Evidence secret-scan clean; payloads sanitized (UUID/host/JWT redaction). Validator uses no hardcoded secret. **0 security failures.**

## 15. Residual P0–P3

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 0 | Systemic false-verified resolved (0/9, 0/20 live). Full 50-question confirmation deferred to 10A9. |
| P2 | 3 | (a) Validator precision cost — gpt-4o-mini safely downgrades some correct recency-sensitive answers (rate hallucination); (b) outcome-prediction restriction gap for non-LOA CTA/protest prompts (pre-existing); (c) retrieval coverage gap persists. |
| P3 | 1 | Validator latency (~9–18s per verified-candidate). |

## 16. Governance Disposition

The systemic P1 (verified-from-retrieval) is architecturally remediated and live-verified (0/9, 0/20 false-verified), fail-closed, with legitimate verified still reachable and genuine restriction preserved. The one material limitation is validator **precision** under the only available model (gpt-4o-mini), which safely under-claims some correct answers. Under governance ("authority integrity > answer fluency"), a safe under-claim is preferred to a harmful over-claim. **Phase 10A remains REOPENED pending the full fact-check rerun.** Phase 10B/10C: BLOCKED. Independent closure review: DEFERRED.

## 17. Recommendations

1. **Upgrade the answer-support validator model** (or ground it in retrieved source TEXT rather than parametric knowledge) to eliminate the false-downgrade of correct recency-sensitive rate answers. This is the single highest-value follow-up; gpt-4o-mini is not a reliable PH-tax correctness oracle.
2. Extend outcome-prediction restriction to non-LOA CTA/protest prediction prompts.
3. Address the underlying retrieval coverage gap (Q23/Q43 and the ~11 under-answered PHASE-10A7 questions).

## 18. Exact Next Task

**`PHASE-10A9-FULL-FACTCHECK-RERUN-1`** — independent re-run of the full 50×3 fact-check to quantify both the false-verified elimination and the validator precision cost, before any Phase 10A re-closure consideration. Independent review of this remediation (by a model that did not execute it) precedes it.

## Evidence

`evaluation/results/phase-10a8-trust-calibration-and-answer-correctness-remediation-1.json`; `.../phase-10a8-trust-calibration-and-answer-correctness-remediation-1/` (v8-run-log.json, payloads/ ×30, evidence-manifest.json with SHA-256). Code commit `104bcee`.
