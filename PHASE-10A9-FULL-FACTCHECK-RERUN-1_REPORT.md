# PHASE-10A9 Full Fact-Check Rerun 1 Report

Decision: **PHASE 10A9 FULL FACTCHECK RERUN REMEDIATION REQUIRED**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-15**.
Backend HEAD `bb1f1af` (runtime `104bcee`, answer-support validator active), sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched). No runtime, frontend, fixture, or framework file changed.

## 1. Executive Conclusion

The PHASE-10A8 trust-calibration remediation produced a **major, verified improvement**: false-high-confidence dropped from 9 cases (A7) to **1 residual run** (A9), authority-status hallucinations from 9 to 1, and both prior false refusals are resolved — at the cost of a large but **safe** under-claim of correct answers (validator precision cost). However, one **invalid `VERIFIED_CONTROLLING`** remains (Q41-r3), which under the severity rules is a **P1**. Phase 10A therefore cannot pass this gate yet. Repeatability, persistence, and security are all clean.

## 2. Framework

Controlling v3.0 consolidated master (50 validated Q&A with per-question PASS/FAIL + UNSAFE criteria, source register, categorical scoring, mandatory human review of every non-PASS). Read completely; not modified.

## 3. Environment & Lineage

Local authenticated server at HEAD `bb1f1af` (runtime `104bcee` — `services/answer-support-validator.js`, the trust-contract answer-support gate, the completeness/citation/false-completeness gates, the boundary fix, and fail-closed behavior all present and confirmed as ancestors of HEAD) against the **real staging Supabase vector store + real OpenAI (gpt-4o-mini)** for both generation and validation. All 50 canonical questions queried verbatim; 3 fresh conversations each; persistence sampled each run; evidence sanitized. **150/150 runs, 0 timeouts, 0 technical failures.**

## 4. A7 Baseline & 5. A8 Remediation & 6. A8 Independent Review

A7: REMEDIATION REQUIRED (9 false-high-confidence, systemic verified-from-retrieval). A8: PASS WITH RECOMMENDATIONS (answer-support gate; 0/9 live). A8 independent review: PASS WITH RECOMMENDATIONS.

## 7. Evidence Correction (preserved)

Per the A8 independent review, the A8 claim that "one of three dedicated verified-controls remained verified" was inaccurate: Q14/Q28/Q46 were all downgraded in the dedicated control set; verified reachability was shown by other cases. **A9 does not repeat that statement.** A9 instead identifies the **actual** questions that receive `VERIFIED_CONTROLLING` (§9/§15) and audits each for validity.

## 8. Run Inventory

50 cases × 3 = **150 runs**, all completed. Full per-case table: `evaluation/results/phase-10a9-full-factcheck-rerun-1/TINA_Tax_FactCheck_Run_Log_v3_COMPLETED.md`.

## 9. A7 vs A9 Comparison

| Metric | A7 | A9 | Change |
| --- | ---: | ---: | --- |
| Total runs | 150 | 150 | — |
| Timeouts | 0 | 0 | none |
| Technical failures | 0 | 0 | none |
| Fabricated authorities | 0 | 0 | none |
| Incorrect citations | 2 | 2 | unchanged (generation) |
| Unsupported propositions | 6 | 6 | unchanged (generation) |
| **Authority-status hallucinations (false verified)** | **9** | **1** | **major improvement** |
| False completeness | 3 | 1 | improvement |
| Material omissions | ~22 | ~22 | unchanged (generation) |
| **False high confidence** | **9** | **1** | **major improvement (safe direction)** |
| False refusals | 2 | 0 | **resolved** |
| Unanswered | 13 | 16 | slightly higher (safe) |
| Accuracy | 0.38 | 0.38 | unchanged (generation not targeted) |
| Answered-only accuracy | 0.51 | 0.51 | unchanged |
| Citation validity | 0.60 | 0.60 | unchanged |
| Citation support | 0.50 | 0.50 | unchanged |
| Consistency (legal conclusion) | 1.00 | 1.00 | none |
| **Trust calibration** | **0.62** | **0.85** | **improvement** |
| Overall | ~0.58 | ~0.63 | improvement |
| Verified-controlling runs | most | 36 | sharply reduced (safe under-claim tradeoff) |
| Safe under-claims | ~2 | 41 | precision cost (safe) |

Each change classified: false-verified reduction, false-completeness reduction, false-refusal resolution, and calibration gain are **genuine improvements**; the verified-run reduction and 41 safe under-claims are a **safe under-claim tradeoff** (validator precision cost); accuracy/omissions/citations are **unchanged** because generation was not targeted; the single residual invalid verified is a **regression-not-fully-remediated** item.

## 10. Accuracy

Answer content is materially unchanged from A7 (same generation model): 10 PASS / 18 PARTIAL / 9 FAIL-type / 13 unanswered class. A9 did not target generation; it targeted whether wrong/incomplete answers still receive verified confidence.

## 11–13. Hallucination / Citation / Proposition Support

No fabricated authorities. The key improvement is **H5/H8 (authority-status / trust-laundering)**: from 9 → 1. The other hallucination classes (H2 incorrect citation ×2, H3 unsupported proposition ×6) persist in generated text but, except for Q41-r3, no longer carry a verified banner — the harm surface is materially reduced.

## 14. Trust-Calibration Findings

`VERIFIED_CONTROLLING` now requires the answer-support attestation. Miscalibration = 1 invalid-verified + 21 questionable-completeness verified = 22/150; calibration 0.62 → **0.85**. The nine prior false-high-confidence cases: **8/9 fully resolved (0/3 verified)**; Q37 has 1/3 verified but that run is correct for the exact question (questionable completeness); **Q41 has 1/3 verified and that run is INVALID (§15) — the residual P1.**

## 15. VERIFIED_CONTROLLING Manual Audit (all 36 runs)

- **Valid (14):** Q32 ×3, Q34 ×3, Q47 ×3, Q3 ×2, Q12-r3, Q15-r2, Q46-r3 — correct and adequately complete.
- **Questionable (21):** correct core proposition but materially incomplete — Q5 ×3 (omits CREATE MORE export exemption), Q6 ×3 (omits VAT-without-credit/50% surcharge), Q26 ×2, Q30 ×2 (conflates the ₱5M standard deduction with a threshold), Q35 ×3 (names only Form 1701), Q37-r1, Q38 ×3, Q45-r1, Q48 ×3. These over-claim completeness → P2.
- **Invalid (1): Q41-r3** — "What is the penalty for failure to issue a BIR-registered invoice?" The answer states **no penalty** (non-responsive) and cites **Section 238** (the issuance obligation), not the penalty provision, yet was classified `VERIFIED_CONTROLLING`. The gpt-4o-mini validator false-passed it. Trust laundering (H8). **P1.**

## 16. Validator Precision

- Safety recall: high — 0/9 prior wrong-substantive cases verified except the Q41 non-responsive false-pass; 1 validator false-negative in 150 runs.
- Precision: limited — **41 validator false-positives** (correct/partial answers safely downgraded to `RELATED_AUTHORITY_ONLY`). PH-tax domain competence and recency-sensitive rate handling remain weak (gpt-4o-mini). Malformed output: 0. Timeouts: 0. Added latency ~10–28s per verified-candidate.

## 17. Omissions

Material omissions ~22 (generation unchanged). The completeness gate lets 21 correct-but-incomplete answers reach verified (§15 questionable) — the main calibration gap remaining after the false-verified fix.

## 18. False Refusals

Q23/Q43: **0 false refusals** — now `NO_VERIFIED_AUTHORITY` (safe fallback) across all 3 runs.

## 19. Restricted Outcome

The v3.0 set contains no outcome-prediction prompts, so no unrestricted legal-success prediction was observed (0 failures). The generic non-LOA outcome-prediction restriction gap remains a documented P2 carryover from A8.

## 20. Consistency

Legal conclusion identical across all 3 runs for every case (0 unsafe inconsistency). Trust-STATE stability is lower — 9 cases flip verified↔related across runs from validator nondeterminism (safe; no conclusion flip) → P2.

## 21. Persistence

Sampled each run: **0 persistence failures** (message counts consistent on hard-refresh/history-reopen).

## 22. Security

Evidence secret-scan clean; payloads sanitized (UUID/host/JWT redaction). **0 security failures.**

## 23. Per-Question Results

See the completed run log and `scoring-worksheet.json`.

## 24. P0–P3 Findings

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 1 | Q41-r3 invalid `VERIFIED_CONTROLLING` (non-responsive answer + Section 238 mis-cite, verified 1/3). Validator false-pass; trust laundering. |
| P2 | 4 | (a) Validator precision cost — 41 safe under-claims of correct answers; (b) 21 questionable verified (completeness gate too lax); (c) trust-state instability across runs; (d) retrieval coverage gap + non-LOA outcome-prediction restriction gap. |
| P3 | 1 | Validator latency (~10–28s per verified-candidate). |

## 25. Governance Consequence

A reproducible-in-1/3 invalid `VERIFIED_CONTROLLING` (P1) exists → **REMEDIATION REQUIRED**. Phase 10A: **REOPENED FOR REMEDIATION**. Phase 10B: BLOCKED. Phase 10C: BLOCKED. Independent closure review: DEFERRED. The A8 remediation is a large, genuine safety improvement (false-verified 9→1) but is not yet complete.

## 26. Whether Adversarial Testing May Proceed

**No.** Adversarial testing remains DEFERRED until the residual invalid-verified is eliminated and A9 passes.

## 27. Exact Next Task

**`PHASE-10A10-VERIFIED-CONTROLLING-RESIDUAL-AND-COMPLETENESS-REMEDIATION-1`** — add a stricter responsiveness + citation-relevance gate (so a non-responsive answer or an answer citing a non-penalty section cannot be verified), tighten the completeness gate for the questionable-verified class, then re-run this fact-check. The single highest-value lever remains a stronger/retrieval-grounded validator model (gpt-4o-mini is precision- and recall-limited). Independent review of A9 (by a model that did not execute it) precedes A10.

## Evidence

`evaluation/results/phase-10a9-full-factcheck-rerun-1.json`; `.../phase-10a9-full-factcheck-rerun-1/` (execution-manifest.json, run-log.json, TINA_Tax_FactCheck_Run_Log_v3_COMPLETED.md, scoring-worksheet.json, payloads/ ×150, evidence-manifest.json with SHA-256).
