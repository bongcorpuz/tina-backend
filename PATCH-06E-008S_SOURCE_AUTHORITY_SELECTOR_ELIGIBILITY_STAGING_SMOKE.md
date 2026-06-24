# PATCH-06E-008S Source-Authority Selector Eligibility Staging Smoke

## Summary

Result: PASS

PATCH-06E-008S ran a narrow staging smoke validation after `PATCH-06E-008 extract source authority selector eligibility` to confirm source-card eligibility, sourceAvailability, visible source-card labels, URLs, click targets, CTA card behavior, and authority-card suppression behavior remained stable after deployment.

No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store data, source-corpus, or PDF ingestion changes were made.

## Staging Health

- Service: `tina-backend-staging`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `d78c7d097b2cbe248b2f0400c3397f4853b4d2b3`
- Expected deployed commit: `d78c7d097b2cbe248b2f0400c3397f4853b4d2b3`
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Smoke Matrix

| # | Query | Expected behavior | Actual behavior | sourceAvailability / boundary outcome | sourceCount | Visible source-card title/label | Source-card URL / click-target status | Expected card suppressed? | Result | Notes |
|---:|---|---|---|---|---:|---|---|---|---|---|
| 1 | What is RA 10963? | RA 10963 / TRAIN bridge remains AUTHORITY_FOUND | NIRC Sec. 2 visible card from RA 10963 authority path | AUTHORITY_FOUND | 1 | NIRC Sec. 2 | publicUrl present | No | PASS | RA 10963 remains accepted and authority-backed. |
| 2 | What is the TRAIN Law? | TRAIN Law bridges to RA 10963 authority path | NIRC Sec. 2 visible card from RA 10963 authority path | AUTHORITY_FOUND | 1 | NIRC Sec. 2 | publicUrl present | No | PASS | TRAIN Law remains bridged and source-backed. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | Full TRAIN title bridges to RA 10963 authority path | NIRC Sec. 6 visible card from RA 10963 authority path | AUTHORITY_FOUND | 1 | NIRC Sec. 6 | publicUrl present | No | PASS | Full title remains bridged and source-backed. |
| 4 | What is RA 11534? | RA 11534 exact authority remains source-backed | RA No. 11534 visible card | AUTHORITY_FOUND | 1 | RA No. 11534 | publicUrl present | No | PASS | CREATE authority path remains independent from RA 10963 bridge. |
| 5 | What is the CREATE Act? | CREATE alias canonicalizes to RA 11534 | RA No. 11534 visible card | AUTHORITY_FOUND | 1 | RA No. 11534 | publicUrl present | No | PASS | CREATE alias remains canonicalized to RA 11534. |
| 6 | What is NIRC Section 23? | NIRC Sec. 23 remains AUTHORITY_FOUND | NIRC Sec. 21, NIRC Sec. 2, and NIRC Sec. 23 visible under existing ordering | AUTHORITY_FOUND | 3 | NIRC Sec. 21; NIRC Sec. 2; NIRC Sec. 23 | publicUrl present on all cards | No | PASS | NIRC Sec. 23 accepted; existing card ordering preserved. |
| 7 | What does NIRC Section 57 provide? | NIRC Sec. 57 remains AUTHORITY_FOUND | NIRC Sec. 57 visible first, with NIRC Sec. 21 and NIRC Sec. 2 also visible | AUTHORITY_FOUND | 3 | NIRC Sec. 57; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present on all cards | No | PASS | NIRC Sec. 57 source-card eligibility preserved. |
| 8 | What does NIRC Section 58 provide? | NIRC Sec. 58 remains AUTHORITY_FOUND | NIRC Sec. 58 visible first, with NIRC Sec. 21 and NIRC Sec. 2 also visible | AUTHORITY_FOUND | 3 | NIRC Sec. 58; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present on all cards | No | PASS | NIRC Sec. 58 source-card eligibility preserved. |
| 9 | What does RR 2-98 provide on expanded withholding tax? | RR 2-98 alias remains authority-safe with visible source card | Revenue Regulations card with RR 2-98 citation | AUTHORITY_FOUND | 1 | Revenue Regulations / RR 2-98 | publicUrl present | No | PASS | RR 2-98 EWT authority-card behavior preserved. |
| 10 | What is RMC 65-2012? | RMC short alias remains authority-safe | RMC No. 65-2012 visible card | AUTHORITY_FOUND | 1 | RMC No. 65-2012 | publicUrl present | No | PASS | RMC source-card eligibility preserved. |
| 11 | What is RMO 20-2013? | RMO short alias remains authority-safe | RMO No. 20-2013 visible card | AUTHORITY_FOUND | 1 | RMO No. 20-2013 | publicUrl present | No | PASS | RMO 20-2013 source-card eligibility preserved. |
| 12 | What is RMO 24-2013? | RMO 24-2013 remains authority-safe | RMO No. 24-2013 visible card | AUTHORITY_FOUND | 1 | RMO No. 24-2013 | publicUrl present | No | PASS | RMO 24-2013 source-card eligibility preserved. |
| 13 | What is CTA Case No. 9369? | CTA Case No. 9369 remains visible with correct card/click target | CTA Case No. 9369 visible card | RELATED_AUTHORITY_ONLY | 1 | CTA Case No. 9369 | publicUrl present | No | PASS | CTA source-card visibility and click target preserved. |
| 14 | Are there jurisprudence cases on withholding tax? | Withholding-tax jurisprudence behavior preserved | CTA Case No. 9711 visible related authority card | RELATED_AUTHORITY_ONLY | 1 | CTA Case No. 9711 | publicUrl present | No | PASS | PATCH-027N jurisprudence guard and CTA related card behavior preserved. |
| 15 | What is BIR Ruling DA-489-03? | BIR Ruling exclusion preserved | No public source card promoted | RELATED_AUTHORITY_ONLY | 0 | None | N/A | No expected card; exclusion preserved | PASS | BIR Ruling exclusion remains preserved. |
| 16 | Explain EWT. | Generic EWT guard behavior preserved | NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998 visible | AUTHORITY_FOUND | 3 | NIRC Sec. 57; NIRC Sec. 58; RR No. 2-1998 | publicUrl present on all cards | No | PASS | Broad EWT behavior remains source-backed. |
| 17 | What is withholding tax? | Generic withholding tax guard behavior preserved | NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998 visible | AUTHORITY_FOUND | 3 | NIRC Sec. 57; NIRC Sec. 58; RR No. 2-1998 | publicUrl present on all cards | No | PASS | Generic WHT behavior remains source-backed. |
| 18 | What is TRAIN? | Generic TRAIN remains rejected/unbridged | Boundary rejection | DOMAIN_BOUNDARY_REJECT | 0 | None | N/A | No expected card | PASS | Generic TRAIN does not activate RA 10963 bridge. |
| 19 | What is a Republic Act? | Generic Republic Act remains rejected/unbridged | Boundary rejection | DOMAIN_BOUNDARY_REJECT | 0 | None | N/A | No expected card | PASS | Generic Republic Act remains rejected/unbridged. |
| 20 | Show me the source for NIRC Section 23. | Source lookup behavior preserved | Indexed source response includes NIRC Sec. 23 source; source cards remain visible | AUTHORITY_FOUND | 3 | NIRC Sec. 2; NIRC Sec. 21; NIRC Sec. 23 | publicUrl present on all cards | No | PASS | Source lookup route preserved; answer lists NIRC Sec. 23 source. |

## Findings

- RA 10963, TRAIN Law, and the full Tax Reform for Acceleration and Inclusion Act title remain `AUTHORITY_FOUND`.
- CREATE / RA 11534 remains `AUTHORITY_FOUND`.
- NIRC Sec. 23, 57, and 58 remain `AUTHORITY_FOUND`.
- RR/RMC/RMO aliases remain authority-safe with expected visible source cards.
- CTA Case No. 9369 retains visible source-card and click-target behavior.
- Withholding-tax jurisprudence behavior remains preserved with CTA Case No. 9711 visible as related authority.
- BIR Ruling DA-489-03 exclusion remains preserved.
- Generic TRAIN and generic Republic Act remain rejected/unbridged according to baseline.
- EWT/WHT guard behavior remains preserved.
- No expected source card was lost because of the extracted eligibility helper.

## Conclusion

PATCH-06E-008S passes. The PATCH-06E-008 source-authority selector eligibility helper extraction did not alter staging source-card eligibility, sourceAvailability, visible source-card labels, URLs, click targets, CTA card behavior, or authority-card suppression behavior in the required smoke matrix.
