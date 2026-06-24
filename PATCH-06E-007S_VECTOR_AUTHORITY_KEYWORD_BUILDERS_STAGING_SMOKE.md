# PATCH-06E-007S Vector Authority Keyword Builders Staging Smoke

## Summary

Result: PASS

PATCH-06E-007S ran a narrow staging smoke validation after `PATCH-06E-007 extract vector authority keyword builders` to confirm exact authority lookup, source keyword matching, RA 10963 bridge behavior, sourceAvailability, and source-card behavior remained stable after deployment.

No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store data, source-corpus, or PDF ingestion changes were made.

## Staging Health

- Service: `tina-backend-staging`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `63834a11e71271000da4fd83251315e2d2c6e4ee`
- Expected deployed commit: `63834a11e71271000da4fd83251315e2d2c6e4ee`
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Smoke Matrix

| # | Query | Expected behavior | Actual behavior | sourceAvailability / boundary outcome | sourceCount | exactAuthorityMatches | Visible source-card title/label | Click target status | Result | Notes |
|---:|---|---|---|---|---:|---:|---|---|---|---|
| 1 | What is RA 10963? | RA 10963 / TRAIN bridge remains authority-backed | NIRC Sec. 2 visible card from RA 10963 authority path | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | publicUrl present | PASS | RA 10963 remains accepted and authority-backed. |
| 2 | What is the TRAIN Law? | TRAIN Law bridges to RA 10963 authority path | NIRC Sec. 2 visible card from RA 10963 authority path | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | publicUrl present | PASS | TRAIN Law remains bridged and source-backed. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | Full TRAIN title bridges to RA 10963 authority path | NIRC Sec. 6 visible card from RA 10963 authority path | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 6 | publicUrl present | PASS | Full title remains bridged and source-backed. |
| 4 | What is RA 11534? | RA 11534 exact authority remains source-backed | RA No. 11534 visible card | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | publicUrl present | PASS | CREATE authority path remains independent from RA 10963 bridge. |
| 5 | What is the CREATE Act? | CREATE alias canonicalizes to RA 11534 | RA No. 11534 visible card | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | publicUrl present | PASS | CREATE alias remains canonicalized to RA 11534. |
| 6 | What does RR 2-98 provide on expanded withholding tax? | RR 2-98 alias remains exact-authority safe | Revenue Regulations card with RR 2-98 citation | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | publicUrl present | PASS | RR 2-98 keyword/source matching preserved. |
| 7 | What does RR 2-1998 provide on expanded withholding tax? | RR 2-1998 alias remains exact-authority safe | Revenue Regulations card with RR 2-98 citation | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | publicUrl present | PASS | RR 2-1998 normalized alias remains stable. |
| 8 | What is Revenue Regulations No. 2-1998? | Long-form RR alias remains exact-authority safe | RR No. 2-1998 visible card | AUTHORITY_FOUND | 1 | 12 | RR No. 2-1998 | publicUrl present | PASS | Long-form Revenue Regulations alias remains source-backed. |
| 9 | What is RMC 65-2012? | RMC short alias remains exact-authority safe | RMC No. 65-2012 visible card | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | publicUrl present | PASS | RMC short alias preserved. |
| 10 | What is Revenue Memorandum Circular No. 65-2012? | RMC long-form alias remains exact-authority safe | RMC No. 65-2012 visible card | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | publicUrl present | PASS | RMC long-form alias preserved. |
| 11 | What is RMO 20-2013? | RMO short alias remains exact-authority safe | RMO No. 20-2013 visible card | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | publicUrl present | PASS | RMO short alias preserved. |
| 12 | What is Revenue Memorandum Order No. 20-2013? | RMO long-form alias remains exact-authority safe | RMO No. 20-2013 visible card | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | publicUrl present | PASS | RMO long-form alias preserved. |
| 13 | What is NIRC Section 23? | NIRC Sec. 23 remains authority-backed | NIRC Sec. 21 visible first under existing card ordering | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 21 | publicUrl present | PASS | NIRC Sec. 23 accepted; existing card ordering preserved. |
| 14 | What does NIRC Section 57 provide? | NIRC Sec. 57 remains authority-backed | NIRC Sec. 57 visible card | AUTHORITY_FOUND | 3 | 15 | NIRC Sec. 57 | publicUrl present | PASS | NIRC Sec. 57 keyword/source behavior preserved. |
| 15 | What does NIRC Section 58 provide? | NIRC Sec. 58 remains authority-backed | NIRC Sec. 58 visible card | AUTHORITY_FOUND | 3 | 21 | NIRC Sec. 58 | publicUrl present | PASS | NIRC Sec. 58 keyword/source behavior preserved. |
| 16 | What is CTA Case No. 9369? | CTA case source-card behavior preserved | CTA Case No. 9369 visible card | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9369 | publicUrl present | PASS | CTA source-card visibility and click target preserved. |
| 17 | Are there jurisprudence cases on withholding tax? | Withholding jurisprudence behavior preserved | CTA Case No. 9711 visible related authority card | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9711 | publicUrl present | PASS | PATCH-027N jurisprudence guard remains active. |
| 18 | What is BIR Ruling DA-489-03? | BIR Ruling exclusion preserved | No public source card promoted | RELATED_AUTHORITY_ONLY | 0 | 4 | None | N/A | PASS | BIR Ruling exclusion remains preserved. |
| 19 | What is TRAIN? | Generic TRAIN remains unbridged/rejected | Boundary rejection | DOMAIN_BOUNDARY_REJECT | 0 | N/A | None | N/A | PASS | Generic TRAIN does not activate RA 10963 bridge. |
| 20 | What is a Republic Act? | Generic Republic Act remains unbridged/rejected | Boundary rejection | DOMAIN_BOUNDARY_REJECT | 0 | N/A | None | N/A | PASS | Generic Republic Act remains rejected/unbridged. |

## Findings

- RA 10963, TRAIN Law, and the full Tax Reform for Acceleration and Inclusion Act title remain `AUTHORITY_FOUND`.
- CREATE / RA 11534 remains `AUTHORITY_FOUND`.
- RR, RMC, and RMO aliases remain exact-authority safe.
- NIRC Sec. 23, 57, and 58 remain `AUTHORITY_FOUND`.
- CTA Case No. 9369 retains visible source-card and click-target behavior.
- Withholding-tax jurisprudence behavior remains preserved through `RELATED_AUTHORITY_ONLY` with CTA Case No. 9711 visible.
- BIR Ruling DA-489-03 exclusion remains preserved.
- Generic TRAIN and generic Republic Act remain rejected/unbridged according to baseline.

## Conclusion

PATCH-06E-007S passes. The PATCH-06E-007 vector authority keyword-builder extraction did not alter staging exact-authority lookup, source keyword matching, RA 10963 bridge behavior, sourceAvailability, or source-card behavior in the required smoke matrix.
