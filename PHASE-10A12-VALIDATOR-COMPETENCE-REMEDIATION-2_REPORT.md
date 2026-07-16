# PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-2 — Report

**Decision: PASS WITH RECOMMENDATIONS**

Remediates the independent review of A12-R1 (**REVISIONS REQUIRED** — P0=0, P1=1, P2=6, P3=1).

- Start HEAD: `d8338a15c0a34ddd3620edf8a7dd617067225133`
- Final runtime: `bd19b3d7a220132a618a3777a33fdfa0b34099ea`
- Runtime commits: `0fab628` (accessor hardening + Q8 refusal fix), `bd19b3d` (outcome-prediction guard, CREATE MORE denial guard, tax-controversy boundary allow)
- Evidence: `evaluation/results/phase-10a12-validator-competence-remediation-2/`

## Governance alignment

Strengthens **Authority Lock** and **answer-support attestation**: locked/verified authority
must survive downstream processing, and no answer may be verified without a valid schema and
without surviving the deterministic fail-closed guards. Every fix moves TINA toward the
Philippine Tax Operating System by protecting authority integrity over answer fluency.

## Findings resolved

### P1 — Q5 post-guard evidence + count reconciliation (RESOLVED)
The A12-R1 evidence carried an invalid `Q5-r2` `VERIFIED_CONTROLLING` with no committed
post-guard proof and unreconciled counts. At the final runtime, **committed post-guard Q5
evidence exists**: `Q5-p2.json` (the CREATE MORE **denial** answer) is blocked to
`RELATED_AUTHORITY_ONLY` via the `material-exception-omission` guard. **Q5 invalid verified = 0.**
All counts are reconciled from the **final runtime only** (`count-reconciliation.json`):
66 payloads = 13 VERIFIED + 44 RELATED + 9 NO_VERIFIED.

### P2 — Direct schema accessor hardening (RESOLVED)
`validateVerdictSchema` / `readOwnBoolean` reject accessor descriptors **before** value
access via `Object.getOwnPropertyDescriptor`. Getters never execute; throwing getters and
proxies that throw in `getOwnPropertyDescriptor` fail closed without propagating. Verified by
`tests/phase-10a12-r2-validator-competence-remediation-2.test.mjs` (R2-1..R2-8).
**Accessor getter executions = 0.**

### P2 — Q8 paraphrase false refusals (RESOLVED)
Residential-lease / lessor / lessee / per-unit / statutory-threshold boundary allow-patterns
were added. Q8 paraphrases now **ALLOW**; non-tax ("bake bread") still **REJECT**.
**Q8 false refusals = 0.**

### P2 — Generic (non-LOA) outcome-prediction gap (RESOLVED)
`detectOutcomePredictionRequest` fails closed on guarantee/prediction questions independent
of any LOA gate. RES-1/RES-6 (previously VERIFIED) are now `RELATED_AUTHORITY_ONLY`
(stage `outcome-prediction`). **Unrestricted outcome predictions = 0.**

### P2 — Source-grounding claim correction (CORRECTED)
The implementation is **not** described as fully source-grounded. Architecture:
`CLUSTER_SPECIFIC_WITH_FAIL_CLOSED_SCHEMA` — cluster-specific deterministic guards plus
fail-closed schema/accessor validation. `sourceExcerptGrounded: false`. Full operative
source-excerpt grounding is a **P2 carryover**.

### P2 — Evidence reconciliation / superseded map (RESOLVED)
`superseded-evidence-map.md` records the A12-R1 invalid `Q5-r2` as historical (retained for
audit trail, **marked superseded**) and points to the authoritative A12-R2 post-guard
payloads. All current metrics derive only from the final runtime set.

## Official-authority basis (Q5/Q8/Q35/Q41)
Statute / BIR regulation / official issuances only (no secondary sources). See
`worksheets/official-authority-worksheets.md`.
- **Q8:** NIRC Sec. 109 (as amended by RA 10963/TRAIN) + **RR 13-2018** — residential unit
  ≤ ₱15,000/month **per unit is VAT-exempt regardless of aggregate annual gross receipts**;
  the ₱3M aggregate governs only units renting above ₱15,000. Not generalized to unrelated
  transactions.
- **Q5:** NIRC Sec. 107 (12% import VAT) + **RA 12066 (CREATE MORE)** — registered export
  enterprise importation directly attributable to its registered activity is VAT-exempt;
  a uniform-12% omission or a denial of the exemption is incorrect and blocked.

## Verified-answer audit (final runtime)
13 verified, all schema-valid, **0 invalid verified**:
- `Q5-p1` correctly pairs 12% import VAT with export zero-rating.
- `Q8-p5/p10/p12` correctly hold residential ≤ ₱15,000/unit VAT-exempt regardless of threshold.
- `VC-Q32/34/47`, `M-Q6/Q12/Q15/Q26/Q30` standard correct controls; `MISSING-1` valid meta-answer.

## Metrics (final runtime `bd19b3d`)
| Metric | Value |
|---|---|
| Total payloads | 66 |
| VERIFIED / RELATED / NO_VERIFIED | 13 / 44 / 9 |
| Q5 invalid verified | 0 |
| Q8 invalid verified | 0 |
| Q8 false refusals | 0 |
| Outcome-prediction verified | 0 |
| Accessor getter executions | 0 |
| Invalid verified overall | 0 |
| All verified schema-valid | true |
| Verified-control reachability | 3/5 |
| Guard activations | 6 |

## Model inventory
`gpt-4o-mini` AVAILABLE; `gpt-4o` / `gpt-4-turbo` / `o1` → 403 `model_not_found`
(AUTHORIZATION_DENIED). Because stronger judge models are unavailable, safety-critical
correctness is not delegated to the LLM stage — deterministic fail-closed guards run first
and override LLM approval. See `model-inventory.json`.

## Recommendations (carryovers)
- **P2:** Implement full operative source-excerpt grounding (replace cluster-specific
  deterministic guards with source-anchored verification).
- **P3:** Complete the 30-question mini fact-check (20/30 captured this runtime; remainder
  skipped on transient fetch).

## STOP conditions honored
A13 not begun; adversarial suite not run; Phase 10A not closed; Phase 10B/10C not begun;
independent review not run this session; Gemini not rerun.
