# PATCH-06E-006S Issue Exact-Authority Staging Smoke

## Summary

Result: PASS

PATCH-06E-006S ran a narrow staging smoke validation after `PATCH-06E-006 extract issue exact authority detector` to confirm exact-authority detection, canonical authority handling, sourceAvailability, and source-card behavior remained stable after deployment.

No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store, source-corpus, or PDF ingestion changes were made.

## Staging Health

- Service: `tina-backend-staging`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `3ec378f63bbae6b805ad8be0439554d0a3d9b344`
- Expected deployed commit: `3ec378f63bbae6b805ad8be0439554d0a3d9b344`
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Smoke Matrix

| # | Query | Expected exact authority behavior | Actual exact authority behavior | Expected sourceAvailability | Actual sourceAvailability | sourceCount | exactAuthorityMatches | Visible source-card title/label | Result | Notes |
|---:|---|---|---|---|---|---:|---:|---|---|---|
| 1 | What is RA 10963? | RA 10963 / TRAIN bridge exact authority | NIRC Sec. 2 visible card from RA 10963 authority path | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | PASS | RA 10963 remains accepted and authority-backed. |
| 2 | What is the TRAIN Law? | RA 10963 canonical exact authority | NIRC Sec. 2 visible card from RA 10963 authority path | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | PASS | TRAIN Law remains bridged to RA 10963 authority behavior. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | RA 10963 canonical exact authority | NIRC Sec. 6 visible card from RA 10963 authority path | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 6 | PASS | Full title remains bridged and source-backed. |
| 4 | What is RA 11534? | RA 11534 exact authority | RA No. 11534 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | PASS | CREATE authority path remains independent from RA 10963 bridge. |
| 5 | What is the CREATE Act? | RA 11534 canonical exact authority | RA No. 11534 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | PASS | CREATE alias remains canonicalized to RA 11534. |
| 6 | What does RR 2-98 provide on expanded withholding tax? | RR No. 2-1998 exact administrative authority | Revenue Regulations | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | PASS | RR 2-98 alias remains authority-safe. |
| 7 | What does RR 2-1998 provide on expanded withholding tax? | RR No. 2-1998 exact administrative authority | Revenue Regulations | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | PASS | RR 2-1998 normalized alias remains stable. |
| 8 | What is Revenue Regulations No. 2-1998? | RR No. 2-1998 exact administrative authority | RR No. 2-1998 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RR No. 2-1998 | PASS | Long-form Revenue Regulations alias remains exact-authority safe. |
| 9 | What is RMC 65-2012? | RMC No. 65-2012 exact administrative authority | RMC No. 65-2012 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | PASS | RMC short alias remains exact-authority safe. |
| 10 | What is Revenue Memorandum Circular No. 65-2012? | RMC No. 65-2012 exact administrative authority | RMC No. 65-2012 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | PASS | RMC long-form alias remains exact-authority safe. |
| 11 | What is RMO 20-2013? | RMO No. 20-2013 exact administrative authority | RMO No. 20-2013 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | PASS | RMO short alias remains exact-authority safe. |
| 12 | What is Revenue Memorandum Order No. 20-2013? | RMO No. 20-2013 exact administrative authority | RMO No. 20-2013 | AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | PASS | RMO long-form alias remains exact-authority safe. |
| 13 | What is NIRC Section 23? | NIRC Sec. 23 exact authority | NIRC Sec. 21 visible card under existing card ordering | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 21 | PASS | NIRC Sec. 23 remains accepted and authority-backed; visible card ordering matches baseline. |
| 14 | What does NIRC Section 57 provide? | NIRC Sec. 57 exact authority | NIRC Sec. 57 | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 15 | NIRC Sec. 57 | PASS | NIRC Sec. 57 remains authority-backed. |
| 15 | What does NIRC Section 58 provide? | NIRC Sec. 58 exact authority | NIRC Sec. 58 | AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 21 | NIRC Sec. 58 | PASS | NIRC Sec. 58 remains authority-backed. |
| 16 | What is CTA Case No. 9369? | CTA Case No. 9369 court exact authority | CTA Case No. 9369 | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9369 | PASS | CTA source-card visibility remains preserved. |
| 17 | What is BIR Ruling DA-489-03? | BIR Ruling exclusion; no promoted exact authority card | RELATED_AUTHORITY_ONLY with no public source count | RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 0 | 4 | None | PASS | BIR Ruling exclusion remains preserved. |
| 18 | What is TRAIN? | Generic TRAIN unbridged | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | N/A | None | PASS | Generic TRAIN does not activate RA 10963 bridge. |
| 19 | What is a Republic Act? | Generic Republic Act unbridged | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | N/A | None | PASS | Generic Republic Act remains rejected/unbridged according to baseline. |

## Findings

- RA 10963, TRAIN Law, and the full Tax Reform for Acceleration and Inclusion Act title remain `AUTHORITY_FOUND`.
- CREATE / RA 11534 remains `AUTHORITY_FOUND` through RA No. 11534 authority behavior, not the RA 10963 bridge.
- RR, RMC, and RMO aliases remain exact-authority safe.
- NIRC Sec. 23, 57, and 58 remain `AUTHORITY_FOUND`.
- CTA Case No. 9369 retains visible source-card behavior.
- BIR Ruling DA-489-03 exclusion remains preserved.
- Generic TRAIN and generic Republic Act remain rejected/unbridged according to baseline.

## Conclusion

PATCH-06E-006S passes. The PATCH-06E-006 exact-authority detector extraction did not alter staging exact-authority behavior, canonical authority handling, sourceAvailability, or source-card behavior in the required smoke matrix.
