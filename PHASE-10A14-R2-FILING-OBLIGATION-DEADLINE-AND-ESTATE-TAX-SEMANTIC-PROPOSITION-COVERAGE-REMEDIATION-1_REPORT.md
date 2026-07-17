# PHASE-10A14-R2-FILING-OBLIGATION-DEADLINE-AND-ESTATE-TAX-SEMANTIC-PROPOSITION-COVERAGE-REMEDIATION-1 — REPORT

**Model:** Claude Code — Opus 4.8. **Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `7736cee`. **Runtime commit:** `22b845a`.
**Decision:** PHASE 10A14-R2 PASS.

Does NOT authorize another full 50×3, Phase 10A closure, adversarial, 10B/10C, model
migration, reindexing, or deployment. The mandatory independent review follows.

---

## WS1 — reproduction (pre-R2 phrase-dependence proven)

The committed pre-R2 validator at HEAD `7736cee` was replayed against the A14-R1
independent-review probes. Every filing-obligation and filing-deadline probe was **left
unclassified**, and every estate probe was **classified but not blocked** (the
phrase-based misstatement detector missed "excess over", "first N tax-free", "threshold",
"gross less"). This reproduces the reviewer's three P1 class-coverage defects
(`ws1-prepatch-bypass-reproduction.md`).

## WS2–WS9 — the remediation (semantic proposition layer)

`evaluatePropositionSourceSufficiency` was rebuilt on a deterministic **semantic** layer
(`design-records-and-semantic-model.md`): a normalizer (`normalizeTaxText` — ITR/contraction
expansion + bounded Taglish mapping), concept signals (filing act / return object /
obligation / genuine temporal frames / answer-introduced conclusions), and an **object
model** that resolves the object of the action so only *return-filing* invokes the gates
(payment / protest / registration / assessment / prescription / refund-claim are excluded).
Bare "due"/"late" were removed from the temporal signal because they collide with the
liability sense ("no tax is **due**") and the penalty sense ("**late** filing of a VAT
return"). Estate base misstatement is recognized by concept (value-exceeding / excess-over /
first-N-tax-free / threshold / gross-less-N), guarded so donor's-tax's real 250k threshold
is not misclassified. The layer runs before the gpt-4o-mini validator, fails closed, keys
authority on displayed source cards, and never upgrades trust. No question IDs, exact
prompts, amounts, dates, or reviewer-phrase deny lists.

## WS10 — focused suite

`tests/phase-10a14-r2-filing-estate-semantic-proposition-coverage.test.mjs` — **33 tests,
0 failed** (A paraphrase, B statement/answer-introduced, C temporal variants, D estate
concepts, E normalizer, F object-disambiguation/overfire, G positive reachability, H
gate-never-upgrades). All prior validator/trust suites pass; the A14-R1 (16/0) and A12-R6
(18/0) suites pass unchanged.

## WS11 — reviewer-probe replay

`ws11-reviewer-probe-replay.md`: all 16 A14-R1 reviewer probes (5 filing_obligation, 7
filing_deadline, 4 estate) now **fail closed with the correct class**. Pre-R2 all bypassed.

## WS12 — all-26 A14 replay

`all-26-replay-adjudication.json`: exactly the **9 Q12/Q30/Q34 slots** newly fail closed
(Q12→filing_obligation, Q30→tax_computation_basis, Q34→filing_deadline); the **17
independently-valid A14 verified results remain unaffected — 0 false refusals**.

## WS13 — targeted live validation (runtime `22b845a`, 42 probes)

`live-reconciliation.md`: **0 invalid verified.**
- **filing_obligation** (10 negatives): 0 verified — 7 blocked at our gate, 3 fail-closed elsewhere.
- **filing_deadline** (10 negatives): 0 verified — all 10 blocked at our gate.
- **estate** (10 negatives): 0 base misstatements verified — 1 blocked (base misstatement),
  8 fail-closed; the single verified estate result (**ES-09**) is a *correct* net-estate
  answer on controlling authority (Sec 84/86) — valid reachability, gate correctly did not fire.
- **positives:** estate-return deadline and donor's tax **VERIFIED_CONTROLLING** live.
- **overfire controls:** refund and protest **verified on their own authority** (not
  misclassified); payment/assessment fail-closed elsewhere — **0 blocked by our classes**.
- **prior safeguards:** Q36 penalty and Q38 registration blocked by their classes; Q25/Q46
  fail-closed — all RELATED, 0 verified.

## WS14 — runners (twice each, clean tree)

Deterministic **192/0 exit 0** (×2) and staging **7/7 exit 0** (×2). Combined **199**; +1
vs prior 198 is the new A14-R2 focused suite (justified). No suite removed, weakened,
skipped, forced, or made non-blocking. (The deterministic 09zf allowed-file gate requires a
clean worktree, so both cycles were run after evidence was committed.)

## Security & scope

`security-and-scope-review.md`: clean. Validator code + one new focused test only; no
corpus/index/model/frontend/Dev Factory/production change; committed A14 / A14-R1 / A13-R1
evidence unchanged; protected untracked paths (`.claude`, `.vscode`, `evaluation/factcheck`)
untouched. No secrets/PII in any artifact.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | the three A14-R1 phrase-dependence defects remediated with semantic coverage; live 0 invalid verified; 17 valid unaffected; safeguards intact |
| P2 | 6 | passage-level grounding not implemented; gate class-enumerated (extensible, not exhaustive); gpt-4o-mini limitation; positive filing_obligation retrieval-surfacing (Sec 51 not always surfaced); + prior carryovers |
| P3 | 1 | Q10 intermittent degenerate generation (transient) |

## Decision

**PHASE 10A14-R2 PASS** — filing_obligation, filing_deadline, and tax_computation_basis
(estate) detection is now deterministic and semantic (concept + object model + normalizer),
not phrase-dependent. Every reviewer probe fails closed with the correct class; the all-26
replay blocks exactly Q12/Q30/Q34 with 0 valid newly blocked; live validation over 42 probes
produces 0 invalid verified while correct estate/donor/deadline answers remain reachable and
object-disambiguation controls are not over-blocked; prior safeguards intact; runners pass
twice; security and worktree clean.

## Exact next task

PHASE-10A14-R2-FILING-OBLIGATION-DEADLINE-AND-ESTATE-TAX-SEMANTIC-PROPOSITION-COVERAGE-REMEDIATION-1-INDEPENDENT-REVIEW-1
(a model that did not execute this remediation). Phase 10A remains open.
