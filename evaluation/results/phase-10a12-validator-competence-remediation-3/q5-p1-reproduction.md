# PHASE-10A12-R3 — Q5-p1 Reproduction (STEP 2)

## Verdict: Q5-P1 INVALID VERIFIED REPRODUCED

The confirmed A12-R2 P1-1 invalid `VERIFIED_CONTROLLING` was reproduced by replaying the
exact committed A12-R2 payload
(`phase-10a12-validator-competence-remediation-2/payloads/Q5-p1.json`) through the
answer-support validator, and the fix was confirmed both deterministically and against the
live final runtime.

## Exact committed Q5-p1 (A12-R2, runtime `bd19b3d`)

- **Prompt:** "Is import VAT always 12% for goods used to make export products?"
- **Answer proposition:** import VAT is "generally 12%", but goods used to produce export
  products "may qualify for zero-rating under specific conditions".
- **Claimed treatment:** zero-rating (incentive treatment) for export-production imports.
- **Cited authorities (source cards):** `NIRC Sec. 107`, `RR No. 16-2005` — generic VAT
  authority only.
- **Missing basis:** no `RA No. 12066` / CREATE MORE / NIRC Sec 295 export-enterprise
  exemption authority; no qualifying condition (registration, direct attribution, period).
- **Source-support mismatch:** a specific incentive (zero-rating/exemption) conclusion was
  drawn from a generic VAT statute + general VAT regulation.
- **A12-R2 validator verdict:** `answerSupport.verifiedEligible = true`, stage `llm`
  (gpt-4o-mini approved; `eligibleForVerifiedControlling=true`).
- **Deterministic guard result (A12-R2):** `detectImportVatExemptionOmission` did NOT fire
  (the answer said "generally 12%", not a UNIVERSAL 12%, and did not explicitly DENY the
  exemption), so no guard blocked it.
- **Final trust state (A12-R2):** `VERIFIED_CONTROLLING` — INVALID.
- **Exact point of unsupported verification:** the LLM `llm` stage, because no deterministic
  pre-gate covered "an incentive treatment GRANTED on generic authority alone".

## Post-fix reproduction (runtime `6ce2d6f`)

1. **Deterministic replay of the committed payload** through
   `evaluateImportVatIncentiveSourceSufficiency` / `evaluateAnswerSupport`:
   - `applicable = true`, `incentiveTreatmentClaimed = true` (zero-rating),
     `specificIncentiveAuthorityInSources = false`, `genericAuthorityOnly = true`.
   - Result: `sufficient = false`, stage `incentive-source-sufficiency`,
     `verifiedEligible = false`. **The exact committed payload no longer verifies.**
   - Covered by regression test `R3-1` (tests/phase-10a12-r3-*.test.mjs).

2. **Live final-runtime Q5-p1 exact ×5** (`Q5-p1a..e`): 5/5 `RELATED_AUTHORITY_ONLY`,
   0 verified (caught at `material-exception-omission` or `incentive-source-sufficiency`).

3. **Historical Q5-r2 exact ×3** (`Q5-r2a..c`): 3/3 `RELATED_AUTHORITY_ONLY`, 0 verified.

**Q5 invalid verified across the full live matrix (18 runs): 0.**
