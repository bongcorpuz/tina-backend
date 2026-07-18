# Legal And Temporal Resolver Review

## Section 51-A Origin

R6 deterministic resolver evidence is positive for Section 51-A origin:

- `resolveSection51AuthorityChain({ propositionClass:"substituted_filing" })` reports `originatingLaw:"RA 10963"` and `baseCode:"RA 8424"`.
- `buildSection51AmendmentChainMetadata("NIRC Sec. 51-A")` reports `originatingLaw:"RA 10963"`.
- Sanitized public card test for `NIRC Sec. 51-A` preserves `chainReviewed:true` and `originatingLaw:"RA 10963"`.

## Event-Aware Defect

R6 is not date-aware for later-amendment propositions. It stores exact effectivity strings but compares only `effectivityYear` to `asOfYear`. Therefore all 2025 transaction dates are treated as if RA 12214 applies.

Deterministic probe output summary:

- `transactionDate:"2025-01-15"` -> `applicableAmendments:["RA 12214"]`, `notYetEffective:[]`, `currentAuthoritySet:["NIRC Sec. 51(C)","RA 12214"]`.
- `transactionDate:"2025-06-01"` -> same.
- `transactionDate:"2025-07-15"` -> same.

This collapses pre-effectivity and post-effectivity 2025 events and fails the requested event-aware temporal resolver standard.
