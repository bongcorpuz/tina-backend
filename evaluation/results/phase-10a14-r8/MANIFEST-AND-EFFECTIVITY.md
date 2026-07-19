# PHASE-10A14-R8 — Manifest, P1 Reproduction & Official Effectivity Determination

## WS1 Preflight (verified)
- Repo `C:\Projects\tina-backend`; branch `feature/source-availability-engine-v1`
- Starting HEAD `15dae5061026afb0a566d1a59cfb6b46565aa588` ✅ matches expected
- Sync `0 0`; tracked tree clean; only preserved paths untracked (`.vscode/`, `evaluation/factcheck/`)
- Model `gpt-4o-mini` (runtime unchanged); **no reindex / DB write / vector mutation / re-embedding**
- Protected paths preserved: `.claude/`, `.vscode/`, `evaluation/factcheck/`

## Permitted-file inventory (this task)
- `legal-date-utils.js` — add `strictMaterialDate` / `toCanonicalLegalDate` strict gate.
- `section51-authority-chain.js` — established effectivity + strict material-date contract + fail-closed metadata.
- `tests/phase-10a14-r8-*.test.mjs` — NEW focused suite (26 assertions).
- `tests/phase-10a14-r5/r6/r7-*.test.mjs` — corrected the specific assertions that encoded the now-superseded (defective) ambiguous-window / taxableYear-substitution behavior the R7 review flagged.
- `evaluation/results/phase-10a14-r8/*` — evidence, gate logs, manifest.
- Report / result JSON / `knowledge/CURRENT_STATE.md` — updates.

## WS1 Official effectivity determination (RA 12214 / CMEPA) — independently proven
Primary sources: lawphil `ra_12214_2025` (Section 28/29 verbatim), signed copy on `bir-cdn.bir.gov.ph`,
publication confirmations (Manila Bulletin 2025-06-04; Official Gazette 2025-06-09).

```
{
  "law": "RA 12214 (Capital Markets Efficiency Promotion Act, CMEPA)",
  "approvalDate": "2025-05-29",
  "section29Verbatim": "This Act shall take effect after fifteen (15) days following the completion of its publication in the Official Gazette or in at least one (1) newspaper of general circulation.",
  "section29Disjunctive": "true — completion of publication in ONE newspaper of general circulation independently satisfies the clause (need not wait for the Official Gazette).",
  "qualifyingPublication": { "outlet": "Manila Bulletin (newspaper of general circulation)", "date": "2025-06-04", "page": 9 },
  "officialGazettePublication": "2025-06-09",
  "earlierQualifyingEvent": "2025-06-04 (Manila Bulletin) precedes the Official Gazette; it is the governing publication-completion date under the disjunctive Section 29.",
  "counting": "publication + 15 days = 2025-06-04 + 15 = 2025-06-19 (verified via addLegalCalendarDays). Firm lower bound approval + 15 = 2025-06-13 confirms 2025-06-19 is later than the approval-anchored minimum.",
  "effectivity": "2025-06-19 (inclusive: the Act 'takes effect' on that day)",
  "section28": "Section 28 verbatim — a FINANCIAL-INSTRUMENT RATE transitory (instruments issued/transacted prior to July 1, 2025 keep the prevailing rate for the remaining maturity). The STT-rate change also applies to Exchange transactions from 2025-07-01. NEITHER is the Section 29 general effectivity NOR the Section 51(C)(2) cutover.",
  "section51c2Cutover": "Section 29 general effectivity = 2025-06-19 (no separate provision moves 51(C)(2) to July 1).",
  "secondarySourceNote": "Several professional tax alerts loosely state 'effective July 1, 2025'; that reflects the Section 28 transitory / STT-rate application date, not the Section 29 general effectivity. Section 29's plain text controls.",
  "conclusion": "Qualifying publication 2025-06-04 is established -> effectivity 2025-06-19. The former R7 'unresolved [2025-06-13, 2025-08-05) window' is SUPERSEDED; there is no ambiguous window. Transactions before 2025-06-19 are PRE_EFFECTIVITY (RA 12214 not applicable); on/after 2025-06-19 are POST_EFFECTIVITY (applicable).",
  "sources": [
    "https://lawphil.net/statutes/repacts/ra2025/ra_12214_2025.html",
    "https://bir-cdn.bir.gov.ph/BIR/pdf/Signed%20RA%2012214%20-%20CMEPA.pdf",
    "Manila Bulletin 2025-06-04 (publication) / Official Gazette 2025-06-09"
  ]
}
```

Independence note: the June 19 conclusion was **derived** from the verbatim Section 29 disjunctive clause + the confirmed 2025-06-04 Manila Bulletin publication + explicit 15-day counting (`addLegalCalendarDays("2025-06-04",15) == "2025-06-19"`), not adopted merely because the packet states it. Had the Manila Bulletin June 4 publication NOT been confirmable as a complete qualifying publication, R8 would have failed closed and reported `REQUIRES_AUTHORITATIVE_PUBLICATION_CONFIRMATION` rather than reverting to the former June 13–August 5 interval.

## WS1 Reproduction of the four R7-review P1 findings (against starting HEAD `15dae50`)
Captured in `p1-reproduction.txt`. Summary:
- **P1-R7-IR-001** — R7 modeled an unresolved effectivity window because publication was treated as unavailable; `txn("2025-07-01")` returned `sufficient:false reason:section_51c2_effectivity_date_unresolved`. Publication IS available (Manila Bulletin 2025-06-04) → effectivity 2025-06-19.
- **P1-R7-IR-002** — `txn("2026-02-30")` and `txn("2026/01/15")` returned `POST_EFFECTIVITY, applicableAmendments:["RA 12214"]` (malformed dates parsed via `new Date()` fallback).
- **P1-R7-IR-003** — `{taxableYear:2026}` and `{legalAsOfDate:"2026-01-01"}` returned `applicableAmendments:["RA 12214"]` (year/legalAsOfDate substituted for a missing transactionDate).
- **P1-R7-IR-004** — `buildSection51AmendmentChainMetadata("NIRC Sec. 51(C)(2)")` (no date) and `txn("2025-07-01")` (fail-closed) both returned `currentAuthoritySet:[...,"RA 12214"]` / `applicableAmendments:["RA 12214"]` despite `sufficient:false` / unadjudicated date.

## Remediation summary (this task)
- Established effectivity `2025-06-19`; removed the ambiguous-window model.
- Strict Section 51(C)(2) material-date contract: only a strictly-valid ISO `transactionDate`/`dispositionDate` is accepted; missing → `PERIOD_UNRESOLVED`, malformed → `INVALID_DATE`; no `taxableYear`/`legalAsOfDate`/`filingEventDate`/`new Date()` substitution.
- Fail-closed metadata: the temporal result is built clean; a failed or pre-effectivity adjudication never exposes RA 12214 as applicable/controlling (empty `applicableAmendments`, `currentAuthoritySet=["NIRC Sec. 51(C)"]`, empty `notYetEffective`/`historicalAuthoritySet` on unresolved/invalid).
- Focused R8 suite (26/0); R5/R6/R7 corrected assertions kept green; prior closures preserved.

## Retry policy
Deterministic/staging: retry only on transport/timeout/empty. Preserve every attempt. No live all-26 matrix and no 100+ call live safeguard matrix in R8 (deferred to the dedicated evidence task per the authorization).
