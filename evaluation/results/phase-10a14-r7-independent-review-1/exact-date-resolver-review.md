# Exact-Date Resolver Probe Evidence

Independent command:

`node --input-type=module -e "import { resolveSection51AuthorityChain } from './section51-authority-chain.js'; ..."`

## Required Positive/Negative Boundary Behavior

- 2025-01-15: PRE_EFFECTIVITY, RA 12214 not applicable.
- 2025-06-01: PRE_EFFECTIVITY, RA 12214 not applicable.
- 2025-06-13 through 2025-08-04: fail closed as unresolved window under R7's chosen model.
- 2025-08-05 and later: POST_EFFECTIVITY under R7's chosen model.

## Release-Blocking Probe Failures

| Probe | Observed |
|---|---|
| transactionDate 2026-02-30 | selectedDate null; resolvedYear 2026; POST_EFFECTIVITY; sufficient true; RA 12214 applicable |
| transactionDate 2026/01/15 | selectedDate null; resolvedYear 2026; POST_EFFECTIVITY; sufficient true; RA 12214 applicable |
| legalAsOfDate 2026-01-01 only | selectedDate null; resolvedYear 2026; POST_EFFECTIVITY; sufficient true; RA 12214 applicable |
| taxableYear 2026 only | selectedDate null; resolvedYear 2026; POST_EFFECTIVITY; sufficient true; RA 12214 applicable |
| transactionDate not-a-date + legalAsOfDate 2026-01-01 | selectedDate null; resolvedYear 2026; POST_EFFECTIVITY; sufficient true; RA 12214 applicable |
| transactionDate 2026-13-01 | sufficient false, reason filing_period_not_resolved, but applicableAmendments/currentAuthoritySet still include RA 12214 |

## Adjudication

The resolver is not safe for malformed material transaction dates, and it permits non-transaction-date facts to decide a transaction-specific Section 51(C)(2) amendment boundary. This is P1.