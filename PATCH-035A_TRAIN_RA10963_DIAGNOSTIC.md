# PATCH-035A TRAIN Law / RA 10963 Diagnostic

Date: 2026-06-23

Branch: `feature/source-availability-engine-v1`

Purpose: investigate the pre-existing TRAIN Law / RA 10963 retrieval backlog without patching.

Status: **DIAGNOSTIC ONLY / NO CODE CHANGE**

## No-Change Confirmation

No backend source code was modified.

No database rows, vector-store rows, source metadata, or indexing data were modified.

No TRAIN Law / RA 10963 fix was implemented.

No new extraction was started.

## Repo Status

Initial status:

```text
## feature/source-availability-engine-v1...origin/feature/source-availability-engine-v1
```

The repo was clean before diagnostics.

## Facts Verified

TRAIN Law aliases classify correctly:

```text
What is the TRAIN Law? -> exactAuthority.reference = RA 10963
Explain RA 10963. -> exactAuthority.reference = RA 10963
What is the Tax Reform for Acceleration and Inclusion Act? -> exactAuthority.reference = RA 10963
```

CREATE control classifies through the same exact-authority path:

```text
What is the CREATE Act? -> exactAuthority.reference = RA 11534
Explain RA 11534. -> exactAuthority.reference = RA 11534
```

The TRAIN/NIRC source exists:

```text
source: 01-tax-code/nirc-1997-ra-10963-(bir).pdf
path: 01_TAX_CODE/NIRC-1997-RA-10963 (BIR).pdf
title: NIRC-1997-RA-10963 (BIR).pdf
fileId: 1fDZA1wY_DdfZzOz_c_R3BDYWyPODIuPW
authority_type: STATUTE
rows found by source/title/path %10963%: 768
```

But no TRAIN rows are keyed by `RA 10963`:

```text
normalized_reference = RA 10963: 0 rows
normalized_reference ilike %RA 10963%: 0 rows
```

CREATE control is keyed by `RA 11534`:

```text
normalized_reference = RA 11534: 370 rows
source/title/path ilike %11534%: 370 rows
```

## Diagnostics Run

Local classifier diagnostics:

```text
node --input-type=module
imports:
  classify
  detectExactAuthority
  normalizeAuthority
  buildIssueClassificationSearchQueries
```

Vector lookup diagnostics:

```text
exactAuthoritySearch()
normalizedCitationSearch()
searchIndexedSources()
buildNormalizedRefVariants()
```

Supabase/index metadata diagnostics:

```text
tina_vector_store normalized_reference equality
tina_vector_store normalized_reference ILIKE
tina_vector_store source/original_source/document_title ILIKE
known source path lookup for nirc-1997-ra-10963
CREATE / RA 11534 control lookup
```

Staging `/ask` diagnostics:

```text
What is the TRAIN Law?
Explain RA 10963.
What is the Tax Reform for Acceleration and Inclusion Act?
What is NIRC 1997 RA 10963?
What is the CREATE Act?
Explain RA 11534.
```

Raw diagnostic JSON was saved outside the repo for local inspection:

```text
C:/Projects/tina-dev-factory/patch-035a-train-ra10963-diagnostics.json
```

## Classifier Output

| Query | exactAuthority | normalized authority | retrieval strategy | response mode | orchestration mode |
|---|---|---|---|---|---|
| `What is the TRAIN Law?` | `RA 10963` | `RA_10963` | `EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC` | `STANDARD` | `STANDARD_TAX` |
| `Explain RA 10963.` | `RA 10963` | `RA_10963` | `EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC` | `STANDARD` | `STANDARD_TAX` |
| `What is the Tax Reform for Acceleration and Inclusion Act?` | `RA 10963` | `RA_10963` | `EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC` | `STANDARD` | `STANDARD_TAX` |
| `What is NIRC 1997 RA 10963?` | `RA 10963` | `RA_10963` | `EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC` | `FAST_DEFINITION` | `FAST_DEFINITION` |
| `What is the CREATE Act?` | `RA 11534` | `RA_11534` | `EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC` | `STANDARD` | `STANDARD_TAX` |
| `Explain RA 11534.` | `RA 11534` | `RA_11534` | `EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC` | `STANDARD` | `STANDARD_TAX` |

Classifier conclusion:

```text
No classifier alias defect was found for TRAIN Law / RA 10963.
```

## Vector Lookup Output

| Diagnostic | exactAuthoritySearch | normalizedCitationSearch | searchIndexedSources | First indexed/source result |
|---|---:|---:|---:|---|
| TRAIN Law | 0 | 0 | 8 | unrelated `RA 11534` surfaced first in local broad indexed search |
| RA 10963 | 0 | 0 | 8 | `NIRC-1997-RA-10963 (BIR).pdf`, `NIRC Sec. 2` |
| Full TRAIN title | 0 | 0 | 8 | unrelated `RA 11534` surfaced first in local broad indexed search |
| NIRC 1997 RA 10963 | 2 | 2 | 8 | `NIRC-1997-RA-10963 (BIR).pdf`, `NIRC Sec. 2` |
| CREATE Act control | 8 | 8 | 8 | `RA_11534- CREATE.pdf`, `RA 11534` |
| RA 11534 control | 8 | 8 | 8 | `RA_11534- CREATE.pdf`, `RA 11534` |

Important vector-store log for TRAIN/RA 10963 exact lookup:

```text
[EXACT AUTHORITY NO BROAD FALLBACK]
found: 0
note: returning equality results only - ILIKE fallback removed to prevent 57014 timeout
```

Important vector-store log for CREATE/RA 11534 exact lookup:

```text
[EXACT AUTHORITY FAST RETURN]
found: 8
```

Vector lookup conclusion:

```text
The exact/citation lookup layer is behaving as designed: it performs indexed equality lookup against normalized_reference.
It cannot find RA 10963 because no rows have normalized_reference = RA 10963.
```

## Supabase / Index Metadata Output

TRAIN/NIRC source metadata sample:

```text
title: NIRC-1997-RA-10963 (BIR).pdf
source: 01-tax-code/nirc-1997-ra-10963-(bir).pdf
original_source: 01-tax-code/nirc-1997-ra-10963-(bir).pdf
path: 01_TAX_CODE/NIRC-1997-RA-10963 (BIR).pdf
authority_type: STATUTE
normalized_reference: NIRC Sec. 2
metadata.normalizedReference: NIRC Sec. 2
chunk_index: 0
fileId: 1fDZA1wY_DdfZzOz_c_R3BDYWyPODIuPW
```

Text preview confirms the source identity:

```text
NATIONAL INTERNAL REVENUE CODE OF 1997 As amended by Republic Act (RA) No. 10963 (TRAIN)...
```

Known TRAIN/NIRC source distinct normalized references:

```text
distinct normalized_reference count: 45
examples:
NIRC Sec. 2
NIRC Sec. 3
NIRC Sec. 5
NIRC Sec. 6
NIRC Sec. 7
NIRC Sec. 8
NIRC Sec. 9
NIRC Sec. 11
NIRC Sec. 12
NIRC Sec. 13
NIRC Sec. 15
NIRC Sec. 17
NIRC Sec. 18
NIRC Sec. 19
NIRC Sec. 21
NIRC Sec. 22
NIRC Sec. 23
NIRC Sec. 24
NIRC Sec. 25
NIRC Sec. 26
NIRC Sec. 27
NIRC Sec. 28
NIRC Sec. 29
NIRC Sec. 31
NIRC Sec. 33
NIRC Sec. 34
NIRC Sec. 35
NIRC Sec. 37
NIRC Sec. 38
NIRC Sec. 39
```

No sampled TRAIN/NIRC row exposes `RA 10963` as its row-level `normalized_reference`.

CREATE control metadata sample:

```text
title: RA_11534- CREATE.pdf
source: 01-tax-code/ra-11534-create.pdf
path: 01_TAX_CODE/RA_11534- CREATE.pdf
authority_type: STATUTE
normalized_reference: RA 11534
metadata.normalizedReference: RA 11534
fileId: 1HPZSewVidf37Ya_aJlMShw3T6dvqJhrp
```

## Staging `/ask` Output

| Query | SAE/source status | vector matches | source cards | first labels/cards | Result |
|---|---|---:|---:|---|---|
| `What is the TRAIN Law?` | `RELATED_AUTHORITY_ONLY` | 12 | 0 | `civil-code-philippines.docx`; `RR 12-2018`; `NIRC Sec. 2`; `NIRC Sec. 6`; `NIRC Sec. 3` | safe no-authority answer |
| `Explain RA 10963.` | `RELATED_AUTHORITY_ONLY` | 12 | 0 | `NIRC Sec. 2`; `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 6` | safe no-authority answer |
| `What is the Tax Reform for Acceleration and Inclusion Act?` | `NO_INDEXED_SOURCE` | 12 | 0 | `NIRC Sec. 2`; `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 6`; `NIRC Sec. 6` | safe no-source answer |
| `What is NIRC 1997 RA 10963?` | `AUTHORITY_FOUND` | 2 | 2 | `NIRC Sec. 2`; `NIRC Sec. 21` | finds NIRC section rows, not RA 10963 as act |
| `What is the CREATE Act?` | `AUTHORITY_FOUND` | 12 | 1 | `RA No. 11534` | control pass |
| `Explain RA 11534.` | `AUTHORITY_FOUND` | 12 | 1 | `RA No. 11534` | control pass |

Staging conclusion:

```text
No timeout/orchestration defect was proven in this diagnostic pass.
The live service returns safe no-authority/no-source states for TRAIN/RA 10963 because exact authority retrieval misses the act-level key.
```

## Indexing Code Path Observed

`vector-store.js` treats NIRC documents specially:

```text
isNircSourceDocument(source, metadata) detects NIRC documents by source/title/path.
For NIRC documents, per-chunk normalized_reference is set from detected section headings.
Document-level fallback references are suppressed for NIRC rows.
```

Relevant behavior:

```text
effectiveNormalizedReference = isNirc ? (chunkSectionScope || null) : authorityFields.normalized_reference
```

This explains why `nirc-1997-ra-10963-(bir).pdf` rows are keyed as `NIRC Sec. X` rather than `RA 10963`.

## CREATE / RA 11534 Control Comparison

CREATE works because its indexed documents are act-level RA documents:

```text
RA 11534 exactAuthoritySearch: 8 rows
RA 11534 normalizedCitationSearch: 8 rows
normalized_reference = RA 11534: 370 rows
staging /ask source card: RA No. 11534
```

TRAIN fails because its indexed source is the NIRC as amended by TRAIN, not a separately act-keyed RA document:

```text
RA 10963 exactAuthoritySearch: 0 rows
RA 10963 normalizedCitationSearch: 0 rows
normalized_reference = RA 10963: 0 rows
known source rows found by path/title 10963: 768 rows
known source rows are keyed as NIRC Sec. X
```

## Root Cause Classification

Primary classification: **A. metadata/indexing defect**

Reason:

```text
The source exists, but no indexed row has normalized_reference = RA 10963 or an equivalent act-level lookup key.
The exact authority and citation lookup layers depend on normalized_reference equality.
```

Secondary contributing condition: **C. vector lookup alias gap**

Reason:

```text
The vector lookup layer has no safe alias bridge from RA 10963 to the NIRC-1997-RA-10963 source path/title when normalized_reference equality misses.
This is not the primary defect; it is an available mitigation path.
```

Not supported by evidence:

```text
B. classifier alias defect: no, TRAIN aliases map to RA 10963 correctly.
D. source-card hydration defect: no, hydration works when candidate rows are found.
E. timeout/orchestration defect: no new timeout defect proven; staging returned safe statuses and CREATE control succeeded.
```

Overall classification:

```text
F. mixed defect, dominated by A metadata/indexing defect with C as optional retrieval-bridge mitigation.
```

## Recommended Fix Options

Option 1: Metadata/index repair for the NIRC-1997-RA-10963 source.

```text
Add an act-level alias/index key for RA 10963 to the NIRC-1997-RA-10963 source while preserving per-section NIRC normalized_reference behavior.
```

Pros:

```text
Fixes the root cause at the data/index layer.
Keeps exactAuthoritySearch equality-based and fast.
Avoids reintroducing broad ILIKE fallback that previously caused 57014 timeouts.
```

Risk:

```text
Must avoid replacing NIRC Sec. X row-level normalized_reference values, because section retrieval depends on them.
Likely requires separate alias metadata or companion act-level rows, not a blunt overwrite.
```

Option 2: Narrow retrieval bridge for RA 10963.

```text
If exactAuthority.reference is RA 10963 and exact/citation equality lookup returns zero, perform a bounded indexed source/title/path lookup for nirc-1997-ra-10963 only.
```

Pros:

```text
Small code patch.
Avoids broad semantic fallback.
Can be scoped only to RA 10963.
Preserves existing NIRC section normalized_reference rows.
```

Risk:

```text
Adds special-case retrieval logic.
Must be guarded so it does not promote unrelated NIRC sections as direct support for every TRAIN question.
Needs source-card and authority sufficiency tests.
```

Option 3: Source alias registry.

```text
Create a canonical source-alias mapping from RA 10963 / TRAIN Law to the indexed NIRC-1997-RA-10963 source path.
```

Pros:

```text
Clear and explicit alias ownership.
Could support future act-to-codified-source mappings.
```

Risk:

```text
Requires careful integration with vector lookup and source-card finalization.
Could become a second metadata system if not kept narrow.
```

## Safest Recommended Patch Path

Recommended path: **Option 2 first, with Option 1 as longer-term index hygiene.**

Implementation guidance for a future patch:

```text
1. Add tests proving classifier behavior remains unchanged for TRAIN and CREATE.
2. Add a narrow RA 10963 retrieval bridge only after exactAuthoritySearch and normalizedCitationSearch miss.
3. Bridge only exactAuthority.reference === RA 10963.
4. Query only indexed top-level columns for the known source path/title, not broad metadata JSON ILIKE.
5. Preserve NIRC Sec. X row-level normalized_reference.
6. Return a controlled source card for the NIRC-1997-RA-10963 source.
7. Validate CREATE / RA 11534 remains unchanged.
8. Validate NIRC Sec. 23, VAT, RR 2-98, and CTA 9369 are unchanged.
```

Why not metadata overwrite:

```text
Changing all 768 NIRC rows to normalized_reference = RA 10963 would break NIRC section lookup behavior.
```

Why not broad fallback:

```text
vector-store.js explicitly removed broad exact-authority ILIKE fallback because it caused Supabase statement timeouts.
```

## Final Diagnostic Verdict

PATCH-035A confirms the TRAIN Law / RA 10963 backlog is real and pre-existing.

Final root cause:

```text
F. mixed defect, dominated by A metadata/indexing defect.
No classifier alias defect.
No source-card hydration defect.
No new timeout/orchestration defect proven.
```

Recommended next patch, if approved:

```text
PATCH-035B: narrow RA 10963 exact-authority retrieval bridge to the NIRC-1997-RA-10963 source, with tests and CREATE control validation.
```
