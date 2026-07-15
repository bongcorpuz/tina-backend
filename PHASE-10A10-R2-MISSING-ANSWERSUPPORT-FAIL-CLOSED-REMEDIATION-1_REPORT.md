# PHASE-10A10-R2 Missing-answerSupport Fail-Closed Remediation 1 Report

Decision: **PHASE 10A10-R2 MISSING-ANSWERSUPPORT REMEDIATION PASS WITH RECOMMENDATIONS**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-16**.
Backend start HEAD `34c2886`, runtime/final HEAD `3de68f8`, sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched).

## 1. Executive Conclusion

The independently-confirmed **trust-contract fail-open** — `buildResponseTrust(… AUTHORITY_FOUND …)` returning `VERIFIED_CONTROLLING` when `answerSupport` is absent — is eliminated. `answerSupport` is now **mandatory** for `VERIFIED_CONTROLLING`: it must be a present, non-null, non-array object with **own boolean `schemaValid===true` AND own boolean `verifiedEligible===true`**. Absent / null / false / string / array / empty / missing-field / wrong-type / inherited / `schemaValid:false` / `verifiedEligible:false` all fail closed (unit A1–A30 and live: **every live verified run had a present, schema-valid attestation**). Legitimate verified remains reachable (8/9 live controls) and all higher-priority states keep precedence.

## 2. Independent-Review Finding

The R1 review (REVISIONS REQUIRED) reproduced: a direct `AUTHORITY_FOUND` trust construction with displayed sources and **no** `answerSupport` still returned `VERIFIED_CONTROLLING` — a P1 trust-safety fail-open ("no attestation means no verified" was violated).

## 3. Pre-Edit Reproduction

`.../pre-edit-reproduction-matrix.json` (runtime `2e636a1`): `answerSupport` omitted → VERIFIED_CONTROLLING; `null` → VERIFIED_CONTROLLING; `{verifiedEligible:true}` without `schemaValid` → VERIFIED_CONTROLLING. Root cause: `if (result.answerSupport && result.answerSupport.verifiedEligible !== true) …` — an absent/null attestation is falsy, skips the guard, and falls through to verified; `schemaValid` was not required.

## 4. Trust Call-Site Inventory

`.../trust-call-site-inventory.md`. The live `/ask` path sets `answerSupport` from the controlled validator for verified-candidate responses; the staging-fixture route and registry now carry a canonical attestation on the verified fixtures; domain-boundary/restricted/source-failure paths never reach the AUTHORITY_FOUND-verified branch. **No production path reaches `VERIFIED_CONTROLLING` without a present, valid attestation.**

## 5. Legacy Verified Fallback

Removed. The R1 "legacy seam" (absent `answerSupport` preserves verified for internal callers) is deleted from the production verified path; legacy/no-attestation inputs now downgrade safely.

## 6. answerSupport Presence Requirement & 7. Canonical Eligibility Helper

`isVerifiedAnswerSupport(answerSupport)` (pure, in `services/trust-contract.js`) requires: present, non-null, non-array object; own `schemaValid` boolean `true`; own `verifiedEligible` boolean `true`. Returns `{ present, objectValid, schemaValid, verifiedEligible, eligible, failureReasons }`. Uses `Object.prototype.hasOwnProperty.call` + strict `typeof`/`=== true` (no truthiness). It is the single source of truth reused by the trust contract and the tests.

## 8. schemaValid Requirement & 9. verifiedEligible Requirement

Both are **own booleans that must be `true`**. `schemaValid` alone or `verifiedEligible` alone is insufficient; both are necessary. `evaluateAnswerSupport` now emits `schemaValid` on every stage (including the structural / citation-relevance / unavailable / error fail-closed returns as `false`).

## 10. Safe Downgrade

Absent/invalid attestation → **`RELATED_AUTHORITY_ONLY`** (no throw, no false GENERAL_ANSWER confidence), preserving retrieved authorities and the source cards; it does not erase useful authorities.

## 11. Precedence Preservation

Unchanged: RESTRICTED → SOURCE_FAILURE → CONFLICTING_AUTHORITY → SPECIFIC_AUTHORITY_NOT_FOUND / RELATED_AUTHORITY_ONLY → VERIFIED_CONTROLLING → GENERAL. A missing attestation **only** prevents verified; it never overrides a higher-priority safe state (unit A22–A25 prove restricted/conflict/missing-authority/source-failure hold with no `answerSupport`).

## 12. Async Failure Paths

Validator skipped / timeout / throw / malformed / schema-invalid / disabled / model-unavailable / ask-handler exception / source-only fallback / generic fallback all yield an attestation that is absent or not `schemaValid && verifiedEligible` → **not verified** (unit A19–A21 exercise the real `evaluateAnswerSupport`).

## 13. Legacy-Test Updates

Verified-expectation tests (10a1 fixture + inline, 10a1-r1 fixtures, 10a4c Case-C + A/G registry, 10a6-r1 R4, 10a6-r3 T6, staging fixtures) now **supply a canonical attestation** (the legitimate-verified form). Two legacy-seam tests (10a8, 10a10 A14) were **flipped to expect the safe downgrade**. No obsolete verified expectation was preserved to avoid changing tests.

## 14. Targeted Tests

`tests/phase-10a10-r2-...test.mjs`: **27 passed / 0 failed / 33 assertions** — A1 complete; A2 omitted; A3–A15 undefined/null/false/string/array/empty/missing-field/wrong-type/inherited; A16 AUTHORITY_FOUND+sources; A17 controlling-flag; A18 source-only; A19–A21 async failures (real validator); A22–A25 precedence; A26 legit reachable; A27–A29 cluster attestations; A30 legacy input; helper diagnostics. Exercises the real trust-contract path, not just the parser.

## 15. Regression

phase-10a 18/18, phase-10a1 18/18, phase-10a1-r1 20/20, phase-10a2 21/21, phase-10a3-r1 5/5, phase-10a4c 15/15, phase-10a6-r1 9/9, phase-10a6-r3 11/11, phase-10a8 24/24, phase-10a10 18/18, phase-10a10-r1 22/22, phase-10a10-r2 27/27 — **all green post-commit**.

## 16. Focused Validation (25 live runs)

| Item | Result |
| --- | --- |
| Legitimate verified controls (Q32/Q34/Q47 ×3) | **8/9 verified** |
| Every live verified run had a present `answerSupport` with `schemaValid=true` | **yes (0 fail-open)** |
| Q5 ×2 / Q35 ×2 / Q41 ×2 | **0 verified** each |
| Restricted (RESTRICT-1) | RESTRICTED + human review |
| Conflict / Missing-authority / Source-failure | RELATED_AUTHORITY_ONLY (safe) |
| Missing/null/empty/partial/wrong-type/inherited attestations (unit) | **0 verified** |

The invalid-attestation shapes are deterministic unit cases (the live path always produces a full attestation); the live harness confirms the live path attaches valid attestations and legitimate verified is reachable.

## 17. Mini Regression (15 questions)

**0 invalid verified, 0 missing-answerSupport verified, 0 schema fail-open, prior-9 (Q2/Q8/Q9) → RELATED_AUTHORITY_ONLY, mini-verified (Q30/Q46) had present valid attestations, 0 false refusals, 0 fabricated authorities.**

## 18. Legitimate Verified Reachability

Preserved — 8/9 live controls verified; A1/A26 prove a complete canonical attestation verifies.

## 19. Residual P0–P3

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 0 | Missing-answerSupport fail-open eliminated (unit A1–A30 + live). |
| P2 | 3 | Validator precision cost; questionable-completeness verified; non-LOA restriction gap (all carryover). |
| P3 | 1 | Validator latency. |

## 20. Governance Consequence

P0 0, P1 0, 0 missing/null/empty/partial/invalid-type/inherited/AUTHORITY_FOUND-without-attestation verified, 0 invalid verified, legitimate verified reachable, Q5/Q35/Q41 safe, restricted/conflict/missing/source-failure precedence preserved, regressions green, security clean → **PASS WITH RECOMMENDATIONS** (recommendations = carryover precision/latency debt + stronger validator). Phase 10A remains **REOPENED pending the full fact-check rerun**. Phase 10B/10C: BLOCKED. Adversarial: DEFERRED. Independent closure review: DEFERRED.

## 21. Exact Next Task

**`PHASE-10A11-FULL-FACTCHECK-RERUN-2`** (only after an independent R2 review passes) — the full 50×3 rerun to confirm 0 invalid verified corpus-wide and quantify the full-corpus precision cost. A11 may proceed only with P0=0 and P1=0.

## Evidence

`evaluation/results/phase-10a10-r2-missing-answersupport-fail-closed-remediation-1.json`; `.../phase-10a10-r2-.../` (pre-edit-reproduction-matrix.json, trust-call-site-inventory.md, r2-run-log.json, payloads/ ×25, evidence-manifest.json with SHA-256). Code: `services/trust-contract.js`, `services/answer-support-validator.js`, `services/staging-trust-fixtures.js`, `tests/phase-10a10-r2-...test.mjs` + updated legacy tests/fixtures (commit `3de68f8`).
