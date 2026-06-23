# PATCH-06E-003S Boundary Pattern Staging Smoke

## Summary

Result: PASS

PATCH-06E-003S ran a narrow staging smoke validation after the Philippine tax boundary pattern constants extraction. The staging deployment remained healthy and was serving the expected PATCH-06E-003 commit. Domain-boundary accept/reject behavior, exact authority acceptance, source availability, and visible source-card behavior remained unchanged for the tested controls.

No backend source code, DB/indexing data, corpus data, RAG data, vector-store data, or PDF ingestion state was modified.

## Staging Health

- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Health status: `ok`
- Deployed commit: `bd94cc31d587bad6c1d965e6d5b212fb6eb51163`
- Expected commit: `bd94cc31d587bad6c1d965e6d5b212fb6eb51163`
- Environment: `staging`
- Indexing running: `false`
- Vector store: 5,346 chunks / 102 sources

## Smoke Matrix

| # | Query | Expected boundary outcome | Actual boundary outcome | Source availability | Source count | Source-card title/label | Pass/Fail | Notes |
|---:|---|---|---|---|---:|---|---|---|
| 1 | What is RA 10963? | ALLOW | ALLOW | AUTHORITY_FOUND | 1 | NIRC Sec. 2 | PASS | Exact TRAIN/RA 10963 bridge remains accepted. |
| 2 | What is the TRAIN Law? | ALLOW | ALLOW | AUTHORITY_FOUND | 1 | NIRC Sec. 2 | PASS | TRAIN Law remains accepted and authority-backed. |
| 3 | What is TRAIN? | REJECT | REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | PASS | Generic TRAIN remains unbridged and rejected. |
| 4 | What is a Republic Act? | REJECT | REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | PASS | Generic Republic Act remains rejected. |
| 5 | What is RA 11534? | ALLOW | ALLOW | AUTHORITY_FOUND | 1 | RA No. 11534 | PASS | CREATE/RA 11534 remains authority-backed through RA 11534. |
| 6 | What is the CREATE Act? | ALLOW | ALLOW | AUTHORITY_FOUND | 1 | RA No. 11534 | PASS | CREATE alias remains accepted and authority-backed. |
| 7 | What is VAT? | ALLOW | ALLOW | AUTHORITY_FOUND | 4 | NIRC Sec. 105 | PASS | VAT tax-domain acceptance remains intact. |
| 8 | What is BIR? | ALLOW | ALLOW | AUTHORITY_FOUND | 2 | NIRC Sec. 2 | PASS | BIR tax-domain acceptance remains intact. |
| 9 | What is NIRC Section 23? | ALLOW | ALLOW | AUTHORITY_FOUND | 3 | NIRC Sec. 21 | PASS | NIRC section handling remains accepted and authority-backed. |
| 10 | What does NIRC Section 57 provide? | ALLOW | ALLOW | AUTHORITY_FOUND | 3 | NIRC Sec. 57 | PASS | NIRC Sec. 57 remains accepted and authority-backed. |
| 11 | What does RR 2-98 provide on expanded withholding tax? | ALLOW | ALLOW | AUTHORITY_FOUND | 1 | Revenue Regulations | PASS | RR alias/control behavior remains accepted. |
| 12 | What is CTA Case No. 9369? | ALLOW | ALLOW | RELATED_AUTHORITY_ONLY | 1 | CTA Case No. 9369 | PASS | CTA source card remains visible with `publicUrl` click target present. |
| 13 | What is BIR Ruling DA-489-03? | ALLOW | ALLOW | RELATED_AUTHORITY_ONLY | 0 | n/a | PASS | BIR Ruling exclusion remains preserved. |
| 14 | What is the weather today? | REJECT | REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | PASS | Non-tax generic query remains rejected. |
| 15 | Tell me a joke. | REJECT | REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | PASS | Non-tax generic query remains rejected. |
| 16 | What is income source? | REJECT | REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | PASS | Existing generic rejection path preserved; did not enter source-inventory mode. |
| 17 | What is the source of income under NIRC Section 23? | ALLOW | ALLOW | AUTHORITY_FOUND | 3 | NIRC Sec. 23 | PASS | NIRC Sec. 23 source-of-income query remains accepted; did not enter source-inventory mode. |

## Source-Card and Source-Intent Notes

- CTA Case No. 9369 returned a visible public card with label/title/display label `CTA Case No. 9369`.
- CTA Case No. 9369 retained a `publicUrl` click target.
- Generic source wording in `What is income source?` did not activate source-inventory behavior.
- `What is the source of income under NIRC Section 23?` remained a standard tax/legal response with `AUTHORITY_FOUND`.

## Confirmation

- No backend source code was modified.
- No refactor was started.
- PATCH-06E-004 was not started.
- No PDFs were ingested.
- No RAG, source corpus, DB/indexing, or vector-store data was modified.
