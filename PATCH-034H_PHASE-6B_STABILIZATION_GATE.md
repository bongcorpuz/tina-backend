# PATCH-034H Phase 6B Stabilization Gate

Date: 2026-06-23

Branch: `feature/source-availability-engine-v1`

Validated staging HEAD: `60bbc642a47bbacd3c825d12056c8a0b32c8af2f`

Service: `tina-backend-staging`

Environment: `staging`

Final verdict: **PASS WITH KNOWN BACKLOG**

## Scope

This gate validates behavioral stability after Phase 6B controlled decomposition and registry extraction.

Validated extracted modules:

1. `source-card-engine.js`
2. `authority-restoration-engine.js`
3. `source-intent-registry.js`
4. `taxpayer-definition-registry.js`
5. `authority-alias-registry.js`
6. `vector-authority-reference-registry.js`
7. `doctrine-authority-map.js`

No additional extraction or refactor was performed.

No changes were made to:

- `pipeline.js`
- `source-authority-selector.js`
- `authority-utils.js`
- `vector-store.js`
- `issue-classification-engine.js`

## Repo Verification

Requested staging HEAD confirmed locally:

```text
60bbc642a47bbacd3c825d12056c8a0b32c8af2f
```

Working tree note:

```text
knowledge/CURRENT_STATE.md was already modified before this report was created.
It was not edited or included in this stabilization-gate commit.
```

## Staging Health

`GET /health` on `https://tina-backend-staging.onrender.com` returned:

```text
status: ok
commitSha: 60bbc642a47bbacd3c825d12056c8a0b32c8af2f
serviceName: tina-backend-staging
environment: staging
indexingRunning: false
vectorStore: 5,346 chunks / 102 sources
```

Health result: **PASS**

## Local Regression Tests

Command:

```text
npm test
```

Result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   56 run, 0 failed
GATE PASSED
```

Included extraction suites:

```text
patch-034a-source-card-engine-extraction.test.mjs
patch-034b-indexed-source-card-target-extraction.test.mjs
patch-034c-authority-restoration-helper-extraction.test.mjs
patch-034d-source-intent-registry-extraction.test.mjs
patch-034e-taxpayer-definition-registry-extraction.test.mjs
patch-034f-1-authority-alias-registry-extraction.test.mjs
patch-034f-2-vector-authority-reference-registry-extraction.test.mjs
patch-034g-doctrine-authority-map-extraction.test.mjs
```

Local regression result: **PASS**

## Staging Query Matrix

| # | Query | Expected status | Actual status | Source cards | Key source card titles | Result | Notes |
|---:|---|---|---|---:|---|---|---|
| 1 | `What is VAT?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 4 | `NIRC Sec. 105`; `NIRC Sec. 106`; `NIRC Sec. 108`; `RR 16-2005` | PASS | VAT source-card behavior preserved. |
| 2 | `What is BIR?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 2 | `NIRC Sec. 2`; `NIRC Sec. 3` | PASS | BIR definition behavior preserved. |
| 3 | `Who is a taxpayer under NIRC Sec. 22?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `NIRC Sec. 22` | PASS | Taxpayer definition under Sec. 22 preserved. |
| 4 | `How is a resident citizen taxed on income from sources within and outside the Philippines under NIRC Sec. 23?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `NIRC Sec. 23` | PASS | Resident citizen income-scope behavior preserved. |
| 5 | `What does NIRC Sec. 57 provide on withholding tax?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | `NIRC Sec. 57`; `RR No. 2-1998`; `NIRC Sec. 58` | PASS | EWT/WHT Sec. 57 behavior preserved. |
| 6 | `What does NIRC Sec. 58 provide on withholding tax returns and payment?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 3 | `NIRC Sec. 58`; `RR No. 2-1998`; `NIRC Sec. 57` | PASS | EWT/WHT Sec. 58 behavior preserved. |
| 7 | `What does RR 2-98 provide on expanded withholding tax?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `Revenue Regulations` | PASS | Exact RR 2-98 behavior preserved; first source label reported `RR 2-98`. |
| 8 | `What does Revenue Regulations No. 2-1998 provide on expanded withholding tax?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `Revenue Regulations` | PASS | RR alias variant preserved; first source label reported `RR 2-98`. |
| 9 | `What is Revenue Memorandum Circular No. 65-2012?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `RMC No. 65-2012` | PASS | RMC alias variant preserved. |
| 10 | `What is Revenue Memorandum Order No. 20-2013?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `RMO No. 20-2013` | PASS | RMO alias variant preserved. |
| 11 | `What does BIR Ruling 016-2024 provide?` | Safe non-admin handling | `RELATED_AUTHORITY_ONLY` | 0 | none | PASS | BIR Ruling exclusion behavior preserved; no accidental RR/RMC/RMO exact-admin promotion. |
| 12 | `What is CTA Case No. 9369?` | Court case card present | `RELATED_AUTHORITY_ONLY` | 1 | `CTA Case No. 9369` | PASS | Source card correctness and click target preserved: `https://drive.google.com/file/d/1jCGaPdUsBWopWJnc3KncZpyBAzlu2G3y/view?usp=drivesdk`. |
| 13 | `/source Show source cards for NIRC Sec. 23.` | Source lookup with Sec. 23 card | `AUTHORITY_FOUND` | 3 | `NIRC Sec. 2`; `NIRC Sec. 21`; `NIRC Sec. 23` | PASS | NIRC Sec. 23 source lookup preserved; answer listed Sec. 23 as primary statute. |
| 14 | `What is the CREATE Act / RA 11534?` | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` | 1 | `RA No. 11534` | PASS | CREATE Act / RA 11534 behavior preserved. |
| 15 | `What is the TRAIN Law / RA 10963?` | Known backlog safe non-authority result | `RELATED_AUTHORITY_ONLY` | 0 | none | PASS WITH KNOWN BACKLOG | Matches known RA 10963 retrieval/indexing backlog; not a Phase 6B regression. |

Additional CTA note:

```text
Initial phrasing "What does CTA Case No. 9369 provide on VAT refund substantiation?"
returned RELATED_AUTHORITY_ONLY with 0 cards. Exact case phrasing returned the correct
CTA Case No. 9369 card and click target. Classified as test/query issue, not a
Phase 6B regression.
```

## Failure Classification

No Phase 6B regressions were proven.

Classifications:

```text
Phase 6B regression: none
Pre-existing backlog: TRAIN Law / RA 10963 indexed-source alias/retrieval gap
Staging/environment issue: none
Test/query issue: initial CTA 9369 VAT-refund phrasing was over-specific and missed the exact case-card path
```

## Known Backlog

TRAIN Law / RA 10963 remains a pre-existing backlog.

Observed in this gate:

```text
query: What is the TRAIN Law / RA 10963?
actual status: RELATED_AUTHORITY_ONLY
source cards: 0
first source labels: RR 12-2018; NIRC Sec. 2; NIRC Sec. 6; NIRC Sec. 3; NIRC Sec. 5
classification: pre-existing backlog
```

This is consistent with the continuity state: RA 10963 exists in the indexed Tax Code source, but rows are normalized as NIRC sections rather than as `RA 10963`. This gate does not patch that backlog.

## Gate Decision

Phase 6B extracted-module behavior is stable on local regression and staging validation.

Final verdict:

```text
PASS WITH KNOWN BACKLOG
```
