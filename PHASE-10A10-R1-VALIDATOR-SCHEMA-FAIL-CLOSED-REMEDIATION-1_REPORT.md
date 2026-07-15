# PHASE-10A10-R1 Validator Schema Fail-Closed Remediation 1 Report

Decision: **PHASE 10A10-R1 VALIDATOR SCHEMA REMEDIATION PASS WITH RECOMMENDATIONS**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-16**.
Backend start HEAD `2f6235b`, runtime/final HEAD `2e636a1`, sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched).

## 1. Executive Conclusion

The independently-confirmed **validator-schema fail-open P1** — a syntactically valid but incomplete validator JSON could omit mandatory A10 safety fields and still yield `verifiedEligible: true` — is eliminated. The validator now **strictly fails closed**: `VERIFIED_CONTROLLING` is impossible unless every mandatory field is an **own, boolean-typed property with the safe value**. Partial / missing / wrong-type / inherited / risk-missing verdicts all fail closed (unit-proven S1–S26 and live: **every verified run had `schemaValid=true`**), while legitimate verified remains reachable (8/9 live controls) and all safety states are preserved.

## 2. Independent-Review Finding

The A10 review (REVISIONS REQUIRED) demonstrated a partial mock returning `verifiedEligible: true` despite missing required A10 fields — a P1 trust-safety fail-open.

## 3. Pre-Edit Reproduction

Reproduced against runtime `728aba6` (`.../pre-edit-reproduction-matrix.json`): a 4-field partial verdict, an `{eligibleForVerifiedControlling:true}`-only verdict, and a verdict with the negative-risk field omitted **all** yielded `verifiedEligible: true`. Root cause: gate derivation used `dt(field)` which **defaulted absent fields to true**.

## 4. Validator-Contract Inventory

Mandatory verified-eligibility booleans consumed downstream: 11 positive (`answerResponsive`, `primaryIssueAnswered`, `requiredIssueKeysCovered`, `materialExceptionsCovered`, `materialAlternativesCovered`, `citationRelevant`, `citationSupportsProposition`, `substantive`, `propositionSupported`, `materiallyComplete`, `eligibleForVerifiedControlling`) + 2 negative-risk (`contradictsSources`, `unsupportedMaterialProposition`). Diagnostic/optional fields (`operativeClaim`, `reason`, issue-key arrays) are not gating. The trust contract consumes `answerSupport.verifiedEligible` (now strict).

## 5. Mandatory Field Set

Centralized as a **single canonical source** in `services/answer-support-validator.js`: `REQUIRED_POSITIVE_BOOLEANS` (11) and `REQUIRED_NEGATIVE_BOOLEANS` (2), exported and reused by the parser and tests (no duplicated lists).

## 6. Own-Property Validation

`Object.prototype.hasOwnProperty.call(v, field)` for every mandatory field. Prototype-inherited fields are treated as **missing**; a possible getter is read once inside `try/catch` (a throwing getter is recorded as an invalid type). Verdicts that are not plain objects fail closed.

## 7. Strict Boolean Validation

Every mandatory field must satisfy `typeof value === "boolean"`. No coercion of `"true"`, `1`, `0`, `null`, `undefined`, `[]`, `{}`. No truthiness checks on safety fields.

## 8. Negative-Risk Field Rules

`contradictsSources` and `unsupportedMaterialProposition` must be **explicitly `false`** (own boolean). Absence → schema invalid (fail closed). Unknown never interpreted as safe.

## 9. Explicit Eligibility Rule

`eligibleForVerifiedControlling === true` is required but **not sufficient** — it is one of the mandatory positives and cannot bypass any other field. S4/S5/S6/S7/S8 prove eligibility-true-plus-any-defect fails closed.

## 10. Legacy Compatibility Disposition

The `dt()` default-true path is **removed** from production. The one legacy test (PHASE-10A8 `GOOD` mock) was updated to the full canonical schema; no production default-true remains. Backward compatibility is subordinate to trust safety (per Step 9).

## 11. Parser / Schema Result

`validateVerdictSchema(v)` returns `{ schemaValid, verifiedEligible, missingFields[], invalidTypeFields[], invalidValueFields[], inheritedFieldsRejected[], failureReasons[], gates }`. `schemaValid` = all mandatory fields present as own booleans; `verifiedEligible` = `schemaValid` AND all positives `true` AND all negatives `false`. A parser/JSON error yields a safe downgrade with a machine-readable reason.

## 12. Trust Integration

Any schema failure → `verifiedEligible=false` → not `VERIFIED_CONTROLLING` → safe downgrade to `RELATED_AUTHORITY_ONLY` with a structured `failureReasons` entry. Malformed JSON / timeout / unavailable already fail closed. No exception path produces a high-confidence fallback.

## 13. Targeted Tests

`tests/phase-10a10-r1-...test.mjs`: **22 passed / 0 failed / 37 assertions** — S1 complete valid (verified reachable); S2 missing positive; S3 legacy-partial; S4 eligibility missing; S5 eligibility false; S6 positive false; S7 risk true; S8 risk missing; S9 null; S10 undefined; S11 string; S12 numeric; S13 empty; S15 extra fields tolerated; S16 inherited rejected; S17 throwing getter; S18–S20 malformed/unavailable; S21 legit reachable; S22–S24 cluster shapes; S25 partial attestation; S26 legacy shape; canonical-set integrity. Asserts parser output (schemaValid, missingFields, invalidTypeFields, verifiedEligible), final trust state, and downgrade reasons — no exact-string-only assertions, no Q-number production branches.

## 14. Regression

phase-10a 18/18, phase-10a1 18/18, phase-10a1-r1 20/20, phase-10a2 21/21, phase-10a3-r1 5/5, phase-10a4c 15/15, phase-10a6-r1 9/9, phase-10a6-r3 11/11, **phase-10a8 24/24** (GOOD mock updated), phase-10a10 18/18, phase-10a10-r1 22/22 — **all green post-commit**.

## 15. Local / Live Validation (25 runs)

| Item | Result |
| --- | --- |
| Legitimate verified controls (Q32/Q34/Q47 ×3) | **8/9 verified**, every verified run `schemaValid=true` |
| All live verified runs had `schemaValid=true` | **yes (0 schema fail-open)** |
| Q5 ×2 / Q35 ×2 / Q41 ×2 | **0 verified** each |
| Restricted (RESTRICT-1) | RESTRICTED + human review |
| Conflict / Missing-authority / Source-failure | RELATED_AUTHORITY_ONLY (safe) |
| Partial / missing / wrong-type / inherited (unit) | **0 verified** |

The real gpt-4o-mini reliably returns the complete schema, so strict validation does not break legitimate verified reachability (Q34-r2 was a value-level safe under-claim, not a schema failure).

## 16. Mini Regression (15 questions)

**0 invalid verified, 0 schema fail-open, 0 prior-9 verified (Q2/Q8/Q9 → RELATED_AUTHORITY_ONLY), 0 false refusals, 0 fabricated authorities.** The 3 mini-verified (Q30/Q46 valid, Q26 questionable-completeness) all `schemaValid=true`; none invalid.

## 17. Legitimate Verified Reachability

Preserved — 8/9 controls verified live; S1/S21 prove a complete valid schema verifies.

## 18. Residual Precision & Latency Debt

Carryover P2 (not introduced here): gpt-4o-mini precision cost (safe recency under-claims); reduced-but-present questionable-completeness verified; non-LOA outcome-prediction restriction gap. P3: validator latency ~15–27s. A stronger/grounded validator remains the top future lever.

## 19. P0–P3

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 0 | Schema fail-open eliminated (unit S1–S26 + live `allVerifiedHaveSchemaValid=true`). |
| P2 | 3 | Validator precision cost; questionable-completeness verified; non-LOA restriction gap (all carryover). |
| P3 | 1 | Validator latency. |

## 20. Governance Consequence

P0 0, P1 0, 0 partial/missing/wrong-type/inherited/missing-answerSupport verified, 0 invalid verified, legitimate verified reachable, Q5/Q35/Q41 safe, restricted/conflict/missing/source-failure preserved, regressions green, security clean → **PASS WITH RECOMMENDATIONS** (recommendations = carryover precision/latency debt + stronger validator). Phase 10A remains **REOPENED pending the full fact-check rerun**. Phase 10B/10C: BLOCKED. Adversarial: DEFERRED. Independent closure review: DEFERRED.

## 21. Exact Next Task

**`PHASE-10A11-FULL-FACTCHECK-RERUN-2`** — the full 50×3 rerun (now that the schema fail-open is closed) to confirm 0 invalid verified corpus-wide and quantify the full-corpus precision cost. Independent review of R1 (by a model that did not execute it) precedes A11; A11 may proceed only with P0=0 and P1=0.

## Evidence

`evaluation/results/phase-10a10-r1-validator-schema-fail-closed-remediation-1.json`; `.../phase-10a10-r1-.../` (pre-edit-reproduction-matrix.json, r1-run-log.json, payloads/ ×25, evidence-manifest.json with SHA-256). Code: `services/answer-support-validator.js`, `tests/phase-10a10-r1-...test.mjs`, updated `tests/phase-10a8-...test.mjs` (commit `2e636a1`).
