# PHASE-10A14-R1-FILING-OBLIGATION-DEADLINE-AND-TAX-BASE-SOURCE-SUFFICIENCY-REMEDIATION-1 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed. **Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `b04f5b0`. **Runtime commit:** `b7e40fc`.
**Decision:** PHASE 10A14-R1 PASS.

Does NOT authorize another full 50×3, Phase 10A closure, adversarial, 10B/10C, model migration,
reindexing, or deployment. The mandatory independent review follows.

---

## WS1 — reproduction (defects proven pre-patch)

Replaying the committed A14 payloads through the **pre-patch** validator: Q12-r1/r2/r3, Q30-r1/r2/r3,
Q34-r1/r2/r3 all carried `verifiedEligible=true` and `evaluatePropositionSourceSufficiency` returned
`applicable=false` — proving the runtime permitted the compound-proposition laundering
(`q12-q30-q34-reproduction-and-root-cause.md`).

- **Q12:** "no tax due" laundered into "no filing required" on income-tax rate/residency authority
  (Sec 23/24/27); no filing authority (Sec 51).
- **Q30:** estate tax "6% on the value of the estate exceeding ₱5,000,000" — the ₱5M is the standard
  deduction, not a threshold; the base is the NET estate (rate/base/deduction/threshold conflation).
- **Q34:** ITR "April 15" deadline supported only by rate/residency provisions; no deadline authority.

## WS3–WS7 — the remediation (class-based)

`evaluatePropositionSourceSufficiency` extended with three proposition classes
(`design-records-and-authority-mapping.md`). No question IDs, exact prompts, income amounts, dates, or
answer deny lists; source-card keyed; runs before the gpt-4o-mini validator; fails closed; the model
validator cannot override a failed deterministic gate.

- **filing_obligation:** required/not-required-to-file, substituted-filing, joint/separate-return
  conclusions require filing authority (Sec 51/52/56/74/75, substituted-filing RRs); fail closed on
  rate/residency/corporate/withholding. Question-led (a refund/rate answer mentioning filing in passing
  is not gated — Q3/Q47 preserved). Distinguishes no-tax-due from no-filing-required.
- **filing_deadline:** return-deadline conclusions require deadline/return authority per tax type
  (Sec 51 individual, 52/77 corporate, 90/91 estate, 103 donor, 114 VAT); fail closed on rate/residency.
- **tax_computation_basis:** an estate-tax computation applying the rate to "the (value of the) estate …
  exceeding [amount]" fails closed; a correct "6% of the net estate" computation remains reachable;
  donor's-tax "6% over ₱250,000" (a real Sec 99 threshold) is not misclassified.
- **compound completeness:** classes are evaluated sequentially; a strongly-supported component cannot
  launder a weaker unsupported one.

## WS8 — focused tests

`tests/phase-10a14-r1-filing-deadline-taxbase-source-sufficiency.test.mjs` — **16 tests, 0 failed**
(filing/deadline/estate positive+negative, no-over-fire on refund/rate/donor, no blanket suppression,
gate never upgrades). All validator/trust suites pass; one R6 fixture updated (estate is now a covered
class). One prior R6 fixture updated only for correct classification (not weakening).

## WS9 — all-26 A14 replay

`all-26-replay-adjudication.md`: exactly the **9 Q12/Q30/Q34 slots newly fail closed**; the **17
independently-VALID A14 verified results (Q1/Q3/Q6/Q15/Q32/Q47/Q48) are unaffected — 0 false refusals**.
Prior Q38/Q46 remediation intact.

## WS10 — targeted live validation (runtime b7e40fc, 26 runs)

- **Q12 exact ×5 + multiple-employer paraphrase → 0 verified**; **Q30 exact ×5 → 0 verified**;
  **Q34 exact ×5 → 0 verified** (all fail closed at `proposition-source-sufficiency`).
- **Valid reachability preserved:** Q32 (estate-return deadline) VERIFIED on Sec 91 — proving the
  filing_deadline gate is not blanket-suppressing; Q47 (donor's 6%) and Q15 (MCIT) VERIFIED.
- **Prior clusters preserved:** Q5/Q8/Q25/Q36/Q38/Q46 all RELATED (0 verified). Outcome-prediction held.
- `persistence.count = 2` all; **invalid/questionable verified 0**.

## WS12 — prior-safeguard preservation

`prior-safeguard-preservation-matrix.md`: Q5/Q8/Q25/Q36/Q38/Q46 invalid verified 0; accessor 0/0/0;
outcome-prediction 0; fabricated authority 0; false refusal 0; model override 0. Every fail-closed
occurred at the deterministic stage before the LLM stage.

## WS11 — regression (twice)

Deterministic lane **191/0 exit 0** (×2) and staging lane **7/7 exit 0** (×2). Combined **198**; +1 vs
prior 197 is the new A14-R1 focused suite (justified). No suite removed, weakened, skipped, forced, or
made non-blocking.

## Security & scope

Clean (`security-and-scope-review.md`): validator code + one focused test + one R6 fixture update only;
no corpus/index/model/frontend/Dev Factory/production change; committed A14 evidence unchanged; protected
untracked paths preserved.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | Q12/Q30/Q34 classes remediated with live evidence; 17 valid unaffected; safeguards intact |
| P2 | 6 | passage-level grounding not implemented; gate class-enumerated (extensible, not exhaustive); gpt-4o-mini limitation; registration/VAT-exception positive-sidecar retrieval-surfacing (from A14); + prior carryovers |
| P3 | 1 | Q10 intermittent degenerate generation (transient) |

## Decision

**PHASE 10A14-R1 PASS** — the three A14-review P1 compound-proposition classes are remediated by
class-based deterministic controls; Q12/Q30/Q34 fail closed live and in replay; the 17 valid verified
are unaffected; valid filing/deadline/estate reachability preserved; prior safeguards intact; runners
pass twice; security and worktree clean.

## Exact next task

PHASE-10A14-R1-FILING-OBLIGATION-DEADLINE-AND-TAX-BASE-SOURCE-SUFFICIENCY-REMEDIATION-1-INDEPENDENT-REVIEW-1
(a model that did not execute this remediation). Phase 10A remains open.
