# PATCH-06E-GATE-2 Post-006/007 Stabilization Gate

## Summary

Result: PASS

PATCH-06E-GATE-2 ran the post-006/007 stabilization gate after:

- `PATCH-06E-006 extract issue exact authority detector`
- `PATCH-06E-007 extract vector authority keyword builders`

The gate confirms exact-authority detection, vector authority keyword-builder behavior, retrieval behavior, sourceAvailability, source-card behavior, and domain-boundary behavior remained stable after both extractions and their staging smokes.

This was a report-only stabilization gate. No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store data, source-corpus, or PDF ingestion changes were made. `pipeline.js` was not touched.

## Local Validation

- `git status --short`: clean before gate
- `npm test`: PASS
  - Syntax checks: 10 run, 0 failed
  - Test suites: 62 run, 0 failed
- `npm run guard:files`: PASS

## Staging Health

- Service: `tina-backend-staging`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `fcd15e9dc070e8d7fb69b5dbdb047eef8a54be07`
- Expected deployed commit: `fcd15e9dc070e8d7fb69b5dbdb047eef8a54be07`
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Matrix

| # | Query | Expected behavior | Actual behavior | sourceAvailability / boundary outcome | sourceCount | exactAuthorityMatches | Visible source-card title/label | Click target status | Result | Notes |
|---:|---|---|---|---|---:|---:|---|---|---|---|
| 1 | What is RA 10963? | RA 10963 / TRAIN bridge remains AUTHORITY_FOUND | NIRC Sec. 2 visible card from RA 10963 path | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | publicUrl present | PASS | Bridge remains source-backed. |
| 2 | What is the TRAIN Law? | TRAIN Law bridge remains AUTHORITY_FOUND | NIRC Sec. 2 visible card from RA 10963 path | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | publicUrl present | PASS | TRAIN Law remains bridged. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | Full TRAIN title bridge remains AUTHORITY_FOUND | NIRC Sec. 6 visible card from RA 10963 path | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 6 | publicUrl present | PASS | Full title remains bridged. |
| 4 | What is RA 11534? | RA 11534 remains AUTHORITY_FOUND | RA No. 11534 visible card | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | publicUrl present | PASS | CREATE path does not use RA 10963 bridge. |
| 5 | What is the CREATE Act? | CREATE alias remains AUTHORITY_FOUND | RA No. 11534 visible card | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | publicUrl present | PASS | CREATE alias canonicalization preserved. |
| 6 | What does RR 2-98 provide on expanded withholding tax? | RR 2-98 remains exact-authority safe | Revenue Regulations card with RR 2-98 citation | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | publicUrl present | PASS | EWT authority-card preservation intact. |
| 7 | What does RR 2-1998 provide on expanded withholding tax? | RR 2-1998 remains exact-authority safe | Revenue Regulations card with RR 2-98 citation | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | publicUrl present | PASS | Alias normalization preserved. |
| 8 | What is Revenue Regulations No. 2-1998? | Long-form RR alias remains exact-authority safe | RR No. 2-1998 visible card | AUTHORITY_FOUND | 1 | 12 | RR No. 2-1998 | publicUrl present | PASS | Long-form keyword behavior preserved. |
| 9 | What is RMC 65-2012? | RMC short alias remains exact-authority safe | RMC No. 65-2012 visible card | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | publicUrl present | PASS | RMC exact authority preserved. |
| 10 | What is Revenue Memorandum Circular No. 65-2012? | RMC long-form alias remains exact-authority safe | RMC No. 65-2012 visible card | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | publicUrl present | PASS | RMC long-form keyword behavior preserved. |
| 11 | What is RMO 20-2013? | RMO short alias remains exact-authority safe | RMO No. 20-2013 visible card | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | publicUrl present | PASS | RMO exact authority preserved. |
| 12 | What is Revenue Memorandum Order No. 20-2013? | RMO long-form alias remains exact-authority safe | RMO No. 20-2013 visible card | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | publicUrl present | PASS | RMO long-form keyword behavior preserved. |
| 13 | What is RMO 24-2013? | RMO 24-2013 remains exact-authority safe | RMO No. 24-2013 visible card | AUTHORITY_FOUND | 1 | 12 | RMO No. 24-2013 | publicUrl present | PASS | Additional RMO alias path preserved. |
| 14 | What is NIRC Section 23? | NIRC Sec. 23 remains AUTHORITY_FOUND | NIRC Sec. 21 visible first under existing order | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 21 | publicUrl present | PASS | NIRC Sec. 23 accepted; ordering baseline preserved. |
| 15 | What does NIRC Section 57 provide? | NIRC Sec. 57 remains AUTHORITY_FOUND | NIRC Sec. 57 visible card | AUTHORITY_FOUND | 3 | 15 | NIRC Sec. 57 | publicUrl present | PASS | NIRC Sec. 57 source behavior preserved. |
| 16 | What does NIRC Section 58 provide? | NIRC Sec. 58 remains AUTHORITY_FOUND | NIRC Sec. 58 visible card | AUTHORITY_FOUND | 3 | 21 | NIRC Sec. 58 | publicUrl present | PASS | NIRC Sec. 58 source behavior preserved. |
| 17 | What is CTA Case No. 9369? | CTA source-card behavior preserved | CTA Case No. 9369 visible related-authority card | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9369 | publicUrl present | PASS | CTA click target preserved. |
| 18 | Are there jurisprudence cases on withholding tax? | Withholding jurisprudence guard preserved | CTA Case No. 9711 visible related-authority card | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9711 | publicUrl present | PASS | PATCH-027N behavior preserved. |
| 19 | What is BIR Ruling DA-489-03? | BIR Ruling exclusion preserved | No public source card promoted | RELATED_AUTHORITY_ONLY | 0 | 4 | None | N/A | PASS | Exclusion remains intact. |
| 20 | What is withholding tax? | Generic withholding tax guard behavior preserved | NIRC Sec. 57 first visible card | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | publicUrl present | PASS | Generic WHT remains source-backed. |
| 21 | Explain EWT. | Generic EWT guard behavior preserved | NIRC Sec. 57 first visible card | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | publicUrl present | PASS | Broad EWT behavior preserved. |
| 22 | What is VAT? | VAT definition behavior preserved | NIRC Sec. 105 first visible card | AUTHORITY_FOUND | 4 | 12 | NIRC Sec. 105 | publicUrl present | PASS | VAT source-card labels and URLs intact. |
| 23 | What is BIR? | BIR definition behavior preserved | NIRC Sec. 2 first visible card | AUTHORITY_FOUND | 2 | 4 | NIRC Sec. 2 | publicUrl present | PASS | BIR definition route preserved. |
| 24 | Who is a taxpayer under the NIRC? | Taxpayer definition behavior preserved | NIRC Sec. 2 first visible card | AUTHORITY_FOUND | 2 | 4 | NIRC Sec. 2 | publicUrl present | PASS | Taxpayer definition source behavior preserved. |
| 25 | What is TRAIN? | Generic TRAIN remains unbridged/rejected | Boundary rejection | DOMAIN_BOUNDARY_REJECT | 0 | N/A | None | N/A | PASS | Generic TRAIN does not activate RA 10963 bridge. |
| 26 | What is a Republic Act? | Generic Republic Act remains unbridged/rejected | Boundary rejection | DOMAIN_BOUNDARY_REJECT | 0 | N/A | None | N/A | PASS | Generic Republic Act remains rejected/unbridged. |
| 27 | What is the source of income under NIRC Section 23? | NIRC Sec. 23 source-of-income behavior preserved | NIRC Sec. 23 visible first | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 23 | publicUrl present | PASS | Sec. 23 keyword/source behavior preserved. |
| 28 | Show me the source for NIRC Section 23. | Source lookup behavior preserved | Indexed source response with NIRC Sec. 23 available | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 2 visible first | publicUrl present | PASS | Source lookup route behavior preserved; answer lists NIRC Sec. 23 source. |

## Coverage Findings

- RA 10963 / TRAIN bridge remains `AUTHORITY_FOUND`.
- CREATE / RA 11534 remains `AUTHORITY_FOUND` through RA No. 11534 and does not use the RA 10963 bridge.
- RR/RMC/RMO aliases remain exact-authority safe.
- NIRC Sec. 23, 57, and 58 remain `AUTHORITY_FOUND`.
- CTA Case No. 9369 retains visible source-card and click-target behavior.
- BIR Ruling exclusion remains preserved.
- Generic Republic Act remains rejected/unbridged according to current baseline.
- Generic TRAIN remains rejected/unbridged according to current baseline.
- Generic withholding tax / EWT guard behavior remains preserved.
- Source-card labels and URLs remain intact.
- Domain-boundary accept/reject behavior remains intact.
- Exact-authority detector behavior remains intact.
- Vector authority keyword-builder behavior remains intact.

## Recommendation

Safe to proceed to the next approved Phase 6E extraction, subject to the normal clean-worktree, local regression, guard, and staging-validation workflow.
