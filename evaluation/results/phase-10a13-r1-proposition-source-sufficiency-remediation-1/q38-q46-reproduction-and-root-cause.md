# PHASE-10A13-R1 — Q38 & Q46 Reproduction and Root Cause (WS1)

Before patching, the committed A13 payloads were replayed through the CURRENT (pre-patch) validator.
All four verified with `answerSupport.verifiedEligible = true`, and `evaluatePropositionSourceSufficiency`
returned `applicable=false` (did NOT catch them) — proving the runtime permitted the invalid/questionable
verification:

| run | committed trust | pre-patch propGate |
|---|---|---|
| Q38-r1 | VERIFIED_CONTROLLING | applicable=false (uncaught) |
| Q38-r2 | VERIFIED_CONTROLLING | applicable=false (uncaught) |
| Q38-r3 | VERIFIED_CONTROLLING | applicable=false (uncaught) |
| Q46-r1 | VERIFIED_CONTROLLING | applicable=false (uncaught) |

## Q38 — registration/procedural source laundering (P1-1)
"Is a new business required to register with the BIR, and what form is used?" The answer cited **BIR
Form 1902** (registration for individuals earning purely COMPENSATION income = employees) as a
business-registration form (correct is 1901 self-employed / 1903 juridical), on source cards that were
**withholding regulations** (RR 2-1998/11-2018) + **foundational** NIRC Sec 2/3 — no registration
authority (Sec 236). Decisive registration/form proposition verified on topic-mismatched/foundational
authority. Root cause: registration/procedural proposition class was uncovered by the R6 gate.

## Q46 — transaction-specific VAT exception laundering (P1-2)
"Is the sale of gold by a small-scale miner to the BSP subject to VAT?" "Not subject to VAT" conflated
VAT-exemption with zero-rating, justified by hedged reasoning ("may be exempt under specific provisions
or interpretations") on **general VAT-imposition** sections (105-108, RR 16-2005) — no specific
exemption/zero-rating/exception authority. Root cause: transaction-specific VAT-exception proposition
class was uncovered by the R6 gate.

## Post-patch (runtime 508a64d)
Replaying the same committed payloads through the patched validator: Q38-r1/r2/r3 fail closed
(`registration_proposition_without_registration_authority`); Q46-r1 fails closed
(`vat_exception_proposition_without_exception_authority`). Targeted live rerun: Q38 exact x5 + 3
paraphrases → 0 verified; Q46 exact x5 → 0 verified. Valid reachability preserved (Q46-p1 correctly
verifies as VAT-exempt on the controlling Sec 109 authority).
