# PHASE-10A12 Validator-Competence Remediation 1 Report

Decision: **PHASE 10A12 VALIDATOR-COMPETENCE REMEDIATION PASS WITH RECOMMENDATIONS**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-16**.
Backend start HEAD `16c9974`, runtime/final HEAD `b01b0507`, sync 0 0. Frontend `0816ac8` (untouched, `.gitignore` preserved). Dev Factory `9167002` (untouched).

## 1. Executive Conclusion

The PHASE-10A11 residual — a structurally valid attestation that *substantively* approved a legally reversed VAT conclusion (Q8-r2) — is remediated with **deterministic treatment-contradiction guards** that override LLM approval, a strengthened **source-contradiction schema** (treatment-direction / threshold-dimension / source-alignment fields), a **source-grounded hardened prompt**, and **accessor/getter hardening**. Live under `LIVE EVIDENCE > THEORY > PATCH`: the initial harness surfaced a *re-emergent* invalid in a different cluster (Q5-r2, universal 12% denying the CREATE MORE exemption); a second deterministic guard closed it and the cluster re-validated **0/3**. Final live state: **Q8 exact 0/5, Q8 paraphrase 0 invalid, Q5 0/3, Q35/Q41 0, prior-nine 0, accessor 0 — 0 invalid verified**, legitimate verified still reachable.

## 2. A11 Independent Finding

One invalid `VERIFIED_CONTROLLING` remained: Q8-r2. Attestation present and structurally valid; the gpt-4o-mini validator's substantive PH-tax judgment was wrong.

## 3. Q8-r2 Legal Analysis

Question: "Is leasing a residential unit at ₱15,000/month subject to VAT?" **Correct: VAT-EXEMPT** — a residential unit at or below the ₱15,000 per-unit monthly threshold is exempt regardless of the lessor's aggregate rental income. Q8-r2 answered "**Yes** … if total annual rental income exceeds ₱3,000,000," **substituting the general ₱3M aggregate VAT-registration threshold for the specific per-unit exemption** — a threshold-dimension substitution + treatment-polarity reversal.

## 4. Competence-Failure Reproduction

`.../pre-edit` (implicit in A11 evidence) + synthetic matrix. The gpt-4o-mini validator returned `contradictsSources=false`/`materiallyComplete=true` for the reversed answer.

## 5–6. Validator-Model Inventory & Selection

Only **gpt-4o-mini** is available on the API key (stronger models return 403; probed in prior phases). No silent model change. Competence is raised via deterministic guards + a source-contradiction schema + a hardened prompt. A stronger/retrieval-grounded validator remains the standing recommendation.

## 7. Source-Excerpt Grounding

Not yet threaded (retrieval exposes labels at this layer, not full text); deferred with a recorded recommendation. The deterministic guards + hardened prompt provide the current grounding.

## 8–10. Proposition Normalization / Polarity / Threshold / General-vs-Specific

The hardened prompt instructs the validator to compare the answer's operative **treatment direction** (taxable↔exempt, zero-rated↔exempt, input↔output VAT, refund↔credit, seller↔buyer, withholding-agent↔payee, required↔prohibited), **threshold dimension** (per-unit/transaction exemption vs aggregate registration threshold), and **general-vs-specific** rule against the controlling source, and to reject reversals/substitutions.

## 11. Source-Contradiction Gate (schema)

Four mandatory canonical fields added: `treatmentDirectionMatches`, `thresholdDimensionMatches`, `sourcePropositionAligned` (positive, must be true) and `answerContradictsControllingSource` (negative, must be false). Strict own-boolean; missing → schema invalid → fail closed.

## 12. Validator Prompt Hardening

Added explicit polarity/threshold/general-vs-specific instructions, including the exact residential-lease reversal as a must-reject example, and "do not judge on fluency; structured booleans only."

## 13. Deterministic Guards (the reliable fix)

- **`detectTreatmentContradiction`** — residential-lease VAT per-unit-exemption reversed to taxable / via the aggregate ₱3M threshold (Q8 class).
- **`detectImportVatExemptionOmission`** — import-VAT for export-manufacturing goods asserting a universal 12% while omitting the CREATE MORE export-enterprise exemption (Q5 class, added after the live loop surfaced Q5-r2).

Both run **before** the LLM and **override** any LLM approval (fail closed). Verified against real captured payloads and with no false-positives on correct/commercial/unrelated answers.

## 14. Accessor Hardening

`isVerifiedAnswerSupport` now inspects property **descriptors**: accessor (getter/setter) mandatory fields are rejected (`accessorFieldsRejected`); a throwing getter is caught (`descriptorReadFailure`) and fails closed **without propagating**; only plain data-boolean own properties can verify. `objectShapeValid` added.

## 15. Schema Changes

Canonical `REQUIRED_POSITIVE_BOOLEANS` → 14, `REQUIRED_NEGATIVE_BOOLEANS` → 3. Strict own-property + boolean typing preserved; no production default-true. Legitimate-verified mocks/fixtures updated to the complete schema; the live gpt-4o-mini reliably returns the new fields (legit verified remains reachable).

## 16. Targeted Tests

`tests/phase-10a12-...test.mjs`: **19 passed / 0 failed / 42 assertions** — C1 (Q8 reversed + LLM-approved → guard overrides), C2 (Q8 correct → verified), C3–C4 (threshold/general reversal detected), C5 (foundational), C6 (contradiction field), C7–C9 (new positive fields false), C7b–C9b (missing new fields → schema invalid), C10 (accessor getter true → rejected), C11 (throwing getter → safe, no propagation), C12 (plain data → verified), C13–C14 (malformed/unavailable), C15–C17 (Q5/Q35/Q41), C18–C21 (restricted/conflict/missing/source-failure), Cimport-1/2/3 (import-VAT guard), polarity no-false-positive.

## 17. Regression

All 13 Phase-10A suites green post-commit.

## 18–20. Q8 Live Validation

**Q8 exact ×5: 0/5 invalid verified** (4 caught by the deterministic guard, 1 by the LLM). **Q8 paraphrases ×6: 0 invalid verified** — Q8-p5 verified but with a **correct** answer ("No, the registration threshold does not override the residential-unit exemption") = valid. Guard activations: 4.

## 21–23. Q5/Q35/Q41 Preservation + Controls

Initial harness surfaced **Q5-r2 invalid** (universal 12%, denied CREATE MORE) — an LLM `materialExceptionsCovered` false-negative. The import-VAT guard was added and **Q5 ×3 re-validated 0/3 verified**. Q35/Q41: 0 verified. Verified controls: **3/5 reachable** (Q32/Q34/Q47; Q14/Q28 safe under-claims). Restricted (RESTRICT-1): held. Conflict / missing-authority / source-failure: all `RELATED_AUTHORITY_ONLY` (safe).

## 24. Verified Audit

11 verified live runs audited: 10 valid (Q8-p5, Q32/Q34/Q47 ×controls, M-Q30/M-Q15/M-Q12), 1 questionable-completeness (M-Q6), **0 invalid**. Every verified run had `schemaValid=true`, a plain-data attestation.

## 25. 30-Question Mini Fact-Check

**0 invalid verified (after guard), prior-nine 0 verified, Q23/Q43 no false refusal, 0 fabricated authorities, 0 missing/schema-invalid verified, 0 accessor bypass.**

## 26. Model Comparison

No stronger validator model available (gpt-4o-mini only; 403 on others). Deterministic guards + grounded schema/prompt used instead. Stated accurately; no false model-upgrade claim.

## 27. Precision & Latency

11 verified / 53 runs; invalid 0; questionable 1; safe under-claims ~30; unsafe approvals 0; guard activations 4; malformed 0; timeout 0. Latency avg ~22s (P50 ~20.5s, P95 ~31s).

## 28. Residual P0–P3

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | — |
| P1 | 0 | Q8 competence deterministically fixed; Q5 re-emergence closed; accessor hardened; 0 invalid verified after re-validation. |
| P2 | 3 | Deterministic guards are cluster-specific (stronger/grounded validator model is the general fix); validator precision cost; non-LOA restriction gap. |
| P3 | 1 | Validator latency. |

## 29. Governance Consequence

P0 0, P1 0, 0 invalid verified (re-validated), Q8/Q5/Q35/Q41 safe, accessor safe, legitimate verified reachable, controls preserved, regressions green, security clean → **PASS WITH RECOMMENDATIONS**. Phase 10A remains **REOPENED pending the full fact-check rerun**. Phase 10B/10C: BLOCKED. Adversarial: DEFERRED. Independent closure review: DEFERRED.

**Honest caveat:** the deterministic-guard approach closes the *known* defect clusters (Q8, Q5) but is inherently cluster-specific under the gpt-4o-mini limitation; a future full rerun (A13) could surface a new LLM-nondeterministic pattern. The standing highest-value recommendation is a stronger/retrieval-grounded validator model.

## 30. Exact Next Task

**`PHASE-10A13-FULL-FACTCHECK-RERUN-3`** (after an independent A12 review) — the full 50×3 rerun to confirm 0 invalid verified corpus-wide. A13 may proceed only with P0=0 and P1=0.

## Evidence

`evaluation/results/phase-10a12-validator-competence-remediation-1.json`; `.../phase-10a12-.../` (q5-revalidation-and-competence-matrix.json, a12-run-log.json, payloads/ ×48, evidence-manifest.json with SHA-256). Code: `services/answer-support-validator.js` (guards + schema + prompt), `services/trust-contract.js` (accessor hardening), `tests/phase-10a12-...test.mjs` + updated mocks (commits `ca5b740`, `64502b7`, `b01b0507`).
