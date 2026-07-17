# PHASE-10A14-FULL-FACTCHECK-RERUN-4 — EXECUTION REPORT

**Model:** Claude Code — Opus 4.8 — Low speed. **Type:** evaluation only (no remediation).
**Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `e381e3c`. **Manifest = runtime commit:** `87ce0c7` (runtime code frozen, unchanged since R1 `508a64d`).
**Decision:** PHASE 10A14 PASS.

A14 PASS does **not** close Phase 10A. A mandatory independent A14 review (by a model that did not
execute A14) and a separately authorized closure gate are required. A14 does not authorize the
adversarial suite, 10B/10C, model migration, reindexing, or deployment.

---

## Frozen baseline & manifest (WS1–WS4)

HEAD `e381e3c`, sync 0 0, tree clean, no stale server (port 5173 unrelated, recorded, untouched).
Frozen runtime controls confirmed present and unchanged: `registration_procedural` + `vat_exception`
(class-based, before the validator, fail-closed). Source-bank snapshot verified `526106e5` (Q1–Q50,
no gaps). Pre-execution manifest (`manifestSha256 75f7f486`, per-question hashes, 3 rounds = 150 slots,
3 predeclared sidecars, retry/evidence policy, validator hash) **committed and pushed at `87ce0c7`
before the first canonical request; remote head verified.** Pre-run gates: deterministic **190/0
exit 0**, staging **7/7 exit 0**.

## Execution (WS5–WS7)

150/150 canonical runs at runtime `87ce0c7`, fresh conversations: **0 duplicates, 0 missing, 0
substitutions, 0 prompt mismatches, 0 runtime mismatches, 0 persistence failures** (`count=2` all).
Technical retries were the recurring **Q10 degenerate 16-char generation** only — retried and
**excluded** from the 150 canonical total (Q10-r1/r2 completed). Counts: **VERIFIED_CONTROLLING 26 +
RELATED_AUTHORITY_ONLY 76 + NO_VERIFIED_AUTHORITY 48 = 150**.

## Adjudication (WS10–WS13)

All **26 verified individually adjudicated VALID** (`verified-detailed-adjudication.md`): the settled
VALID-class questions (VAT registration threshold, exporter input-VAT refund, non-VAT invoice, ITR
filing, MCIT, estate rate/deadline, ITR deadline, donor's tax, bad debt). **0 invalid, 0
questionable.** No fabricated authority; no invented form / unsupported rate / exemption-zero-rating
conflation in any verified result; no unrestricted outcome prediction (the frozen bank has none); no
model override of a deterministic gate; accessor 0/0/0; no material false refusal.

## High-risk clusters (WS9) — all remediated/preserved

**Q5, Q8, Q25, Q36, Q38, Q46 all verified 0/3 (RRR).** Q38 (registration/procedural) and Q46
(transaction-specific VAT exception) — A13's P1 defects (Q38 3/3 invalid; Q46 1/3 questionable) — are
**eliminated live**: each round fails closed at the deterministic gate on non-controlling authority.
Q5 (incentive), Q8 (treatment-contradiction), Q25 (EWT), Q36 (penalty) gates all preserved; invalid
verified 0 for every cluster.

## Reachability (WS8 sidecars + live)

- **Registration reachability DEMONSTRATED LIVE:** **Q1-r3** is classified `registration_procedural`,
  the gate is SUFFICIENT (Sec 236 in the displayed source cards), and it VERIFIED — proving the gate
  does **not** blanket-suppress; a registration proposition verifies when the controlling authority is
  present. (Q6-r2/r3 also verified with Sec 236.)
- **Ordinary general-VAT reachability DEMONSTRATED:** SIDE-GENVAT-POS VERIFIED (12% on Sec 106).
- **VAT-exception reachability preserved (proven):** R1 deterministic tests + A13-R1 live Q46-p1
  (exempt on Sec 109).
- **P2 (non-blocking):** the dedicated SIDE-REG-POS and SIDE-VATEXC-POS sidecars returned **correct
  answers** (Form 1903; agri/marine food exempt) but retrieval surfaced **non-controlling** authority
  (foundational Sec 2/3; general VAT 105-108) instead of Sec 236 / Sec 109, so the gate correctly
  failed closed (anti-laundering). This is a retrieval/source-surfacing limitation, **not** gate
  blanket-suppression (Q1-r3 verifying proves the gate discriminates on displayed authority).

## Cross-round (WS11)

No **material legal contradiction**: every question's legal treatment (taxable/exempt, rate, form,
deadline, authority) is consistent across its three rounds; variation is trust-state (VERIFIED vs
RELATED) on the same correct answer, driven by generation/retrieval nondeterminism.

## Regression, reconciliation, security (WS14–WS16)

Pre-run and post-run **deterministic 190/0 exit 0** and **staging 7/7 exit 0**; combined **197**.
`count-reconciliation.json` ties manifest, runlog, payload index, worksheets, result JSON, report, and
CURRENT_STATE. Security clean (`security-and-scope-review.md`) — `sanitizedConversationRef` + hashes
only. **No runtime/validator/test/fixture/question/source/corpus/index/model/schema/frontend/Dev
Factory/production change**; protected untracked paths preserved; worktree clean; no A14 server left.

## Final severity (WS17)

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | invalid verified 0; questionable 0; Q38 0/3; Q46 0/3; clusters preserved; no fabrication/override/false-refusal; no material cross-round contradiction; reachability preserved & not blanket-suppressed |
| P2 | 5 | registration/VAT-exception positive-sidecar retrieval-surfacing limitation; passage-level grounding not implemented; gate class-enumerated (not exhaustive); gpt-4o-mini limitation; Q3/Q34 same-tax-type citation precision |
| P3 | 1 | Q10 intermittent degenerate generation (technical, excluded) |

## Decision

**PHASE 10A14 PASS.** All PASS conditions met: 150/150 completed and reconciled; all verified
adjudicated VALID; invalid/questionable verified 0; Q38/Q46 remediation holds live; Q5/Q8/Q25/Q36
intact; fabricated authority 0; outcome-prediction 0; accessor 0/0/0; model override 0; valid
reachability preserved and not blanket-suppressed (registration verified live; general-VAT verified);
pre-run and post-run deterministic + staging gates pass; counts/hashes reconcile; security clean;
worktree clean; pushed; sync 0 0; no stale server.

## Exact next task

PHASE-10A14-FULL-FACTCHECK-RERUN-4-INDEPENDENT-REVIEW-1 (a model that did not execute A14). Phase 10A
remains OPEN until an independent A14 PASS and a separately authorized Phase 10A closure gate.
