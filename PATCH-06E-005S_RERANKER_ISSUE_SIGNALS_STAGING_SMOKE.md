# PATCH-06E-005S Reranker Issue-Signals Staging Smoke

## Summary

Result: PASS

PATCH-06E-005S ran a narrow staging smoke validation after extracting pure reranker issue-signal helpers into `reranker-issue-signals.js`. Staging was healthy and serving the expected PATCH-06E-005 commit. Issue-signal-sensitive authority behavior, source availability, exact authority diagnostics, RA 10963/TRAIN bridge behavior, WHT/EWT behavior, jurisprudence routing, and visible source-card output remained consistent with the stabilized baseline.

No backend source code, DB/indexing data, corpus data, RAG data, vector-store data, or PDF ingestion state was modified.

## Staging Health

- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Health status: `ok`
- Deployed commit: `c8bf99c179aa57edfa49c0020adf9220928760c3`
- Expected commit: `c8bf99c179aa57edfa49c0020adf9220928760c3`
- Environment: `staging`
- Indexing running: `false`
- Vector store: 5,346 chunks / 102 sources

## Smoke Matrix

| # | Query | Expected sourceAvailability | Actual sourceAvailability | Source count | exactAuthorityMatches | Visible source-card title/label | Pass/Fail | Notes |
|---:|---|---|---|---:|---:|---|---|---|
| 1 | What is RA 10963? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | PASS | RA 10963 bridge remains authority-found. |
| 2 | What is the TRAIN Law? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | PASS | TRAIN Law bridge remains authority-found. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 6 | PASS | Full TRAIN title bridge remains authority-found. |
| 4 | What is RA 11534? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | PASS | CREATE/RA 11534 remains independent of RA 10963 bridge. |
| 5 | What is the CREATE Act? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | PASS | CREATE alias remains authority-found. |
| 6 | What is NIRC Section 23? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 21 | PASS | NIRC Sec. 23 handling preserved. |
| 7 | What does NIRC Section 57 provide? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 15 | NIRC Sec. 57 | PASS | NIRC Sec. 57 remains first visible card. |
| 8 | What does NIRC Section 58 provide? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 21 | NIRC Sec. 58 | PASS | NIRC Sec. 58 remains first visible card. |
| 9 | What does RR 2-98 provide on expanded withholding tax? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | PASS | RR 2-98 issue signal and source-card behavior preserved. |
| 10 | What is CTA Case No. 9369? | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9369 | PASS | CTA case signal and visible card preserved. |
| 11 | Are there jurisprudence cases on withholding tax? | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9711 | PASS | Jurisprudence/WHT signal behavior preserved. |
| 12 | What is BIR Ruling DA-489-03? | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 0 | 4 | n/a | PASS | BIR Ruling exclusion remains preserved. |
| 13 | What is withholding tax? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | PASS | Broad WHT baseline preserved under statutory support. |
| 14 | Explain EWT. | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | PASS | Broad EWT baseline preserved under statutory support. |

## Notes

- RA 10963 / TRAIN exact authority behavior stayed stable: `AUTHORITY_FOUND`, `sourceCount=1`, and `exactAuthorityMatches=12`.
- CREATE / RA 11534 continued to resolve through `RA No. 11534`, not through the RA 10963 bridge.
- NIRC Sec. 23 / 57 / 58, RR 2-98, CTA Case No. 9369, BIR Ruling exclusion, generic WHT, and EWT controls all matched expected staging behavior.
- No staging evidence indicated a reranker issue-matching, authority marker, sourceAvailability, or source-card regression.

## Confirmation

- No backend source code was modified.
- No refactor was started.
- The next extraction was not started.
- No PDFs were ingested.
- No RAG, source corpus, DB/indexing, or vector-store data was modified.
