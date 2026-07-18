# Legal-Date Utility Review

The standalone legal-date-utils.js utility is mostly sound in isolation:

- strict YYYY-MM-DD regex;
- invalid month/day rejection;
- leap-year handling;
- date-only arithmetic and comparison without Date object timezone conversion;
- inclusive/exclusive helper semantics are explicit.

The release-blocking defect is not the utility itself. The defect is integration: section51-authority-chain.js uses strict extraction first, but falls back to resolveAsOfYear(), which uses JavaScript Date parsing and can normalize malformed material transaction dates.

Independent probes:

| Probe | Result |
|---|---|
| transactionDate 2026-02-30 | POST_EFFECTIVITY, sufficient true, RA 12214 applicable |
| transactionDate 2026/01/15 | POST_EFFECTIVITY, sufficient true, RA 12214 applicable |
| transactionDate not-a-date + legalAsOfDate 2026-01-01 | POST_EFFECTIVITY, sufficient true, RA 12214 applicable |
| transactionDate 2026-13-01 | sufficient false, but metadata still carries RA 12214 in applicable/current fields |

These fail the Stage A malformed-date and missing-date requirements.