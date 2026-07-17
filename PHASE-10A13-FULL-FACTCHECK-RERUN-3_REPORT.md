# PHASE-10A13-FULL-FACTCHECK-RERUN-3 — EXECUTION REPORT

**Model:** Claude Code — Opus 4.8 — Low speed. **Type:** evaluation only (no remediation authorized).
**Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `9559bf3`. **Manifest = runtime commit:** `d71b913` (runtime code unchanged since R6 `09751a6`).
**Decision:** PHASE 10A13 REVISIONS REQUIRED.

A13 does not close Phase 10A. A mandatory independent A13 review by a model that did not execute
this rerun must follow. A13 does not authorize the adversarial suite, 10B/10C, model migration,
reindexing, or deployment.

---

## Governed source bank & manifest

Immutable Q1–Q50 source-bank snapshot verified: `sourceBankSnapshotSha256 = 526106e5…`, exactly 50
questions, IDs Q1–Q50, no missing/duplicate. Pre-execution manifest (`a13-execution-manifest.json`,
`manifestSha256 7ef64234…`) with per-question text hashes, 3 deterministic rounds (Q1..Q50 each) =
150 slots, retry/persistence/classification/serialization policies — **committed and pushed at
`d71b913` before the first live request**.

## Runner validation (before and after)

Deterministic lane **189/0 exit 0** and mandatory staging lane **7/7 exit 0**, both **pre-run and
post-run** from clean process states. Combined **196** suites. Logs: `deterministic-gate-prerun.txt`,
`staging-gate-prerun.txt`, `deterministic-gate-postrun.txt`, `staging-gate-postrun.txt`.

## Execution (WS: full 50×3)

150/150 canonical runs at runtime `d71b913`, fresh conversations, no reuse: **0 duplicates, 0
missing, 0 substitutions, 0 prompt mismatches, 0 runtime mismatches, 0 persistence failures**
(`persistence.count = 2` all). 3 superseded **technical** retries (all Q10 degenerate 16-char
generations) retried to clean captures and **excluded** from the 150 canonical total
(`a13-retry-log.jsonl`). Counts (`count-reconciliation.json`): **VERIFIED_CONTROLLING 30 +
RELATED_AUTHORITY_ONLY 72 + NO_VERIFIED_AUTHORITY 48 = 150**.

## Verified adjudication (all 30 individually reviewed)

`verified-adjudication-worksheet.md`: **26 VALID, 1 QUESTIONABLE, 3 INVALID.**

### INVALID — Q38 (all 3 rounds)
"Is a new business required to register with the BIR, and what form is used?" The answer states
**BIR Form 1902** — the registration form for individuals earning purely **compensation** income
(employees) — as a business-registration form; a new business uses **1901** (self-employed) or
**1903** (juridical). Its source cards are **withholding regulations** (RR 2-1998 / RR 11-2018) plus
**foundational** NIRC Sec 2/3 (BIR powers/officials) — **none is the registration authority**
(NIRC Sec 236). A **wrong form** plus a registration proposition verified on **topic-mismatched /
foundational** authority (source-card laundering). Consistent across 3/3 rounds.

### QUESTIONABLE — Q46 (r1)
"Is the sale of gold by a small-scale miner to the BSP subject to VAT?" "Not subject to VAT"
**conflates VAT-exemption with zero-rating** and is justified by hedged, speculative reasoning
("may be exempt", "may be exempt under specific provisions or interpretations of tax law") citing
**only general VAT-imposition sections** (105-108, RR 16-2005) — no controlling authority for the
specific transaction treatment. Nondeterministic (verified only in r1).

Both defects belong to the **source-card-laundering class the R6 `evaluatePropositionSourceSufficiency`
gate does NOT yet cover** (it covers penalty and EWT; registration/procedural and
exemption-vs-zero-rating are uncovered) — the R6 review's own **P2-C** carryover, now materialized as
live invalid/questionable VERIFIED_CONTROLLING across the full 50-question set.

### VALID (P2 citation-precision notes, not defects)
Q3 (exporter input-VAT refund) and Q34 (individual ITR April 15) state correct baseline propositions
but cite general same-tax-type provisions rather than the most specific section — correct and not
misleading (VALID/P2, consistent with prior independent-review acceptance). Q30 (estate 6%) carries
the prior-accepted minor base imprecision; the asked proposition (the 6% rate) is correct (VALID/P2).

## Cross-run consistency

`cross-run-consistency-report.md`: consistent INVALID verification Q38 (3/3); nondeterministic
QUESTIONABLE verification Q46 (1/3); trust-classification instability on VALID answers (Q1 2/3, Q3
2/3, Q6 2/3, Q13 1/3, Q15 1/3) — harmless wording/trust variation on correct answers; **no material
legal inconsistency among VALID answers**.

## Prior-remediation preservation

**Q5 0/3 verified** (incentive-source-sufficiency), **Q8 0/3** (treatment-contradiction fired r2),
**Q25 0/3** (proposition-source-sufficiency), **Q36 0/3** (proposition-source-sufficiency) — all
RELATED. Q5/Q8 invalid verified = 0, M-Q25/M-Q36 invalid verified = 0. Accessor getter executions 0,
exceptions 0, accessor verified 0 (A12-R2 suite). Unrestricted outcome prediction 0, false refusal 0,
fabricated authority 0. **No prior gate weakened.**

## Reconciliation, security, scope

`count-reconciliation.json` ties manifest, run log, payload index, worksheets, result JSON, report,
and CURRENT_STATE. Security clean (`security-and-scope-review.md`) — `sanitizedConversationRef` +
request/response hashes only; no secrets, private URLs, raw conversation IDs, or PII. **No runtime,
validator, question, corpus, index, model, frontend, Dev Factory, production, or protected-path
change.** Tracked worktree clean; only governed protected untracked paths remain.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 2 | Q38 invalid verified (registration/procedural source-sufficiency); Q46 questionable verified (exemption-vs-zero-rating source-sufficiency). Both uncovered by the current penalty/EWT gate. |
| P2 | 6 | Carryovers incl. source-excerpt grounding false; proposition gate not exhaustive; gpt-4o-mini limitation; trust-classification instability on some valid answers; deadline/registration citation precision. |
| P3 | 1 | Intermittent degenerate generation (Q10) requiring bounded technical retry. |

## Decision

**PHASE 10A13 REVISIONS REQUIRED.** The rerun completed cleanly and the prior remediations hold, but
individual adjudication found 3 INVALID and 1 QUESTIONABLE VERIFIED_CONTROLLING results (Q38, Q46) —
the source-card-laundering class not yet covered by the proposition gate. PASS requires invalid = 0
and unresolved questionable = 0. No remediation is authorized in A13; the defects are preserved.

## Exact next task

PHASE-10A12-style remediation of the registration/procedural and exemption-vs-zero-rating
source-sufficiency classes (generalize `evaluatePropositionSourceSufficiency`), then re-run the
governed full 50×3 — followed by the mandatory independent A13 review. Phase 10A remains open;
A13 closure, the adversarial suite, 10B/10C, model migration, reindexing, and deployment remain
unauthorized.
