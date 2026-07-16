# PHASE-10A12-R2 — Superseded-Evidence Map

The independent review of A12-R1 found (P1) that the committed A12-R1 evidence contained a
`Q5-r2.json` with an invalid `VERIFIED_CONTROLLING` and **no committed post-guard live
payload** proving the runtime now blocks it, and that counts were unreconciled.

This map records which A12-R1 evidence is **superseded** and where the authoritative
post-guard evidence now lives.

| A12-R1 artifact | Status | Superseded by (A12-R2, runtime `bd19b3d`) |
|---|---|---|
| `phase-10a12-validator-competence-remediation-1/payloads/Q5-r2.json` (invalid VERIFIED) | **SUPERSEDED — historical, retained for audit trail** | `phase-10a12-validator-competence-remediation-2/payloads/Q5-p2.json` → `RELATED_AUTHORITY_ONLY` (stage `material-exception-omission`) |
| A12-R1 unreconciled counts | **SUPERSEDED** | `count-reconciliation.json` (reconciled from final runtime only) |
| A12-R1 Q8 reversed-VAT payload (`Q8-r2.json`) | **SUPERSEDED** | A12-R2 Q8 exact 0/3 verified; reversal blocked by `detectTreatmentContradiction` |

## Authoritative post-guard evidence (A12-R2)

- **Single runtime:** every A12-R2 payload was produced at `bd19b3d7a220132a618a3777a33fdfa0b34099ea` and stamped with that commit; all counts in `count-reconciliation.json` derive from this set only.
- **Q5 invalid verified = 0**, **Q8 invalid verified = 0**, **outcome-prediction verified = 0**, **false refusals = 0**, **invalid verified overall = 0**.
- The A12-R1 invalid `Q5-r2` payload is **not deleted** (institutional audit trail) but is **marked superseded** and must not be counted toward current metrics.
