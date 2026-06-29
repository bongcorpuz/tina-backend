# PATCH-06E-010S Unavailable BIR Ruling Guard Staging Smoke

## Summary

Result: PASS

PATCH-06E-010S ran a narrow staging smoke validation after `PATCH-06E-010 guard unavailable BIR Ruling promotion` to confirm unavailable specific BIR Ruling queries are not promoted to `AUTHORITY_FOUND` through unrelated G.R./NIRC substitute cards, while ordinary authority/source-card behavior remains preserved.

No backend source code was modified. No refactor was performed. No DB, indexing, RAG, vector-store data, source-corpus, or PDF ingestion changes were made.

The staging runtime is healthy and serving the expected PATCH-06E-010 commit. The four specific unavailable BIR Ruling DA-489-03 query forms returned `NO_INDEXED_SOURCE` with zero public source cards. No BIR Ruling card was exposed, and the prior unrelated substitute cards (`G.R. No. 187485`, `G.R. No. 226592`, `NIRC Sec. 2`) were not promoted for those BIR Ruling queries.

## Committed File Verification

`git show --name-only --stat c2b6380` confirmed that PATCH-06E-010 committed only:

```text
issue-classification-engine.js
tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
```

`authority-utils.js` was not present in the committed file list and is treated as a prior display/artifact, not part of PATCH-06E-010.

## Staging Health

- Service: `tina-backend-staging`
- Endpoint: `https://tina-backend-staging.onrender.com/health`
- Environment: `staging`
- Health: `ok`
- Deployed commit: `c2b63805ac0a079fca9163b2ab8ea5ec43272a3b`
- Expected deployed commit: `c2b63805ac0a079fca9163b2ab8ea5ec43272a3b`
- Commit status: MATCH
- Indexing running: `false`
- Vector chunks: `5,346`
- Vector sources: `102`

## Staging Smoke Matrix

| # | Query | Expected behavior | Actual behavior | sourceAvailability / boundary outcome | sourceCount | Visible source-card title/label | Source-card URL / click-target status | Unrelated substitute promoted? | Result | Notes |
|---:|---|---|---|---|---:|---|---|---|---|---|
| 1 | What is BIR Ruling DA-489-03? | Unavailable BIR Ruling remains guarded; no substitute authority promoted | No indexed source found; zero public cards | `NO_INDEXED_SOURCE` | 0 | None | N/A | No | PASS | No BIR Ruling card exposed; no G.R./NIRC substitute cards promoted. |
| 2 | BIR Ruling DA-489-03 | Unavailable BIR Ruling remains guarded; no substitute authority promoted | No indexed source found; zero public cards | `NO_INDEXED_SOURCE` | 0 | None | N/A | No | PASS | Exact bare citation form preserved as unavailable-source behavior. |
| 3 | Explain BIR Ruling DA-489-03 | Unavailable BIR Ruling remains guarded; no substitute authority promoted | No indexed source found; zero public cards | `NO_INDEXED_SOURCE` | 0 | None | N/A | No | PASS | Explanatory query form remains guarded. |
| 4 | BIR Ruling DA 489 03 | Unavailable BIR Ruling remains guarded; no substitute authority promoted | No indexed source found; zero public cards | `NO_INDEXED_SOURCE` | 0 | None | N/A | No | PASS | Spaced number variant remains guarded. |
| 5 | What is BIR? | General BIR definition behavior preserved | NIRC Sec. 2 and NIRC Sec. 3 cards visible | `AUTHORITY_FOUND` | 2 | NIRC Sec. 2; NIRC Sec. 3 | publicUrl present | No | PASS | General BIR path unaffected by specific BIR Ruling guard. |
| 6 | What is NIRC Section 2? | NIRC Sec. 2 remains authority-backed | NIRC Sec. 2 visible with related cards | `AUTHORITY_FOUND` | 4 | RR No. 11-2018; RR No. 2-1998; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present | No | PASS | Expected NIRC Sec. 2 card remains visible. |
| 7 | What is NIRC Section 3? | NIRC Sec. 3 remains authority-backed | NIRC Sec. 3 visible with related cards | `AUTHORITY_FOUND` | 4 | RMO No. 20-2013; NIRC Sec. 21; NIRC Sec. 2; NIRC Sec. 3 | publicUrl present | No | PASS | Expected NIRC Sec. 3 card remains visible. |
| 8 | Are there jurisprudence cases on withholding tax? | Jurisprudence behavior preserved | CTA Case No. 9711 visible as related authority | `RELATED_AUTHORITY_ONLY` | 1 | CTA Case No. 9711 | publicUrl present | No | PASS | WHT jurisprudence guard remains intact. |
| 9 | What is CTA Case No. 9369? | CTA Case No. 9369 remains visible | CTA Case No. 9369 visible | `RELATED_AUTHORITY_ONLY` | 1 | CTA Case No. 9369 | publicUrl present | No | PASS | CTA card/click-target behavior preserved. |
| 10 | What is RA 10963? | RA 10963 / TRAIN bridge remains `AUTHORITY_FOUND` | NIRC Sec. 2 visible card from RA 10963 authority path | `AUTHORITY_FOUND` | 1 | NIRC Sec. 2 | publicUrl present | No | PASS | RA 10963 bridge preserved. |
| 11 | What is the TRAIN Law? | TRAIN Law bridge remains `AUTHORITY_FOUND` | NIRC Sec. 2 visible card from RA 10963 authority path | `AUTHORITY_FOUND` | 1 | NIRC Sec. 2 | publicUrl present | No | PASS | TRAIN Law bridge preserved. |
| 12 | What is the Tax Reform for Acceleration and Inclusion Act? | Full TRAIN title remains `AUTHORITY_FOUND` | NIRC Sec. 6 visible card from RA 10963 authority path | `AUTHORITY_FOUND` | 1 | NIRC Sec. 6 | publicUrl present | No | PASS | Full title bridge preserved. |
| 13 | What is RA 11534? | RA 11534 remains `AUTHORITY_FOUND` | RA No. 11534 visible card | `AUTHORITY_FOUND` | 1 | RA No. 11534 | publicUrl present | No | PASS | CREATE authority path preserved. |
| 14 | What is the CREATE Act? | CREATE alias remains `AUTHORITY_FOUND` | RA No. 11534 visible card | `AUTHORITY_FOUND` | 1 | RA No. 11534 | publicUrl present | No | PASS | CREATE alias canonicalization preserved. |
| 15 | What is NIRC Section 23? | NIRC Sec. 23 remains `AUTHORITY_FOUND` | NIRC Sec. 23 visible with existing related cards | `AUTHORITY_FOUND` | 5 | G.R. No. 226592; G.R. No. 222743; NIRC Sec. 21; NIRC Sec. 2; NIRC Sec. 23 | publicUrl present | No | PASS | Expected NIRC Sec. 23 card remains visible. |
| 16 | What does NIRC Section 57 provide? | NIRC Sec. 57 remains `AUTHORITY_FOUND` | NIRC Sec. 57 visible first | `AUTHORITY_FOUND` | 3 | NIRC Sec. 57; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present | No | PASS | NIRC Sec. 57 behavior preserved. |
| 17 | What does NIRC Section 58 provide? | NIRC Sec. 58 remains `AUTHORITY_FOUND` | NIRC Sec. 58 visible first | `AUTHORITY_FOUND` | 4 | NIRC Sec. 58; G.R. No. 222743; NIRC Sec. 21; NIRC Sec. 2 | publicUrl present | No | PASS | NIRC Sec. 58 behavior preserved. |
| 18 | What does RR 2-98 provide on expanded withholding tax? | RR 2-98 alias remains authority-safe | Revenue Regulations card visible | `AUTHORITY_FOUND` | 1 | Revenue Regulations | publicUrl present | No | PASS | RR 2-98 EWT behavior preserved. |
| 19 | What is RMC 65-2012? | RMC 65-2012 remains authority-safe | RMC No. 65-2012 visible card | `AUTHORITY_FOUND` | 1 | RMC No. 65-2012 | publicUrl present | No | PASS | RMC card behavior preserved. |
| 20 | What is RMO 20-2013? | RMO 20-2013 remains authority-safe | RMO No. 20-2013 visible card | `AUTHORITY_FOUND` | 1 | RMO No. 20-2013 | publicUrl present | No | PASS | RMO 20-2013 behavior preserved. |
| 21 | What is RMO 24-2013? | RMO 24-2013 remains authority-safe | RMO No. 24-2013 visible card | `AUTHORITY_FOUND` | 1 | RMO No. 24-2013 | publicUrl present | No | PASS | RMO 24-2013 behavior preserved. |
| 22 | Explain EWT. | EWT guard behavior preserved | NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998 visible | `AUTHORITY_FOUND` | 3 | NIRC Sec. 57; NIRC Sec. 58; RR No. 2-1998 | publicUrl present | No | PASS | Broad EWT path remains source-backed. |
| 23 | What is withholding tax? | WHT guard behavior preserved | NIRC Sec. 57, NIRC Sec. 58, and RR No. 2-1998 visible | `AUTHORITY_FOUND` | 3 | NIRC Sec. 57; NIRC Sec. 58; RR No. 2-1998 | publicUrl present | No | PASS | Generic WHT path remains source-backed. |
| 24 | What is TRAIN? | Generic TRAIN remains unbridged/rejected | Boundary rejection; zero cards | `DOMAIN_BOUNDARY_REJECT` | 0 | None | N/A | No | PASS | Generic TRAIN does not activate RA 10963 bridge. |
| 25 | What is a Republic Act? | Generic Republic Act remains unbridged/rejected | Boundary rejection; zero cards | `DOMAIN_BOUNDARY_REJECT` | 0 | None | N/A | No | PASS | Generic Republic Act remains rejected. |
| 26 | Show me the source for NIRC Section 23. | `/source` route returns NIRC Sec. 23 source | NIRC Sec. 23 visible first, followed by expanded source-route results | `AUTHORITY_FOUND` | 12 | NIRC Sec. 23; NIRC Sec. 2; NIRC Sec. 21; G.R. No. 187485; G.R. Nos. 250032 & 250047; G.R. No. 247737 | no publicUrl/click-target fields in source-route payload | No | PASS | Source lookup behavior preserved; expected NIRC Sec. 23 source is visible. |

## Public Response Shape Notes

For source-card-bearing `/ask` responses, public card keys remained:

```text
label
title
citation
authorityType
displayLabel
limitationRequired
publicUrl
```

The `/source` route returned the existing source-route source payload shape without publicUrl/click-target fields in the sampled response; this matches the observed source-route behavior for this smoke and still included the expected NIRC Sec. 23 result.

## Findings

- Staging commit matched PATCH-06E-010 exactly.
- Indexing was not running.
- Vector-store counts remained unchanged at `5,346` chunks / `102` sources.
- PATCH-06E-010 committed only `issue-classification-engine.js` and the focused 06E-010 test.
- `authority-utils.js` was not in the PATCH-06E-010 commit.
- All four unavailable BIR Ruling DA-489-03 variants returned `NO_INDEXED_SOURCE`, zero cards, and no unrelated substitute promotion.
- RA 10963/TRAIN, CREATE/RA 11534, NIRC Sec. 23/57/58, RR/RMC/RMO aliases, CTA Case No. 9369, WHT jurisprudence, EWT/WHT guards, and generic boundary rejects remained preserved.

## Conclusion

PATCH-06E-010S passes. The deployed PATCH-06E-010 guard prevents unavailable specific BIR Ruling DA-489-03 queries from being promoted to `AUTHORITY_FOUND` through unrelated G.R./NIRC substitute cards, with no staging evidence of regression in the required authority/source-card controls.
