# PATCH-035D Post-035 Stabilization Gate

Date: 2026-06-23

Branch: `feature/source-availability-engine-v1`

Validated local HEAD: `57b533d5aee709eb91d29dfc2a7dc2067a5238db`

Validated staging HEAD: `57b533d5aee709eb91d29dfc2a7dc2067a5238db`

Service: `tina-backend-staging`

Environment: `staging`

Final verdict: **PASS**

## Scope

This gate validates post-PATCH-035A/B/C stability for the TRAIN Law / RA 10963 authority bridge and confirms no regressions across authority, retrieval, source-card, source-availability, and source-intent behavior.

No backend source code was modified.

No changes were made to:

- source corpus
- source metadata
- embeddings
- indexing data
- RAG/vector store
- newly uploaded Google Drive PDFs

Phase 6E decomposition was not started.

## Repo Verification

Command:

```text
git status --short
git branch --show-current
git rev-parse HEAD
```

Result:

```text
working tree: clean
branch: feature/source-availability-engine-v1
HEAD: 57b533d5aee709eb91d29dfc2a7dc2067a5238db
```

Repo verification result: **PASS**

## Staging Health

`GET /health` on `https://tina-backend-staging.onrender.com` returned:

```text
status: ok
commitSha: 57b533d5aee709eb91d29dfc2a7dc2067a5238db
serviceName: tina-backend-staging
environment: staging
indexingRunning: false
vectorStore: 5,346 chunks / 102 sources
```

Staging commit verification result: **PASS**

## Local Regression Tests

Command:

```text
npm test
```

Result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   57 run, 0 failed
GATE PASSED
```

Relevant covered suites included:

```text
patch-026a-r2-create-act-canonicalization.test.mjs
patch-026a-r3-train-law-canonicalization.test.mjs
patch-027j-r1-exact-admin-authority-governing.test.mjs
patch-027m-exact-admin-query-shape.test.mjs
patch-027n-wht-jurisprudence-sae-guard.test.mjs
patch-027o-generic-ewt-acronym-guard.test.mjs
patch-027p-r1-nirc-section-continuation-scope.test.mjs
patch-027r-source-card-field-preservation.test.mjs
patch-027y-source-card-finalization.test.mjs
patch-030a-exact-jurisprudence-authority-integrity.test.mjs
patch-033d-r1-source-card-integrity.test.mjs
patch-033d-r2-admin-issuance-year-variants.test.mjs
patch-034d-source-intent-registry-extraction.test.mjs
patch-035b-ra10963-bridge.test.mjs
```

Local regression result: **PASS**

## Staging Query Matrix

| # | Query | Expected sourceAvailability | Actual sourceAvailability | Source count | exactAuthorityMatches | Visible source-card title/label | Click target | Result | Notes |
|---:|---|---|---|---:|---:|---|---|---|---|
| 1 | `What is RA 10963?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `NIRC Sec. 2` | present | PASS | RA 10963 bridge restored. |
| 2 | `What is the TRAIN Law?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `NIRC Sec. 2` | present | PASS | TRAIN Law bridge restored. |
| 3 | `What is the Tax Reform for Acceleration and Inclusion Act?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `NIRC Sec. 6` | present | PASS | Full title bridge restored. |
| 4 | `What is RA 11534?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `RA No. 11534` | present | PASS | CREATE/RA 11534 remains independent of RA 10963 bridge. |
| 5 | `What is the CREATE Act?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `RA No. 11534` | present | PASS | CREATE Act canonicalization preserved. |
| 6 | `What is NIRC Section 23?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | 9 | `NIRC Sec. 21`; `NIRC Sec. 2`; `NIRC Sec. 23` | present | PASS | NIRC Sec. 23 remains authority found. |
| 7 | `What does NIRC Section 57 provide?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | 15 | `NIRC Sec. 57`; `NIRC Sec. 21`; `NIRC Sec. 2` | present | PASS | Sec. 57 handling preserved. |
| 8 | `What does NIRC Section 58 provide?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | 21 | `NIRC Sec. 58`; `NIRC Sec. 21`; `NIRC Sec. 2` | present | PASS | Sec. 58 handling preserved. |
| 9 | `What does RR 2-98 provide on expanded withholding tax?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `Revenue Regulations` | present | PASS | First source label reported `RR 2-98`; RR authority-safe behavior preserved. |
| 10 | `What is RMC 65-2012?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 14 | `RMC No. 65-2012` | present | PASS | RMC exact-admin behavior preserved. |
| 11 | `What is RMO 20-2013?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `RMO No. 20-2013` | present | PASS | RMO exact-admin behavior preserved. |
| 12 | `What is RMO 24-2013?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | 12 | `RMO No. 24-2013` | present | PASS | RMO alias behavior preserved. |
| 13 | `What is CTA Case No. 9369?` | `RELATED_AUTHORITY_ONLY` with visible case card | `RELATED_AUTHORITY_ONLY` | 1 | 12 | `CTA Case No. 9369` | present | PASS | Source-card and click target preserved: `https://drive.google.com/file/d/1jCGaPdUsBWopWJnc3KncZpyBAzlu2G3y/view?usp=drivesdk`. |
| 14 | `Are there jurisprudence cases on withholding tax?` | `RELATED_AUTHORITY_ONLY` | `RELATED_AUTHORITY_ONLY` | 1 | 12 | `CTA Case No. 9711` | present | PASS | Jurisprudence guard preserved. |
| 15 | `What is BIR Ruling DA-489-03?` | `RELATED_AUTHORITY_ONLY` with no promoted BIR ruling card | `RELATED_AUTHORITY_ONLY` | 0 | 4 | none | n/a | PASS | BIR Ruling exclusion preserved. |
| 16 | `What is withholding tax?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | 12 | `NIRC Sec. 57`; `NIRC Sec. 58`; `RR No. 2-1998` | present | PASS | Generic WHT guard behavior preserved under statutory support. |
| 17 | `Explain EWT.` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | 12 | `NIRC Sec. 57`; `NIRC Sec. 58`; `RR No. 2-1998` | present | PASS | Generic EWT guard behavior preserved under statutory support. |
| 18 | `What is a Republic Act?` | no RA 10963 bridge activation | `DOMAIN_BOUNDARY_REJECT` | 0 | n/a | none | n/a | PASS | Generic Republic Act query remained unbridged. |
| 19 | `What is TRAIN?` | no RA 10963 bridge activation | `DOMAIN_BOUNDARY_REJECT` | 0 | n/a | none | n/a | PASS | Generic TRAIN query remained unbridged. |
| 20 | `Show me the source for NIRC Section 23.` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | 9 | `NIRC Sec. 2`; `NIRC Sec. 21`; `NIRC Sec. 23` | present | PASS | `/source` source-card path preserved. |

Staging matrix result: **PASS**

## Behavior Notes

- RA 10963, TRAIN Law, and the Tax Reform for Acceleration and Inclusion Act now return `AUTHORITY_FOUND` with `sourceCount=1` and `exactAuthorityMatches=12`.
- CREATE / RA 11534 remains `AUTHORITY_FOUND` through `RA No. 11534` source cards, not the RA 10963 bridge.
- NIRC Sec. 23, Sec. 57, and Sec. 58 remain `AUTHORITY_FOUND`.
- RR 2-98, RMC 65-2012, RMO 20-2013, and RMO 24-2013 remain authority-safe.
- CTA Case No. 9369 retains visible source-card and click target behavior.
- BIR Ruling exclusion remains preserved.
- Generic `Republic Act` and generic `TRAIN` remain unbridged and are rejected by the domain-boundary guard.
- Generic withholding tax and EWT retain guarded `AUTHORITY_FOUND` behavior with statutory support from NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998.

## Failure Classification

No PATCH-035 regression was found.

Classifications:

```text
PATCH-035 regression: none
pre-existing backlog: none surfaced in this gate
staging/deployment issue: none
test/query issue: none requiring patch
source corpus mismatch: none
```

## Gate Decision

PATCH-035A/B/C are stable on local regression and staging validation.

Final verdict:

```text
PASS
```
