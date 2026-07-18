# PHASE-10A14-R3-MULTI-PROPOSITION-FILING-AUTHORITY-COMPATIBILITY-AND-ESTATE-COMPUTATION-SUFFICIENCY-REMEDIATION-1 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed. **Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `d5cfceb`. **Runtime commits:** `f44490d` (architecture) + `ba08ae7` (live-caught donor false-refusal fix).
**Decision:** PHASE 10A14-R3 **REVISIONS REQUIRED**.

The R3 GATE remediation is architecturally complete and correct — all five R2 P1 defects
are fixed deterministically and in negative live validation, with 0 invalid verified. It is
NOT a clean PASS because the packet's PASS bar requires **direct live positive reachability
for the individual filing-obligation, individual-deadline, and substituted-filing classes**,
and this could not be demonstrated: retrieval/source-surfacing **systematically** returns
only income-tax rate/residency authority (Sec 23/24/27), never the filing provision Sec 51/
51-A, across multiple bounded formulations (including ones explicitly citing Section 51).
Per the packet's RETRIEVAL-SURFACING RULE this is a material and systemic limitation → the
honest self-assessment is REVISIONS REQUIRED. The R3 gate behaves correctly (it fails closed
when matching authority is absent); the blocker is retrieval, which this task is NOT
authorized to modify. A separately-authorized retrieval / source-surfacing remediation is
required before individual-filing live positive reachability can be shown.

Does NOT authorize another full 50×3, Phase 10A closure, adversarial, 10B/10C/10G-C, model
migration, reindexing, corpus/source-bank/prompt/question-bank change, or deployment. The
mandatory independent review (Codex GPT-5, high reasoning, low speed) follows and must not
execute R3.

---

## WS1 — pre-patch reproduction (all five P1 OPEN at d5cfceb)

`ws1-prepatch-5p1-reproduction.md`: replaying the reviewer P1 probes through the pre-R3
runtime, all five defects reproduced — mixed-object filing suppression (`OPEN:none`),
relative/Taglish deadline bypass (`OPEN:none`), cross-tax-type authority laundering
(`OPEN:filing_deadline`, i.e. estate authority accepted for an individual ITR deadline and
vice-versa), correct-but-unsupported estate computation (`OPEN:tax_computation_basis`), and
the relational standard-deduction-as-threshold misstatement (`OPEN:tax_computation_basis`).

## WS2–WS9 — the remediation (clause-scoped multi-proposition architecture)

`design-records-multi-proposition-architecture.md`. `evaluatePropositionSourceSufficiency`
was rebuilt on a deterministic clause-scoped multi-proposition ledger:

- **P1-1** `segmentClauses` + a per-clause proposition ledger: a wrong object (documents/
  protest/refund/registration/appeal) in one clause no longer suppresses a separate
  decisive tax-return proposition in another clause.
- **P1-2** object-aware relative-period / Taglish deadline model: "still file today",
  "pwede pa bang mag-file", "already late for the return", answer-introduced dates are
  detected; bare "late filing" (penalty) and "no tax is due" (liability) are not.
- **P1-3** clause-first tax/return classification + an explicit authority-compatibility
  matrix: filing authority must match the EXACT tax/return type (no cross-tax laundering);
  substituted filing requires substituted-filing authority.
- **P1-4** estate computation component model with POSITIVE authority sufficiency: a correct
  estate answer requires estate rate (Sec 84) and base/deduction (Sec 85/86) authority for
  the components it asserts; foundational-only cards fail closed.
- **P1-5** estate base misstatement by legal RELATIONSHIP (deduction/first-amount as
  threshold/floor/sole base reducer), independent of any fixed amount or one phrase.
- **compound completeness**: every decisive proposition is evaluated; the first unsupported
  one fails closed while the ledger preserves all detected propositions.

Class/object based; no question IDs, prompts, amounts, dates, or reviewer-phrase deny lists.
Runs before the gpt-4o-mini validator; fails closed; never upgrades trust.

## WS10 — focused R3 suite

`tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs` —
**34 tests, 0 failed**, covering A mixed-object, B relative/Taglish deadline, C cross-tax-
type authority mismatch (each type + matching controls), D estate positive-authority
sufficiency, E estate relationship errors, F generic-return false positives, G compound
completeness. Every negative asserts class + object + authority mismatch/insufficiency +
the correct gate (not merely "not verified"). All prior validator/trust suites pass.

## WS11 — reviewer-probe replay

`ws11-reviewer-probe-replay.txt`: all 16 R1 probes + all R2 probes + additional forms of
the five P1 families — **every unsafe probe fails closed with the correct class**.

## WS12 — all-26 A14 replay

`all-26-replay-adjudication.json`: exactly the **9 Q12/Q30/Q34 slots** blocked
(filing_obligation / tax_computation_basis / filing_deadline); the **17 valid slots
unaffected**; Q3/Q47 no over-fire; Q32 reachable.

## WS13 — targeted live validation (runtime `ba08ae7`, 60 probes)

`live-reconciliation.md`. Full displayed source labels captured per payload. **Invalid
verified = 0** (all 8 live-verified results sit on MATCHING controlling authority).

- **Mixed-object** (8): all fail closed as `filing_obligation` — the document/protest/refund
  clause never suppresses the return proposition (P1-1 fixed live).
- **Deadline** (10, incl. Taglish "pwede pa" / "ihahabol" / "hanggang kailan"): all fail
  closed as `filing_deadline` (P1-2 fixed live).
- **Cross-tax** (8): no laundering — a filing/deadline result verifies only when the full
  displayed set carries MATCHING-type authority (XT-02 estate deadline verified on Sec 91);
  otherwise fails closed (P1-3).
- **Estate** (10): misstatements fail closed (`estate_tax_base_deduction_threshold_
  conflation`); correct-but-unsupported fail closed (`estate_computation_without_estate_
  authority`); a correct estate answer with estate authority (ES-01) verifies.
- **Positive — DEMONSTRATED live:** estate-return deadline (POS-04/POS-12, Sec 90/91),
  correct estate computation (ES-01, Sec 84/86), donor's tax (POS-13, Sec 99–104), VAT
  return deadline (POSX-vatdl-1, Sec 114), protest non-return control (POS-10, Sec 228),
  EWT valid safeguard (PR-Q25, RR 2-98).
- **Positive — NOT demonstrable live (retrieval-surfacing):** individual filing obligation,
  individual deadline, and substituted filing — retrieval systematically returned only
  Sec 23/24/27, never Sec 51/51-A, across three bounded formulations per class (incl.
  explicit "Section 51" citations). The gate then correctly fails closed. This is the
  blocking limitation for a clean PASS.
- **Donor false refusal — caught live and fixed:** the first live run misclassified a
  correct donor's-tax answer that mentioned "estate planning" as an estate misstatement;
  fixed in `ba08ae7` (estate context requires a genuine estate-TAX marker + excludes donor/
  gift; regression test E-donor). Final runtime: no false refusal by the R3 gate.
- **Prior safeguards** (4): Q36 penalty + Q38 registration blocked by their classes; Q46
  fail closed; Q25 verified on proper withholding authority (RR 2-98) — valid, 0 invalid.

Per the packet's retrieval-surfacing rule, the individual-filing live gap is recorded as the
deterministic gate behaving correctly with a material, systemic retrieval/source-surfacing
limitation — not papered over with fixtures; no retrieval change was made in this task.

## WS14 — ES-09 reconciliation correction

`es09-reconciliation-correction-record.md`: preserves the historical R2 artifact, identifies
the inconsistent `INVALID_VERIFIED(neg families): estate:ES-09` field, and adjudicates ES-09
as VALID positive estate reachability (correct net-estate answer on Sec 84/86), not an
invalid verified. All R3 outputs agree.

## WS15 — runners (twice each, clean tree)

Deterministic **193/0 exit 0** (×2) and staging **7/7 exit 0** (×2). Combined **200**; +1 vs
prior 199 = the new R3 focused suite (justified). _(Exact counts recorded in the committed
cycle logs.)_

## WS16 — prior safeguards

`prior-safeguard-preservation-matrix.md`: Q5/Q8/Q25/Q36/Q38/Q46 invalid verified 0; accessor
0/0/0; outcome-prediction 0; fabricated authority 0; false refusal 0; model override 0.

## WS17 — security & scope

`security-and-scope-review.md`: clean. Validator code + one new focused test only; no
corpus/source-bank/index/model/prompt/frontend/Dev Factory/production change; committed R2 /
R2-review / R1 evidence unchanged; protected untracked paths preserved; no backend server
remains.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 1 | **blocking:** individual filing-obligation / deadline / substituted live POSITIVE reachability cannot be demonstrated — retrieval systematically surfaces only rate/residency authority, never Sec 51/51-A (material, systemic). The R3 gate is correct; the blocker is retrieval (out of scope here). |
| P2 | 5 | passage-level grounding not implemented; matrix class-enumerated (extensible); gpt-4o-mini limitation; + prior carryovers |
| P3 | 1 | Q10 intermittent degenerate generation (transient) |

The five R2 P1 gate defects are all remediated (deterministically + in negative live
validation, 0 invalid verified). The one P1 above is a live-reachability/retrieval blocker,
not a gate defect.

## Decision

**PHASE 10A14-R3 REVISIONS REQUIRED.** The clause-scoped multi-proposition architecture
remediates all five R2 P1 gate defects: propositions are independently detected in mixed-
object text and matched to their exact tax object; filing authority matches the exact
taxpayer/tax/return type (no cross-tax laundering); correct estate computations require
positive authority support; estate errors are relationship-detected; and a live-caught donor
false refusal was fixed. Deterministic and negative live evidence is clean (34→35 focused
tests; all reviewer probes closed; all-26 exact; 0 invalid verified; 0 regressions; runners
pass twice). PASS is NOT claimed because the packet requires direct LIVE positive reachability
for the individual filing-obligation, individual-deadline, and substituted-filing classes,
and the systemic retrieval-surfacing limitation (Sec 51/51-A never surfaced across bounded
formulations) prevents it. No retrieval change was made (out of scope). A separately-
authorized retrieval / source-surfacing remediation is required to close this before PASS.

## Exact next task

PHASE-10A14-R3-MULTI-PROPOSITION-FILING-AUTHORITY-COMPATIBILITY-AND-ESTATE-COMPUTATION-SUFFICIENCY-REMEDIATION-1-INDEPENDENT-REVIEW-1
(Codex GPT-5, high reasoning, low speed; must not execute R3). Phase 10A remains open.
