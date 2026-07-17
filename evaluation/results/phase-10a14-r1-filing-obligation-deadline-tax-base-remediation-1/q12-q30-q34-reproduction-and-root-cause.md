# PHASE-10A14-R1 — Q12/Q30/Q34 Reproduction & Root Cause (WS1)

Replaying the committed A14 payloads through the PRE-PATCH validator: Q12-r1/r2/r3, Q30-r1/r2/r3,
Q34-r1/r2/r3 all had verifiedEligible=true and evaluatePropositionSourceSufficiency returned
applicable=false (uncaught) -- proving the runtime permitted the compound-proposition laundering.

## Q12 — filing obligation on rate/residency authority (P1-1)
"Is an individual with ₱250,000 required to file an income tax return?" -> "not required to file, as
this amount is exempt from income tax." Sources: NIRC Sec 24 (individual rate), 23 (residency), 27
(corporate). No filing authority (Sec 51). Root cause: a NO-TAX-DUE conclusion laundered into a
NO-FILING-REQUIRED conclusion; the filing_obligation proposition class was uncovered.

## Q30 — estate-tax base/deduction/threshold conflation (P1-2)
"What is the estate tax rate under TRAIN?" -> "a flat rate of 6% on the value of the estate exceeding
Five Million Pesos (₱5,000,000)." The ₱5M is the STANDARD DEDUCTION (Sec 86), not a threshold on the
estate value; the base is the NET estate. The answer applies the rate to "the value of the estate
exceeding [amount]", misstating the base. Root cause: rate/base/deduction/threshold conflated; the
tax_computation_basis (estate) class was uncovered.

## Q34 — filing deadline on rate/residency authority (P1-3)
"What is the deadline for the annual income tax return of an individual?" -> "on or before April 15."
Sources: NIRC Sec 23/24/27 (residency/rate/corporate). No deadline authority (Sec 51). Root cause: a
DEADLINE conclusion supported only by rate/residency provisions; the filing_deadline class was
uncovered.

## Post-patch (runtime b7e40fc)
Committed-payload replay: Q12 (x3) -> filing_obligation fail closed; Q34 (x3) -> filing_deadline fail
closed; Q30 (x3) -> tax_computation_basis fail closed (estate base misstatement). Targeted live
rerun: Q12 exact x5, Q30 exact x5, Q34 exact x5 -> 0 verified. Valid reachability preserved: Q32
(estate-return deadline) VERIFIED on the estate-return provisions (Sec 91); Q47 (donor's 6%) and Q15
(MCIT) VERIFIED.
