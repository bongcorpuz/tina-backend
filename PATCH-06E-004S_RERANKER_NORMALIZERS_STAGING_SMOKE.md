# PATCH-06E-004S Reranker Normalizers Staging Smoke

## Summary

Result: PASS

PATCH-06E-004S ran a narrow staging smoke validation after extracting pure reranker normalizers into `reranker-normalizers.js`. Staging was healthy and serving the expected PATCH-06E-004 commit. Reranker-sensitive authority behavior, source availability, exact authority diagnostics, RA 10963/TRAIN bridge behavior, and visible source-card output remained consistent with the prior PATCH-035D stabilization baseline.

No backend source code, DB/indexing data, corpus data, RAG data, vector-store data, or PDF ingestion state was modified.

## Staging Health

- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Health status: `ok`
- Deployed commit: `c35b50741f8386c9b5c7739f85fb8a4562369138`
- Expected commit: `c35b50741f8386c9b5c7739f85fb8a4562369138`
- Environment: `staging`
- Indexing running: `false`
- Vector store: 5,346 chunks / 102 sources

## Smoke Matrix

| # | Query | Expected sourceAvailability | Actual sourceAvailability | Source count | exactAuthorityMatches | Visible source-card title/label | RA10963 bridge markers | Pass/Fail | Notes |
|---:|---|---|---|---:|---:|---|---|---|---|
| 1 | What is RA 10963? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | Public marker not exposed; availability/card controls preserved | PASS | RA 10963 bridge remains authority-found. |
| 2 | What is the TRAIN Law? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | Public marker not exposed; availability/card controls preserved | PASS | TRAIN Law bridge remains authority-found. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 6 | Public marker not exposed; availability/card controls preserved | PASS | Full TRAIN title bridge remains authority-found. |
| 4 | What is RA 11534? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | n/a | PASS | CREATE/RA 11534 remains independent of RA 10963 bridge. |
| 5 | What is the CREATE Act? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | n/a | PASS | CREATE alias remains authority-found. |
| 6 | What is NIRC Section 23? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 21 | n/a | PASS | NIRC Sec. 23 handling preserved. |
| 7 | What does NIRC Section 57 provide? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 15 | NIRC Sec. 57 | n/a | PASS | NIRC Sec. 57 remains first visible card. |
| 8 | What does NIRC Section 58 provide? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 21 | NIRC Sec. 58 | n/a | PASS | NIRC Sec. 58 remains first visible card. |
| 9 | What does RR 2-98 provide on expanded withholding tax? | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | n/a | PASS | RR 2-98 authority-safe behavior preserved. |
| 10 | What is CTA Case No. 9369? | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9369 | n/a | PASS | CTA visible source card remains intact. |
| 11 | Are there jurisprudence cases on withholding tax? | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9711 | n/a | PASS | Jurisprudence guard/source-card behavior preserved. |
| 12 | What is BIR Ruling DA-489-03? | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 0 | 4 | n/a | n/a | PASS | BIR Ruling exclusion remains preserved. |
| 13 | What is withholding tax? | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | n/a | PASS | Generic WHT guard baseline preserved under statutory support. |
| 14 | Explain EWT. | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | n/a | PASS | Generic EWT guard baseline preserved under statutory support. |

## Notes

- RA 10963 / TRAIN public responses do not expose internal bridge marker fields, but the external controls stayed stable: `AUTHORITY_FOUND`, `sourceCount=1`, `exactAuthorityMatches=12`, and visible NIRC source cards.
- CREATE / RA 11534 continued to resolve through `RA No. 11534`, not through the RA 10963 bridge.
- Broad withholding tax and EWT matched the PATCH-035D baseline: `AUTHORITY_FOUND` is expected when statutory support is present.
- No staging evidence indicated a reranker scoring, authority marker, sourceAvailability, or source-card regression.

## Confirmation

- No backend source code was modified.
- No refactor was started.
- PATCH-06E-005 was not started.
- No PDFs were ingested.
- No RAG, source corpus, DB/indexing, or vector-store data was modified.
