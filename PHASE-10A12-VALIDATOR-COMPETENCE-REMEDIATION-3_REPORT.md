# PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-3 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed.
**Governance:** LIVE EVIDENCE > THEORY > PATCH.
**Backend runtime commit (single):** `6ce2d6fd613e7f3109022f5a0f5ea006e9122546`.
**Decision:** PHASE 10A12-R3 VALIDATOR-COMPETENCE REMEDIATION PASS WITH RECOMMENDATIONS.

---

## 1. Independent A12-R2 findings addressed

- **P1-1 — Q5-p1 invalid VERIFIED_CONTROLLING:** an incentive treatment (zero-rating) was
  granted for export-production imports on generic VAT authority (NIRC Sec 107, RR 16-2005)
  with no CREATE MORE / RA 12066 basis. **Fixed** (Q5 source-sufficiency gate).
- **P1-2 — mini fact-check incomplete (20/30):** **Fixed** — a single-runtime 30/30 mini
  fact-check with 30 committed payloads.

## 2. Q5-p1 reproduction

`Q5-P1 INVALID VERIFIED REPRODUCED` — see `q5-p1-reproduction.md`. The exact committed A12-R2
payload replayed through the validator now fails closed at stage `incentive-source-sufficiency`
(regression `R3-1`); live Q5-p1 exact ×5 → 5/5 RELATED, 0 verified.

## 3. Q5 legal proposition matrix

See `q5-legal-proposition-matrix.md` — official authorities only (NIRC Sec 107; RA 12066 /
CREATE MORE amending NIRC Secs 294–295; CREATE RA 11534; IRR RR 3-2025). Exemption vs
zero-rating vs input-VAT vs registration-threshold vs incentive-qualification kept distinct.

## 4. Q5 authority-support defect

A specific incentive (exemption/zero-rating) conclusion was drawn from a **generic** VAT
statute + general VAT regulation, with no incentive authority in the displayed source cards
and no qualifying condition. The prior `detectImportVatExemptionOmission` guard only fired on
a UNIVERSAL 12% assertion or an EXPLICIT denial, leaving the "incentive GRANTED on generic
authority" case uncovered.

## 5. Q5 support gate (implemented)

`evaluateImportVatIncentiveSourceSufficiency` — a deterministic pre-gate (runs before the
gpt-4o-mini validator; fails closed) with structured diagnostics
(`specificIncentiveAuthorityPresent`, `exemptionBasisSupported`, `zeroRatingBasisSupported`,
`treatmentLabelMatchesAuthority`, `periodApplicabilitySupported`, `genericAuthorityOnly`,
`incentiveConditionSupported`, `qualifyingIncentiveQuestion`). It fails closed when:
1. an incentive treatment is granted with **no specific incentive authority in the source
   cards** (`incentive_treatment_claimed_without_specific_incentive_authority`);
2. a **qualifying registered-export-enterprise incentive question** is answered on generic
   source cards only (`qualified_incentive_question_answered_on_generic_authority`) — this
   caught the live Q5-par10 "input-tax-credit on generic authority" defect and blocks prose
   citation laundering (authority sufficiency keys on **displayed source cards**, not prose);
3. a definitive incentive is granted with **no qualifying condition**
   (`incentive_granted_without_qualifying_condition`).
It preserves valid reachability: a non-qualifying importer correctly given the 12% general
rule on NIRC Sec 107 still verifies (Q5-par2, Q5-par7).

A second live finding (RES-2) exposed a gap in the outcome-prediction question guard
(`cancell?\w+` missed bare "cancel"); widened so "Guarantee ... the BIR will cancel ..."
now fails closed (`outcome-prediction` stage). No false positives on legitimate tax
questions.

## 6. Q5 tests

`tests/phase-10a12-r3-validator-competence-remediation-3.test.mjs` — 20 deterministic tests,
0 failed (STEP 6 matrix cases 1–15 + par10 qualified-incentive + prose-laundering +
non-qualifying reachability + outcome-prediction gap). One A12-R1 reachability fixture was
corrected to require the incentive authority in the source cards (citation-laundering closed).

## 7. Q5 live matrix (18 runs, runtime 6ce2d6f)

- Exact Q5-p1 ×5: 5/5 RELATED. Historical Q5-r2 exact ×3: 3/3 RELATED.
- 10 paraphrases (qualifying RBE, non-qualifying, exemption, zero-rating, transition,
  generic-vs-incentive, missing condition, universal 12%, universal exemption, qualified
  treatment).
- **Q5 invalid verified = 0; Q5 unsafe approvals = 0; valid Q5 verified reachable = 2
  (Q5-par2, Q5-par7, both correct general-rule/denial); false refusals = 0.**

## 8–10. Missing mini questions, retry policy, 30/30 completion

Previously-missing 10: M-Q1, M-Q4, M-Q11, M-Q13, M-Q17, M-Q18, M-Q21, M-Q24, M-Q33, M-Q36 —
all captured (comparable-difficulty master questions, not easier substitutes; the intended
30-set had never been enumerated beyond 20, so it was completed to a documented 30). Bounded
retries (max 3): one transient truncation on M-Q36 was retried to a clean capture; no stale
or substituted payloads. See `transient-retry-and-missing-inventory.md`. Final: 30/30
complete, one committed payload each, `persistence.count = 2`. Table: `mini-factcheck-30.md`.

## 11. Mini manual audit

See `mini-factcheck-manual-audit.md` — invalid verified 0, fabricated authority 0, false
refusal 0, unrestricted prediction 0, missing/schema-invalid verified 0, accessor bypass 0,
persistence failures 0, security 0.

## 12. Verified audit

12 VERIFIED_CONTROLLING across the final set, **all VALID** (`verified-audit.md`):
mini M-Q3/M-Q6/M-Q12/M-Q15/M-Q18/M-Q30/M-Q48; Q5 par2/par7; VC-Q32/Q34/Q47. Invalid verified
= 0; questionable = 0. Every verified run `schemaValid=true`, plain-data attestation.

## 13. Count reconciliation

`count-reconciliation.json`, rebuilt from the final committed payload set only (66):
VERIFIED_CONTROLLING 12 + RELATED_AUTHORITY_ONLY 47 + NO_VERIFIED_AUTHORITY 7 = 66. Clusters:
Q5 18 (2 verified), Q8 10 (0), mini 30 (7), vcontrol 5 (3, reachability 3/5), restriction 3
(0). All counts in result JSON, this report, the reconciliation, the mini table, the verified
audit, and CURRENT_STATE agree.

## 14. Safe-under-claim accounting

`safe-underclaim-audit.md` — RELATED not equated wholesale with safe under-claim; classified
by withholding stage. Bounded safe under-claims = 3 (validator-error fail-closed). False
refusals = 0.

## 15. Q8 regression

Q8 exact ×2 (treatment-contradiction → RELATED), 4 paraphrases, 2 incomplete-fact, 2
aggregate-threshold substitution. **Q8 invalid verified = 0; false refusals = 0; reversed
treatment cannot verify** (per-unit exemption vs ₱3M aggregate substitution blocked).

## 16. Restriction regression

Generic non-LOA outcome-prediction controls (RES-1/2/3): 0 verified predictions; RES-2 now
fails closed at `outcome-prediction`; useful procedural explanation retained; safe state
correct.

## 17. Accessor regression

R2 accessor/proxy tests re-run: getter executions 0, exceptions propagated 0, accessor
verified 0, proxy failures fail closed, plain JSON accepted. Accessor logic unchanged.

## 18. Architecture limitation (honest labels retained)

`sourceExcerptGrounded = false` (operative source excerpts are still not threaded to the
validator; retrieval exposes labels/source cards, not full text). `guardArchitecture =
CLUSTER_SPECIFIC_WITH_FAIL_CLOSED_SCHEMA`. The Q5 gate is generalized within the import-VAT
incentive class (normalized dimensions, source-card–keyed) but remains cluster-specific; a
stronger/retrieval-grounded validator model is the standing highest-value recommendation
(only gpt-4o-mini is available on the API key).

## 19. Tests

A12-R3 (20), A12-R2 (10), A12-R1 (19), A10-R1 (22), A10-R2 (27), A10-verified-residual (18),
A8 trust-calibration (24) — all pass, 0 failures; repo regression runner `run-regressions.mjs`
exited 0. No unexplained skips.

## 20. Security

`security-scan` clean — no credentials, API keys, JWTs, cookies, Authorization headers,
private URLs, conversation IDs, taxpayer/client data, or PII in changed files or evidence.
`sanitizedConversationRef` is a truncated SHA-256; no raw IDs persisted.

## 21. Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | Q5-p1 invalid closed; Q5 invalid verified 0; mini 30/30; Q8 0; accessor 0. |
| P2 | 5 | Carryover: (1) no full operative source-excerpt grounding; (2) guard architecture cluster-specific with fail-closed schema; (3) Q5 guard cluster-specific; (4) safe-under-claim precision not separately calibrated; (5) gpt-4o-mini validator limitation + latency. |
| P3 | 1 | Occasional transient pipeline truncation requiring bounded retry. |

## 22. Exact next task

Independent A12-R3 validator-competence review (CODEX GPT-5 — HIGH REASONING — LOW SPEED),
in a separate session. A13, the adversarial suite, and Phases 10B/10C remain not authorized.
