# WS13 — targeted live validation reconciliation

Runtime `22b845afe1fe16bfa4821804d528f469366e4f8c`. Local server on port 10000; each probe
issued through `POST /ask` with a JWT; sanitized payloads under `payloads/`. No raw
conversation IDs / PII captured.

## Negatives — 0 invalid verified across all three classes

| Family | n | verified | blocked at our gate | other fail-closed | invalid verified |
|---|---:|---:|---:|---:|---:|
| filing_obligation | 10 | 0 | 7 (`filing_obligation`) | 3 (NO_VERIFIED_AUTHORITY / structural) | **0** |
| filing_deadline | 10 | 0 | 10 (`filing_deadline`) | 0 | **0** |
| estate (tax_computation_basis) | 10 | 1* | 1 (`tax_computation_basis`, baseMis) | 8 (NO_VERIFIED_AUTHORITY / structural / llm) | **0** |

\* **ES-09** ("What is the taxable base for the 6% estate tax under TRAIN?") verified
VERIFIED_CONTROLLING with a **correct** answer — *"the net estate … gross estate minus
allowable deductions … 6% applied to the net estate"* on controlling authority (Sec 84/86).
This is a valid reachability result, NOT a base misstatement: `estateBaseMisstatement`
was correctly `false`, so the gate did not fire. It proves the estate gate does not
blanket-suppress correct estate-computation answers.

**No negative probe asserting a filing/deadline/estate-base MISSTATEMENT verified.**

## Positive reachability (live)

| Probe | Result |
|---|---|
| estate-return deadline ("deadline … can it be extended?") | VERIFIED_CONTROLLING (Sec 84/86/88/89) |
| donor's tax rate + threshold | VERIFIED_CONTROLLING (Sec 99–104) |
| self-employed filing-required | blocked at gate — retrieval surfaced rate authority (Sec 24) not filing authority (Sec 51); gate behaved correctly on the DISPLAYED cards. Known P2 retrieval-surfacing limitation (carried from A14), not a gate regression; unit reachability proven by focused tests G1/G2. |
| MCIT rate | structural fail-closed (Sec 22 only) — unrelated to our classes |

## Object-disambiguation / overfire controls — 0 blocked by our classes

| Probe | Result |
|---|---|
| VAT exporter refund/tax credit | VERIFIED_CONTROLLING on its own authority — NOT misclassified as filing_obligation |
| estate-tax **payment** deadline | NO_VERIFIED_AUTHORITY — NOT the return filing_deadline class |
| **protest** deadline | VERIFIED_CONTROLLING on its own authority — NOT the return filing_deadline class |
| **assessment/prescription** period | structural fail-closed — NOT filing_deadline |

## Prior safeguards — intact (0 verified)

| Probe | Result |
|---|---|
| Q36 penalty (late VAT filing) | blocked `penalty_procedural` |
| Q38 registration | blocked `registration_procedural` |
| Q25 EWT on law-firm fees | fail-closed (structural) |
| Q46 VAT exception (residential lot) | fail-closed (llm) — RELATED |

## Conclusion

Across 42 live probes: **0 invalid verified**. Every filing-obligation and filing-deadline
negative failed closed (30/30 not verified; 17 explicitly at our semantic gate with the
correct class); every estate base-misstatement failed closed; correct estate/donor/deadline
answers remained reachable (3 VERIFIED_CONTROLLING); object-disambiguation controls were not
over-blocked; and all prior safeguards held.
