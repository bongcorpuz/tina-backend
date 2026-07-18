# Live Retrieval And Legal Currentness Evidence

## Runtime Bridge Evidence

Code references:

- vector-store.js:2293 restricts the bridge to source ilike %nirc-1997-ra-10963%.
- vector-store.js:2297-2303 defines content markers for Sec. 51, Sec. 51(C), and Sec. 51-A text.
- vector-store.js:2305 exports assignSection51Ref.
- vector-store.js:2345 exports isSection51FilingAuthorityIntent.
- vector-store.js:2408-2442 performs the read-only content-marker lookup and re-labeling.
- vector-store.js:2610-2645 merges and reserves Sec. 51 bridge rows.
- pipeline.js:2465-2477 promotes Sec. 51 / 51-A into target and controlling authorities for matching issue intent.

Read-only network-enabled exactAuthoritySearch sample:

- natural-individual-filing -> returned NIRC Sec. 51, NIRC Sec. 51(C), and NIRC Sec. 51-A bridge rows from 01-tax-code/nirc-1997-ra-10963-(bir).pdf.
- natural-individual-deadline -> returned NIRC Sec. 51, NIRC Sec. 51(C), and NIRC Sec. 51-A bridge rows from the same source.
- natural-substituted -> returned NIRC Sec. 51, NIRC Sec. 51(C), and NIRC Sec. 51-A bridge rows from the same source.
- explicit-51a -> returned NIRC Sec. 51, NIRC Sec. 51(C), and NIRC Sec. 51-A bridge rows from the same source.

All sampled bridge rows had sec51FilingAuthorityBridge=true, exactAuthorityMatch=true, and authorityMatchTier=1. No DB writes or reindexing were performed.

## Legal Currentness Check

Primary sources reviewed:

- RA 10963, Supreme Court E-Library: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/80559
- RA 11976, Supreme Court E-Library: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/96948
- RA 12214, Supreme Court E-Library: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/99213

RA 10963 is a genuine authority for the TRAIN-era amendment of Sec. 51 and creation of Sec. 51-A. It is not, by itself, the full current-law chain for Sec. 51 because RA 11976 further amended Sec. 51 in 2024 and RA 12214 further amended Sec. 51(C) in 2025. The R4 bridge and live sample promote only RA 10963 source rows as Tier-1 exact controlling authority, and the executor report's current-law statement does not account for the later amendments. This blocks PASS.
