# PATCH-06E-002S Source Card Sanitizer Staging Smoke

Date: 2026-06-23

Branch: `feature/source-availability-engine-v1`

Validated local HEAD: `15bbf15f2fb8042b2f0cbb77bc5e5861f6b3f724`

Validated staging HEAD: `15bbf15f2fb8042b2f0cbb77bc5e5861f6b3f724`

Service: `tina-backend-staging`

Environment: `staging`

Final verdict: **PASS**

## Scope

This smoke gate validates that PATCH-06E-002 did not alter public source-card behavior after deployment.

No backend source code was modified for this smoke gate.

No changes were made to:

- source corpus
- source metadata
- embeddings
- indexing data
- RAG/vector store
- newly uploaded Google Drive PDFs

PATCH-06E-003 was not started.

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
HEAD: 15bbf15f2fb8042b2f0cbb77bc5e5861f6b3f724
```

Repo verification result: **PASS**

## Staging Health

`GET /health` on `https://tina-backend-staging.onrender.com` returned:

```text
status: ok
commitSha: 15bbf15f2fb8042b2f0cbb77bc5e5861f6b3f724
serviceName: tina-backend-staging
environment: staging
indexingRunning: false
vectorStore: 5,346 chunks / 102 sources
```

Staging health result: **PASS**

## Staging Smoke Matrix

| # | Query | sourceAvailability | Source count | Visible source-card title/label | URL / click target | Internal-only fields absent | Eligibility support before public sanitization | Result | Notes |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `What is RA 10963?` | `AUTHORITY_FOUND` | 1 | `NIRC Sec. 2` | present | yes | inferred pass | PASS | `exactAuthorityMatches=12`; RA 10963 bridge remains visible and clickable. |
| 2 | `What is the TRAIN Law?` | `AUTHORITY_FOUND` | 1 | `NIRC Sec. 2` | present | yes | inferred pass | PASS | `exactAuthorityMatches=12`; TRAIN bridge remains visible and clickable. |
| 3 | `What is RA 11534?` | `AUTHORITY_FOUND` | 1 | `RA No. 11534` | present | yes | inferred pass | PASS | CREATE/RA 11534 source card preserved. |
| 4 | `What is the CREATE Act?` | `AUTHORITY_FOUND` | 1 | `RA No. 11534` | present | yes | inferred pass | PASS | CREATE alias source card preserved. |
| 5 | `What is NIRC Section 23?` | `AUTHORITY_FOUND` | 3 | `NIRC Sec. 21`; `NIRC Sec. 2`; `NIRC Sec. 23` | present | yes | inferred pass | PASS | NIRC Sec. 23 visible among public cards. |
| 6 | `What does NIRC Section 57 provide?` | `AUTHORITY_FOUND` | 3 | `NIRC Sec. 57`; `NIRC Sec. 21`; `NIRC Sec. 2` | present | yes | inferred pass | PASS | NIRC Sec. 57 remains first visible card. |
| 7 | `What does RR 2-98 provide on expanded withholding tax?` | `AUTHORITY_FOUND` | 1 | `Revenue Regulations` | present | yes | inferred pass | PASS | Public card citation reported `RR 2-98`; URL preserved. |
| 8 | `What is CTA Case No. 9369?` | `RELATED_AUTHORITY_ONLY` | 1 | `CTA Case No. 9369` | present | yes | inferred pass | PASS | CTA click target preserved: `https://drive.google.com/file/d/1jCGaPdUsBWopWJnc3KncZpyBAzlu2G3y/view?usp=drivesdk`. |
| 9 | `Are there jurisprudence cases on withholding tax?` | `RELATED_AUTHORITY_ONLY` | 1 | `CTA Case No. 9711` | present | yes | inferred pass | PASS | Jurisprudence source-card behavior preserved. |
| 10 | `What is BIR Ruling DA-489-03?` | `RELATED_AUTHORITY_ONLY` | 0 | none | n/a | yes | inferred pass | PASS | BIR Ruling exclusion remains preserved; no public card emitted. |

Smoke matrix result: **PASS**

## Public Card Field Checks

All public `sourceCards` were checked for the internal-only fields moved behind the sanitizer boundary:

```text
id
source
path
filePath
file_path
filename
fileName
documentTitle
document_title
source_path
sourcePath
storageKey
metadata
fileId
vectorId
supabaseId
rowId
```

Observed result:

```text
internal-only fields absent from every public card
```

Required preserved fields before public sanitization were inferred from unchanged eligibility outcomes: expected cards still appeared with correct `sourceAvailability`, labels, citations, authority types, and click targets.

## Failure Classification

No failure appeared.

```text
PATCH-06E-002 regression: none
staging issue: none
test-query issue: none
pre-existing behavior: none surfaced in this smoke
```

## Gate Decision

PATCH-06E-002 is stable on staging for public source-card visibility, labels, URLs, public field shape, and sanitizer boundary behavior.

Final verdict:

```text
PASS
```
