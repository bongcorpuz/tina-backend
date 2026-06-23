# PATCH-035B RA 10963 Bridge Addendum

Date: 2026-06-23

Branch: `feature/source-availability-engine-v1`

Status: **PARTIAL RETRIEVAL BRIDGE IMPLEMENTED / SOURCE-AVAILABILITY NOT CLOSED**

## No-Data-Change Confirmation

No database rows, vector-store rows, source metadata, or indexing data were modified.

The NIRC source row-level `normalized_reference` values remain `NIRC Sec. X`.

No broad semantic fallback was added.

No general RA-to-NIRC bridge was added.

## Commits

```text
030548d PATCH-035B bridge RA10963 exact authority retrieval
1ea4eb5 PATCH-035B tighten RA10963 bridge source filter
aa870d1 PATCH-035B annotate RA10963 bridge authority matches
```

## Local Result

Focused local regression:

```text
node tests/patch-035b-ra10963-bridge.test.mjs
PATCH-035B RA 10963 bridge tests: 11 passed, 0 failed
```

Additional local checks passed:

```text
node --check vector-store.js
node --check tests/patch-035b-ra10963-bridge.test.mjs
node tests/patch-026a-r3-train-law-canonicalization.test.mjs
node tests/patch-026a-r2-create-act-canonicalization.test.mjs
node tests/patch-033d-r2-admin-issuance-year-variants.test.mjs
node tests/patch-023b-source-card-url-and-label.test.mjs
node tests/patch-027y-source-card-finalization.test.mjs
node tests/patch-034d-source-intent-registry-extraction.test.mjs
```

Known non-behavioral local test issue:

```text
node tests/patch-034g-doctrine-authority-map-extraction.test.mjs
```

This test passed its behavior assertions but failed its PATCH-034G-specific "pipeline/vector/source-card files have no diff" guard because PATCH-035B intentionally changes `vector-store.js`.

## Implementation Summary

PATCH-035B added a narrow bridge in `exactAuthoritySearch()`:

```text
only after normalized_reference equality results are empty
only for RA 10963 exact-authority context
only by source/original_source/document_title stem nirc-1997-ra-10963
```

The bridge returns rows from:

```text
01-tax-code/nirc-1997-ra-10963-(bir).pdf
NIRC-1997-RA-10963 (BIR).pdf
```

The bridge also annotates only those returned rows with RA 10963 aliases and exact/target authority match flags while preserving each row's displayed `normalizedReference` as `NIRC Sec. X`.

## Staging Deployment

Staging deployed commit:

```text
aa870d1317d8fa0627c2cf03285ecbfcc81b3809
```

Health check:

```text
/health: ok
commitSha: aa870d1317d8fa0627c2cf03285ecbfcc81b3809
```

## Staging Validation Result

Final staging `/ask` validation:

| Query | sourceAvailability | sourceCount | exactAuthorityMatches | firstSourceLabels |
|---|---:|---:|---:|---|
| `What is the TRAIN Law?` | `RELATED_AUTHORITY_ONLY` | 0 | 12 | `NIRC Sec. 6`; `NIRC Sec. 3`; `NIRC Sec. 5`; `NIRC Sec. 6`; `NIRC Sec. 6` |
| `Explain RA 10963.` | `RELATED_AUTHORITY_ONLY` | 0 | 12 | `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 2`; `NIRC Sec. 3` |
| `What is the Tax Reform for Acceleration and Inclusion Act?` | `RELATED_AUTHORITY_ONLY` | 0 | 12 | `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 2`; `NIRC Sec. 3` |
| `What is the CREATE Act?` | `AUTHORITY_FOUND` | 1 | 12 | `RA No. 11534` |
| `NIRC Sec. 23` | `AUTHORITY_FOUND` | 3 | 9 | `NIRC Sec. 23`; `NIRC Sec. 21`; `NIRC Sec. 2` |
| `NIRC Sec. 57` | `AUTHORITY_FOUND` | 3 | 15 | `NIRC Sec. 57`; `NIRC Sec. 21`; `NIRC Sec. 2` |
| `RR 2-98` | `AUTHORITY_FOUND` | 1 | 12 | `RR 2-98` |
| `CTA Case No. 9369` | `RELATED_AUTHORITY_ONLY` | 1 | 12 | `CTA Case No. 9369` |
| `What does BIR Ruling No. 016-2024 provide on VAT refund?` | `RELATED_AUTHORITY_ONLY` | 0 | 12 | `CTA Case No. 9711`; `NIRC Sec. 112`; `NIRC Sec. 112`; `NIRC Sec. 112`; `NIRC Sec. 112` |

## Finding

PATCH-035B successfully moved RA 10963 / TRAIN from exact lookup miss to exact Layer 1 retrieval:

```text
before PATCH-035B: exactAuthorityMatches = 0
after PATCH-035B:  exactAuthorityMatches = 12
```

But the final source-availability/source-card gate still returns:

```text
sourceAvailability = RELATED_AUTHORITY_ONLY
sourceCount = 0
```

Therefore the remaining defect is not the vector retrieval bridge itself. It is downstream eligibility/final source-card acceptance for an act-level exact authority whose retrieved rows remain section-keyed as `NIRC Sec. X`.

## Root-Cause Update

PATCH-035A classified the backlog as:

```text
F. mixed defect, dominated by A metadata/indexing defect with C as optional retrieval-bridge mitigation.
```

PATCH-035B confirms:

```text
C retrieval bridge mitigation is sufficient to retrieve rows into Layer 1.
It is not sufficient to close user-visible source availability.
```

Remaining condition:

```text
Source-availability/card eligibility requires a visible governing source-card path for RA 10963.
NIRC section-keyed rows retrieved through an act-level bridge are still treated as related authority only.
```

## Controls Preserved

Staging controls remained stable:

```text
CREATE Act / RA 11534: AUTHORITY_FOUND
NIRC Sec. 23: AUTHORITY_FOUND
NIRC Sec. 57: AUTHORITY_FOUND
RR 2-98: AUTHORITY_FOUND
CTA Case No. 9369: source card still present
BIR Ruling query: still excluded from exact authority promotion
```

## Recommendation

Do not broaden PATCH-035B further inside vector retrieval.

Next work should be a separate diagnostic/patch focused on the source-availability/source-card boundary for act-level aliases to codified NIRC sources.

Potential narrow direction:

```text
When a row is marked as the RA 10963 source bridge and came from the known NIRC-1997-RA-10963 source, allow one controlled visible source card for the document-level NIRC-1997-RA-10963 source while preserving row-level NIRC Sec. X references.
```

This should be handled separately because it touches final authority eligibility and source-card display behavior, not only retrieval.
