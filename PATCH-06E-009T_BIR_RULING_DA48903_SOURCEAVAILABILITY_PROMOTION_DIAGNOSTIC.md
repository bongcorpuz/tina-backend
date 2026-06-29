# PATCH-06E-009T BIR Ruling DA-489-03 SourceAvailability Promotion Diagnostic

## Summary

Result: DIAGNOSTIC COMPLETE

PATCH-06E-009T investigated why the unavailable-source query `What is BIR Ruling DA-489-03?` returns `AUTHORITY_FOUND` with non-BIR substitute source cards instead of guarded unavailable-source behavior or `RELATED_AUTHORITY_ONLY`.

No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store data, source-corpus, or PDF ingestion changes were made. `pipeline.js` was read for diagnosis only and was not modified.

## Staging Health

- Service: `tina-backend-staging`
- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `51414dae827d8fd811a5f671794d8fd12acc332b`
- Expected code commit for PATCH-06E-009 behavior: `acee116c9b469b5a9bfd1e5ca9e16463a4ada1ba`
- Deployment note: staging is serving `51414da`, the report-only PATCH-06E-009S diagnostic commit. No backend source files changed between `acee116` and `51414da`.
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Reproduction

Query:

```text
What is BIR Ruling DA-489-03?
```

Observed staging response:

- `sourceAvailability`: `AUTHORITY_FOUND`
- `saeStatus`: `AUTHORITY_FOUND`
- `sourceStatus`: `AUTHORITY_FOUND`
- `sourceAvailabilityReason`: `4 governing indexed parsed candidate(s) directly govern the issue.`
- `sourceCount`: `3`
- `sourcesCount`: `3`
- `vectorMatches`: `5`
- `retrievedSourceCount`: `5`
- `exactAuthorityMatches`: `4`
- Public source-card labels:
  - `G.R. No. 187485`
  - `G.R. No. 226592`
  - `NIRC Sec. 2`
- Public source-card URLs/click targets:
  - `https://drive.google.com/file/d/1uV6ozJtzPYpVZW3hHA9MN4-p31fcquXw/view?usp=drivesdk`
  - `https://drive.google.com/file/d/15QgNCQfHkngjD38vcEGUZAyf48smEcJW/view?usp=drivesdk`
  - `https://drive.google.com/file/d/1fDZA1wY_DdfZzOz_c_R3BDYWyPODIuPW/view?usp=drivesdk`
- Public source-card field shape:
  - `label`
  - `title`
  - `citation`
  - `authorityType`
  - `displayLabel`
  - `limitationRequired`
  - `publicUrl`

No BIR Ruling DA-489-03 public source card was exposed.

## Corpus Verification

The staging health vector-store source-name list contains no source name matching:

- `DA-489`
- `489-03`
- `bir-ruling-da`

Conclusion: BIR Ruling DA-489-03 is not present in the approved staging vector-store corpus. It should not be treated as an available TINA source and should not produce a BIR Ruling source card.

## Local Control Comparison

Relevant local controls still pass:

- `tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs`
  - Confirms `classify("What is BIR Ruling DA-489-03?").exactAuthority.detected === false`.
- `tests/patch-06e-007-vector-authority-keyword-builders-extraction.test.mjs`
  - Confirms `buildPossibleSourceKeywords("What is BIR Ruling DA-489-03?")` returns `[]`.
- `tests/patch-035b-ra10963-bridge.test.mjs`
  - Confirms BIR Ruling exclusion remains outside exact-authority bridge scope.

Read-only local exact/citation lookup for the staging query showed:

- Query classification target authorities: `NIRC Sec. 2`, `NIRC Sec. 3`
- Exact authority lookup result: `NIRC Sec. 2`, `NIRC Sec. 3`
- Citation variant lookup result: `NIRC Sec. 2`, `NIRC Sec. 3`
- No DA-489-03 exact source result.

## Classification Findings

Local classifier output for `What is BIR Ruling DA-489-03?`:

- `exactAuthority.detected`: `false`
- `primaryIssue`: `BIR_ORGANIZATION`
- `subIssue`: `BIR_DEFINITION`
- `domainCode`: `BIR`
- `queryIntent`: `definition`
- `isJurisprudenceQuery`: `true`
- `requiresJurisprudence`: `true`
- `retrievalStrategy`: `FAST_DEFINITION_PRIMARY_AUTHORITY`
- `targetAuthorities`: `NIRC Sec. 2`, `NIRC Sec. 3`
- `controllingAuthorities`: `NIRC Sec. 2`, `NIRC Sec. 3`

Interpretation:

The exact BIR Ruling citation is not recognized as an available exact authority. However, the query is still classified as a BIR definition query. That substitutes generic BIR-definition controlling targets (`NIRC Sec. 2` and `NIRC Sec. 3`). Separately, the word `Ruling` activates jurisprudence intent in the current query-intent logic.

## Promotion Path Diagnosis

The promotion does not appear to originate in:

- PATCH-06E-009 ask-handler public sanitizer
- exact-authority detection
- vector authority keyword bridge
- source-card public field sanitizer
- DB/indexing/corpus changes
- staging deployment mismatch

The likely promotion path is:

1. Query asks for unavailable `BIR Ruling DA-489-03`.
2. Exact-authority detector does not promote the BIR Ruling citation.
3. Classifier falls back to `BIR_ORGANIZATION` / `BIR_DEFINITION`.
4. Classifier assigns `NIRC Sec. 2` and `NIRC Sec. 3` as controlling authorities.
5. Classifier also marks the query as jurisprudence-oriented because the query contains `Ruling`.
6. Retrieval returns generic BIR-definition/NIRC and court candidates, including G.R. sources that reference BIR Ruling DA-489-03 or nearby ruling doctrine.
7. Source Availability Engine sees eligible candidates satisfying the generic AND gate:
   - `authorityRole === "GOVERNING"`
   - `directlyGovernsIssue === true`
   - `isIndexed === true`
   - parsed source
   - no higher-authority-missing flag
8. Existing jurisprudence guard blocks statute/RR-only jurisprudence queries, but permits `AUTHORITY_FOUND` when eligible court candidates exist.
9. Source-authority selector permits court cards for jurisprudence queries via the existing court-card override.
10. Final public response exposes G.R. No. 187485, G.R. No. 226592, and NIRC Sec. 2 with valid public URLs.

## Why The Non-BIR Cards Were Promoted

`NIRC Sec. 2` was promoted because the classifier converted the unavailable BIR Ruling query into a generic BIR-definition query with NIRC Sec. 2 / Sec. 3 as controlling targets.

`G.R. No. 187485` and `G.R. No. 226592` were promoted because the query was treated as jurisprudence-oriented and the current SAE/jurisprudence guards allow eligible court candidates to support `AUTHORITY_FOUND`.

The current system has guards proving BIR Rulings are excluded from exact-authority and keyword-bridge promotion, but it lacks a narrow unavailable-BIR-Ruling guard that prevents substitute NIRC/court authorities from upgrading the response to `AUTHORITY_FOUND` when the named BIR Ruling itself is absent from the approved corpus.

## Required Classification

Primary classification:

- `sourceAvailability promotion gap`

Secondary classifications:

- `missing source / expected unavailable-source behavior`
- `BIR Ruling exclusion gap`

Rejected classifications:

- `PATCH-06E-009 regression`: rejected. PATCH-06E-009 only moved ask-handler public response sanitizer helpers and does not compute sourceAvailability or select cards.
- `source-card sanitizer issue`: rejected. Public card shape is preserved and no BIR Ruling card is exposed.
- `staging/deployment mismatch`: rejected. Staging is healthy and deployed; current deployment includes only the 009S report commit beyond the 009 source commit.
- `test-query expectation mismatch`: unlikely. The user-specified corpus fact says DA-489-03 is unavailable and should not be treated as an available TINA source.

## Diagnostic Conclusion

Since BIR Ruling DA-489-03 is unavailable in the approved corpus, the correct behavior is not to expose a BIR Ruling card and not to promote unrelated substitute NIRC/court cards as `AUTHORITY_FOUND`.

The observed behavior is best explained as a narrow sourceAvailability promotion guard gap: unavailable named BIR Ruling queries are excluded from exact-authority promotion, but still fall through to generic BIR-definition and jurisprudence paths whose eligible substitute candidates can upgrade the response to `AUTHORITY_FOUND`.

## Recommendation

Choose: B. Create PATCH-06E-010 as a narrow unavailable BIR Ruling/sourceAvailability promotion guard patch.

PATCH-06E-010 should be scoped to prevent unavailable named BIR Ruling queries from being upgraded to `AUTHORITY_FOUND` by substitute non-BIR authority cards, while preserving:

- no BIR Ruling source card unless the source exists in the approved corpus,
- existing exact-authority behavior for RA/NIRC/RR/RMC/RMO/CTA controls,
- existing EWT/WHT and jurisprudence guards,
- existing public source/card sanitizer behavior,
- no DB/indexing/vector/corpus changes.
