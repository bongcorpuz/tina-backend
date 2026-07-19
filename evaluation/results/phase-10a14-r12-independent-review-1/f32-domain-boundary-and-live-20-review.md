# F32, Domain-Boundary, And Live-20 Review

## Live Campaign Counts

- Live payloads: 20.
- Runtime: `d91b6978cda1ed3e31740566de8ef5f2061868ce`.
- Trust counts: RELATED_AUTHORITY_ONLY=11, NOT_APPLICABLE=6, NO_VERIFIED_AUTHORITY=2, VERIFIED_CONTROLLING=1.
- Persistence status counts: PERSISTED=6, null=14.
- API unsafe: 0.
- History unsafe: 0.
- API/history mismatch: 0.
- Rejected generated output exposed: 0.

## F32

`P1-F32-CONDITIONAL` now records API/history equality. Its live trust is `NO_VERIFIED_AUTHORITY`, not `NOT_APPLICABLE`, and `persistenceStatus` is null. This closes the observed empty-history mismatch, but it is not evidence that the domain-boundary persistence contract is correct on save failure.

## Domain Boundary

`P2-DOMAIN-BOUNDARY` records `NOT_APPLICABLE`, `DOMAIN_BOUNDARY`, `PERSISTED`, and API/history equality for the successful-path case.
