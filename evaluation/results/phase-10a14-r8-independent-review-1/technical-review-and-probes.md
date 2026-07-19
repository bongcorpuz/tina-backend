# Technical Review And Probes

Strict date utility:
- whole-string YYYY-MM-DD required;
- invalid calendar dates rejected;
- leap-year behavior correct;
- no JavaScript Date parsing for legal material dates;
- no timezone conversion;
- no locale parsing;
- no year-only comparison;
- fifteen calendar days addition correct;
- effectivity boundary is inclusive.

Required probe outcomes:

| Input | Outcome |
| --- | --- |
| 2024-02-29 | valid |
| 2025-02-29 | invalid |
| 2026-02-30 | invalid / INVALID_DATE if used as transactionDate |
| 2025-13-01 | invalid / INVALID_DATE |
| 2025-00-10 | invalid / INVALID_DATE |
| 2025/06/19 | invalid / INVALID_DATE |
| June 19, 2025 | invalid / INVALID_DATE |
| blank/null/undefined | PERIOD_UNRESOLVED |
| 2025-06-18 | PRE_EFFECTIVITY |
| 2025-06-19 | POST_EFFECTIVITY |
| 2025-06-20 | POST_EFFECTIVITY |

Transaction-date contract:
- Section 51(C)(2) accepts only transactionDate or dispositionDate.
- taxableYear, legalAsOfDate, filingEventDate, current year, and no dates all fail closed.
- malformed transactionDate plus valid legalAsOfDate remains INVALID_DATE.
- malformed transactionDate plus valid taxableYear remains INVALID_DATE.
- RA 12214 is absent from applicableAmendments/currentAuthoritySet for failed adjudications.

Exact boundary review:

| Input | Result |
| --- | --- |
| 2024-12-31 | PRE_EFFECTIVITY |
| 2025-01-15 | PRE_EFFECTIVITY |
| 2025-06-01 | PRE_EFFECTIVITY |
| 2025-06-18 | PRE_EFFECTIVITY |
| 2025-06-19 | POST_EFFECTIVITY |
| 2025-06-20 | POST_EFFECTIVITY |
| 2025-07-01 | POST_EFFECTIVITY |
| 2025-08-05 | POST_EFFECTIVITY |
| 2025-12-31 | POST_EFFECTIVITY |
| 2026-01-01 | POST_EFFECTIVITY |
| missing | PERIOD_UNRESOLVED |
| malformed | INVALID_DATE |

Fail-closed metadata:
- INVALID_DATE and PERIOD_UNRESOLVED: applicableAmendments empty; currentAuthoritySet excludes RA 12214; no POST_EFFECTIVITY metadata survives.
- PRE_EFFECTIVITY: RA 12214 is not applicable or controlling.
- Public-card helper exposes temporalStatus and temporalSufficient and preserves clean authority sets.

