# PHASE-10A11 Full Fact-Check Rerun 2 Report

Decision: **PHASE 10A11 FULL FACTCHECK RERUN REMEDIATION REQUIRED**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-16**.
Backend HEAD `1a8bcc1` (runtime lineage `728aba6` + `2e636a1` + `3de68f8`, all confirmed ancestors), sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched). No runtime/framework/frontend file changed.

## 1. Executive Conclusion

The A10 → A10-R1 → A10-R2 remediations **hold corpus-wide**: the three prior invalid-verified clusters (**Q5, Q35, Q41 all 0/3 verified**), and **every one of the 24 `VERIFIED_CONTROLLING` runs had a present, schema-valid attestation (`schemaValid===true` AND `verifiedEligible===true`) — 0 verified without a valid attestation.** Both prior false refusals are resolved. However, **one residual invalid verified remains: Q8-r2** — a reversed-VAT answer that the gpt-4o-mini validator false-approved in 1 of 3 runs. This is a **validator-model competence** false-negative (not a schema/attestation fail-open), and under the severity rules any invalid `VERIFIED_CONTROLLING` is a **P1** → REMEDIATION REQUIRED.

## 2. Framework & Methodology

Controlling v3.0 master (50 validated Q&A, per-question PASS/FAIL/UNSAFE, categorical scoring, mandatory human review of every non-PASS). Every `VERIFIED_CONTROLLING` run was manually audited; the independent A9 correction (7 invalid / Q5·Q35·Q41 clusters) is controlling for the baseline.

## 3. Environment & Lineage

Local authenticated server at HEAD `1a8bcc1` (runtime `728aba6`+`2e636a1`+`3de68f8` confirmed as ancestors; `isVerifiedAnswerSupport` + `validateVerdictSchema` present) vs **real staging Supabase vector store + real OpenAI gpt-4o-mini** (generation + validator). 50 questions verbatim; 3 fresh conversations each; persistence sampled. **150/150 runs, 0 timeouts, 0 technical failures.**

## 4–6. A7 Baseline / A9 Corrections / Remediation Lineage

A7: 9 false-high-confidence (P1). A9 independent correction: 7 invalid verified across Q5/Q35/Q41. A10 (responsiveness/completeness/citation-relevance gates) → A10-R1 (strict schema fail-closed) → A10-R2 (mandatory attestation). A11 is the post-R2 full rerun.

## 7. Run Inventory

50×3 = **150 runs**. authoritySupport distribution: RELATED_AUTHORITY_ONLY 78, VERIFIED_CONTROLLING 24, NO_VERIFIED_AUTHORITY 48. Full table: `.../TINA_Tax_FactCheck_Run_Log_v3_RERUN2_COMPLETED.md`.

## 8. answerSupport Attestation Audit (all 24 verified runs)

**Every verified run: `answerSupportPresent=true`, `schemaValid=true`, `verifiedEligible=true` — 0 verified without a valid attestation.** The A10-R1 schema and A10-R2 mandatory-attestation gates hold across the entire corpus. No missing / partial / schema-invalid / wrong-type / inherited attestation reached verified.

## 9. Verified-Controlling Manual Audit

- **Valid (13):** Q12 ×3, Q15 ×2, Q32 ×3, Q46 ×2, Q47 ×3 — correct and adequately complete.
- **Questionable-completeness (10):** Q30 ×3 (6% correct but "exceeding ₱5M" conflates the standard deduction with a threshold), Q38 ×2 (omits Form 1903 / ₱500-fee abolition), Q48 ×2 (omits charge-off/evidence), Q6 ×3 (omits the 50% surcharge / VAT-without-credit). Correct core, materially incomplete — not materially wrong.
- **Invalid (1): Q8-r2** — "Is leasing a residential unit at ₱15,000/month subject to VAT? → **Yes**." Reversed treatment (a ₱15,000 per-unit monthly residential lease is **VAT-exempt**). Verified in 1/3 runs (r1/r3 correctly RELATED_AUTHORITY_ONLY). **P1.**

## 10. answerSupport Attestation Audit — required invalid counts

verified-with-missing-attestation **0**; verified-with-partial-attestation **0**; verified-with-schema-invalid-attestation **0**. The Q8-r2 defect is **not** an attestation gap — its attestation was structurally valid; the validator's *judgment* was wrong.

## 11–13. Q5 / Q35 / Q41 Clusters

- **Q5 ×3: 0 invalid verified** — import-VAT answers no longer verified without the CREATE MORE exception.
- **Q35 ×3: 0 invalid verified** — "only Form 1701" no longer verified.
- **Q41 ×3: 0 invalid verified** — non-responsive penalty / foundational-citation no longer verified.

All three prior clusters are eliminated corpus-wide.

## 14. Prior Nine False-High-Confidence Cases

Q2, Q9, Q27, Q29, Q31, Q37, Q41, Q49 → **0 invalid verified**. **Q8 → 1/3 invalid verified (Q8-r2)** — the residual P1. (Q8 was an A7 FAIL/UNSAFE but was not among the A9 invalid-verified clusters; it now surfaces as a validator false-negative.)

## 15. Prior False Refusals

Q23, Q43 → `NO_VERIFIED_AUTHORITY` across all 6 runs — **0 false refusals** (no DOMAIN_BOUNDARY refusal, safe fallback).

## 16. Restricted Outcome Behavior

The v3.0 set contains no outcome-prediction prompts, so no unrestricted/guaranteed legal-success prediction occurred (**0 failures**). The generic non-LOA restriction-state gap remains a documented P2 carryover.

## 17. Hallucination Review

Fabricated authorities **0**. Authority-status hallucination reduced to **1** (Q8-r2). Trust-laundering **1** (Q8-r2). Citation-laundering **0**. Other classes (incorrect-citation ×2, unsupported-proposition ×6) persist in generated text but, except Q8-r2, no longer carry a verified banner.

## 18. Material Omission Review

~22 material omissions (generation unchanged); 10 surface as questionable-completeness verified (Q30/Q38/Q48/Q6) — correct core, materially incomplete. None of the *questionable* omissions is materially wrong; the single materially-wrong verified is Q8-r2.

## 19. Validator Precision

24 verified / 150; false-negative **1** (Q8-r2 — approved a wrong answer); false-positive (safe under-claim) **52**; malformed **0**; timeout **0**. Avg latency ~14.5s (P50 ~13s, P95 ~25s). Vs A9-independent: invalid verified 7 → 1; questionable 16 → 10; verified-without-valid-attestation → 0.

## 20. Consistency

Legal conclusion stable across all 3 runs per case (0 unsafe inconsistency). Trust-STATE varies verified↔related on 5 cases (Q8, Q15, Q38, Q46, Q48) from validator nondeterminism — safe variance, except that the Q8 wrong answer reached verified once (the P1).

## 21. Persistence

Sampled each run: **0 persistence failures**.

## 22. Security

Evidence secret-scan clean; payloads sanitized. **0 security failures.**

## 23. Scoring

PASS 10 / PARTIAL 18 / FAIL 9 / UNSAFE 1 (Q8) / unanswered 16 / false refusals 0. Accuracy 0.38 (0.51 answered-only); citation existence 0.98 / validity 0.60 / support 0.50; consistency 1.00; **trust calibration 0.87** (up from 0.62/0.85); overall ~0.64.

## 24. A7 / A9-Independent / A11 Comparison

| Metric | A7 | A9 independent | A11 | Change |
| --- | ---: | ---: | ---: | --- |
| Total runs | 150 | 150 | 150 | — |
| Timeouts / tech failures | 0 | 0 | 0 | none |
| Fabricated authorities | 0 | 0 | 0 | none |
| **Invalid verified runs** | ≥9 cases | **7** | **1** | major improvement |
| **Invalid-verified clusters** | 9 cases | Q5/Q35/Q41 | **all resolved** | eliminated |
| **Verified without valid attestation** | not gated | not gated | **0** | attestation gate holds |
| Questionable verified | — | 16 | 10 | reduced |
| False refusals | 2 | 0 | 0 | resolved |
| Unanswered | 13 | 16 | 16 | ~same (safe) |
| Accuracy | 0.38 | 0.38 | 0.38 | unchanged |
| Trust calibration | 0.62 | 0.85 | 0.87 | improved |
| Overall | ~0.58 | ~0.63 | ~0.64 | improved |

## 25. Release-Blocking Criteria

`invalid VERIFIED_CONTROLLING = 1 (> 0)` → the release-blocking condition is triggered. All others pass (0 fabricated, 0 verified-without-attestation, 0 false refusals, 0 unrestricted prediction, 0 unsafe inconsistency, 0 persistence, 0 security).

## 26. Accessor-Hardening Carryover

R2 independent-review P2 recorded and **not patched here**: `isVerifiedAnswerSupport` reads own getters (a getter returning `true` is accepted; a throwing getter may throw). Production `JSON.parse` never creates accessor properties; **no live production bypass**. Carryover P2 — must be remediated before final Phase 10A closure.

## 27. P0–P3

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 1 | Q8-r2 invalid `VERIFIED_CONTROLLING` (reversed-VAT answer approved by the gpt-4o-mini validator; valid attestation but wrong validator judgment). |
| P2 | 4 | Validator precision cost (52 safe under-claims); questionable-completeness verified (10); non-LOA restriction gap; accessor/getter hardening (carryover). |
| P3 | 1 | Validator latency. |

## 28. Governance Consequence

A reproducible-in-1/3 invalid `VERIFIED_CONTROLLING` (P1) exists → **REMEDIATION REQUIRED**. Phase 10A: **REOPENED FOR REMEDIATION**. Phase 10B: BLOCKED. Phase 10C: BLOCKED. Adversarial: DEFERRED. Independent closure review: DEFERRED. The structural trust architecture (attestation + schema + cluster gates) is now proven to hold corpus-wide; the remaining gap is the **validator model's tax-correctness competence**.

## 29. Whether Adversarial Testing May Proceed

**No** — deferred until the residual invalid verified is eliminated and A11 passes.

## 30. Exact Next Task

**`PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-1`** — raise validator competence on reversed/wrong-treatment answers (a stronger or retrieval-text-grounded validator model and/or a deterministic reversed-treatment guard) to eliminate the Q8-class false-negative; also remediate the accessor-hardening P2; then re-run the fact-check. Independent review of A11 (by a model that did not execute it) precedes A12.

## Evidence

`evaluation/results/phase-10a11-full-factcheck-rerun-2.json`; `.../phase-10a11-full-factcheck-rerun-2/` (execution-manifest.json, run-log.json, TINA_Tax_FactCheck_Run_Log_v3_RERUN2_COMPLETED.md, scoring-worksheet.json, payloads/ ×150, evidence-manifest.json with SHA-256).
