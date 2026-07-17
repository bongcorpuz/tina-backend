# PHASE-10A13-R1-PROPOSITION-SOURCE-SUFFICIENCY-REMEDIATION-1 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed. **Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `d6fbf29`. **Runtime commit:** `508a64d`.
**Decision:** PHASE 10A13-R1 PASS.

Does NOT authorize another full 50×3 rerun, Phase 10A closure, adversarial testing, 10B/10C,
model migration, reindexing, or deployment. The mandatory independent R1 review follows.

---

## WS1 — reproduction (defects proven before patching)

Replaying the committed A13 payloads through the **pre-patch** validator: Q38-r1/r2/r3 and Q46-r1 all
carried `verifiedEligible=true`, and `evaluatePropositionSourceSufficiency` returned `applicable=false`
(did not catch them) — proving the runtime permitted the invalid/questionable verification
(`q38-q46-reproduction-and-root-cause.md`).

- **Q38 (P1-1):** registration/form answer citing **Form 1902** (employee registration) on withholding
  regs + foundational NIRC Sec 2/3 — no registration authority (Sec 236).
- **Q46 (P1-2):** "not subject to VAT" conflating exemption vs zero-rating on general VAT-imposition
  authority (105-108, RR 16-2005) — no specific exception authority.

## WS2/WS3/WS4 — the remediation (class-based, no hardcoding)

`evaluatePropositionSourceSufficiency` extended with two proposition classes
(`proposition-source-sufficiency-design-record.md`). No question IDs, exact prompts, answer strings, or
deny lists; deterministic and source-card-keyed; runs before the gpt-4o-mini validator; fails closed;
never upgrades trust.

- **registration_procedural:** registration / form-selection / registration-procedure (amend/update/
  close/transfer/cancel) propositions require registration authority (NIRC Sec 236/237/238, registration
  RRs/RMCs); fail closed on foundational (Sec 1-6), withholding, general, or topically adjacent
  authority. A tax-RETURN-form question is not a registration act (not misclassified).
- **vat_exception:** transaction-specific exempt / zero-rated / not-subject-to-VAT / outside-scope claims
  require exemption/zero-rating/exception authority (Sec 109, the zero-rating subsections, specific
  exception/incentive laws); fail closed on general VAT-imposition authority alone.

Passage-level grounding was not attempted (needs retrieval/corpus change) and remains a continuing P2.

## WS5 — focused tests

`tests/phase-10a13-r1-proposition-source-sufficiency.test.mjs` — **17 tests, 0 failed**
(registration positive/negative/return-form-non-overfire; VAT exempt/zero-rated/general/reachability;
cross-class foundational/same-tax-type laundering; no blanket suppression; gate never upgrades). Two
prior fixtures were corrected to supply the matching **source card** their prose claims (Q8 exempt →
Sec 109; registration is now a covered class) — a strengthening, not a weakening. All validator/trust
suites pass (A13-R1 17, A12-R6 17, A12-R1 19, A12-R3 20, A12-R2 10, A10-R1 22, A10-R2 27, A8 24).

**Post-patch replay of all 30 committed A13 verified payloads:** only **Q38 (×3) and Q46 (×1)** newly
fail closed; the **26 valid verified are unaffected** (0 false refusals introduced).

## WS6 — targeted live validation (runtime 508a64d, 23 runs)

- **Q38 exact ×5 + 3 paraphrases → 0 verified** (all fail closed at `proposition-source-sufficiency`).
- **Q46 exact ×5 → 0 verified.** Q46-p1 ("VAT-exempt or zero-rated?") → **VALID verified**: correctly
  classifies the treatment as **VAT-exempt** and cites the controlling **Sec 109** exemption authority —
  demonstrating **preserved VAT-exception reachability** (the opposite of the A13 Q46-r1 defect, which
  cited only general authority and hedged).
- **Q5 / Q8 / Q25 / Q36 → 0 verified** (incentive, treatment-contradiction, EWT, penalty gates intact).
- **Valid reachability:** Q47 (donor's 6%) verified. **Outcome-prediction:** RES held (RELATED).
- `persistence.count = 2` all; **invalid verified 0, questionable verified 0**.

## WS8 — prior-safeguard preservation

`prior-safeguard-preservation-matrix.md`: Q5/Q8/Q25/Q36 invalid verified 0; accessor getter
executions 0 / exceptions 0 / accessor verified 0; unrestricted outcome prediction 0; fabricated
authority 0; false refusal 0. **The model validator did not override any failed deterministic gate** —
every Q38/Q46/Q25/Q36 fail-closed occurred at the deterministic stage before the LLM stage.

## WS7 — regression (twice)

Deterministic lane **190/0 exit 0** (×2) and staging lane **7/7 exit 0** (×2) from clean process
states. Combined **197** suites; +1 vs prior 196 is the new R1 focused suite (justified, reconciled).
No suite removed, weakened, skipped, forced, or made non-blocking.

## Security & scope

Clean (`security-and-scope-review.md`): validator code + focused tests + two fixture corrections only;
no corpus/index/model/frontend/Dev Factory/production change; protected untracked paths untouched;
`sanitizedConversationRef` + hashes only.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | Q38-class and Q46-class remediated with live evidence; prior safeguards intact. |
| P2 | 6 | Source/passage-level grounding still not implemented; gate remains class-enumerated (extensible, not exhaustive); gpt-4o-mini limitation; other prior carryovers. |
| P3 | 1 | Intermittent degenerate generation / transient truncation. |

## Decision

**PHASE 10A13-R1 PASS** — both A13 P1 defect classes remediated by class-based deterministic controls;
Q38-class invalid verified 0 and Q46-class questionable/invalid verified 0 with live evidence; valid
registration and VAT-exception reachability preserved; Q5/Q8/Q25/Q36 intact; runners pass twice;
security clean; worktree clean; pushed; sync 0 0.

## Exact next task

PHASE-10A13-R1-PROPOSITION-SOURCE-SUFFICIENCY-REMEDIATION-1-INDEPENDENT-REVIEW-1 (a model that did not
execute this remediation). Phase 10A remains open; A13 closure, another full 50×3, the adversarial
suite, 10B/10C, model migration, reindexing, and deployment remain unauthorized.
