# PHASE-10A10 Verified-Controlling Residual & Completeness Remediation 1 Report

Decision: **PHASE 10A10 VERIFIED-CONTROLLING REMEDIATION PASS WITH RECOMMENDATIONS**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-16**.
Backend start HEAD `9f98c3c`, runtime/final HEAD `728aba6`, sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched).

## 1. Executive Conclusion

All three independently-confirmed invalid-`VERIFIED_CONTROLLING` clusters — **Q5 (missing CREATE MORE exemption), Q35 ("only Form 1701"), Q41 (non-responsive penalty / NIRC Secs 2-3 citation)** — are eliminated. Live: **0/3 invalid verified for each cluster, 0/9 for paraphrases, 0 invalid verified across all 49 live runs**, while legitimate verified remains reachable and restricted/conflict/missing-authority/source-failure behavior is preserved. The residual is a **safe** validator precision cost (correct recency-sensitive answers under-claimed) plus reduced-but-present questionable-completeness — both P2. Phase 10A stays reopened pending the full rerun (A11).

## 2. A9 Executor Findings & 3. A9 Independent-Review Corrections

A9 executor found 1 invalid verified (Q41-r3). The independent A9 review (REVISIONS REQUIRED) expanded this to **3 clusters / 7 invalid runs** (Q5 ×3, Q35 ×3, Q41-r3) and confirmed the A8 evidence-correction (Q14/Q28/Q46 were downgraded; verified reachability shown elsewhere). A10 addresses all three clusters.

## 4. Root-Cause Matrix

Full matrix: `evaluation/results/phase-10a10-.../root-cause-matrix.md`. Systemic cause: the validator judged operative-claim plausibility but not (a) required-issue-key / material-exception / material-alternative coverage, and (b) whether displayed sources are specifically relevant to the exact proposition.

## 5–7. Cluster Analyses

- **Q5:** "12%" only; omitted the material CREATE MORE export-enterprise exemption → **material-exception** miss (sources NIRC Sec 107 + RR 16-2005 were relevant, so caught by the LLM coverage gate).
- **Q35:** "only Form 1701"; omitted 1701-MS/1701A and cited only NIRC Sec 2 → **material-alternative + citation-relevance** miss.
- **Q41-r3:** never stated the penalty (non-responsive) and cited NIRC Secs 2-3 (foundational) → **responsiveness + citation-relevance** miss.

## 8. Question-Intent & 9. Issue-Key Coverage & 10. Material-Exception & 11. Material-Alternative Gates

The controlled evaluator now identifies the question's required issue keys, material exceptions, and material alternatives, and returns `answerResponsive`, `primaryIssueAnswered`, `requiredIssueKeysCovered`, `materialExceptionsCovered`, `materialAlternativesCovered`. Coverage gates apply **only when the question implies them** (a simple deadline/rate answer is not penalized). All generalizable — **no hardcoded Q-number runtime logic** and no v3.0 expected-answer leakage.

## 12. Citation-Relevance Gate

Deterministic `citesOnlyFoundationalProvisions()`: if every displayed authority is only a foundational/jurisdictional NIRC provision (Secs 1-6), it cannot support a specific rate/form/penalty → fail closed (catches Q35 Sec 2, Q41 Secs 2-3). The LLM additionally returns `citationRelevant` / `citationSupportsProposition` for non-foundational-but-irrelevant citations. Generic NIRC sections can no longer launder a specific conclusion.

## 13. Proposition-to-Source Alignment & 14. Pass-Criteria Coverage

Verified now requires the displayed authority to be specifically relevant and to support the proposition; `requiredIssueKeysCovered` + `materiallyComplete` encode pass-criteria coverage from question analysis + evaluator output (not a fixture lookup).

## 15. Validator Grounding & Model Strategy

Model strategy assessed: only `gpt-4o-mini` is available on the API key (probed; stronger models 403). Retained with **stronger structured grounding** (the richer schema, source-relevance instructions) + the deterministic foundational-citation gate. Fail-closed on malformed/timeout/unavailable preserved. Latency ~26s per verified-candidate (P3). A stronger/grounded validator remains the highest-value future lever.

## 16. Targeted Tests

`tests/phase-10a10-...test.mjs`: **18 passed / 0 failed / 30 assertions** — foundational-citation gate; Q5 exact+paraphrase (missing exception); Q35 exact+paraphrase (missing alternative + foundational citation); Q41 exact+paraphrase (non-responsive + irrelevant citation); 20 general adversarial units (correct+irrelevant source, wrong+related, missing exception/alternative, non-responsive, wrong-proposition, generic-NIRC-for-penalty, unsupported only/always, incomplete+good-sources, malformed/timeout/unavailable fail-closed, legitimate verified reachable, related/conflict/missing/restricted preserved). Mocked LLM verdicts for determinism; no exact-string-only assertions; paraphrases covered.

## 17. Regression

phase-10a 18/18, phase-10a1 18/18, phase-10a1-r1 20/20, phase-10a2 21/21, phase-10a3-r1 5/5, phase-10a4c 15/15, phase-10a6-r1 9/9, phase-10a6-r3 11/11, **phase-10a8 24/24** (backward-compatible schema), phase-10a10 18/18 — **all green post-commit**.

## 18–20. Live Validation & Acceptance

| Cluster / control | Result |
| --- | --- |
| **Q5 exact ×3** | **0/3 invalid verified** (RELATED_AUTHORITY_ONLY, LLM missing-exception) |
| **Q35 exact ×3** | **0/3 invalid verified** (citation-relevance) |
| **Q41 exact ×3** | **0/3 invalid verified** (citation-relevance) |
| **Paraphrases ×9** | **0/9 verified** |
| Legitimate verified controls ×5 | 3 verified (Q32/Q34/Q47); Q14/Q28 safely downgraded |
| Restricted ×2 | RESTRICT-1 RESTRICTED+review; RESTRICT-2 pre-existing gap |
| Conflict ×2 | 1 related, 1 verified (questionable completeness) |
| Missing-authority ×2 | both RELATED_AUTHORITY_ONLY |
| Source-failure ×2 | both RELATED_AUTHORITY_ONLY (safe, not verified/fabricated) |
| Mini prior-9 (in 25-Q set) | **0 verified** |

**Acceptance met:** Q5/Q35/Q41 exact 0 invalid verified; all paraphrases safe; no citation laundering; no unsupported exclusivity verified; no material-exception omission verified; no non-responsive verified; legitimate verified reachable; restricted/conflict/missing/source-failure preserved.

## 21. Verified-Controlling Quality Audit (all 6 live verified runs)

- **Valid (4):** VC-Q32, VC-Q34, VC-Q47, M-Q46 — correct and adequately complete.
- **Questionable (2):** M-Q26 (EWT remittance — correct 10th-day baseline, omits quarterly detail), CONFLICT-2 (answers the underlying PEZA zero-rating correctly).
- **Invalid: 0.**

## 22. 25-Question Mini Fact-Check

**0 invalid verified, 0 prior-9 verified, 0 false refusals, 0 fabricated authorities, 0 unrestricted outcome prediction.** Passed.

## 23. Precision & Latency

Vs A9 (36 verified: 13 valid / 16 questionable / 7 invalid + 41 safe under-claims): A10 eliminates the 7 invalid-verified cluster runs (**invalid → 0**) and keeps verified reachable, at a safe under-claim cost (Q14/Q28 recency downgrades). Validator false-negative 0, false-positive (safe) on the control set 2, malformed 0, timeout 0, avg latency ~26s. Full-corpus precision is quantified in the deferred A11 rerun.

## 24. Residual P0–P3

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 0 | All three invalid-verified clusters eliminated; 0 invalid verified live. Full 150-run confirmation deferred to A11. |
| P2 | 3 | Validator precision cost (safe recency under-claims); reduced-but-present questionable-completeness verified; non-LOA outcome-prediction restriction gap (carryover). |
| P3 | 1 | Validator latency ~26s per verified-candidate. |

## 25. Governance Consequence

0 P0, 0 P1, 0 invalid verified, all cluster and acceptance criteria met, regressions green, security clean → **PASS WITH RECOMMENDATIONS**. Phase 10A remains **REOPENED pending the full fact-check rerun**. Phase 10B/10C: BLOCKED. Adversarial suite: DEFERRED. Independent closure review: DEFERRED.

## 26. Exact Next Task

**`PHASE-10A11-FULL-FACTCHECK-RERUN-2`** — full 50×3 rerun to confirm 0 invalid verified across the whole corpus and quantify the full-corpus precision cost, before any Phase 10A re-closure or adversarial testing. Independent review of A10 (by a model that did not execute it) precedes A11.

## Evidence

`evaluation/results/phase-10a10-verified-controlling-residual-and-completeness-remediation-1.json`; `.../phase-10a10-.../` (root-cause-matrix.md, a10-run-log.json, payloads/ ×49, evidence-manifest.json with SHA-256). Code: `services/answer-support-validator.js`, `tests/phase-10a10-...test.mjs` (commit `728aba6`).
