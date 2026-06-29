# PATCH-06E-009S Ask-Handler Public Source Sanitizer Staging Smoke Diagnostic

## Summary

Result: DIAGNOSTIC / NOT ALL PASS

PATCH-06E-009S ran a narrow staging smoke validation after `PATCH-06E-009 extract ask-handler public source sanitizer` to confirm public API response shape, visible source-card behavior, source-card labels, public URLs, click targets, sourceAvailability, and authority-card suppression behavior remained stable after deployment.

No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store data, source-corpus, or PDF ingestion changes were made.

The staging runtime is healthy and serving the expected PATCH-06E-009 commit. Public source/card response shape appears preserved across source-card-bearing responses. One smoke item did not match the prior PATCH-06E-008S baseline: `What is BIR Ruling DA-489-03?` returned `AUTHORITY_FOUND` with three non-BIR public source cards instead of the prior `RELATED_AUTHORITY_ONLY` / zero-card baseline.

## Staging Health

- Service: `tina-backend-staging`
- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `acee116c9b469b5a9bfd1e5ca9e16463a4ada1ba`
- Expected deployed commit: `acee116c9b469b5a9bfd1e5ca9e16463a4ada1ba`
- Commit status: MATCH
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Smoke Matrix

| # | Query | Expected behavior | Actual behavior | sourceAvailability / boundary outcome | sourceCount | Visible source-card title/label | Source-card URL / click-target status | Public response shape preserved? | Expected card suppressed? | Result | Notes |
|---:|---|---|---|---|---:|---|---|---|---|---|---|
| 1 | What is RA 10963? | RA 10963 / TRAIN bridge remains `AUTHORITY_FOUND` | NIRC Sec. 2 visible card from RA 10963 authority path | `AUTHORITY_FOUND` | 1 | NIRC Sec. 2 | publicUrl present | Yes | No | PASS | Matches prior baseline; public card keys: `label`, `title`, `citation`, `authorityType`, `displayLabel`, `limitationRequired`, `publicUrl`. |
| 2 | What is the TRAIN Law? | TRAIN Law bridges to RA 10963 authority path | NIRC Sec. 2 visible card from RA 10963 authority path | `AUTHORITY_FOUND` | 1 | NIRC Sec. 2 | publicUrl present | Yes | No | PASS | TRAIN Law remains bridged and source-backed. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | Full TRAIN title bridges to RA 10963 authority path | NIRC Sec. 6 visible card from RA 10963 authority path | `AUTHORITY_FOUND` | 1 | NIRC Sec. 6 | publicUrl present | Yes | No | PASS | Full title remains bridged and source-backed. |
| 4 | What is RA 11534? | RA 11534 exact authority remains source-backed | RA No. 11534 visible card | `AUTHORITY_FOUND` | 1 | RA No. 11534 | publicUrl present | Yes | No | PASS | CREATE authority path remains independent from RA 10963 bridge. |
| 5 | What is the CREATE Act? | CREATE alias canonicalizes to RA 11534 | RA No. 11534 visible card | `AUTHORITY_FOUND` | 1 | RA No. 11534 | publicUrl present | Yes | No | PASS | CREATE alias remains canonicalized to RA 11534. |
| 6 | What is NIRC Section 23? | NIRC Sec. 23 remains `AUTHORITY_FOUND` | G.R. No. 226592, G.R. No. 222743, NIRC Sec. 21, NIRC Sec. 2, and NIRC Sec. 23 visible | `AUTHORITY_FOUND` | 5 | G.R. No. 226592; G.R. No. 222743; NIRC Sec. 21; NIRC Sec. 2; NIRC Sec. 23 | publicUrl present on all cards | Yes | No | PASS | NIRC Sec. 23 accepted; no expected NIRC Sec. 23 card lost. |
| 7 | What does NIRC Section 57 provide? | NIRC Sec. 57 remains `AUTHORITY_FOUND` | NIRC Sec. 57 visible first, with NIRC Sec. 21 and NIRC Sec. 2 also visible | `AUTHORITY_FOUND` | 3 | NIRC Sec. 57; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present on all cards | Yes | No | PASS | NIRC Sec. 57 source-card behavior preserved. |
| 8 | What does NIRC Section 58 provide? | NIRC Sec. 58 remains `AUTHORITY_FOUND` | NIRC Sec. 58 visible first, with G.R. No. 222743, NIRC Sec. 21, and NIRC Sec. 2 also visible | `AUTHORITY_FOUND` | 4 | NIRC Sec. 58; G.R. No. 222743; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present on all cards | Yes | No | PASS | NIRC Sec. 58 source-card behavior preserved. |
| 9 | What does RR 2-98 provide on expanded withholding tax? | RR 2-98 alias remains authority-safe with expected visible source card | Revenue Regulations visible card | `AUTHORITY_FOUND` | 1 | Revenue Regulations | publicUrl present | Yes | No | PASS | RR 2-98 EWT authority-card behavior preserved. |
| 10 | What is RMC 65-2012? | RMC short alias remains authority-safe | RMC No. 65-2012 visible card | `AUTHORITY_FOUND` | 1 | RMC No. 65-2012 | publicUrl present | Yes | No | PASS | RMC source-card behavior preserved. |
| 11 | What is RMO 20-2013? | RMO short alias remains authority-safe | RMO No. 20-2013 visible card | `AUTHORITY_FOUND` | 1 | RMO No. 20-2013 | publicUrl present | Yes | No | PASS | RMO 20-2013 source-card behavior preserved. |
| 12 | What is RMO 24-2013? | RMO 24-2013 remains authority-safe | RMO No. 24-2013 visible card | `AUTHORITY_FOUND` | 1 | RMO No. 24-2013 | publicUrl present | Yes | No | PASS | RMO 24-2013 source-card behavior preserved. |
| 13 | What is CTA Case No. 9369? | CTA Case No. 9369 remains visible with correct card/click target | CTA Case No. 9369 visible card | `RELATED_AUTHORITY_ONLY` | 1 | CTA Case No. 9369 | publicUrl present | Yes | No | PASS | CTA source-card visibility and click target preserved. |
| 14 | Are there jurisprudence cases on withholding tax? | Withholding-tax jurisprudence behavior preserved | CTA Case No. 9711 visible related authority card | `RELATED_AUTHORITY_ONLY` | 1 | CTA Case No. 9711 | publicUrl present | Yes | No | PASS | PATCH-027N jurisprudence guard and CTA related-card behavior preserved. |
| 15 | What is BIR Ruling DA-489-03? | BIR Ruling exclusion preserved according to prior 06E-008S baseline: no public source card promoted, `RELATED_AUTHORITY_ONLY` | Returned `AUTHORITY_FOUND` with three non-BIR public source cards: G.R. No. 187485, G.R. No. 226592, NIRC Sec. 2 | `AUTHORITY_FOUND` | 3 | G.R. No. 187485; G.R. No. 226592; NIRC Sec. 2 | publicUrl present on all cards | Yes | Baseline zero-card suppression not preserved | FAIL / DIAGNOSTIC | Reproduced twice after the matrix with identical status/cards. No BIR Ruling source card was exposed, but sourceAvailability and card suppression differ from prior baseline. |
| 16 | Explain EWT. | Generic EWT guard behavior preserved | NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998 visible | `AUTHORITY_FOUND` | 3 | NIRC Sec. 57; NIRC Sec. 58; RR No. 2-1998 | publicUrl present on all cards | Yes | No | PASS | Broad EWT behavior remains source-backed. |
| 17 | What is withholding tax? | Generic withholding tax guard behavior preserved | NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998 visible | `AUTHORITY_FOUND` | 3 | NIRC Sec. 57; NIRC Sec. 58; RR No. 2-1998 | publicUrl present on all cards | Yes | No | PASS | Generic WHT behavior remains source-backed. |
| 18 | What is TRAIN? | Generic TRAIN remains rejected/unbridged | Boundary rejection | `DOMAIN_BOUNDARY_REJECT` | 0 | None | N/A | Yes | No expected card | PASS | Generic TRAIN does not activate RA 10963 bridge. |
| 19 | What is a Republic Act? | Generic Republic Act remains rejected/unbridged | Boundary rejection | `DOMAIN_BOUNDARY_REJECT` | 0 | None | N/A | Yes | No expected card | PASS | Generic Republic Act remains rejected/unbridged. |
| 20 | Show me the source for NIRC Section 23. | Source lookup behavior preserved | Indexed source response includes NIRC Sec. 23 source; source cards remain visible | `AUTHORITY_FOUND` | 3 | NIRC Sec. 2; NIRC Sec. 21; NIRC Sec. 23 | publicUrl present on all cards | Yes | No | PASS | `/source` route preserved; answer lists NIRC Sec. 23 source. |

## Confirmation Reruns For Failed Item

`What is BIR Ruling DA-489-03?` was rerun twice after the full matrix:

| Rerun | sourceAvailability | sourceCount | Visible labels | URL status |
|---:|---|---:|---|---|
| 1 | `AUTHORITY_FOUND` | 3 | G.R. No. 187485; G.R. No. 226592; NIRC Sec. 2 | publicUrl present on all cards |
| 2 | `AUTHORITY_FOUND` | 3 | G.R. No. 187485; G.R. No. 226592; NIRC Sec. 2 | publicUrl present on all cards |

## Failure Classification

Classification: staging/test-query or pre-existing behavior mismatch; not classified as a PATCH-06E-009 source-code regression.

Reasoning:

- The deployed commit matches PATCH-06E-009 exactly: `acee116c9b469b5a9bfd1e5ca9e16463a4ada1ba`.
- Indexing is not running and vector-store counts remain unchanged at `5,346` chunks / `102` sources.
- PATCH-06E-009 only extracted ask-handler public sanitizer helpers and re-imported `sanitizePublicSourceCards`.
- The extracted sanitizer runs after pipeline sourceAvailability computation and after source-card selection. It does not select, rank, suppress, or compute sourceAvailability.
- The failed item differs in `sourceAvailability` and card suppression, which are upstream of the extracted route sanitizer.
- No BIR Ruling source card was exposed. The observed cards were G.R./NIRC cards, with public response shape preserved.

This should be investigated before marking PATCH-06E-009S as pass, but no source patch was made under this smoke task.

## Findings

- RA 10963, TRAIN Law, and the full Tax Reform for Acceleration and Inclusion Act title remain `AUTHORITY_FOUND`.
- CREATE / RA 11534 remains `AUTHORITY_FOUND`.
- NIRC Sec. 23, 57, and 58 remain `AUTHORITY_FOUND`; expected NIRC cards remain visible.
- RR/RMC/RMO aliases remain authority-safe with visible source cards and public URLs.
- CTA Case No. 9369 retains visible source-card and click-target behavior.
- Withholding-tax jurisprudence behavior remains preserved with CTA Case No. 9711 visible as related authority.
- Generic TRAIN and generic Republic Act remain rejected/unbridged according to baseline.
- EWT/WHT guard behavior remains preserved.
- Public source/card fields appear stable across source-card-bearing responses.
- One baseline mismatch remains: BIR Ruling DA-489-03 sourceAvailability/card suppression.

## Conclusion

PATCH-06E-009S is not marked PASS because the BIR Ruling DA-489-03 staging smoke item did not match the prior baseline. The evidence does not point to the extracted ask-handler public sanitizer as the cause, because the mismatch is in upstream sourceAvailability and card selection/suppression behavior rather than public field sanitization.
