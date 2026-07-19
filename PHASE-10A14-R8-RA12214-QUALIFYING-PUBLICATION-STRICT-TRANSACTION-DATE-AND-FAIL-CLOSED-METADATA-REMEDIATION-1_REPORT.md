# PHASE-10A14-R8 — RA 12214 Qualifying-Publication, Strict Transaction-Date & Fail-Closed Metadata Remediation 1

**Executor:** Claude Code — Opus 4.8 (low speed)
**Repository:** `C:\Projects\tina-backend` · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `15dae5061026afb0a566d1a59cfb6b46565aa588` (matches expected) · sync `0 0`
**Runtime model:** `gpt-4o-mini` (unchanged)
**Decision (self-assessed within R8 scope):** **PASS** — formal decision belongs to the mandatory independent reviewer.

## Scope
Narrowly-scoped legal-temporal runtime remediation of the four confirmed P1 findings. The complete 100+ call governed live safeguard matrix and a fresh live all-26 execution are **deliberately deferred** to the dedicated evidence task per the authorization (NOT AUTHORIZED in R8).

## WS1 — Official effectivity determination (independently proven)
Primary sources: lawphil `ra_12214_2025` (Section 28/29 verbatim), signed copy `bir-cdn.bir.gov.ph`, publication confirmations.

- **Approval:** 2025-05-29.
- **Section 29 (verbatim):** *"This Act shall take effect after fifteen (15) days following the completion of its publication in the Official Gazette or in at least one (1) newspaper of general circulation."* The clause is **disjunctive** — completion of publication in a single newspaper of general circulation independently satisfies it.
- **Qualifying publication:** Manila Bulletin (newspaper of general circulation), **2025-06-04**, p.9 (Official Gazette 2025-06-09 is later; the June 4 newspaper publication governs under the disjunctive clause).
- **Counting:** `2025-06-04 + 15 days = 2025-06-19` (verified via `addLegalCalendarDays`). Approval + 15 = 2025-06-13 is a firm lower bound, confirming 2025-06-19 is legally supportable.
- **Effectivity:** **2025-06-19** (inclusive — the Act "takes effect" on that day).
- **Section 28 "July 1, 2025":** a financial-instrument RATE transitory / STT-rate application date only; **NOT** the Section 29 general effectivity and **NOT** the Section 51(C)(2) cutover. (Secondary tax alerts loosely say "effective July 1"; that reflects Section 28 / STT rate, not Section 29.)

**Independence:** the June 19 date was derived from the verbatim disjunctive Section 29 clause + the confirmed 2025-06-04 publication + explicit 15-day counting — not adopted because the packet states it. Had the June 4 publication been unconfirmable as complete, R8 would have failed closed with `REQUIRES_AUTHORITATIVE_PUBLICATION_CONFIRMATION`; the former June 13–August 5 interval was **not** reused.

## Findings — all four CLOSED

| Finding | Closure |
|---|---|
| **P1-R7-IR-001** | Qualifying publication established; effectivity fixed at 2025-06-19; ambiguous window removed. Boundary: 2025-06-18 PRE, 2025-06-19 POST (inclusive), 2025-06-20 POST. |
| **P1-R7-IR-002** | `resolveAsOfYear` no longer uses `new Date()`. 51(C)(2) material date must pass `strictMaterialDate` (whole-string strict ISO). Malformed/impossible/slash/free-text → `INVALID_DATE` fail closed; no malformed date reaches POST_EFFECTIVITY. |
| **P1-R7-IR-003** | 51(C)(2) requires `transactionDate`/`dispositionDate`. `taxableYear`, `legalAsOfDate`, `filingEventDate` never substitute → `PERIOD_UNRESOLVED` (`section_51c2_transaction_date_required`), `applicableAmendments []`. |
| **P1-R7-IR-004** | Temporal result built fail-closed. Unresolved/invalid/pre-effectivity never expose RA 12214 (`applicableAmendments []`, `currentAuthoritySet ["NIRC Sec. 51(C)"]`, clean `amendingAuthorities`/`notYetEffective`/`historicalAuthoritySet`). Public source-card carries `temporalStatus`/`temporalSufficient` and stays clean. |

## Strict material-date contract (WS2/WS3)
- **Required:** strictly-valid ISO `transactionDate` (or `dispositionDate` where the rule uses disposition).
- **Never substitutes:** `taxableYear`, `legalAsOfDate`, `filingEventDate`, system date, inferred year, `new Date()`-parsed strings.
- **Missing:** `{ sufficient:false, temporalStatus:"PERIOD_UNRESOLVED", reason:"section_51c2_transaction_date_required" }`.
- **Malformed:** `{ sufficient:false, temporalStatus:"INVALID_DATE", reason:"section_51c2_transaction_date_invalid" }`.

## Prior-closure preservation (WS6)
Section 51-A `originatingLaw` RA 10963 / `baseCode` RA 8424; RA 8424 code lineage; historical 2023 ordinary filing (HISTORICAL, RA 11976/12214 not applied); substituted-filing compatibility; imperative-filing detection; no corporate/estate/donor/VAT leakage; ordinary `filing_obligation` still resolves by `taxableYear`; **no year-only comparison path** in the date utility and 51(C)(2) never resolves by year.

## Tests & gates (WS7/WS8)
- Focused: `phase-10a14-r8` **26/0** (sections A–K; explicitly reproduces and closes all four P1 findings).
- Preserved/corrected: `phase-10a14-r7` 14/0, `phase-10a14-r6` 15/0, `phase-10a14-r5` 25/0. The R5/R6/R7 edits corrected only the specific assertions that encoded the superseded ambiguous-window / taxableYear-substitution behavior (a strengthening; no coverage removed).
- Deterministic gate: **198/0 ×2** on a clean tree (was 197/0; +1 for the new R8 suite).
- Staging gate: **7/0 ×2**, exit 0.

## Security & scope (WS9)
No secrets, env, DB write, vector mutation, reindex, re-embedding, model/prompt, source-bank/corpus, frontend, or Dev-Factory change; no production deployment. Protected paths (`.claude/`, `.vscode/`, `evaluation/factcheck/`) preserved; port 5173 untouched; tracked tree clean; sync `0 0`. See `evaluation/results/phase-10a14-r8/security-and-scope-review.md`.

## Next task
PHASE-10A14-R8-...-INDEPENDENT-REVIEW-1 (mandatory independent reviewer: Codex GPT-5, high reasoning, low speed).
