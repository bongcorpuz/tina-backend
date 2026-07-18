# PHASE-10A14-R7 — Manifest, P1 Reproduction & Official Effectivity Determination

## WS1 Preflight (verified)
- Repo `C:\Projects\tina-backend`; branch `feature/source-availability-engine-v1`
- Starting HEAD `ab4a20fe13c05199f80ca54343ed8a59eeb1a595` ✅ matches expected
- R6 runtime `1b86550` ancestor ✅; sync `0 0`; tracked tree clean; protected paths preserved
- Model `gpt-4o-mini`; corpus `tina_vector_store` 5346 rows; **no reindex / DB write / vector mutation**

## WS1 Reproduction of the two R6-review P1 findings
- **P1-R6-IR-001 (date-level defect)** — reproduced: `resolveSection51AuthorityChain({propositionClass:"filing_deadline_transaction", transactionDate:"2025-06-01"})` (and `2025-01-15`) returned `applicableAmendments:["RA 12214"]` (LATER_AMENDMENT_REQUIRED) because applicability was computed by `effectivityYear` (2025), collapsing pre- and post-effectivity events in 2025.
- **P1-R6-IR-002 (complete governed evidence package absent)** — confirmed: no single committed package contains the complete governed live R1–R5 safeguard matrix + fresh governed live all-26 replay with full per-probe payloads/hashes/persistence and per-answer adjudication.

## WS2 Official effectivity determination (RA 12214 / CMEPA)
Verified against official primary sources (lawphil ra_12214_2025; BIR):

```
{
  "law": "RA 12214 (Capital Markets Efficiency Promotion Act, CMEPA)",
  "approvalDate": "2025-05-29",
  "statutoryEffectivityClause": "Section 29 — 'This Act shall take effect after fifteen (15) days following the completion of its publication in the Official Gazette or in at least one (1) newspaper of general circulation.'",
  "transitoryProvision": "Section 28 — financial instruments issued/transacted prior to July 1, 2025 keep the prevailing rate for remaining maturity (a FINANCIAL-INSTRUMENT RATE transitory, NOT the general effectivity and NOT Section 51(C)(2)'s cutover).",
  "legallyRelevantPublicationEvent": "completion of publication (OG or newspaper) — exact date NOT officially resolvable from available primary sources",
  "dateCountingMethod": "approval + 15 days is a FIRM LOWER BOUND (effectivity cannot precede it): 2025-05-29 + 15 = 2025-06-13",
  "computedGeneralEffectivityDate": "UNDETERMINED to the day (publication date not officially established); bounded [2025-06-13 earliest, 2025-08-05 definitely-operative]",
  "definitelyOperativeBy": "2025-08-05 (BIR implementing RR 20-2025 / RR 21-2025 issued)",
  "propositionSpecificOperationalDates": { "section_51c2_transaction_return_timing": "governed by Section 29 general effectivity (NOT the Section 28 July 1 financial-instrument transitory)" },
  "legalConclusion": "RA 12214 amends Section 51(C)(2) (per Section 13). It cannot apply to a transaction before its legal effectivity. Transactions before 2025-06-13 are definitively pre-effectivity (not applicable). Transactions in [2025-06-13, 2025-08-05) fall in an officially-unresolved window and must FAIL CLOSED. Transactions on/after 2025-08-05 apply RA 12214.",
  "uncertainty": "exact general-effectivity day (publication + 15) not officially resolvable from available sources -> ambiguous window fails closed per governance",
  "sources": ["lawphil.net/statutes/repacts/ra2025/ra_12214_2025.html", "bir.gov.ph/CMEPA", "RR 20-2025 / RR 21-2025 (2025-08-05)"]
}
```

## Remediation (this task)
- `legal-date-utils.js` (NEW): date-only ISO comparison (no timezone/UTC/locale; rejects invalid calendar dates; full Y-M-D comparison; no year-only path).
- `section51-authority-chain.js`: RA 12214 applicability resolved by EXACT transaction date — before `earliestPossible` (2025-06-13) → PRE_EFFECTIVITY not applicable; `[earliest, established)` → fail closed `section_51c2_effectivity_date_unresolved`; on/after `establishedOperative` (2025-08-05) → applicable. July 1 modeled as the Section 28 financial-instrument transitory only. Missing exact date for a 2025 transaction → fail closed `section_51c2_transaction_date_required`.
- Focused suite `tests/phase-10a14-r7-...` (14/0). R3 35/0, R4 20/0, R5 25/0, R6 15/0 preserved.

## Honest scope note (P1-R6-IR-002)
The complete governed **live** R1–R5 safeguard matrix + fresh **live** all-26 replay (100+ model calls, full per-probe payloads/hashes/persistence/adjudication, WS13/WS16/WS17) is the largest R7 deliverable and is NOT produced as one reconciled package in this task; see the R7 report for what was executed vs. deterministically preserved. This is the primary reason no unqualified PASS is claimed.

## Retry policy
Live: retry only on transport/timeout/empty/persistence-transport failure. Never retry a complete RELATED result for best-answer selection. Preserve every attempt.
