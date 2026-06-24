# PATCH-06E-GATE-1 First-Wave Stabilization

## Summary

Result: PASS

PATCH-06E-GATE-1 ran the first-wave Phase 6E stabilization gate after the completed decomposition patches through PATCH-06E-005S. Local regression, protected-file guard, staging health, source-card behavior, domain-boundary behavior, reranker normalizer behavior, reranker issue-signal behavior, authority retrieval, and source availability all remained stable.

No backend source code, DB/indexing data, corpus data, RAG data, vector-store data, or PDF ingestion state was modified.

## Staging Health

- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Health status: `ok`
- Deployed commit: `1fad5a69707d659d6007be5ffb1667af1c259b7c`
- Expected commit: `1fad5a69707d659d6007be5ffb1667af1c259b7c`
- Environment: `staging`
- Indexing running: `false`
- Vector store: 5,346 chunks / 102 sources

## Local Validation

- `npm test`: PASS
  - Syntax checks: 10 run, 0 failed
  - Test suites: 60 run, 0 failed
- `npm run guard:files`: PASS
  - No protected files modified

## Staging Matrix

| # | Query | Expected behavior | Actual behavior | sourceAvailability | sourceCount | exactAuthorityMatches | Source-card title/label | Click target | Boundary | Pass/Fail | Notes |
|---:|---|---|---|---:|---:|---|---|---|---|---|
| 1 | What is RA 10963? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | present | ALLOW | PASS | RA 10963 bridge preserved. |
| 2 | What is the TRAIN Law? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 2 | present | ALLOW | PASS | TRAIN Law bridge preserved. |
| 3 | What is the Tax Reform for Acceleration and Inclusion Act? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | NIRC Sec. 6 | present | ALLOW | PASS | Full TRAIN title bridge preserved. |
| 4 | What is RA 11534? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | present | ALLOW | PASS | CREATE/RA 11534 remains independent of RA 10963 bridge. |
| 5 | What is the CREATE Act? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RA No. 11534 | present | ALLOW | PASS | CREATE alias preserved. |
| 6 | What is NIRC Section 23? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 21 | present | ALLOW | PASS | NIRC Sec. 23 handling preserved. |
| 7 | What does NIRC Section 57 provide? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 15 | NIRC Sec. 57 | present | ALLOW | PASS | NIRC Sec. 57 first card preserved. |
| 8 | What does NIRC Section 58 provide? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 21 | NIRC Sec. 58 | present | ALLOW | PASS | NIRC Sec. 58 first card preserved. |
| 9 | What does RR 2-98 provide on expanded withholding tax? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | Revenue Regulations | present | ALLOW | PASS | RR 2-98 behavior preserved. |
| 10 | What is RMC 65-2012? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 14 | RMC No. 65-2012 | present | ALLOW | PASS | RMC alias behavior preserved. |
| 11 | What is RMO 20-2013? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RMO No. 20-2013 | present | ALLOW | PASS | RMO 20-2013 behavior preserved. |
| 12 | What is RMO 24-2013? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 1 | 12 | RMO No. 24-2013 | present | ALLOW | PASS | RMO 24-2013 behavior preserved. |
| 13 | What is CTA Case No. 9369? | ALLOW; RELATED_AUTHORITY_ONLY | ALLOW; RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9369 | present | ALLOW | PASS | CTA visible card and click target preserved. |
| 14 | Are there jurisprudence cases on withholding tax? | ALLOW; RELATED_AUTHORITY_ONLY | ALLOW; RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 1 | 12 | CTA Case No. 9711 | present | ALLOW | PASS | Jurisprudence guard preserved. |
| 15 | What is BIR Ruling DA-489-03? | ALLOW; RELATED_AUTHORITY_ONLY | ALLOW; RELATED_AUTHORITY_ONLY | RELATED_AUTHORITY_ONLY | 0 | 4 | n/a | n/a | ALLOW | PASS | BIR Ruling exclusion preserved. |
| 16 | What is withholding tax? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | present | ALLOW | PASS | Generic WHT guard behavior preserved under statutory support. |
| 17 | Explain EWT. | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 12 | NIRC Sec. 57 | present | ALLOW | PASS | Generic EWT guard behavior preserved under statutory support. |
| 18 | What is VAT? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 4 | 12 | NIRC Sec. 105 | present | ALLOW | PASS | VAT issue matching preserved. |
| 19 | What is BIR? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 2 | 4 | NIRC Sec. 2 | present | ALLOW | PASS | BIR tax-domain behavior preserved. |
| 20 | Who is a taxpayer under the NIRC? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 2 | 4 | NIRC Sec. 2 | present | ALLOW | PASS | Taxpayer/NIRC behavior preserved. |
| 21 | What is TRAIN? | REJECT; DOMAIN_BOUNDARY_REJECT | REJECT; DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | n/a | n/a | REJECT | PASS | Generic TRAIN remains unbridged. |
| 22 | What is a Republic Act? | REJECT; DOMAIN_BOUNDARY_REJECT | REJECT; DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | n/a | n/a | REJECT | PASS | Generic Republic Act remains rejected. |
| 23 | What is the weather today? | REJECT; DOMAIN_BOUNDARY_REJECT | REJECT; DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | n/a | n/a | REJECT | PASS | Non-tax boundary rejection preserved. |
| 24 | Tell me a joke. | REJECT; DOMAIN_BOUNDARY_REJECT | REJECT; DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | n/a | n/a | REJECT | PASS | Non-tax boundary rejection preserved. |
| 25 | What is income source? | REJECT; DOMAIN_BOUNDARY_REJECT | REJECT; DOMAIN_BOUNDARY_REJECT | DOMAIN_BOUNDARY_REJECT | 0 | n/a | n/a | n/a | REJECT | PASS | Generic income-source query does not activate source inventory. |
| 26 | What is the source of income under NIRC Section 23? | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 23 | present | ALLOW | PASS | NIRC Sec. 23 legal source-of-income query preserved. |
| 27 | Show me the source for NIRC Section 23. | ALLOW; AUTHORITY_FOUND | ALLOW; AUTHORITY_FOUND | AUTHORITY_FOUND | 3 | 9 | NIRC Sec. 2 | present | ALLOW | PASS | Source lookup path preserved. |

## Coverage Confirmation

- RA 10963 / TRAIN bridge remained `AUTHORITY_FOUND`.
- CREATE / RA 11534 remained `AUTHORITY_FOUND` through `RA No. 11534`, not the RA 10963 bridge.
- NIRC Sec. 23 / 57 / 58 remained `AUTHORITY_FOUND`.
- RR 2-98, RMC 65-2012, RMO 20-2013, and RMO 24-2013 remained authority-safe.
- CTA Case No. 9369 retained visible source-card and click target behavior.
- BIR Ruling exclusion remained preserved.
- Generic Republic Act and generic TRAIN remained rejected/unbridged.
- Generic withholding tax / EWT guard behavior remained preserved.
- Source-card labels and URLs remained intact.
- Public source cards did not expose internal-only fields in the matrix.
- Domain-boundary accept/reject behavior remained intact.
- Reranker issue matching and marker-preservation controls remained intact through local and staging checks.

## Recommendation

It is safe to proceed to PATCH-06E-006, Issue Exact-Authority Detector Extraction, under the existing Phase 6E rules: one narrow extraction patch, no behavior changes, no retrieval/vector/pipeline changes, and a targeted CREATE/TRAIN/RA/NIRC authority regression gate.

## Confirmation

- No backend source code was modified.
- No refactor was started.
- PATCH-06E-006 was not started.
- No PDFs were ingested.
- No RAG, source corpus, DB/indexing, or vector-store data was modified.
