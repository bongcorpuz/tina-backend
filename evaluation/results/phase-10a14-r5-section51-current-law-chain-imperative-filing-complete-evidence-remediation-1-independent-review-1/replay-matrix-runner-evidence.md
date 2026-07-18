# Replay, Matrix, And Runner Evidence

## Focused Suite

node tests\phase-10a14-r5-section51-current-law-chain-and-imperative-filing.test.mjs -> 25 passed, 0 failed.

## Independent Probes

- buildSection51AmendmentChainMetadata("NIRC Sec. 51-A") returns officialAmendmentLaws [RA 8424] only; RA 10963 missing.
- resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2023 }) returns RA 11976 in amendingAuthorities, despite pre-effectivity period.
- "File the annual income tax return" on NIRC Sec. 24 only -> filing_obligation_proposition_without_matching_return_authority.
- Current Sec. 51(C)(2) capital-gains timing without RA 12214 -> section_51_later_amendment_missing.

## R3 Failed-Positive Controls

Deterministic controls on final R5 runtime:

- Individual filing on Sec. 23/24/27 only -> blocked.
- Individual filing on Sec. 51 -> sufficient.
- Individual deadline on Sec. 23/24/27 only -> blocked.
- Individual deadline on Sec. 51(C) -> sufficient.
- Substituted filing on Sec. 51-A -> sufficient at deterministic validator layer.
- Individual deadline on estate authority -> blocked.
- Imperative filing on rate-only authority -> blocked.

## Governed R5 Live Matrix

Committed R5 live matrix contains VERIFIED_CONTROLLING for individual filing obligation and individual filing deadline. It does not contain a VERIFIED_CONTROLLING substituted-filing result; both substituted rows are RELATED_AUTHORITY_ONLY. All rows show chainReviewed=false.

## All-26 A14 Replay

Independent deterministic replay of all 26 A14 VERIFIED_CONTROLLING payloads:

- Blocked exactly 9: Q12-r1/r2/r3, Q30-r1/r2/r3, Q34-r1/r2/r3.
- Preserved exactly 17.
- Mismatch count: 0.
- Q3 and Q47 did not overfire; Q32 remained reachable.

## Prior Safeguards

The fresh deterministic runner passed 195/0 twice and includes the R1/R2/R3/R4/R5 focused suites plus prior validator/trust/accessor/outcome-prediction controls. A complete governed live prior-safeguard matrix with public cards, persistence, request/response hashes, and final trust state for every packet item remains absent.

## Runners

- Deterministic cycle 1: syntax 10/0, deterministic suites 195/0, exit 0.
- Deterministic cycle 2: syntax 10/0, deterministic suites 195/0, exit 0.
- Restricted staging: 7 run, 1 failed due phase-09r staging reachability assertion.
- Network-enabled staging cycle 1: 7/0, exit 0.
- Network-enabled staging cycle 2: 7/0, exit 0.
